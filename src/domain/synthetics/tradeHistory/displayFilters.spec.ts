import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import { filterLifecycleTradeActionsByDisplayFilters } from "domain/synthetics/tradeHistory/displayFilters";
import { PositionTradeAction, TradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

describe("filterLifecycleTradeActionsByDisplayFilters", () => {
  it("applies date filters after a lifecycle slice is found", () => {
    expect(
      filterActions(
        [
          positionAction({ id: "before", timestamp: 999 }),
          positionAction({ id: "inside", timestamp: 1000 }),
          positionAction({ id: "after", timestamp: 1001 }),
        ],
        {
          fromTxTimestamp: 1000,
          toTxTimestamp: 1000,
        }
      )
    ).toEqual(["inside"]);
  });

  it("applies event and order-type filters after a lifecycle slice is found", () => {
    expect(
      filterActions(
        [
          positionAction({ id: "created", eventName: TradeActionType.OrderCreated }),
          positionAction({ id: "executed-market", eventName: TradeActionType.OrderExecuted }),
          positionAction({
            id: "executed-limit",
            eventName: TradeActionType.OrderExecuted,
            orderType: OrderType.LimitIncrease,
          }),
        ],
        {
          orderEventCombinations: [{ eventName: TradeActionType.OrderExecuted, orderType: [OrderType.MarketIncrease] }],
        }
      )
    ).toEqual(["executed-market"]);
  });

  it("applies deposit and withdraw filters for market increase and decrease rows", () => {
    expect(
      filterActions(
        [
          positionAction({ id: "deposit", orderType: OrderType.MarketIncrease, sizeDeltaUsd: 0n }),
          positionAction({ id: "increase", orderType: OrderType.MarketIncrease, sizeDeltaUsd: 100n }),
          positionAction({ id: "withdraw", orderType: OrderType.MarketDecrease, sizeDeltaUsd: 0n }),
        ],
        {
          orderEventCombinations: [{ isDepositOrWithdraw: true }],
        }
      )
    ).toEqual(["deposit", "withdraw"]);
  });

  it("applies twap filters", () => {
    expect(
      filterActions(
        [
          positionAction({ id: "twap", twapParams: {} as PositionTradeAction["twapParams"] }),
          positionAction({ id: "regular", twapParams: undefined }),
        ],
        {
          orderEventCombinations: [{ isTwap: true }],
        }
      )
    ).toEqual(["twap"]);
  });
});

type LifecycleDisplayFilters = Omit<Parameters<typeof filterLifecycleTradeActionsByDisplayFilters>[0], "tradeActions">;

function filterActions(actions: TradeAction[], filters: LifecycleDisplayFilters) {
  return filterLifecycleTradeActionsByDisplayFilters({ tradeActions: actions, ...filters })?.map((action) => action.id);
}

function positionAction(overrides: Partial<PositionTradeAction>): PositionTradeAction {
  return {
    type: "position",
    id: "id",
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketIncrease,
    sizeDeltaUsd: 100n,
    timestamp: 1000,
    twapParams: undefined,
    ...overrides,
  } as PositionTradeAction;
}
