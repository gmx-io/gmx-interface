import assert from "node:assert/strict";
import { test } from "node:test";
import { zeroAddress, zeroHash } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import type { PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";

import { USD } from "./economy";
import { inspectPreparedOrder } from "./preparedOrder";

const address = "0x1111111111111111111111111111111111111111";
const marketAddress = "0x2222222222222222222222222222222222222222";
const usdc = {
  address: "0x3333333333333333333333333333333333333333",
  decimals: 6,
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;
const weth = {
  address: "0x4444444444444444444444444444444444444444",
  decimals: 18,
  prices: { minPrice: 2_000n * USD, maxPrice: 2_000n * USD },
} as TokenData;
const intent = { kind: "increase" as const, isLong: true, sizeUsd: 2n * USD, collateralAmount: 2_500_000n };

function preparedOrder(): PrepareOrderResponse {
  const batchParams = {
    createOrderParams: [
      {
        orderPayload: {
          addresses: {
            receiver: address,
            cancellationReceiver: address,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: marketAddress,
            initialCollateralToken: usdc.address,
            swapPath: [],
          },
          numbers: {
            sizeDeltaUsd: intent.sizeUsd,
            initialCollateralDeltaAmount: intent.collateralAmount,
            triggerPrice: 0n,
            acceptablePrice: 2_006n * 10n ** 12n,
            executionFee: 100_000_000_000_000n,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: 2,
          decreasePositionSwapType: 0,
          isLong: true,
          shouldUnwrapNativeToken: false,
          autoCancel: true,
          referralCode: zeroHash,
          dataList: [],
        },
      },
    ],
    updateOrderParams: [],
    cancelOrderParams: [],
  };
  const relayParams = {
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
    fee: { feeToken: usdc.address, feeAmount: 400_000n, feeSwapPath: [] },
    deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
    userNonce: 1n,
    desChainId: 42161n,
  };
  const typedData = getBatchTypedData({
    chainId: 42161,
    account: address,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
    batchParams: batchParams as unknown as Parameters<typeof getBatchTypedData>[0]["batchParams"],
    relayParams,
  });
  return {
    requestId: "test-request",
    mode: "express",
    payloadType: "typed-data",
    payload: { typedData, batchParams, relayParams },
    estimates: {
      positionPriceImpactDeltaUsd: 0n,
      swapPriceImpactDeltaUsd: 0n,
      executionFeeAmount: 100_000_000_000_000n,
      acceptablePrice: 0n,
      sizeDeltaUsd: intent.sizeUsd,
      positionFeeUsd: USD / 1_000n,
      borrowingFeeUsd: 0n,
      fundingFeeUsd: 0n,
    },
  };
}

function inspect(prepared: PrepareOrderResponse) {
  return inspectPreparedOrder({ prepared, intent, address, marketAddress, usdc, weth });
}

function rebuildTypedData(prepared: PrepareOrderResponse) {
  prepared.payload.typedData = getBatchTypedData({
    chainId: 42161,
    account: address,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
    batchParams: prepared.payload.batchParams,
    relayParams: prepared.payload.relayParams,
  });
}

test("counts total relay charge once, without treating execution-fee refunds as spendable", () => {
  const quote = inspect(preparedOrder());
  assert.equal(quote.feeUsd, (411n * USD) / 1_000n);
});

test("rejects a mutated relay fee that is not bound by the signed message", () => {
  const prepared = preparedOrder();
  prepared.payload.relayParams.fee.feeAmount = 900_000n;
  assert.throws(() => inspect(prepared));
});

test("rebalance reserves the value lost at its minimum permitted output, including swap costs", () => {
  const prepared = preparedOrder();
  const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
  order.orderType = 0;
  order.addresses.swapPath = [marketAddress];
  order.numbers.sizeDeltaUsd = 0n;
  order.numbers.minOutputAmount = 1_243_750_000_000_000n;
  order.shouldUnwrapNativeToken = true;
  prepared.estimates!.positionFeeUsd = 0n;
  rebuildTypedData(prepared);
  const quote = inspectPreparedOrder({
    prepared,
    address,
    marketAddress,
    usdc,
    weth,
    intent: {
      kind: "swap",
      tokenIn: usdc.address,
      amount: 2_500_000n,
      minOutputAmount: order.numbers.minOutputAmount,
      unwrapNative: true,
    },
  });
  assert.equal(quote.feeUsd, (4_225n * USD) / 10_000n);
});

test("rejects a signed collateral amount larger than the intended minimum", () => {
  const prepared = preparedOrder();
  prepared.payload.batchParams.createOrderParams[0].orderPayload.numbers.initialCollateralDeltaAmount = 3_000_000n;
  rebuildTypedData(prepared);
  assert.throws(() => inspect(prepared));
});

test("rejects an API payload directing proceeds to another receiver", () => {
  const prepared = preparedOrder();
  prepared.payload.batchParams.createOrderParams[0].orderPayload.addresses.receiver = marketAddress;
  rebuildTypedData(prepared);
  assert.throws(() => inspect(prepared));
});

test("rejects a different chain or router and unbounded slippage", () => {
  for (const change of [
    (p: PrepareOrderResponse) => {
      p.payload.typedData.domain.chainId = 1;
    },
    (p: PrepareOrderResponse) => {
      p.payload.typedData.domain.verifyingContract = marketAddress;
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.numbers.acceptablePrice = 10n ** 70n;
      rebuildTypedData(p);
    },
  ]) {
    const prepared = preparedOrder();
    change(prepared);
    assert.throws(() => inspect(prepared));
  }
});
