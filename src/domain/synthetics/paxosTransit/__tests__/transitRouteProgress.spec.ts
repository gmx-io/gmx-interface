import { afterEach, describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { TransitOrder, TransitOrderStatus } from "sdk/utils/paxos/types";

import {
  getShouldStoreTransitRouteProgress,
  readStoredTransitRouteProgress,
  removeStoredTransitRouteProgress,
  writeStoredTransitRouteProgress,
  type TransitRouteProgress,
} from "../transitRouteProgress";

const GLV_ADDRESS = "0x4Cd5A94a30876320ac65F2e192493EE476f13866";
const USER = "0x1234567890abcdef1234567890abcdef12345678";

function makeProgress(patch: Partial<TransitRouteProgress> = {}): TransitRouteProgress {
  return {
    id: 1,
    chainId: ARBITRUM,
    account: USER,
    direction: "usdcToUsdg",
    glvOrMarketAddress: GLV_ADDRESS,
    withdrawalTxnHash: undefined,
    withdrawalExecutedTxnHash: undefined,
    conversion: { orderId: "0xorder", txnHash: "0xconvert", offerAmount: 1_000_000_000n, isMocked: false },
    depositTxnHash: undefined,
    isContinueRequested: false,
    isDismissed: false,
    ...patch,
  };
}

function makeOrder(status: TransitOrderStatus) {
  return { status } as TransitOrder;
}

describe("stored transit route progress", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("reads back what was written, bigint amounts included", () => {
    const progress = makeProgress();

    writeStoredTransitRouteProgress(progress);

    expect(readStoredTransitRouteProgress()).toEqual(progress);
  });

  it("forgets the progress once removed", () => {
    writeStoredTransitRouteProgress(makeProgress());
    removeStoredTransitRouteProgress();

    expect(readStoredTransitRouteProgress()).toBeUndefined();
  });
});

describe("getShouldStoreTransitRouteProgress", () => {
  const sellProgress = makeProgress({ direction: "usdgToUsdc", withdrawalTxnHash: "0xsell", conversion: undefined });

  it.each<{ name: string; progress: TransitRouteProgress; order?: TransitOrder; expected: boolean }>([
    { name: "buy: converted, not bought yet", progress: makeProgress(), order: makeOrder("PROCESSED"), expected: true },
    { name: "buy: still converting", progress: makeProgress(), order: makeOrder("PROCESSING"), expected: true },
    { name: "buy: buy sent", progress: makeProgress({ depositTxnHash: "0xbuy" }), expected: false },
    { name: "buy: conversion removed", progress: makeProgress(), order: makeOrder("REMOVED"), expected: false },
    { name: "toast closed", progress: makeProgress({ isDismissed: true }), expected: false },
    { name: "sell: sale not executed yet", progress: sellProgress, expected: false },
    {
      name: "sell: sold, not converted yet",
      progress: { ...sellProgress, withdrawalExecutedTxnHash: "0xexecuted" },
      expected: true,
    },
    {
      name: "sell: converted",
      progress: { ...sellProgress, withdrawalExecutedTxnHash: "0xexecuted" },
      order: makeOrder("PROCESSED"),
      expected: false,
    },
  ])("$name", ({ progress, order, expected }) => {
    expect(getShouldStoreTransitRouteProgress({ progress, order, isWithdrawalCancelled: false })).toBe(expected);
  });

  it("drops a sell whose sale was cancelled", () => {
    const progress = { ...sellProgress, withdrawalExecutedTxnHash: "0xexecuted" };

    expect(getShouldStoreTransitRouteProgress({ progress, order: undefined, isWithdrawalCancelled: true })).toBe(false);
  });
});
