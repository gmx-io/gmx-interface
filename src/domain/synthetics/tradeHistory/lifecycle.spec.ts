import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import {
  getPositionLifecycleSlice,
  PositionLifecycleFilter,
  resolveTradeHistoryFetchParams,
} from "domain/synthetics/tradeHistory/lifecycle";
import { PositionTradeAction, TradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

describe("getPositionLifecycleSlice", () => {
  it("returns only the lifecycle containing the selected action", () => {
    const actions = [
      close("b-close", "key"),
      increase("b-increase", "key"),
      close("a-close", "key"),
      increase("a-increase", "key"),
    ];

    expect(select(actions, { positionKey: "key", sourceActionId: "a-increase" })).toEqual([
      close("a-close", "key"),
      increase("a-increase", "key"),
    ]);

    expect(select(actions, { positionKey: "key", sourceActionId: "b-increase" })).toEqual([
      close("b-close", "key"),
      increase("b-increase", "key"),
    ]);
  });

  it("includes an open lifecycle up to the previous close", () => {
    const actions = [increase("open-increase", "key"), close("old-close", "key"), increase("old-increase", "key")];

    expect(select(actions, { positionKey: "key", sourceActionId: "open-increase" })).toEqual([
      increase("open-increase", "key"),
    ]);
  });

  it("ignores other position slots", () => {
    const actions = [
      increase("other", "other-key"),
      close("selected-close", "key"),
      increase("selected-increase", "key"),
    ];

    expect(select(actions, { positionKey: "key", sourceActionId: "selected-increase" })).toEqual([
      close("selected-close", "key"),
      increase("selected-increase", "key"),
    ]);
  });

  it("returns an empty slice instead of all position rows when the selected source is missing", () => {
    const actions = [increase("newer-increase", "key"), close("old-close", "key")];

    expect(select(actions, { positionKey: "key", sourceActionId: "missing-source" })).toEqual([]);
    expect(getPositionLifecycleSlice(actions, { positionKey: "key", sourceActionId: "missing-source" })).toEqual({
      tradeActions: [],
      needsMoreData: true,
    });
  });

  it("treats liquidations as lifecycle close boundaries", () => {
    const actions = [
      increase("c-increase", "key"),
      liquidation("b-liquidation", "key"),
      increase("b-increase", "key"),
      close("a-close", "key"),
      increase("a-increase", "key"),
    ];

    expect(select(actions, { positionKey: "key", sourceActionId: "b-increase" })).toEqual([
      liquidation("b-liquidation", "key"),
      increase("b-increase", "key"),
    ]);
  });

  it("keeps post-close cancelled trigger orders with the closed lifecycle", () => {
    const actions = [
      increase("next-increase", "key"),
      cancelledTrigger("tp-cancel", "key"),
      close("a-close", "key"),
      increase("a-increase", "key"),
    ];

    const expectedSlice = [
      cancelledTrigger("tp-cancel", "key"),
      close("a-close", "key"),
      increase("a-increase", "key"),
    ];

    expect(select(actions, { positionKey: "key", sourceActionId: "a-increase" })).toEqual(expectedSlice);
    expect(select(actions, { positionKey: "key", sourceActionId: "tp-cancel" })).toEqual(expectedSlice);
    expect(select(actions, { positionKey: "key", sourceActionId: "next-increase" })).toEqual([
      increase("next-increase", "key"),
    ]);
  });

  it("keeps mid-lifecycle cancelled trigger orders in their own lifecycle", () => {
    const actions = [
      close("b-close", "key"),
      cancelledTrigger("manual-cancel", "key"),
      increase("b-increase", "key"),
      close("a-close", "key"),
    ];

    expect(select(actions, { positionKey: "key", sourceActionId: "b-increase" })).toEqual([
      close("b-close", "key"),
      cancelledTrigger("manual-cancel", "key"),
      increase("b-increase", "key"),
    ]);
  });

  it("stops requesting more data when close detection is degraded by missing positionSizeInUsd", () => {
    const actions = [
      increase("new-increase", "key"),
      closeWithoutSize("legacy-close", "key"),
      increase("old-increase", "key"),
    ];

    expect(getPositionLifecycleSlice(actions, { positionKey: "key", sourceActionId: "new-increase" })).toEqual({
      tradeActions: actions,
      needsMoreData: false,
    });
  });
});

describe("resolveTradeHistoryFetchParams", () => {
  const userFilters = {
    fromTxTimestamp: 1,
    toTxTimestamp: 2,
    marketsDirectionsFilter: [{ marketAddress: "0xMarket", direction: "long" as const }],
    orderEventCombinations: [{ eventName: TradeActionType.OrderExecuted }],
  };

  it("passes user filters through without a lifecycle filter", () => {
    expect(resolveTradeHistoryFetchParams({ ...userFilters, positionLifecycleFilter: undefined })).toEqual({
      ...userFilters,
      positionKey: undefined,
    });
  });

  it("neutralizes server filters and sets positionKey in lifecycle mode", () => {
    expect(
      resolveTradeHistoryFetchParams({
        ...userFilters,
        positionLifecycleFilter: { positionKey: "key", sourceActionId: "id" },
      })
    ).toEqual({
      fromTxTimestamp: undefined,
      toTxTimestamp: undefined,
      marketsDirectionsFilter: [],
      orderEventCombinations: undefined,
      positionKey: "key",
    });
  });
});

function select(actions: TradeAction[], filter: PositionLifecycleFilter) {
  return getPositionLifecycleSlice(actions, filter).tradeActions;
}

function increase(id: string, positionKey: string) {
  return action({
    id,
    positionKey,
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketIncrease,
    positionSizeInUsd: 100n,
  });
}

function close(id: string, positionKey: string) {
  return action({
    id,
    positionKey,
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketDecrease,
    positionSizeInUsd: 0n,
  });
}

function liquidation(id: string, positionKey: string) {
  return action({
    id,
    positionKey,
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.Liquidation,
    positionSizeInUsd: 0n,
  });
}

function cancelledTrigger(id: string, positionKey: string) {
  return action({
    id,
    positionKey,
    eventName: TradeActionType.OrderCancelled,
    orderType: OrderType.LimitDecrease,
    positionSizeInUsd: 0n,
  });
}

function closeWithoutSize(id: string, positionKey: string) {
  return action({
    id,
    positionKey,
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketDecrease,
    positionSizeInUsd: undefined,
  });
}

function action(action: Partial<PositionTradeAction>) {
  return {
    type: "position",
    ...action,
  } as PositionTradeAction;
}
