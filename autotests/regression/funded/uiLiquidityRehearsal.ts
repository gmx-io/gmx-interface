import { expect } from "@playwright/test";
import {
  decodeFunctionData,
  encodeFunctionResult,
  erc20Abi,
  getAddress,
  type Abi,
  type Hex,
  type TransactionReceipt,
} from "viem";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import GlvReader from "../../../sdk/src/abis/GlvReader";
import GlvRouter from "../../../sdk/src/abis/GlvRouter";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import type { AccountState } from "../fixtures/accountState";
import fixture from "../fixtures/markets/arbitrum.json";
import { fundedOrderReceipt } from "./fundedReceipt";
import { USD } from "./economy";
import type { UiTransaction } from "./uiOrderGuard";

export function uiLiquidityRehearsal(state: AccountState, usdc: TokenData, weth: TokenData) {
  const glv = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
  const gm = getAddress(state.data.market.marketTokenAddress);
  const pool = fixture.values[0];
  const supply = BigInt(pool.poolValueMax) / (2n * 10n ** 12n);
  const glvs = [{ glv: { glvToken: glv, longToken: weth.address, shortToken: usdc.address }, markets: [gm] }];
  const totalPoolUsd =
    (BigInt(pool.longPoolAmount) * weth.prices.minPrice) / 10n ** 18n +
    (BigInt(pool.shortPoolAmount) * usdc.prices.minPrice) / 10n ** 6n;
  const outputs = (amount: bigint) => {
    const valueUsd = (amount * 2n * USD) / 10n ** 18n;
    return [
      (valueUsd * BigInt(pool.longPoolAmount)) / totalPoolUsd,
      (valueUsd * BigInt(pool.shortPoolAmount)) / totalPoolUsd,
    ];
  };
  for (const token of [gm, glv]) {
    state.balances.set(token, 0n);
    state.allowances.set(token, new Map([[getAddress(getContract(42161, "SyntheticsRouter")), 0n]]));
  }
  return {
    tokens: [gm, glv],
    read(functionName: string, args: readonly unknown[]) {
      if (functionName === "getMarketTokenPrice") return [2n * USD, {}];
      if (functionName === "getGlvInfoList") return glvs;
      if (functionName === "getGlvTokenPrice") return [2n * USD, BigInt(pool.poolValueMax), supply];
      if (functionName === "getBytes32ValuesAt") return [];
      if (functionName === "getWithdrawalAmountOut") return outputs(args[3] as bigint);
    },
    contractRead(target: string, data: Hex): Hex | undefined {
      if (target === getAddress(getContract(42161, "SyntheticsReader"))) {
        const call = decodeFunctionData({ abi: SyntheticsReader, data });
        if (call.functionName === "getMarketTokenPrice" && getAddress(call.args[1].marketToken) === gm) {
          const fn = SyntheticsReader.find((item) => item.type === "function" && item.name === "getMarketTokenPrice")!;
          const info = Object.fromEntries(
            (fn.outputs[1] as { components: readonly { name: string }[] }).components.map((c) => [
              c.name,
              c.name === "poolValue" ? BigInt(pool.poolValueMax) : 0n,
            ])
          );
          return encodeFunctionResult({
            abi: SyntheticsReader as Abi,
            functionName: call.functionName,
            result: [2n * USD, info],
          });
        }
      }
      if ([gm, glv].includes(target)) {
        const call = decodeFunctionData({ abi: erc20Abi, data });
        if (call.functionName === "totalSupply")
          return encodeFunctionResult({ abi: erc20Abi, functionName: call.functionName, result: supply });
      }
      if (target !== getAddress(getContract(42161, "GlvReader"))) return;
      const call = decodeFunctionData({ abi: GlvReader as Abi, data });
      const result =
        call.functionName === "getGlvInfoList"
          ? glvs
          : call.functionName === "getGlvTokenPrice"
            ? [2n * USD, BigInt(pool.poolValueMax), supply]
            : call.functionName === "getGlvValue"
              ? BigInt(pool.poolValueMax)
              : undefined;
      if (result !== undefined)
        return encodeFunctionResult({ abi: GlvReader as Abi, functionName: call.functionName, result });
    },
    transact(tx: UiTransaction, key: Hex): TransactionReceipt | undefined {
      const isGlv = getAddress(tx.to) === getAddress(getContract(42161, "GlvRouter"));
      const abi = (isGlv ? GlvRouter : ExchangeRouter) as Abi;
      const root = decodeFunctionData({ abi, data: tx.data });
      if (root.functionName !== "multicall") return;
      const calls = (root.args![0] as Hex[]).map((data) => decodeFunctionData({ abi, data }));
      const create = calls.find((c) =>
        ["createDeposit", "createGlvDeposit", "createWithdrawal", "createGlvWithdrawal"].includes(c.functionName)
      );
      if (!create) return;
      const withdraw = create.functionName.endsWith("Withdrawal");
      const token = isGlv ? glv : gm;
      const transfer = calls.find((c) => c.functionName === "sendTokens")!;
      const amount = transfer.args![2] as bigint;
      const p = create.args![0] as Record<string, bigint>;
      if (withdraw) {
        expect(state.balances.get(token)).toBe(amount);
        state.balances.set(token, 0n);
        const [long, short] = outputs(amount).map((value) => (value * 9_995n) / 10_000n);
        expect(long).toBeGreaterThanOrEqual(p.minLongTokenAmount);
        expect(short).toBeGreaterThanOrEqual(p.minShortTokenAmount);
        state.balances.set(weth.address, (state.balances.get(weth.address) ?? 0n) + long);
        state.balances.set(usdc.address, state.balances.get(usdc.address)! + short);
      } else {
        expect(amount).toBe(1_000_000n);
        const minted = (10n ** 18n * 9_995n) / 20_000n;
        expect(minted).toBeGreaterThanOrEqual(isGlv ? p.minGlvTokens : p.minMarketTokens);
        state.balances.set(usdc.address, state.balances.get(usdc.address)! - amount);
        state.balances.set(token, minted);
      }
      return fundedOrderReceipt({
        account: state.address,
        market: gm,
        keys: [key as `0x${string}`],
        eventName: `${isGlv ? "Glv" : ""}${withdraw ? "Withdrawal" : "Deposit"}Created`,
      });
    },
  };
}
