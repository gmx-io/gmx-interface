import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import {
  filterTradeActionsByDisplayFilters,
  TradeHistoryMarketFilter,
} from "domain/synthetics/tradeHistory/displayFilters";
import { PositionTradeAction, SwapTradeAction, TradeAction, TradeActionType } from "sdk/utils/tradeHistory/types";

const MARKET_A = "0xMarketA";
const MARKET_B = "0xMarketB";
const USDC = "0xUSDC";
const WETH = "0xWETH";

describe("filterTradeActionsByDisplayFilters market filters", () => {
  it("intersects pure-direction filters with defined-market filters like the server", () => {
    const longA = positionAction({ id: "longA", marketAddress: MARKET_A, isLong: true });
    const shortA = positionAction({ id: "shortA", marketAddress: MARKET_A, isLong: false });
    const longB = positionAction({ id: "longB", marketAddress: MARKET_B, isLong: true });

    const filters: TradeHistoryMarketFilter[] = [
      { marketAddress: "any", direction: "long" },
      { marketAddress: MARKET_A, direction: "any" },
    ];

    expect(filterActions([longA, shortA, longB], filters)).toEqual(["longA"]);
  });

  it("unions filters within the same group", () => {
    const longA = positionAction({ id: "longA", marketAddress: MARKET_A });
    const longB = positionAction({ id: "longB", marketAddress: MARKET_B });
    const filters: TradeHistoryMarketFilter[] = [
      { marketAddress: MARKET_A, direction: "any" },
      { marketAddress: MARKET_B, direction: "any" },
    ];

    expect(filterActions([longA, longB], filters)).toEqual(["longA", "longB"]);
  });

  it("matches swaps routed through a defined market for direction any", () => {
    const swapThroughA = swapAction({ id: "swapA", swapPath: [MARKET_B, MARKET_A] });
    const swapElsewhere = swapAction({ id: "swapB", swapPath: [MARKET_B] });
    const filters: TradeHistoryMarketFilter[] = [{ marketAddress: MARKET_A, direction: "any" }];

    expect(filterActions([swapThroughA, swapElsewhere], filters)).toEqual(["swapA"]);
  });

  it("matches all swaps for a pure swap direction filter", () => {
    const swap = swapAction({ id: "swap" });
    const position = positionAction({ id: "position" });
    const filters: TradeHistoryMarketFilter[] = [{ marketAddress: "any", direction: "swap" }];

    expect(filterActions([swap, position], filters)).toEqual(["swap"]);
  });
});

describe("filterTradeActionsByDisplayFilters collateral filters", () => {
  const filters: TradeHistoryMarketFilter[] = [{ marketAddress: MARKET_A, direction: "long", collateralAddress: USDC }];

  it("does not collateral-constrain market orders or liquidations", () => {
    const marketIncrease = positionAction({
      id: "marketIncrease",
      orderType: OrderType.MarketIncrease,
      initialCollateralTokenAddress: WETH,
      targetCollateralToken: { address: WETH } as PositionTradeAction["targetCollateralToken"],
    });
    const liquidation = positionAction({
      id: "liquidation",
      orderType: OrderType.Liquidation,
      initialCollateralTokenAddress: WETH,
      targetCollateralToken: { address: WETH } as PositionTradeAction["targetCollateralToken"],
    });

    expect(filterActions([marketIncrease, liquidation], filters)).toEqual(["marketIncrease", "liquidation"]);
  });

  it("constrains limit orders by swap output collateral", () => {
    const matching = positionAction({
      id: "matching",
      orderType: OrderType.LimitIncrease,
      initialCollateralTokenAddress: WETH,
      targetCollateralToken: { address: USDC } as PositionTradeAction["targetCollateralToken"],
    });
    const nonMatching = positionAction({
      id: "nonMatching",
      orderType: OrderType.LimitIncrease,
      initialCollateralTokenAddress: USDC,
      targetCollateralToken: { address: WETH } as PositionTradeAction["targetCollateralToken"],
    });

    expect(filterActions([matching, nonMatching], filters)).toEqual(["matching"]);
  });

  it("constrains trigger-decrease orders by initial collateral", () => {
    const matching = positionAction({
      id: "matching",
      orderType: OrderType.StopLossDecrease,
      initialCollateralTokenAddress: USDC,
      targetCollateralToken: { address: WETH } as PositionTradeAction["targetCollateralToken"],
    });
    const nonMatching = positionAction({
      id: "nonMatching",
      orderType: OrderType.StopLossDecrease,
      initialCollateralTokenAddress: WETH,
      targetCollateralToken: { address: USDC } as PositionTradeAction["targetCollateralToken"],
    });

    expect(filterActions([matching, nonMatching], filters)).toEqual(["matching"]);
  });
});

function filterActions(actions: TradeAction[], marketsDirectionsFilter: TradeHistoryMarketFilter[]) {
  return filterTradeActionsByDisplayFilters({ tradeActions: actions, marketsDirectionsFilter })?.map(
    (action) => action.id
  );
}

function positionAction(overrides: Partial<PositionTradeAction>): PositionTradeAction {
  return {
    type: "position",
    id: "id",
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketIncrease,
    marketAddress: MARKET_A,
    isLong: true,
    sizeDeltaUsd: 100n,
    initialCollateralTokenAddress: USDC,
    targetCollateralToken: { address: USDC },
    timestamp: 1000,
    twapParams: undefined,
    ...overrides,
  } as PositionTradeAction;
}

function swapAction(overrides: Partial<SwapTradeAction>): SwapTradeAction {
  return {
    type: "swap",
    id: "id",
    eventName: TradeActionType.OrderExecuted,
    orderType: OrderType.MarketSwap,
    swapPath: [MARKET_A],
    timestamp: 1000,
    twapParams: undefined,
    ...overrides,
  } as SwapTradeAction;
}
