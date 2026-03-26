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
