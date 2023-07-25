import { BigNumber } from "ethers";
import { Market } from "../markets";

export enum PerfPeriod {
  DAY = "24 hours",
  WEEK = "7 days",
  MONTH = "1 month",
  TOTAL = "All time",
};

export type AccountPerfJson = {
  id: string;
  timestamp: number;
  period: "hourly" | "daily" | "total";
  account: string;
  wins: string;
  losses: string;
  volume: string;
  totalPnl: string;
  totalCollateral: string;
  maxCollateral: string;
  cumsumCollateral: string;
  cumsumSize: string;
  sumMaxSize: string;
  closedCount: string;
};

export type AccountPerf = {
  id: string;
  account: string;
  period: PerfPeriod;
  timestamp: number;
  wins: BigNumber;
  losses: BigNumber;
  totalPnl: BigNumber;
  totalCollateral: BigNumber;
  maxCollateral: BigNumber;
  cumsumSize: BigNumber;
  cumsumCollateral: BigNumber;
  sumMaxSize: BigNumber;
  closedCount: BigNumber;
};

export type PerfByAccount = { [key: string]: AccountPerf };

export type AccountScores = {
  id: string;
  account: string;
  absPnl: BigNumber;
  relPnl: BigNumber;
  size: BigNumber;
  leverage: BigNumber;
  wins: BigNumber;
  losses: BigNumber;
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
};

export type AccountOpenPosition = {
  id: string;
  account: string;
  market: string;
  marketData?: Market;
  collateralToken: string;
  isLong: boolean;
  sizeInTokens: BigNumber;
  sizeInUsd: BigNumber;
  realizedPnl: BigNumber;
  collateralAmount: BigNumber;
  entryPrice: BigNumber;
  maxSize: BigNumber;
};

export type AccountPositionsSummary = {
  account: string;
  positions: Array<PositionScores>;
  unrealizedPnl: BigNumber;
  sumSize: BigNumber;
  sumCollateral: BigNumber;
  sumMaxSize: BigNumber;
  totalCollateral: BigNumber;
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
  sizeInUsd: BigNumber;
  liqPrice: BigNumber;
  collateralAmount: BigNumber;
  collateralAmountUsd: BigNumber;
  maxSize: BigNumber;
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
