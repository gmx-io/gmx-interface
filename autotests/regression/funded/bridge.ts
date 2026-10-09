import assert from "node:assert/strict";
import { encodeFunctionData, erc20Abi, getAddress, hashTypedData, parseAbi, type Hex } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBridgeOutTypedData } from "../../../sdk/src/utils/express/utils/bridgeOutUtils";
import type { RelayParamsPayload } from "../../../sdk/src/utils/express/types";
import type { CrossChainWithdrawPrepareResponse } from "../../../sdk/src/utils/gmxAccountApi/api";
import type { BridgeOutParams } from "../../../sdk/src/utils/multichain/api";
import { getMultichainTransferSendParams } from "../../../sdk/src/utils/multichain/sendParams";
import { accountBalance, withdrawAccount } from "./account";
import { checkFeeBudget, USD } from "./economy";
import { chargedFees } from "./journal";
import type { FundedAction } from "./journal";
import type { FundedSession } from "./session";
import { eventually } from "./trading";

const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const poolBase = "0x27a16dc786820B16E5c9028b75B99F6f604b5d26";
const poolArbitrum = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3";
const poolAbi = parseAbi([
  "function quoteSend((uint32 dstEid,bytes32 to,uint256 amountLD,uint256 minAmountLD,bytes extraOptions,bytes composeMsg,bytes oftCmd),bool) view returns ((uint256 nativeFee,uint256 lzTokenFee))",
  "function sendToken((uint32 dstEid,bytes32 to,uint256 amountLD,uint256 minAmountLD,bytes extraOptions,bytes composeMsg,bytes oftCmd),(uint256 nativeFee,uint256 lzTokenFee),address) payable returns ((bytes32,uint64,(uint256,uint256)),(uint256,uint256),(uint72,bytes))",
]);

export function baseStableBalance(session: FundedSession) {
  return session.sourceRpc.readContract({
    address: usdcBase,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [session.address],
  });
}

export async function depositBridge(session: FundedSession) {
  const state = await session.snapshot();
  const inventory = (session.active.inventory ??= {});
  if (!inventory.bridgeAmount) {
    const [source, account] = await Promise.all([
      baseStableBalance(session),
      accountBalance(session, state.usdc.address),
    ]);
    if (source < 3_000_000n) throw new Error("BLOCKED: bridge requires 3 USDC and native ETH on Base on this wallet");
    assert.equal(account, 0n, "Bridge requires an empty GMX Account");
    await session.gate(USD / 100n, false, 8453);
    inventory.bridgeAmount = "3000000";
    inventory.bridgeSourceBaseline = source.toString();
    inventory.accountBaseline = "0";
    inventory.accountAmount = "3000000";
    await session.save();
  }
  const amount = BigInt(inventory.bridgeAmount);
  const quote = await session.sdk.prepareCrossChainDeposit({
    srcChainId: 8453,
    account: session.address,
    tokenSymbol: "USDC",
    amount,
  });
  assert.ok(quote.composeGas > 0n && quote.composeGas <= 3_000_000n, "Unbounded bridge compose gas");
  // Construct the recipient, payload and minimum locally; the API transaction is never signed.
  const send = {
    ...getMultichainTransferSendParams({
      srcChainId: 8453,
      dstChainId: 42161,
      account: session.address,
      amountLD: amount,
      composeGas: quote.composeGas,
      isToGmx: true,
    }),
    minAmountLD: (amount * 9_950n) / 10_000n,
  };
  const fee = await session.sourceRpc.readContract({
    abi: poolAbi,
    address: poolBase,
    functionName: "quoteSend",
    args: [send as never, false],
  });
  assert.equal(fee.lzTokenFee, 0n);
  const feeUsd = (fee.nativeFee * state.weth.prices.maxPrice) / 10n ** 18n + USD / 50n;
  checkFeeBudget(chargedFees(session.active), feeUsd + USD / 20n, false, session.feePolicy);
  const currentAllowance = await session.sourceRpc.readContract({
    address: usdcBase,
    abi: erc20Abi,
    functionName: "allowance",
    args: [session.address, poolBase],
  });
  if (currentAllowance < amount) {
    await session.nativeTransaction(
      {
        to: usdcBase,
        value: 0n,
        data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [poolBase, amount] }),
      },
      "bridge-approve",
      false,
      0n,
      8453
    );
  }
  await session.nativeTransaction(
    {
      to: poolBase,
      value: fee.nativeFee,
      data: encodeFunctionData({
        abi: poolAbi,
        functionName: "sendToken",
        args: [send as never, fee, session.address],
      }),
    },
    "bridge-deposit",
    false,
    feeUsd,
    8453
  );
  const delivered = await eventually(
    () => accountBalance(session, state.usdc.address),
    (balance) => balance >= send.minAmountLD,
    600_000
  );
  assert.ok(delivered <= amount, "Unexpected bridge credit");
  assert.equal(await baseStableBalance(session), BigInt(inventory.bridgeSourceBaseline) - amount);
  inventory.bridgeDelivered = delivered.toString();
  await session.save();
  return delivered;
}

export function inspectBridgeWithdrawal(
  prepared: CrossChainWithdrawPrepareResponse,
  params: BridgeOutParams,
  state: Awaited<ReturnType<FundedSession["snapshot"]>>
) {
  const relay = prepared.payload.relayParams as RelayParamsPayload;
  const td = getBridgeOutTypedData({ chainId: 42161, srcChainId: 8453, params, relayParams: relay });
  assert.equal(
    hashTypedData(td as never),
    hashTypedData(prepared.payload.typedData as never),
    "Bridge payload differs from expected withdrawal"
  );
  assert.equal(
    getAddress(prepared.payload.relayRouterAddress),
    getAddress(getContract(42161, "MultichainTransferRouter"))
  );
  assert.equal(Number(relay.desChainId), 42161);
  assert.ok(BigInt(relay.deadline) > BigInt(Math.floor(Date.now() / 1000)));
  assert.deepEqual(relay.tokenPermits, []);
  for (const field of [
    "sendTokens",
    "sendAmounts",
    "externalCallTargets",
    "externalCallDataList",
    "refundTokens",
    "refundReceivers",
  ])
    assert.deepEqual(relay.externalCalls[field], [], "Bridge external calls are forbidden");
  const gp = prepared.payload.gasPaymentParams;
  assert.equal(getAddress(relay.fee.feeToken), getAddress(state.usdc.address));
  assert.equal(getAddress(gp.gasPaymentTokenAddress), getAddress(state.usdc.address));
  assert.equal(BigInt(relay.fee.feeAmount), gp.gasPaymentTokenAmount);
  assert.ok(gp.gasPaymentTokenAmount > 0n && gp.gasPaymentTokenAmount <= 1_000_000n);
  assert.ok(
    relay.fee.feeSwapPath.length <= 1 &&
      relay.fee.feeSwapPath.every((p) => getAddress(p) === getAddress(state.market.marketTokenAddress))
  );
  const relayerToken = [state.usdc, state.weth].find(
    (t) => getAddress(t.address) === getAddress(gp.relayerFeeTokenAddress)
  );
  assert.ok(relayerToken && gp.relayerFeeAmount > 0n);
  const feeUsd = (gp.gasPaymentTokenAmount * state.usdc.prices.maxPrice) / 10n ** 6n;
  assert.ok(
    (gp.relayerFeeAmount * relayerToken.prices.maxPrice) / 10n ** BigInt(relayerToken.decimals) <= feeUsd,
    "Relayer fee exceeds bound gas payment"
  );
  return feeUsd + USD / 50n;
}

export async function reconcileBridge(session: FundedSession, action: FundedAction) {
  const status = await eventually(
    () => session.sdk.getCrossChainWithdrawStatus(action.requestId!),
    (s) => ["executed", "cancelled", "relay_failed", "relay_reverted"].includes(s.status),
    180_000
  );
  if (status.status === "executed") {
    assert.ok(status.txHash);
    const receipt = await session.rpc.waitForTransactionReceipt({ hash: status.txHash as Hex });
    assert.equal(receipt.status, "success");
    action.txHash = status.txHash as FundedAction["txHash"];
  }
  action.state = status.status === "executed" ? "settled" : "failed";
  action.finishedAt = new Date().toISOString();
  await session.save();
}

export async function withdrawBridge(session: FundedSession) {
  const inventory = session.active.inventory;
  if (!inventory?.bridgeAmount) return;
  const state = await session.snapshot();
  const sourceBaseline = BigInt(inventory.bridgeSourceBaseline);
  const originalAmount = BigInt(inventory.bridgeAmount);
  if (!inventory.bridgeMinimumReturn) {
    const balance = await eventually(
      () => accountBalance(session, state.usdc.address),
      (value) => value >= (originalAmount * 9_950n) / 10_000n,
      600_000
    );
    let amount = balance - 1_000_000n;
    for (let attempt = 0; attempt < 3; attempt++) {
      const params = session.sdk.buildCrossChainWithdrawBridgeOutParams({
        tokenAddress: state.usdc.address,
        amount,
        dstChainId: 8453,
        stargateAddress: poolArbitrum,
        slippageBps: 50,
      });
      const quote = await session.sdk.prepareCrossChainWithdraw({
        srcChainId: 8453,
        account: session.address,
        bridgeOutParams: params,
        gasPaymentToken: state.usdc.address,
      });
      inspectBridgeWithdrawal(quote, params, state);
      const available = balance - quote.payload.gasPaymentParams.gasPaymentTokenAmount - 10_000n;
      if (available >= amount && available - amount <= 10_000n) {
        inventory.bridgeWithdrawalAmount = amount.toString();
        inventory.bridgeMinimumReturn = params.minAmountOut.toString();
        await session.save();
        break;
      }
      amount = available;
    }
    assert.ok(inventory.bridgeMinimumReturn, "Bridge return fee did not stabilize");
  }
  const minimum = BigInt(inventory.bridgeMinimumReturn);
  if ((await baseStableBalance(session)) < sourceBaseline - originalAmount + minimum) {
    const params = session.sdk.buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: state.usdc.address,
      amount: BigInt(inventory.bridgeWithdrawalAmount),
      dstChainId: 8453,
      stargateAddress: poolArbitrum,
      slippageBps: 50,
    });
    const previous = session.active.actions.find((a) => a.purpose === "bridge-withdraw");
    if (!previous) await session.bridgeWithdrawal(params);
    else {
      await session.reconcile(true);
      assert.equal(previous.state, "settled", "Bridge return failed; do not blindly resubmit");
    }
    await eventually(
      () => baseStableBalance(session),
      (value) => value >= sourceBaseline - originalAmount + minimum,
      600_000
    );
  }
  await withdrawAccount(session);
  inventory.bridgeReturned = "true";
  await session.save();
}
