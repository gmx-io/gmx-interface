import { type Abi, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";

import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { parseError } from "lib/errors";
import { getIsInsufficientExecutionFeeError, getIsInvalidSignatureError } from "lib/errors/customErrors";
import { abis } from "sdk/abis";
import { StatusCode } from "sdk/utils/express";

import type { OrderCreatedEventData, OrderStatus, PendingOrderData } from "./types";
import { extractRelayTaskError, findMatchedOrderStatus, findOrderStatusForAllocation } from "./utils";

function makePendingOrder(overrides: Partial<PendingOrderData> = {}): PendingOrderData {
  return {
    isTwap: false,
    account: "0xaccount",
    marketAddress: "0xmarket",
    initialCollateralTokenAddress: "0xcollateral",
    swapPath: [],
    externalSwapQuote: undefined,
    initialCollateralDeltaAmount: 0n,
    triggerPrice: 2n,
    acceptablePrice: 1n,
    autoCancel: true,
    minOutputAmount: 0n,
    sizeDeltaUsd: 100n,
    isLong: true,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    shouldUnwrapNativeToken: false,
    orderType: OrderType.LimitDecrease,
    createdAt: 10,
    txnType: "create",
    ...overrides,
  };
}

function makeOrderData(overrides: Partial<OrderCreatedEventData> = {}): OrderCreatedEventData {
  return {
    key: "0xnew",
    account: "0xaccount",
    receiver: "0xaccount",
    callbackContract: "0xcallback",
    marketAddress: "0xmarket",
    initialCollateralTokenAddress: "0xcollateral",
    swapPath: [],
    sizeDeltaUsd: 100n,
    initialCollateralDeltaAmount: 0n,
    contractTriggerPrice: 2n,
    contractAcceptablePrice: 1n,
    executionFee: 0n,
    callbackGasLimit: 0n,
    minOutputAmount: 0n,
    updatedAtBlock: 1n,
    orderType: OrderType.LimitDecrease,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: true,
    shouldUnwrapNativeToken: false,
    externalSwapQuote: undefined,
    uiFeeReceiver: "0xreceiver",
    isFrozen: false,
    isTwap: false,
    ...overrides,
  };
}

function makeOrderStatus(overrides: Partial<OrderStatus> = {}): OrderStatus {
  return {
    key: "0xnew",
    data: makeOrderData(),
    createdAt: 20,
    ...overrides,
  };
}

describe("findMatchedOrderStatus", () => {
  const replacementCreatedStatus = makeOrderStatus({ createdTxnHash: "0xtx" });
  const oldCancelledStatus = makeOrderStatus({
    key: "0xold",
    data: makeOrderData({ key: "0xold" }),
    createdAt: 5,
    createdTxnHash: undefined,
    cancelledTxnHash: "0xtx",
  });
  const pendingCreate = makePendingOrder();
  const pendingCancel = makePendingOrder({ orderKey: "0xold", txnType: "cancel" });

  it("matches cancel actions by contract key when a replacement create has the same pending key", () => {
    expect(findOrderStatusForAllocation([replacementCreatedStatus, oldCancelledStatus], pendingCancel)).toBe(
      oldCancelledStatus
    );
  });

  it("matches cancel actions independently of status ordering", () => {
    expect(findMatchedOrderStatus([oldCancelledStatus, replacementCreatedStatus], pendingCancel)).toBe(
      oldCancelledStatus
    );
  });

  it("does not fall back to the pending key for actions with a contract key", () => {
    expect(findMatchedOrderStatus([replacementCreatedStatus], pendingCancel)).toBeUndefined();
  });

  it("keeps pending-key matching for create actions without a contract key", () => {
    expect(findOrderStatusForAllocation([replacementCreatedStatus, oldCancelledStatus], pendingCreate)).toBe(
      replacementCreatedStatus
    );
  });

  it("does not match a replacement create with a different decrease swap type", () => {
    const oldSingleTokenStatus = makeOrderStatus({
      data: makeOrderData({ decreasePositionSwapType: DecreasePositionSwapType.SwapPnlTokenToCollateralToken }),
    });

    expect(findOrderStatusForAllocation([oldSingleTokenStatus], pendingCreate)).toBeUndefined();
  });

  it("matches a create status received before the wallet pending order is recorded", () => {
    const earlyCreatedStatus = makeOrderStatus({ createdAt: 5, createdTxnHash: "0xtx" });

    expect(findOrderStatusForAllocation([earlyCreatedStatus], pendingCreate)).toBe(earlyCreatedStatus);
  });

  it("does not match create actions to an older updated order with the same pending key", () => {
    const oldUpdatedStatus = makeOrderStatus({
      key: "0xold",
      data: makeOrderData({ key: "0xold" }),
      createdAt: 30,
      createdTxnHash: "0xold-create-tx",
      updatedTxnHash: "0xupdate-tx",
    });

    expect(findOrderStatusForAllocation([oldUpdatedStatus, replacementCreatedStatus], pendingCreate)).toBe(
      replacementCreatedStatus
    );
    expect(findOrderStatusForAllocation([oldUpdatedStatus], pendingCreate)).toBeUndefined();
  });

  it("keeps a create status matched after its lifecycle changes", () => {
    const cancelledCreatedStatus = makeOrderStatus({
      createdTxnHash: "0xcreate-tx",
      cancelledTxnHash: "0xcancel-tx",
    });

    expect(findOrderStatusForAllocation([cancelledCreatedStatus], pendingCreate)).toBeUndefined();
    expect(findMatchedOrderStatus([cancelledCreatedStatus], pendingCreate)).toBe(cancelledCreatedStatus);
  });
});

describe("extractRelayTaskError", () => {
  const taskId = "0xtask";

  function makeRelayTaskStatus(message: string | undefined, revertData?: string) {
    return { taskId, statusCode: StatusCode.Reverted, message, revertData };
  }

  it("classifies an execution fee failure the GMX relay reported as a decoded reason", () => {
    const error = extractRelayTaskError(makeRelayTaskStatus("InsufficientExecutionFee(1200,1000)"));

    expect(getIsInsufficientExecutionFeeError(error)).toMatchObject({
      isErrorMatched: true,
      args: { minExecutionFee: 1200n, executionFee: 1000n },
    });
  });

  it("classifies an invalid signature the GMX relay reported as a decoded reason", () => {
    const error = extractRelayTaskError(makeRelayTaskStatus("InvalidSignature(subaccountApproval)"));

    expect(getIsInvalidSignatureError(error).isErrorMatched).toBe(true);
  });

  it("keeps revert data the relay supplied in preference to its decoded reason", () => {
    const revertData = encodeErrorResult({
      abi: abis.CustomErrors as Abi,
      errorName: "InvalidSignature",
      args: ["order"],
    });
    const error = extractRelayTaskError(makeRelayTaskStatus("InsufficientExecutionFee(1200,1000)", revertData));

    expect(getIsInvalidSignatureError(error).isErrorMatched).toBe(true);
  });

  it.each([
    ["a reason that names no contract error", "deadline passed"],
    ["a reason whose arguments do not fit the ABI", "InsufficientExecutionFee(1200)"],
    ["a reason whose arguments are not decodable", "InsufficientExecutionFee(some,thing)"],
    ["a truncated reason", "InsufficientExecutionFee(1200,10"],
  ])("leaves %s unclassified", (_label, message) => {
    const error = extractRelayTaskError(makeRelayTaskStatus(message));

    expect(parseError(error)?.contractError).toBeUndefined();
    expect(getIsInsufficientExecutionFeeError(error).isErrorMatched).toBe(false);
  });
});

