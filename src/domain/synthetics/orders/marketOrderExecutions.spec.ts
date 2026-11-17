import { describe, expect, it } from "vitest";

import { MarketOrderExecutionAction, buildMarketOrderExecutionRows } from "./marketOrderExecutions";
import { OrderType } from "./types";

function action(overrides: Partial<MarketOrderExecutionAction> = {}): MarketOrderExecutionAction {
  return {
    orderKey: "0xorder",
    orderType: OrderType.MarketIncrease,
    timestamp: 104,
    transactionHash: "0xexecution",
    account: "0xAccount",
    marketAddress: "0xMarket",
    isLong: true,
    shouldUnwrapNativeToken: false,
    initialCollateralTokenAddress: "0xTokenIn",
    initialCollateralDeltaAmount: "1000000",
    swapPath: [],
    sizeDeltaUsd: "1000000000000000000000000000000000",
    orderCreatedTimestamp: 100,
    orderCreatedTxnHash: "0xcreation",
    ...overrides,
  };
}

describe("buildMarketOrderExecutionRows", () => {
  it.each([
    [OrderType.MarketIncrease, true, "increase", "long"],
    [OrderType.MarketIncrease, false, "increase", "short"],
    [OrderType.MarketDecrease, true, "decrease", "long"],
    [OrderType.MarketDecrease, false, "decrease", "short"],
  ] as const)("maps timing and order metadata for orderType=%s and isLong=%s", (orderType, isLong, phase, side) => {
    const [row] = buildMarketOrderExecutionRows([action({ orderType, isLong })]);

    expect(row).toEqual({
      kind: "perp",
      orderKey: "0xorder",
      orderType,
      account: "0xAccount",
      marketAddress: "0xMarket",
      phase,
      side,
      sizeDeltaUsd: "1000000000000000000000000000000000",
      submittedTimestamp: 100,
      submittedTransactionHash: "0xcreation",
      executedTimestamp: 104,
      executedTransactionHash: "0xexecution",
      delaySeconds: 4,
    });
  });

  it("keeps swap input metadata and timing", () => {
    const [row] = buildMarketOrderExecutionRows([
      action({
        orderType: OrderType.MarketSwap,
        isLong: null,
        marketAddress: null,
        shouldUnwrapNativeToken: null,
        swapPath: ["0xMarket"],
      }),
    ]);

    expect(row).toEqual({
      kind: "swap",
      orderKey: "0xorder",
      orderType: OrderType.MarketSwap,
      account: "0xAccount",
      marketAddress: "",
      initialCollateralTokenAddress: "0xTokenIn",
      initialCollateralDeltaAmount: "1000000",
      shouldUnwrapNativeToken: false,
      swapPath: ["0xMarket"],
      submittedTimestamp: 100,
      submittedTransactionHash: "0xcreation",
      executedTimestamp: 104,
      executedTransactionHash: "0xexecution",
      delaySeconds: 4,
    });
  });

  it.each([
    [null, null],
    [105, null],
    [104, 0],
  ] as const)("maps submitted timestamp %s to delay %s", (orderCreatedTimestamp, expectedDelay) => {
    const [row] = buildMarketOrderExecutionRows([action({ orderCreatedTimestamp })]);

    expect(row.delaySeconds).toBe(expectedDelay);
  });

  it("uses zero for a missing perp size", () => {
    const [row] = buildMarketOrderExecutionRows([action({ sizeDeltaUsd: null })]);

    expect(row.kind).toBe("perp");
    if (row.kind === "perp") {
      expect(row.sizeDeltaUsd).toBe("0");
    }
  });

  it("ignores unsupported and incomplete position orders", () => {
    expect(
      buildMarketOrderExecutionRows([action({ orderType: OrderType.LimitIncrease }), action({ isLong: null })])
    ).toEqual([]);
  });
});
