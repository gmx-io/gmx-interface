import type { MarketInfo } from "domain/synthetics/markets";

import { calculateDeltaUsd, getCombinedStatus, sortTradingCostRowsByVenueVolume } from "./costs";
import { matchGmxMarketsToVenueMarkets } from "./marketMatching";
import type {
  ComparisonVenueMarket,
  MatchedTradingMarket,
  TradingCostBreakdown,
  TradingCostRow,
  TradingCostScenario,
} from "./types";

export function buildTradingCostRows({
  scenario,
  gmxMarkets,
  venueMarkets,
  buildGmxBreakdown,
  buildVenueBreakdown,
}: {
  scenario: TradingCostScenario;
  gmxMarkets: MarketInfo[];
  venueMarkets: ComparisonVenueMarket[];
  buildGmxBreakdown: (market: MarketInfo, scenario: TradingCostScenario) => TradingCostBreakdown;
  buildVenueBreakdown: (match: MatchedTradingMarket, scenario: TradingCostScenario) => TradingCostBreakdown;
}): TradingCostRow[] {
  const { matched } = matchGmxMarketsToVenueMarkets(gmxMarkets, venueMarkets);
  const rows = matched.map((match) => {
    const gmx = buildGmxBreakdown(match.gmxMarket, scenario);
    const venue = buildVenueBreakdown(match, scenario);
    const deltaUsd = calculateDeltaUsd(gmx.totalUsd, venue.totalUsd);

    return {
      marketKey: `${match.venueMarket.providerId}:${match.venueMarket.symbol}:${match.gmxMarket.marketTokenAddress}`,
      displayName: match.gmxMarket.name,
      indexSymbol: match.gmxMarket.indexToken.symbol,
      venueVolume24hUsd: match.venueMarket.volume24hUsd,
      gmx,
      venue,
      deltaUsd,
      status: getCombinedStatus(gmx.status, venue.status),
    };
  });

  return sortTradingCostRowsByVenueVolume(rows);
}
