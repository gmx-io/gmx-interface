import type { MarketInfo } from "domain/synthetics/markets";

import type { ComparisonVenueMarket, MatchedTradingMarket } from "./types";

const SYMBOL_ALIASES: Record<string, string> = {
  WETH: "ETH",
  WBTC: "BTC",
};

export function normalizeMarketSymbol(symbol: string | undefined): string {
  const normalized = (symbol ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return SYMBOL_ALIASES[normalized] ?? normalized;
}

export function matchGmxMarketsToVenueMarkets(
  gmxMarkets: MarketInfo[],
  venueMarkets: ComparisonVenueMarket[]
): { matched: MatchedTradingMarket[]; unmatched: MarketInfo[] } {
  const venueBySymbol = new Map(
    venueMarkets.filter((market) => !market.isDisabled).map((market) => [normalizeMarketSymbol(market.symbol), market])
  );

  const matched: MatchedTradingMarket[] = [];
  const unmatched: MarketInfo[] = [];

  for (const gmxMarket of gmxMarkets) {
    if (gmxMarket.isDisabled || gmxMarket.isSpotOnly) {
      continue;
    }

    const symbol = normalizeMarketSymbol(gmxMarket.indexToken?.symbol);
    const venueMarket = venueBySymbol.get(symbol);

    if (!venueMarket) {
      unmatched.push(gmxMarket);
      continue;
    }

    matched.push({ gmxMarket, venueMarket });
  }

  return { matched, unmatched };
}
