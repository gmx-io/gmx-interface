import { BigNumber } from "ethers";

export enum PerfPeriod {
  DAY = "24 hours",
  WEEK = "7 days",
  MONTH = "1 month",
  TOTAL = "All time",
};

export type AccountPerfJson = {
  id: string;
  timestamp: number;
  period: "hourly" | "daily";
  account: string;
  wins: string;
  losses: string;
  volume: string;
  totalPnl: string;
  sumSize: string;
  sumCollateral: string;
  sumMaxCollateral: string;
  sumMaxSize: string;
  positionCount: string;
};

export type AccountPerf = {
  id: string;
  period: PerfPeriod;
  account: string;
  wins: BigNumber;
  losses: BigNumber;
  totalPnl: BigNumber;
  sumSize: BigNumber;
  sumCollateral: BigNumber;
  sumMaxCollateral: BigNumber;
  sumMaxSize: BigNumber;
  positionCount: BigNumber;
};

export type PerfByAccount = { [key: string]: AccountPerf };

export type AccountScores = {
  id: string;
  rank: number;
  account: string;
  absPnl: BigNumber;
  relPnl: BigNumber;
  size: BigNumber;
  leverage: BigNumber;
};

export type AccountOpenPositionJson = {
  id: string;
  account: string;
  market: string;
  collateralToken: string;
  isLong: boolean;
  sizeInTokens: string;
  sizeInUsd: string;
  realizedPnl: string;
  collateralAmount: string;
  entryPrice: string;
  maxSize: string;
  maxCollateral: string;
  sumSize: string;
  sumCollateral: string;
  changeCount: string;
};

export type AccountOpenPosition = {
  id: string;
  account: string;
  market: string;
  collateralToken: string;
  isLong: boolean;
  sizeInTokens: BigNumber;
  sizeInUsd: BigNumber;
  realizedPnl: BigNumber;
  collateralAmount: BigNumber;
  entryPrice: BigNumber;
  maxSize: BigNumber;
  maxCollateral: BigNumber;
  sumSize: BigNumber;
  sumCollateral: BigNumber;
  changeCount: BigNumber;
};

export type AccountPositionsSummary = {
  account: string;
  positions: Array<PositionScores>;
  unrealizedPnl: BigNumber;
  sumCollateral: BigNumber;
};

export type PositionsSummaryByAccount = Record<string, AccountPositionsSummary>;

export type PositionScores = {
  id: string;
  account: string;
  market: string;
  isLong: boolean;
  collateralToken: string;
  unrealizedPnl: BigNumber;
  entryPrice: BigNumber;
  size: BigNumber;
  liqPrice: BigNumber;
  collateralAmount: BigNumber;
};

export type DataByPeriod<T> = {
  [key in PerfPeriod]?: Array<T>;
};

export type TopAccountParams = {
  period?: "daily" | "hourly";
  pageSize?: number;
  offset?: number;
  orderBy?: "totalPnl";
  orderDirection?: "desc";
  since?: number;
};

export type TopPositionParams = {
  pageSize?: number;
  offset?: number;
  orderBy?: "sizeInUsd";
  orderDirection?: "desc";
};

export type RemoteData<T> = {
  isLoading: boolean;
  data: Array<T>;
  error: Error | null; 
};

export type LeaderboardContextType = {
  chainId: number;
  topPositions: RemoteData<PositionScores>;
  topAccounts: RemoteData<AccountScores>;
  period: PerfPeriod;
  setPeriod: (_: PerfPeriod) => void;
};
