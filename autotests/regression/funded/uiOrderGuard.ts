import assert from "node:assert/strict";
import { decodeFunctionData, getAddress, maxUint256, zeroAddress, type Hex } from "viem";

import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { convertToUsd } from "../../../sdk/src/utils/tokens/utils";
import { decodeOrderDataListMetadata, UI_FEE_SOURCE_UI } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import { economy, USD } from "./economy";
import type { OrderIntent } from "./preparedOrder";

export type UiTransaction = { to: string; data: Hex; value: bigint };
export type UiOrderIntent = OrderIntent & {
  sizeToleranceUsd?: bigint;
  minimumOutputUsd?: bigint;
  fullPositionSizeUsd?: bigint;
  editDirection?: { isLong: boolean; orderType: number };
};
type GuardContext = {
  address: string;
  marketAddress: string;
  usdc: TokenData;
  weth: TokenData;
  ownedOrderKeys: string[];
  express?: boolean;
};

// This inspects calldata produced by the deployed UI. It never constructs or submits an order.
export function inspectUiOrder(tx: UiTransaction, intent: UiOrderIntent, context: GuardContext) {
  const { address, marketAddress, usdc, weth, ownedOrderKeys } = context;
  const same = (a: string, b: string) => getAddress(a) === getAddress(b);
  const unlimited = (price: bigint, buying: boolean) =>
    buying ? price === maxUint256 || price === maxUint256 / 10n ** BigInt(weth.decimals) : price === 0n;
  assert.ok(same(tx.to, getContract(42161, "ExchangeRouter")), "Unexpected UI transaction destination");
  const root = decodeFunctionData({ abi: ExchangeRouter, data: tx.data });
  assert.equal(root.functionName, "multicall", "Expected an ExchangeRouter batch");
  if (root.functionName !== "multicall") throw new Error("Expected multicall");
  assert.ok(root.args[0].length > 0 && root.args[0].length <= 8, "Unexpected batch size");
  const calls = root.args[0].map((data) => decodeFunctionData({ abi: ExchangeRouter, data }));
  let nativeSent = 0n;
  const tokenTransfers = new Map<string, bigint>();
  const operations = calls.filter((call) => {
    if (call.functionName === "sendWnt") {
      assert.ok(same(call.args[0], getContract(42161, "OrderVault")), "Unexpected native token receiver");
      nativeSent += call.args[1];
      return false;
    }
    if (call.functionName === "sendTokens") {
      assert.ok(same(call.args[1], getContract(42161, "OrderVault")), "Unexpected collateral receiver");
      const token = getAddress(call.args[0]);
      tokenTransfers.set(token, (tokenTransfers.get(token) ?? 0n) + call.args[2]);
      return false;
    }
    return true;
  });
  assert.equal(tx.value, nativeSent, "Transaction value differs from batch native transfers");
  assert.ok(tx.value >= 0n);
  let executionFee = 0n;
  let protocolReserveUsd = 0n;
  let sizeDeltaUsd = 0n;
  const createdCount = intent.kind === "increase" && intent.twap ? 2 : 1;
  if (intent.kind === "cancel") {
    assert.equal(operations.length, intent.keys.length);
    assert.equal(new Set(intent.keys).size, intent.keys.length);
    const keys = operations.map((call) => {
      assert.equal(call.functionName, "cancelOrder");
      if (call.functionName !== "cancelOrder") throw new Error("Expected cancellation");
      assert.ok(ownedOrderKeys.includes(call.args[0]), "Cannot cancel an unowned order");
      return call.args[0];
    });
    assert.deepEqual([...keys].sort(), [...intent.keys].sort());
    assert.equal(nativeSent, 0n);
    assert.equal(tokenTransfers.size, 0);
  } else if (intent.kind === "edit") {
    assert.equal(operations.length, 1);
    const call = operations[0];
    assert.equal(call.functionName, "updateOrder");
    if (call.functionName !== "updateOrder") throw new Error("Expected order update");
    assert.ok(ownedOrderKeys.includes(intent.key), "Cannot edit an unowned order");
    const acceptablePrice = intent.editDirection ? call.args[2] : intent.acceptablePrice;
    if (intent.editDirection) {
      const { isLong, orderType } = intent.editDirection;
      const buying = orderType === 3 || orderType === 8 ? isLong : !isLong;
      const sentinel = [3, 5, 6, 8].includes(orderType) && unlimited(acceptablePrice, buying);
      assert.ok(
        sentinel ||
          (buying
            ? acceptablePrice > 0n && acceptablePrice <= (intent.triggerPrice * 10_100n) / 10_000n
            : acceptablePrice !== maxUint256 && acceptablePrice >= (intent.triggerPrice * 9_900n) / 10_000n),
        `UI edited acceptable price ${acceptablePrice} exceeds slippage around ${intent.triggerPrice}`
      );
    }
    assert.deepEqual(call.args, [
      intent.key,
      intent.sizeUsd,
      acceptablePrice,
      intent.triggerPrice,
      intent.minOutputAmount,
      intent.validFromTime,
      intent.autoCancel,
    ]);
    assert.ok((intent.fullPositionSizeUsd ?? intent.sizeUsd) <= economy.positionLimitUsd);
    if (intent.fullPositionSizeUsd) assert.equal(intent.sizeUsd, maxUint256);
    assert.equal(tokenTransfers.size, 0);
    executionFee = nativeSent;
  } else {
    assert.equal(operations.length, createdCount);
    let totalCollateral = 0n;
    let totalSize = 0n;
    let twapId: string | undefined;
    for (const call of operations) {
      assert.equal(call.functionName, "createOrder", "Unexpected additional operation in UI batch");
      if (call.functionName !== "createOrder") throw new Error("Expected order creation");
      const order = call.args[0];
      const { addresses, numbers } = order;
      assert.ok(order.dataList.length <= 1, "Unexpected order metadata");
      if (order.dataList.length) {
        const metadata = decodeOrderDataListMetadata(order.dataList[0]);
        assert.ok(metadata && !metadata.isJit && metadata.source === UI_FEE_SOURCE_UI);
        assert.equal(metadata.isExpress, !!context.express);
        assert.equal(metadata.numberOfParts, intent.kind === "increase" && intent.twap ? 2 : 0);
        if (metadata.numberOfParts) {
          twapId ??= metadata.twapId;
          assert.equal(metadata.twapId, twapId);
        }
      }
      assert.ok(same(addresses.receiver, address), "Order receiver differs from the test wallet");
      assert.ok(same(addresses.cancellationReceiver, address) || same(addresses.cancellationReceiver, zeroAddress));
      assert.ok(same(addresses.callbackContract, zeroAddress));
      assert.ok(
        same(addresses.uiFeeReceiver, zeroAddress) ||
          same(addresses.uiFeeReceiver, "0xff00000000000000000000000000000000000001"),
        "Unexpected UI fee receiver"
      );
      assert.equal(numbers.callbackGasLimit, 0n);
      assert.equal(
        order.decreasePositionSwapType,
        intent.kind === "close" && intent.sizeUsd > 0n && intent.isLong ? 1 : 0,
        "Unexpected collateral conversion"
      );
      assert.ok(numbers.executionFee > 0n, "Missing keeper fee");
      executionFee += numbers.executionFee;
      totalCollateral += numbers.initialCollateralDeltaAmount;
      totalSize += numbers.sizeDeltaUsd;
      sizeDeltaUsd += numbers.sizeDeltaUsd;
      const twap = intent.kind === "increase" ? intent.twap : undefined;
      if (twap) {
        assert.ok(Number(numbers.validFromTime) >= twap.start && Number(numbers.validFromTime) <= twap.end);
      } else assert.equal(numbers.validFromTime, 0n);
      if (intent.kind === "swap") {
        assert.equal(order.orderType, 0);
        assert.ok(same(addresses.market, zeroAddress));
        assert.ok(same(addresses.initialCollateralToken, intent.tokenIn));
        assert.ok(same(intent.tokenIn, usdc.address) || same(intent.tokenIn, weth.address));
        assert.deepEqual(
          addresses.swapPath.map((value) => getAddress(value)),
          [getAddress(marketAddress)]
        );
        assert.equal(numbers.sizeDeltaUsd, 0n);
        assert.equal(numbers.initialCollateralDeltaAmount, intent.amount);
        assert.equal(numbers.triggerPrice, 0n);
        assert.equal(numbers.acceptablePrice, 0n);
        assert.ok(intent.minOutputAmount > 0n && numbers.minOutputAmount >= intent.minOutputAmount);
        assert.equal(order.shouldUnwrapNativeToken, intent.unwrapNative);
        const input = same(intent.tokenIn, usdc.address) ? usdc : weth;
        const output = input === usdc ? weth : usdc;
        const paid = convertToUsd(intent.amount, input.decimals, input.prices.maxPrice)!;
        const received = convertToUsd(numbers.minOutputAmount, output.decimals, output.prices.minPrice)!;
        assert.ok(paid > 0n && paid <= USD * 2n, "UI swap exceeds the economy amount");
        protocolReserveUsd = (paid > received ? paid - received : 0n) + USD / 100n;
      } else {
        assert.ok(same(addresses.market, marketAddress));
        assert.ok(same(addresses.initialCollateralToken, usdc.address));
        assert.equal(addresses.swapPath.length, 0);
        assert.equal(order.orderType, intent.orderType ?? (intent.kind === "increase" ? 2 : 4));
        assert.equal(order.isLong, intent.isLong);
        assert.equal(order.shouldUnwrapNativeToken, false);
        if (intent.kind === "close" && intent.sizeUsd === 0n) {
          assert.ok(intent.minimumOutputUsd && numbers.minOutputAmount >= intent.minimumOutputUsd);
          assert.equal(numbers.initialCollateralDeltaAmount, intent.collateralAmount);
        } else assert.equal(numbers.minOutputAmount, 0n);
        assert.equal(numbers.triggerPrice, twap ? (intent.isLong ? maxUint256 : 0n) : intent.triggerPrice ?? 0n);
        const stopLoss = intent.kind === "close" && intent.orderType === 6;
        const buying = intent.kind === "increase" ? intent.isLong : !intent.isLong;
        const unlimitedLimit = [3, 5, 8].includes(intent.orderType ?? -1) && unlimited(numbers.acceptablePrice, buying);
        const marketStopLoss = stopLoss && unlimited(numbers.acceptablePrice, !intent.isLong);
        if (twap) {
          assert.equal(numbers.acceptablePrice, intent.isLong ? maxUint256 : 0n);
        } else if (!marketStopLoss && !unlimitedLimit) {
          const referenceMin = intent.triggerPrice ?? weth.prices.minPrice / 10n ** BigInt(weth.decimals);
          const referenceMax = intent.triggerPrice ?? weth.prices.maxPrice / 10n ** BigInt(weth.decimals);
          const buying = intent.kind === "increase" ? intent.isLong : !intent.isLong;
          assert.ok(numbers.acceptablePrice > 0n && numbers.acceptablePrice !== maxUint256);
          assert.ok(
            buying
              ? numbers.acceptablePrice <= (referenceMax * 10_100n) / 10_000n
              : numbers.acceptablePrice >= (referenceMin * 9_900n) / 10_000n,
            `UI acceptable price exceeds the permitted slippage: ${numbers.acceptablePrice}; reference ${referenceMin}–${referenceMax}`
          );
        }
      }
    }
    assert.equal(executionFee, nativeSent, "Native payment differs from the keeper fee total");
    if (intent.kind === "increase") {
      const tolerance = intent.sizeToleranceUsd ?? 0n;
      assert.ok(tolerance >= 0n && tolerance <= intent.sizeUsd / 1_000n, "Excessive UI sizing tolerance");
      assert.ok(
        totalSize >= intent.sizeUsd - tolerance && totalSize <= intent.sizeUsd + tolerance,
        "UI size differs from the permitted amount"
      );
      assert.equal(totalCollateral, intent.collateralAmount);
      assert.ok(convertToUsd(totalCollateral, usdc.decimals, usdc.prices.maxPrice)! <= economy.collateralLimitUsd);
    } else if (intent.kind === "close") {
      assert.equal(totalSize, intent.sizeUsd);
      assert.ok(totalCollateral <= intent.collateralAmount);
    }
    if (intent.kind !== "swap") {
      if (intent.fullPositionSizeUsd) {
        assert.ok(intent.kind === "close" && (intent.orderType === 5 || intent.orderType === 6));
        assert.equal(totalSize, maxUint256);
        assert.ok(intent.fullPositionSizeUsd > 0n);
      }
      const boundedSize = intent.fullPositionSizeUsd ?? totalSize;
      assert.ok(boundedSize <= economy.positionLimitUsd);
      protocolReserveUsd = boundedSize / 100n + USD / 10n;
    }
    const token = intent.kind === "swap" ? intent.tokenIn : usdc.address;
    const paid = intent.kind === "close" ? 0n : intent.kind === "swap" ? intent.amount : intent.collateralAmount;
    assert.equal(tokenTransfers.size, paid === 0n ? 0 : 1);
    assert.equal(
      tokenTransfers.get(getAddress(token)) ?? 0n,
      paid,
      "UI collateral transfers differ from the permitted amount"
    );
  }
  return {
    keeperFee: executionFee,
    sizeDeltaUsd,
    extraFeeUsd: convertToUsd(executionFee, weth.decimals, weth.prices.maxPrice)! + protocolReserveUsd,
    createdCount: intent.kind === "cancel" || intent.kind === "edit" ? 0 : createdCount,
  };
}
