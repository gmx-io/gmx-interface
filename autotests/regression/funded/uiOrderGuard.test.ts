import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFunctionData, maxUint256, type Hex } from "viem";

import { encodeOrderDataListMetadata } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { address, marketAddress, usdc, weth, intent, preparedOrder } from "./fundedQuote";
import { inspectUiOrder } from "./uiOrderGuard";
import type { OrderIntent } from "./preparedOrder";

const context = { address, marketAddress, usdc, weth, ownedOrderKeys: [] as string[] };
const vault = getContract(42161, "OrderVault");
function batch(calls: Hex[], value = 0n) {
  return {
    to: getContract(42161, "ExchangeRouter"),
    value,
    data: encodeFunctionData({ abi: ExchangeRouter, functionName: "multicall", args: [calls as `0x${string}`[]] }),
  };
}
function fixture() {
  const order = preparedOrder().payload.batchParams.createOrderParams[0].orderPayload;
  const build = (extra: Hex[] = []) =>
    batch(
      [
        encodeFunctionData({ abi: ExchangeRouter, functionName: "sendWnt", args: [vault, order.numbers.executionFee] }),
        encodeFunctionData({
          abi: ExchangeRouter,
          functionName: "sendTokens",
          args: [usdc.address, vault, intent.collateralAmount],
        }),
        encodeFunctionData({ abi: ExchangeRouter, functionName: "createOrder", args: [order] }),
        ...extra,
      ],
      order.numbers.executionFee
    );
  return { order, build };
}

test("UI order guard accepts the permitted Classic order and reserves keeper and protocol fees", () => {
  const { build } = fixture();
  const result = inspectUiOrder(build(), intent, context);
  assert.equal(result.createdCount, 1);
  assert.equal(result.keeperFee, 100_000_000_000_000n);
  assert.ok(result.extraFeeUsd > (result.keeperFee * weth.prices.maxPrice) / 10n ** 18n);
});

for (const field of [
  "receiver",
  "cancellationReceiver",
  "callbackContract",
  "uiFeeReceiver",
  "market",
  "initialCollateralToken",
] as const) {
  test(`UI order guard rejects a changed ${field}`, () => {
    const { order, build } = fixture();
    order.addresses[field] = weth.address;
    assert.throws(() => inspectUiOrder(build(), intent, context));
  });
}

for (const field of [
  "sizeDeltaUsd",
  "initialCollateralDeltaAmount",
  "triggerPrice",
  "callbackGasLimit",
  "validFromTime",
  "minOutputAmount",
] as const) {
  test(`UI order guard rejects a changed ${field}`, () => {
    const { order, build } = fixture();
    order.numbers[field] += 1n;
    assert.throws(() => inspectUiOrder(build(), intent, context));
  });
}

test("UI order guard rejects excessive slippage, wrong direction, extra transfers and excess msg.value", () => {
  const { order, build } = fixture();
  order.numbers.acceptablePrice = maxUint256;
  assert.throws(() => inspectUiOrder(build(), intent, context));
  order.numbers.acceptablePrice = 2_006n * 10n ** 12n;
  order.isLong = false;
  assert.throws(() => inspectUiOrder(build(), intent, context));
  order.isLong = true;
  const extra = encodeFunctionData({
    abi: ExchangeRouter,
    functionName: "sendTokens",
    args: [usdc.address, vault, 1n],
  });
  assert.throws(() => inspectUiOrder(build([extra]), intent, context));
  const tx = build();
  tx.value += 1n;
  assert.throws(() => inspectUiOrder(tx, intent, context));
});

test("UI order guard cancels only the exact recorded owned order", () => {
  const key = `0x${"12".repeat(32)}` as `0x${string}`;
  const tx = batch([encodeFunctionData({ abi: ExchangeRouter, functionName: "cancelOrder", args: [key] })]);
  const cancel: OrderIntent = { kind: "cancel", keys: [key] };
  assert.throws(() => inspectUiOrder(tx, cancel, context), /unowned/);
  assert.equal(inspectUiOrder(tx, cancel, { ...context, ownedOrderKeys: [key] }).createdCount, 0);
  assert.throws(() => inspectUiOrder(tx, { kind: "cancel", keys: [] }, { ...context, ownedOrderKeys: [key] }));
});

test("UI order update binds size, trigger, acceptable price, and order ownership", () => {
  const key = `0x${"12".repeat(32)}` as `0x${string}`;
  const edit: OrderIntent = {
    kind: "edit",
    key,
    sizeUsd: intent.sizeUsd,
    triggerPrice: 1000n * 10n ** 12n,
    acceptablePrice: 1003n * 10n ** 12n,
    autoCancel: true,
    minOutputAmount: 0n,
    validFromTime: 0n,
  };
  const tx = batch([
    encodeFunctionData({
      abi: ExchangeRouter,
      functionName: "updateOrder",
      args: [key, edit.sizeUsd, edit.acceptablePrice, edit.triggerPrice, 0n, 0n, true],
    }),
  ]);
  const owned = { ...context, ownedOrderKeys: [key] };
  assert.doesNotThrow(() => inspectUiOrder(tx, edit, owned));
  assert.throws(() => inspectUiOrder(tx, { ...edit, triggerPrice: edit.triggerPrice + 1n }, owned));
  assert.throws(() => inspectUiOrder(tx, edit, context), /unowned/);
});

test("UI market sizing permits only an explicit small rounding range, still bounded by the economy cap", () => {
  const { order, build } = fixture();
  order.addresses.uiFeeReceiver = "0xff00000000000000000000000000000000000001";
  const tolerance = intent.sizeUsd / 1_000n;
  order.numbers.sizeDeltaUsd = intent.sizeUsd - tolerance;
  assert.doesNotThrow(() => inspectUiOrder(build(), { ...intent, sizeToleranceUsd: tolerance }, context));
  assert.throws(() => inspectUiOrder(build(), intent, context));
  order.numbers.sizeDeltaUsd--;
  assert.throws(() => inspectUiOrder(build(), { ...intent, sizeToleranceUsd: tolerance }, context));
  order.numbers.sizeDeltaUsd = intent.sizeUsd;
  assert.throws(() => inspectUiOrder(build(), { ...intent, sizeToleranceUsd: tolerance + 1n }, context));
});

test("UI close permits long PnL conversion into USDC, with no additional token payment", () => {
  const { order } = fixture();
  order.orderType = 4;
  order.decreasePositionSwapType = 1;
  order.numbers.acceptablePrice = 1_994n * 10n ** 12n;
  const close = { ...intent, kind: "close" as const };
  const build = () =>
    batch(
      [
        encodeFunctionData({ abi: ExchangeRouter, functionName: "sendWnt", args: [vault, order.numbers.executionFee] }),
        encodeFunctionData({ abi: ExchangeRouter, functionName: "createOrder", args: [order] }),
      ],
      order.numbers.executionFee
    );
  assert.doesNotThrow(() => inspectUiOrder(build(), close, context));
  order.decreasePositionSwapType = 2;
  assert.throws(() => inspectUiOrder(build(), close, context), /conversion/);
  order.decreasePositionSwapType = 1;
  order.numbers.acceptablePrice = 1_970n * 10n ** 12n;
  assert.throws(() => inspectUiOrder(build(), close, context), /slippage/);
});

test("UI margin withdrawal binds the amount and minimum USD output", () => {
  const { order } = fixture();
  order.orderType = 4;
  order.numbers.sizeDeltaUsd = 0n;
  order.numbers.initialCollateralDeltaAmount = 250_000n;
  order.numbers.acceptablePrice = 1_994n * 10n ** 12n;
  const minimumOutputUsd = 2475n * 10n ** 26n;
  order.numbers.minOutputAmount = minimumOutputUsd;
  const withdrawal = {
    kind: "close" as const,
    isLong: true,
    sizeUsd: 0n,
    collateralAmount: 250_000n,
    minimumOutputUsd,
  };
  const build = () =>
    batch(
      [
        encodeFunctionData({ abi: ExchangeRouter, functionName: "sendWnt", args: [vault, order.numbers.executionFee] }),
        encodeFunctionData({ abi: ExchangeRouter, functionName: "createOrder", args: [order] }),
      ],
      order.numbers.executionFee
    );
  assert.doesNotThrow(() => inspectUiOrder(build(), withdrawal, context));
  order.numbers.minOutputAmount--;
  assert.throws(() => inspectUiOrder(build(), withdrawal, context));
  order.numbers.minOutputAmount = minimumOutputUsd;
  order.numbers.initialCollateralDeltaAmount--;
  assert.throws(() => inspectUiOrder(build(), withdrawal, context));
});

test("UI order metadata rejects hidden JIT, Express and unexpected TWAP settings", () => {
  const { order, build } = fixture();
  order.dataList = [encodeOrderDataListMetadata({})];
  inspectUiOrder(build(), intent, context);
  for (const metadata of [
    encodeOrderDataListMetadata({ isJit: true }),
    encodeOrderDataListMetadata({ isExpress: true }),
    encodeOrderDataListMetadata({ source: "01" }),
    encodeOrderDataListMetadata({ numberOfParts: 2, twapId: "abcd" }),
    `0x${"00".repeat(32)}`,
  ]) {
    order.dataList = [metadata];
    assert.throws(() => inspectUiOrder(build(), intent, context));
  }
  order.dataList = [encodeOrderDataListMetadata({}), encodeOrderDataListMetadata({})];
  assert.throws(() => inspectUiOrder(build(), intent, context));
});
