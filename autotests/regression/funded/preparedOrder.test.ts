import assert from "node:assert/strict";
import { test } from "node:test";
import { maxUint256, zeroAddress } from "viem";

import type { PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import { address, marketAddress, usdc, weth, intent, preparedOrder, rebuildTypedData } from "./fundedQuote";

import { USD } from "./economy";
import { inspectPreparedOrder } from "./preparedOrder";
import { testSession } from "./testSession";

for (const buying of [false, true]) {
  test(`swap preparation pins the permitted market when ${buying ? "buying" : "selling"} ETH`, async () => {
    const session = testSession();
    Object.defineProperty(session, "address", { value: address });
    const amount = buying ? 2_500_000n : 1_250_000_000_000_000n;
    const minimum = buying ? 1_243_750_000_000_000n : 2_487_500n;
    const prepared = preparedOrder();
    const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
    order.orderType = 0;
    order.addresses.market = zeroAddress;
    order.addresses.initialCollateralToken = (buying ? usdc : weth).address;
    order.addresses.swapPath = [marketAddress];
    order.numbers.initialCollateralDeltaAmount = amount;
    order.numbers.sizeDeltaUsd = 0n;
    order.numbers.minOutputAmount = minimum;
    order.shouldUnwrapNativeToken = buying;
    rebuildTypedData(prepared);
    session.sdk.prepareOrder = async (request) => {
      assert.deepEqual(request.manualSwapPath, [marketAddress]);
      assert.equal(request.receiveToken, buying ? "ETH" : usdc.address);
      assert.equal(request.collateralToPay?.amount, amount);
      return prepared;
    };
    const state = { usdc, weth, market: { marketTokenAddress: marketAddress } } as never;
    const quote = await session.quoteSwap(state, amount, buying, buying);
    assert.equal(quote.intent.minOutputAmount, minimum);
    assert.equal(quote.intent.unwrapNative, buying);
    order.addresses.swapPath = [address];
    rebuildTypedData(prepared);
    await assert.rejects(session.quoteSwap(state, amount, buying, buying), /Prepared order differs/);
  });
}

function inspect(prepared: PrepareOrderResponse) {
  return inspectPreparedOrder({ prepared, intent, address, marketAddress, usdc, weth });
}

function closeOrder(withdrawal: bigint) {
  const prepared = preparedOrder();
  const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
  order.orderType = 4;
  order.decreasePositionSwapType = 1;
  order.numbers.initialCollateralDeltaAmount = withdrawal;
  order.numbers.acceptablePrice = 1_994n * 10n ** 12n;
  rebuildTypedData(prepared);
  return prepared;
}

function inspectClose(prepared: PrepareOrderResponse, isLong = true) {
  return inspectPreparedOrder({
    prepared,
    address,
    marketAddress,
    usdc,
    weth,
    intent: { kind: "close", isLong, sizeUsd: 2n * USD, collateralAmount: 2_499_162n },
  });
}

test("close orders reject unbounded execution prices", () => {
  for (const isLong of [true, false]) {
    const prepared = closeOrder(0n);
    const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
    order.isLong = isLong;
    order.numbers.acceptablePrice = isLong ? 0n : maxUint256;
    rebuildTypedData(prepared);
    assert.throws(() => inspectClose(prepared, isLong), /Unbounded acceptable price/);
  }
});

test("full close accepts zero or bounded collateral withdrawals and keeps size, token and path checks", () => {
  assert.equal(inspectClose(closeOrder(2_499_162n)).feeUsd, (411n * USD) / 1_000n);
  for (const amount of [0n, 1_249_581n]) assert.doesNotThrow(() => inspectClose(closeOrder(amount)));
  for (const change of [
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.numbers.initialCollateralDeltaAmount = 2_499_163n;
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.numbers.sizeDeltaUsd = USD;
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.addresses.initialCollateralToken = weth.address;
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.addresses.swapPath = [marketAddress];
    },
  ]) {
    const prepared = closeOrder(2_499_162n);
    change(prepared);
    rebuildTypedData(prepared);
    assert.throws(() => inspectClose(prepared), /Prepared order differs/);
  }
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

test("rejects a tampered fee, collateral, receiver, chain, router or slippage", () => {
  assert.doesNotThrow(() => inspect(preparedOrder()));
  for (const change of [
    (p: PrepareOrderResponse) => {
      p.payload.relayParams.fee.feeAmount = 900_000n;
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.numbers.initialCollateralDeltaAmount = 3_000_000n;
      rebuildTypedData(p);
    },
    (p: PrepareOrderResponse) => {
      p.payload.batchParams.createOrderParams[0].orderPayload.addresses.receiver = marketAddress;
      rebuildTypedData(p);
    },
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
    assert.throws(() => inspect(prepared), /Prepared order differs/);
  }
});
