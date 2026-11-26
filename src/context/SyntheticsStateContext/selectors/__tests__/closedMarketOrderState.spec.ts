import { describe, expect, it } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createMockMarketInfo, MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { createMockSyntheticsState } from "domain/testUtils/mockSyntheticsState";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import { selectTradeboxClosedMarketOrderState } from "../closedMarketsSelectors";

function getOrderState(tradeType: TradeType, tradeMode: TradeMode, isMarketClosed: boolean) {
  const state = createMockSyntheticsState({ tradeType, tradeMode, marketInfo: createMockMarketInfo() });

  return selectTradeboxClosedMarketOrderState({
    ...state,
    globals: { ...state.globals, closedMarkets: isMarketClosed ? { [MOCK_MARKET_ADDRESS]: true } : {} },
  } as SyntheticsState);
}

describe("selectTradeboxClosedMarketOrderState", () => {
  it("blocks market and TWAP orders on a closed market and lets limit, stop and TP/SL orders wait TRD-45", () => {
    const cases: [TradeType, TradeMode, boolean, ReturnType<typeof getOrderState>][] = [
      [TradeType.Long, TradeMode.Market, true, "blocked"],
      [TradeType.Short, TradeMode.Twap, true, "blocked"],
      [TradeType.Long, TradeMode.Limit, true, "limitWaits"],
      [TradeType.Short, TradeMode.StopMarket, true, "stopWaits"],
      [TradeType.Long, TradeMode.Trigger, true, "stopWaits"],
      [TradeType.Long, TradeMode.Market, false, undefined],
      [TradeType.Short, TradeMode.Twap, false, undefined],
      [TradeType.Swap, TradeMode.Market, true, undefined],
      [TradeType.Swap, TradeMode.Twap, true, undefined],
    ];

    for (const [tradeType, tradeMode, isMarketClosed, expected] of cases) {
      expect(
        getOrderState(tradeType, tradeMode, isMarketClosed),
        `${tradeType} ${tradeMode} closed=${isMarketClosed}`
      ).toBe(expected);
    }
  });
});
