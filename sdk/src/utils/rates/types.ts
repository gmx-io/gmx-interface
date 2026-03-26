export type ApiParameterPeriod = "1d" | "7d" | "30d" | "90d" | "180d" | "1y" | "total";

export type RatesSnapshot = {
  netRateLong: string;
  netRateShort: string;
  fundingRateLong: string;
  fundingRateShort: string;
  borrowingRateLong: string;
  borrowingRateShort: string;
  timestamp: number;
};

export type MarketRates = {
  marketAddress: string;
  ratesSnapshots: RatesSnapshot[];
};

export type RatesParams = {
  period?: ApiParameterPeriod;
  averageBy?: "1d" | "7d" | "30d";
  address?: string;
};
