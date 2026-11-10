import assert from "node:assert/strict";
import { decodeFunctionData, getAddress, zeroAddress, type Abi } from "viem";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import GlvRouter from "../../../sdk/src/abis/GlvRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { USD } from "./economy";
import type { UiTransaction } from "./uiOrderGuard";

export type UiLiquidityIntent = {
  kind: "gm" | "glv";
  withdraw: boolean;
  account: string;
  market: string;
  lpToken: string;
  usdc: string;
  weth: string;
  amount: bigint;
  minLp?: bigint;
  minLong?: bigint;
  minShort?: bigint;
  nativePrice: bigint;
};

export function inspectUiLiquidity(tx: UiTransaction, intent: UiLiquidityIntent) {
  const { kind, withdraw } = intent;
  const abi = (kind === "gm" ? ExchangeRouter : GlvRouter) as Abi;
  assert.equal(getAddress(tx.to), getAddress(getContract(42161, kind === "gm" ? "ExchangeRouter" : "GlvRouter")));
  const root = decodeFunctionData({ abi, data: tx.data });
  assert.equal(root.functionName, "multicall");
  const calls = (root.args![0] as `0x${string}`[]).map((data) => decodeFunctionData({ abi, data }));
  assert.equal(calls.length, 3, "Unexpected liquidity batch operations");
  const vault = getContract(42161, kind === "glv" ? "GlvVault" : withdraw ? "WithdrawalVault" : "DepositVault");
  const sendNative = calls.filter((c) => c.functionName === "sendWnt");
  const sendTokens = calls.filter((c) => c.functionName === "sendTokens");
  assert.equal(sendNative.length, 1);
  assert.equal(sendTokens.length, 1);
  assert.deepEqual(sendNative[0].args, [getAddress(vault), tx.value]);
  assert.deepEqual(sendTokens[0].args, [
    getAddress(withdraw ? intent.lpToken : intent.usdc),
    getAddress(vault),
    intent.amount,
  ]);
  assert.ok(intent.amount > 0n && (withdraw || intent.amount === 1_000_000n));
  const operation = `create${kind === "glv" ? "Glv" : ""}${withdraw ? "Withdrawal" : "Deposit"}`;
  const create = calls.find((c) => c.functionName === operation);
  assert.ok(create, "Expected liquidity operation");
  const p = create.args![0] as {
    addresses: Record<string, string | string[]>;
    executionFee: bigint;
    callbackGasLimit: bigint;
    shouldUnwrapNativeToken: boolean;
    minMarketTokens?: bigint;
    minGlvTokens?: bigint;
    isMarketTokenDeposit?: boolean;
    minLongTokenAmount?: bigint;
    minShortTokenAmount?: bigint;
    dataList: readonly string[];
  };
  assert.deepEqual(p.dataList, [], "Unexpected liquidity callback metadata");
  const a = p.addresses;
  assert.equal(getAddress(a.receiver as string), getAddress(intent.account));
  assert.equal(a.callbackContract, zeroAddress);
  assert.ok(a.uiFeeReceiver === zeroAddress || a.uiFeeReceiver === "0xff00000000000000000000000000000000000001");
  assert.equal(getAddress(a.market as string), getAddress(intent.market));
  if (kind === "glv") assert.equal(getAddress(a.glv as string), getAddress(intent.lpToken));
  assert.deepEqual(a.longTokenSwapPath, []);
  assert.deepEqual(a.shortTokenSwapPath, []);
  assert.equal(p.callbackGasLimit, 0n);
  assert.equal(p.shouldUnwrapNativeToken, false, "Withdrawal must receive WETH to measure exact proceeds");
  assert.equal(p.executionFee, tx.value);
  assert.ok(p.executionFee > 0n);
  if (withdraw) {
    assert.ok(intent.minLong !== undefined && intent.minShort !== undefined);
    assert.ok(intent.minLong + intent.minShort > 0n);
    assert.ok(
      p.minLongTokenAmount! >= intent.minLong && p.minShortTokenAmount! >= intent.minShort,
      "Liquidity output below permitted minimum"
    );
  } else {
    assert.equal(getAddress(a.initialLongToken as string), getAddress(intent.weth));
    assert.equal(getAddress(a.initialShortToken as string), getAddress(intent.usdc));
    assert.ok(
      intent.minLp && (kind === "gm" ? p.minMarketTokens! : p.minGlvTokens!) >= intent.minLp,
      "Insufficient minimum LP output"
    );
    if (kind === "glv") assert.equal(p.isMarketTokenDeposit, false);
  }
  return { extraFeeUsd: (tx.value * intent.nativePrice) / 10n ** 18n + USD / 50n };
}
