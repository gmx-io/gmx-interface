import type { MarketInfo } from "utils/markets/types";

export type AcceptablePriceParams = {
  marketInfo: MarketInfo;
  isIncrease: boolean;
  isLimit: boolean;
  isLong: boolean;
  indexPrice: bigint;
  sizeDeltaUsd: bigint;
  maxNegativePriceImpactBps?: bigint;
  sizeDeltaInTokens?: bigint;
  positionSizeInUsd?: bigint;
  positionSizeInTokens?: bigint;
};

export type GmsolAcceptablePriceParams = AcceptablePriceParams & { priceImpactDeltaUsd: bigint };

export type OhlcvCandle = {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
};

export type OhlcvParams = {
  symbol: string;
  timeframe: string;
  limit?: number;
  since?: number;
};
