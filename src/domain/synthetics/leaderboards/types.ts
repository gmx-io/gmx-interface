import { BigNumber } from "ethers";

export type AccountPerfJson = {
  id: string;
  timestamp: number;
  period: "hourly" | "daily";
  account: string;
  wins: string;
  losses: string;
  volume: string;
  totalPnl: string;
  maxCollateral: string;
};

export type AccountPerf = {
  id: string;
  timestamp: number;
  period: "hourly" | "daily";
  account: string;
  wins: BigNumber;
  losses: BigNumber;
  volume: BigNumber;
  totalPnl: BigNumber;
  maxCollateral: BigNumber;
};

export type AccountScores = {
  id: string;
  account: string;
  absPnl: string;
  relPnl: string;
  sizeLev: string;
  perf: string;
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
};

export type PositionScores = {
  id: string;
  account: string;
  unrealizedPnl: string;
  market: string;
  entryPrice: string;
  sizeLiqPrice: string;
};

export enum AccountFilterPeriod {
  DAY,
  WEEK,
  MONTH,
  TOTAL,
}

export type DataByPeriod<T> = {
  [key in AccountFilterPeriod]?: Array<T>;
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
  period: AccountFilterPeriod;
  setPeriod: (_: AccountFilterPeriod) => void;
};
