import assert from "node:assert/strict";
import { test } from "node:test";
import { maxUint256, zeroAddress, zeroHash } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import type { PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import { getEmptySubaccountApproval } from "../../../sdk/src/utils/subaccount/getEmptySubaccountApproval";
import { hashSubaccountApproval } from "../../../sdk/src/utils/subaccount/hashSubaccountApproval";
import { address, marketAddress, usdc, weth, intent, preparedOrder, rebuildTypedData } from "../fixtures/fundedQuote";

import { checkFeeBudget, USD } from "./economy";
import { bufferSubaccountRelayFee, inspectPreparedOrder, type OrderIntent } from "./preparedOrder";
import { FundedSession } from "./session";

for (const signedApproval of [true, false]) {
  for (const cancel of [false, true]) {
    test(`1CT ${cancel ? "cancel" : "create"} binds the relay router, wallet and ${signedApproval ? "initial" : "on-chain"} approval`, () => {
      const approval = getEmptySubaccountApproval(42161, marketAddress);
      if (signedApproval) {
        Object.assign(approval, {
          shouldAdd: true,
          expiresAt: BigInt(Math.floor(Date.now() / 1000) + 600),
          maxAllowedCount: 2n,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
          signature: `0x${"11".repeat(65)}`,
        });
      }
      const prepared = preparedOrder();
      const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
      order.orderType = 3;
      order.numbers.triggerPrice = 1_000n * 10n ** 12n;
      const orderKey = `0x${"12".repeat(32)}`;
      if (cancel) {
        prepared.payload.batchParams.createOrderParams = [];
        prepared.payload.batchParams.cancelOrderParams = [{ orderKey }];
      }
      const oneClickIntent: OrderIntent = cancel
        ? { kind: "cancel", keys: [orderKey] }
        : { ...intent, orderType: 3, triggerPrice: order.numbers.triggerPrice };
      const rebuild = (router = getContract(42161, "SubaccountGelatoRelayRouter")) => {
        prepared.payload.typedData = getBatchTypedData({
          chainId: 42161,
          account: address,
          relayRouterAddress: router,
          batchParams: prepared.payload.batchParams,
          relayParams: prepared.payload.relayParams,
          subaccountApprovalHash: hashSubaccountApproval(approval),
        });
      };
      const check = () =>
        inspectPreparedOrder({
          prepared,
          intent: oneClickIntent,
          address,
          marketAddress,
          usdc,
          weth,
          subaccountApproval: approval,
        });
      rebuild();
      assert.doesNotThrow(check);
      const params = {
        prepared,
        intent: oneClickIntent,
        address,
        marketAddress,
        usdc,
        weth,
        subaccountApproval: approval,
      };
      const original = structuredClone(prepared);
      const buffered = bufferSubaccountRelayFee(params);
      assert.equal(BigInt(buffered.payload.relayParams.fee.feeAmount), 440_000n);
      assert.deepEqual(buffered.payload.batchParams, original.payload.batchParams);
      assert.deepEqual(prepared, original, "Buffering must not mutate the API quote");
      const bufferedQuote = inspectPreparedOrder({ ...params, prepared: buffered });
      assert.doesNotThrow(() => checkFeeBudget(0n, bufferedQuote.feeUsd, cancel));
      for (const wrongRouter of ["SubaccountRouter", "GelatoRelayRouter", "MultichainSubaccountRouter"] as const) {
        rebuild(getContract(42161, wrongRouter));
        assert.throws(check, /Unexpected relay router or signing chain/);
        assert.throws(() => bufferSubaccountRelayFee(params), /Unexpected relay router or signing chain/);
      }
      rebuild();
      prepared.payload.typedData!.message.account = marketAddress;
      assert.throws(check, /Typed data does not match the permitted batch and approval/);
      rebuild();
      prepared.payload.typedData!.message.subaccountApproval = zeroHash;
      assert.throws(check, /Typed data does not match the permitted batch and approval/);
      rebuild();
      approval.maxAllowedCount += 1n;
      assert.throws(check, /Typed data does not match the permitted batch and approval/);
      approval.maxAllowedCount -= 1n;
      if (cancel) prepared.payload.batchParams.cancelOrderParams[0].orderKey = zeroHash;
      else order.numbers.initialCollateralDeltaAmount += 1n;
      rebuild();
      assert.throws(check, /Prepared order differs/);
    });
  }
}

test("1CT relay margin is rounded up and cannot bypass the action budget", () => {
  const prepared = preparedOrder();
  const approval = getEmptySubaccountApproval(42161, marketAddress);
  const params = { prepared, intent, address, marketAddress, usdc, weth, subaccountApproval: approval };
  for (const feeAmount of [400_001n, 920_000n]) {
    prepared.payload.relayParams.fee.feeAmount = feeAmount;
    prepared.payload.typedData = getBatchTypedData({
      chainId: 42161,
      account: address,
      relayRouterAddress: getContract(42161, "SubaccountGelatoRelayRouter"),
      batchParams: prepared.payload.batchParams,
      relayParams: prepared.payload.relayParams,
      subaccountApprovalHash: hashSubaccountApproval(approval),
    });
    const buffered = bufferSubaccountRelayFee(params);
    const quote = inspectPreparedOrder({ ...params, prepared: buffered });
    if (feeAmount === 400_001n) assert.equal(buffered.payload.relayParams.fee.feeAmount, 440_002n);
    else assert.throws(() => checkFeeBudget(0n, quote.feeUsd, false), /Action fee exceeds/);
  }
  const ordinary = preparedOrder();
  assert.equal(bufferSubaccountRelayFee({ prepared: ordinary, intent, address, marketAddress, usdc, weth }), ordinary);
});

for (const buying of [false, true]) {
  test(`swap preparation pins the permitted market when ${buying ? "buying" : "selling"} ETH`, async () => {
    const previous = process.env.REGRESSION_PRIVATE_KEY;
    process.env.REGRESSION_PRIVATE_KEY = `0x${"1".repeat(64)}`;
    let session: FundedSession;
    try {
      session = new FundedSession();
    } finally {
      if (previous === undefined) delete process.env.REGRESSION_PRIVATE_KEY;
      else process.env.REGRESSION_PRIVATE_KEY = previous;
    }
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

test("resting limit orders bind the requested trigger while retaining the oracle-based acceptable-price cap", () => {
  const prepared = preparedOrder();
  const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
  order.orderType = 3;
  order.numbers.triggerPrice = 1_000n * 10n ** 12n;
  rebuildTypedData(prepared);
  const check = () =>
    inspectPreparedOrder({
      prepared,
      address,
      marketAddress,
      usdc,
      weth,
      intent: { ...intent, orderType: 3, triggerPrice: 1_000n * 10n ** 12n },
    });
  assert.doesNotThrow(check);
  order.numbers.triggerPrice += 1n;
  rebuildTypedData(prepared);
  assert.throws(check);
});

test("editing cannot change the selected key, size, execution-fee top-up or other order fields", () => {
  const key = `0x${"1".repeat(64)}`;
  const payload = {
    orderKey: key,
    sizeDeltaUsd: 2n * USD,
    triggerPrice: 1_100n * 10n ** 12n,
    acceptablePrice: 2_006n * 10n ** 12n,
    minOutputAmount: 0n,
    validFromTime: 0n,
    autoCancel: true,
    executionFeeTopUp: 0n,
  };
  const prepared = preparedOrder();
  prepared.payload.batchParams.createOrderParams = [];
  prepared.payload.batchParams.updateOrderParams = [{ updatePayload: payload }];
  const editIntent = {
    kind: "edit" as const,
    key,
    sizeUsd: payload.sizeDeltaUsd,
    triggerPrice: payload.triggerPrice,
    acceptablePrice: payload.acceptablePrice,
    autoCancel: true,
    minOutputAmount: 0n,
    validFromTime: 0n,
  };
  rebuildTypedData(prepared);
  const check = () => inspectPreparedOrder({ prepared, address, marketAddress, usdc, weth, intent: editIntent });
  assert.doesNotThrow(check);
  for (const mutation of [
    { executionFeeTopUp: 1n },
    { sizeDeltaUsd: 3n * USD },
    { orderKey: zeroHash },
    { validFromTime: 10n },
    { autoCancel: false },
  ]) {
    prepared.payload.batchParams.updateOrderParams[0].updatePayload = { ...payload, ...mutation };
    rebuildTypedData(prepared);
    assert.throws(check);
  }
});

test("TWAP rejects the API's unlimited acceptable price; bounded two-part classic orders fit the same intent", () => {
  const prepared = preparedOrder();
  const first = prepared.payload.batchParams.createOrderParams[0].orderPayload;
  const start = Math.floor(Date.now() / 1000);
  first.orderType = 3;
  first.numbers.triggerPrice = maxUint256;
  first.numbers.validFromTime = BigInt(start);
  first.numbers.acceptablePrice = maxUint256;
  const second = structuredClone(first);
  second.numbers.validFromTime += 600n;
  prepared.payload.batchParams.createOrderParams.push({ orderPayload: second });
  const twapIntent = {
    ...intent,
    sizeUsd: 4n * USD,
    collateralAmount: 5_000_000n,
    orderType: 3 as const,
    twap: { start, end: start + 630 },
  };
  const check = () => inspectPreparedOrder({ prepared, address, marketAddress, usdc, weth, intent: twapIntent });
  rebuildTypedData(prepared);
  assert.throws(check);
  first.numbers.acceptablePrice = second.numbers.acceptablePrice = 2_006n * 10n ** 12n;
  rebuildTypedData(prepared);
  assert.doesNotThrow(check);
  for (const delta of [-1n, 1n]) {
    second.numbers.initialCollateralDeltaAmount += delta;
    rebuildTypedData(prepared);
    assert.throws(check, /TWAP collateral total mismatch/);
    second.numbers.initialCollateralDeltaAmount -= delta;
    second.numbers.sizeDeltaUsd += delta;
    rebuildTypedData(prepared);
    assert.throws(check, /TWAP size total mismatch/);
    second.numbers.sizeDeltaUsd -= delta;
  }
  second.numbers.validFromTime += 100n;
  rebuildTypedData(prepared);
  assert.throws(check);
});

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

function inspectClose(prepared: PrepareOrderResponse) {
  return inspectPreparedOrder({
    prepared,
    address,
    marketAddress,
    usdc,
    weth,
    intent: { kind: "close", isLong: true, sizeUsd: 2n * USD, collateralAmount: 2_499_162n },
  });
}

for (const isLong of [true, false]) {
  test(`stop-loss ${isLong ? "long" : "short"} accepts SDK market-price semantics and retains all other guards`, () => {
    const prepared = closeOrder(2_499_162n);
    const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
    order.orderType = 6;
    order.isLong = isLong;
    order.numbers.triggerPrice = (isLong ? 1_000n : 3_000n) * 10n ** 12n;
    order.numbers.acceptablePrice = isLong ? 0n : maxUint256;
    const stopLossIntent = {
      kind: "close" as const,
      isLong,
      sizeUsd: 2n * USD,
      collateralAmount: 2_499_162n,
      orderType: 6 as const,
      triggerPrice: order.numbers.triggerPrice,
    };
    const check = () => inspectPreparedOrder({ prepared, address, marketAddress, usdc, weth, intent: stopLossIntent });
    rebuildTypedData(prepared);
    assert.doesNotThrow(check);
    const original = structuredClone(order);
    for (const mutate of [
      () => {
        order.numbers.triggerPrice += 1n;
      },
      () => {
        order.numbers.initialCollateralDeltaAmount += 1n;
      },
      () => {
        order.numbers.sizeDeltaUsd += 1n;
      },
      () => {
        order.addresses.receiver = marketAddress;
      },
      () => {
        order.addresses.market = address;
      },
      () => {
        order.addresses.initialCollateralToken = weth.address;
      },
      () => {
        order.isLong = !isLong;
      },
      () => {
        order.numbers.acceptablePrice = isLong ? maxUint256 : 0n;
      },
    ]) {
      Object.assign(order, structuredClone(original));
      mutate();
      rebuildTypedData(prepared);
      assert.throws(check);
    }
    Object.assign(order, original);
    prepared.payload.relayParams.fee.feeToken = weth.address;
    rebuildTypedData(prepared);
    assert.throws(check);
  });

  test(`bounded stop-loss ${isLong ? "long" : "short"} prices are checked against the trigger`, () => {
    const prepared = closeOrder(0n);
    const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
    order.orderType = 6;
    order.isLong = isLong;
    const triggerPrice = (isLong ? 1_000n : 3_000n) * 10n ** 12n;
    order.numbers.triggerPrice = triggerPrice;
    const stopLossIntent = {
      kind: "close" as const,
      isLong,
      sizeUsd: 2n * USD,
      collateralAmount: 2_499_162n,
      orderType: 6 as const,
      triggerPrice,
    };
    const check = () => inspectPreparedOrder({ prepared, address, marketAddress, usdc, weth, intent: stopLossIntent });
    order.numbers.acceptablePrice = (triggerPrice * (isLong ? 9_900n : 10_100n)) / 10_000n;
    rebuildTypedData(prepared);
    assert.doesNotThrow(check);
    order.numbers.acceptablePrice += isLong ? -1n : 1n;
    rebuildTypedData(prepared);
    assert.throws(check, /acceptable price/i);
  });

  test(`stop-loss ${isLong ? "long" : "short"} rejects invalid triggers and sizes even with matching API fields`, () => {
    for (const [sizeUsd, triggerPrice] of [
      [2n * USD, 0n],
      [2n * USD, 2_000n * 10n ** 12n],
      [2n * USD, (isLong ? 3_000n : 1_000n) * 10n ** 12n],
      [0n, (isLong ? 1_000n : 3_000n) * 10n ** 12n],
      [11n * USD, (isLong ? 1_000n : 3_000n) * 10n ** 12n],
    ]) {
      const prepared = closeOrder(0n);
      const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
      order.orderType = 6;
      order.isLong = isLong;
      Object.assign(order.numbers, { sizeDeltaUsd: sizeUsd, triggerPrice, acceptablePrice: isLong ? 0n : maxUint256 });
      rebuildTypedData(prepared);
      assert.throws(() =>
        inspectPreparedOrder({
          prepared,
          address,
          marketAddress,
          usdc,
          weth,
          intent: { kind: "close", isLong, sizeUsd, triggerPrice, orderType: 6, collateralAmount: 2_499_162n },
        })
      );
    }
  });

  for (const orderType of [2, 3, 4, 5, 8] as const) {
    test(`order type ${orderType} ${isLong ? "long" : "short"} still rejects unbounded execution prices`, () => {
      const prepared = closeOrder(0n);
      const order = prepared.payload.batchParams.createOrderParams[0].orderPayload;
      const increasing = orderType === 2 || orderType === 3 || orderType === 8;
      order.orderType = orderType;
      order.isLong = isLong;
      order.numbers.acceptablePrice = (increasing ? isLong : !isLong) ? maxUint256 : 0n;
      rebuildTypedData(prepared);
      assert.throws(() =>
        inspectPreparedOrder({
          prepared,
          address,
          marketAddress,
          usdc,
          weth,
          intent: {
            kind: increasing ? "increase" : "close",
            isLong,
            orderType,
            sizeUsd: 2n * USD,
            collateralAmount: 0n,
          } as Parameters<typeof inspectPreparedOrder>[0]["intent"],
        })
      );
    });
  }
}

test("accepts a full-close quote withdrawing the remaining position collateral", () => {
  const quote = inspectClose(closeOrder(2_499_162n));
  assert.equal(quote.feeUsd, (411n * USD) / 1_000n);
});

test("accepts a full close with zero or a bounded collateral withdrawal", () => {
  for (const amount of [0n, 1_249_581n]) assert.doesNotThrow(() => inspectClose(closeOrder(amount)));
});

test("rejects a full-close withdrawal larger than the position collateral", () => {
  assert.throws(() => inspectClose(closeOrder(2_499_163n)));
});

test("full-close collateral support preserves the exact size, token and settlement path checks", () => {
  for (const change of [
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
    assert.throws(() => inspectClose(prepared));
  }
});

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
