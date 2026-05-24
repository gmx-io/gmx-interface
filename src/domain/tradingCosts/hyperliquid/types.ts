import type { TradingCostSide } from "../types";

export type HyperliquidAssetMeta = {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  marginTableId: number;
  isDelisted?: boolean;
};

export type HyperliquidAssetCtx = {
  dayNtlVlm?: string;
  funding?: string;
  markPx?: string;
  midPx?: string;
  oraclePx?: string;
  premium?: string;
};

export type HyperliquidMetaAndAssetCtxsResponse = [{ universe: HyperliquidAssetMeta[] }, HyperliquidAssetCtx[]];

export type HyperliquidBookLevel = {
  px: string;
  sz: string;
  n: number;
};

export type HyperliquidL2BookResponse = {
  coin: string;
  time: number;
  levels: [HyperliquidBookLevel[], HyperliquidBookLevel[]];
};

export type HyperliquidNormalizedMarket = {
  symbol: string;
  displayName: string;
  isDisabled: boolean;
  volume24hUsd: bigint | undefined;
  markPrice: number | undefined;
  midPrice: number | undefined;
  hourlyFundingRate: number | undefined;
  timestamp: number;
};

export type BookSide = "ask" | "bid";

export type HyperliquidLeg = {
  bookSide: BookSide;
  tradingSide: TradingCostSide;
};
