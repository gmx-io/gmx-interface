import { useMemo } from "react";

import {
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGmxTradingCostBreakdown } from "domain/tradingCosts/gmx/gmxCost";

import { buildTradingCostRows, getMatchedVenueSymbols } from "./buildTradingCostRows";
import { filterTradingCostRows } from "./costs";
import { buildHyperliquidBreakdown, getHyperliquidVenueMarkets } from "./hyperliquid/buildHyperliquidBreakdown";
import { useHyperliquidL2Books, useHyperliquidMarkets } from "./hyperliquid/useHyperliquidData";
import type { TradingCostScenario } from "./types";

export function useTradingCosts({ scenario, search }: { scenario: TradingCostScenario; search: string }) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const tokensData = useSelector(selectTokensData);

  const gmxMarkets = useMemo(() => Object.values(marketsInfoData ?? {}), [marketsInfoData]);
  const hyperliquidMarkets = useHyperliquidMarkets();
  const venueMarkets = useMemo(
    () => getHyperliquidVenueMarkets(hyperliquidMarkets.markets ?? []),
    [hyperliquidMarkets.markets]
  );
  const coins = useMemo(() => getMatchedVenueSymbols({ gmxMarkets, venueMarkets }), [gmxMarkets, venueMarkets]);
  const hyperliquidBooks = useHyperliquidL2Books(coins);

  const rows = useMemo(() => {
    const builtRows = buildTradingCostRows({
      scenario,
      gmxMarkets,
      venueMarkets,
      buildGmxBreakdown: (marketInfo) =>
        getGmxTradingCostBreakdown({
          marketInfo,
          sizeUsd: scenario.sizeUsd,
          side: scenario.side,
          holdingPeriodHours: scenario.holdingPeriodHours,
          chainId,
          gasLimits,
          gasPrice,
          tokensData,
          timestamp: Date.now(),
        }),
      buildVenueBreakdown: (match) =>
        buildHyperliquidBreakdown({
          match,
          scenario,
          market: hyperliquidMarkets.markets?.find((item) => item.symbol === match.venueMarket.symbol),
          book: hyperliquidBooks.booksByCoin?.[match.venueMarket.symbol],
        }),
    });

    return filterTradingCostRows(builtRows, search);
  }, [
    chainId,
    gasLimits,
    gasPrice,
    gmxMarkets,
    hyperliquidBooks.booksByCoin,
    hyperliquidMarkets.markets,
    scenario,
    search,
    tokensData,
    venueMarkets,
  ]);

  return {
    rows,
    isLoading: hyperliquidMarkets.isLoading || hyperliquidBooks.isLoading || !marketsInfoData,
    error: hyperliquidMarkets.error ?? hyperliquidBooks.error,
  };
}
