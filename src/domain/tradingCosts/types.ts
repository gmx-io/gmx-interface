import type { MarketInfo } from "domain/synthetics/markets";

export type TradingCostProviderId = "gmx" | "hyperliquid";
export type TradingCostSide = "long" | "short";
export type ComparisonVenueId = "hyperliquid";

export type HyperliquidVenueAssumptions = {
  takerFeeRate: number;
};

export type TradingCostScenario = {
  sizeUsd: bigint;
  side: TradingCostSide;
  holdingPeriodHours: number;
  comparisonVenue: ComparisonVenueId;
  venueAssumptions: {
    hyperliquid: HyperliquidVenueAssumptions;
  };
};

export type TradingCostComponentKey =
  | "protocolFee"
  | "openPriceImpact"
  | "closePriceImpact"
  | "netRate"
  | "networkFee"
  | "venueExecutionImpact"
  | "funding";

export type TradingCostComponent = {
  key: TradingCostComponentKey;
  label: string;
  usd: bigint;
};

export type TradingCostStatus = "ready" | "loading" | "unmatched" | "insufficientDepth" | "providerError" | "stale";

export type TradingCostBreakdown = {
  providerId: TradingCostProviderId;
  totalUsd: bigint | undefined;
  components: TradingCostComponent[];
  timestamp: number | undefined;
  status: TradingCostStatus;
  warnings: string[];
};

export type TradingCostRow = {
  marketKey: string;
  displayName: string;
  indexSymbol: string;
  venueVolume24hUsd: bigint | undefined;
  gmx: TradingCostBreakdown;
  venue: TradingCostBreakdown;
  deltaUsd: bigint | undefined;
  status: TradingCostStatus;
};

export type ComparisonVenueMarket = {
  providerId: Exclude<TradingCostProviderId, "gmx">;
  symbol: string;
  displayName: string;
  volume24hUsd: bigint | undefined;
  isDisabled?: boolean;
};

export type MatchedTradingMarket = {
  gmxMarket: MarketInfo;
  venueMarket: ComparisonVenueMarket;
};
