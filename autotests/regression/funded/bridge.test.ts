import assert from "node:assert/strict";
import { test } from "node:test";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBridgeOutTypedData } from "../../../sdk/src/utils/express/utils/bridgeOutUtils";
import type { RelayParamsPayload } from "../../../sdk/src/utils/express/types";
import type { CrossChainWithdrawPrepareResponse } from "../../../sdk/src/utils/gmxAccountApi/api";
import { buildCrossChainWithdrawBridgeOutParams } from "../../../sdk/src/utils/multichain/api";
import { inspectBridgeWithdrawal } from "./bridge";
import { USD } from "./economy";
import type { FundedSession } from "./session";

const state = {
  usdc: {
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    decimals: 6,
    prices: { minPrice: USD, maxPrice: USD },
  },
  weth: {
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    decimals: 18,
    prices: { minPrice: 2_000n * USD, maxPrice: 2_000n * USD },
  },
  market: { marketTokenAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336" },
} as Awaited<ReturnType<FundedSession["snapshot"]>>;
const params = buildCrossChainWithdrawBridgeOutParams({
  tokenAddress: state.usdc.address,
  amount: 2_000_000n,
  dstChainId: 8453,
  stargateAddress: "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3",
  slippageBps: 50,
});

function fixture() {
  const relay = {
    oracleParams: { tokens: [], providers: [], data: [] },
    tokenPermits: [],
    externalCalls: {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    fee: { feeToken: state.usdc.address, feeAmount: 500_000n, feeSwapPath: [state.market.marketTokenAddress] },
    deadline: BigInt(Math.floor(Date.now() / 1000) + 120),
    userNonce: 1n,
    desChainId: 42161n,
  };
  const prepared: CrossChainWithdrawPrepareResponse = {
    payloadType: "typed-data",
    requestId: "withdraw",
    expiresAt: Number(relay.deadline),
    payload: {
      relayParams: relay,
      relayRouterAddress: getContract(42161, "MultichainTransferRouter"),
      typedData: getBridgeOutTypedData({ chainId: 42161, srcChainId: 8453, params, relayParams: relay }),
      gasPaymentParams: {
        gasPaymentTokenAddress: state.usdc.address,
        gasPaymentTokenAmount: 500_000n,
        relayerFeeTokenAddress: state.weth.address,
        relayerFeeAmount: 200_000_000_000_000n,
      },
    },
  };
  return prepared;
}

function rebuild(prepared: CrossChainWithdrawPrepareResponse) {
  prepared.payload.typedData = getBridgeOutTypedData({
    chainId: 42161,
    srcChainId: 8453,
    params,
    relayParams: prepared.payload.relayParams as RelayParamsPayload,
  });
}

test("bridge withdrawal binds destination, minimum, token and total gas payment", () => {
  const prepared = fixture();
  assert.equal(inspectBridgeWithdrawal(prepared, params, state), (52n * USD) / 100n);
  assert.throws(() => inspectBridgeWithdrawal(prepared, { ...params, amount: params.amount + 1n }, state));
  assert.throws(() => inspectBridgeWithdrawal(prepared, { ...params, minAmountOut: 0n }, state));
  assert.throws(() => inspectBridgeWithdrawal(prepared, { ...params, data: "0x" }, state));
});

test("bridge rejects fee tampering even when the hash is recomputed", () => {
  const prepared = fixture();
  (prepared.payload.relayParams as RelayParamsPayload).fee.feeAmount = 900_000n;
  assert.throws(() => inspectBridgeWithdrawal(prepared, params, state));
  rebuild(prepared);
  assert.throws(() => inspectBridgeWithdrawal(prepared, params, state));
});

test("bridge rejects expired or wrong-chain relay data and unrelated swap markets", () => {
  for (const change of [
    (relay: RelayParamsPayload) => {
      relay.deadline = 1n;
    },
    (relay: RelayParamsPayload) => {
      relay.desChainId = 1n;
    },
    (relay: RelayParamsPayload) => {
      relay.fee.feeSwapPath = [state.weth.address];
    },
  ]) {
    const prepared = fixture();
    change(prepared.payload.relayParams as RelayParamsPayload);
    rebuild(prepared);
    assert.throws(() => inspectBridgeWithdrawal(prepared, params, state));
  }
});

test("bridge refuses an unbound relayer fee larger than the approved gas payment", () => {
  const prepared = fixture();
  prepared.payload.gasPaymentParams.relayerFeeAmount = 10n ** 18n;
  assert.throws(() => inspectBridgeWithdrawal(prepared, params, state));
});
