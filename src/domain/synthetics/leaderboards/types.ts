import { BigNumber } from "ethers";
import { TokenData } from "../tokens";
import { MarketInfo } from "../markets";
import { TableCell } from "components/Table/types";

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
  borrowingFeeUsd: string;
  fundingFeeUsd: string;
  positionFeeUsd: string;
  priceImpactUsd: string;
};

export type AccountPerf = {
  id: string;
  account: string;
  ensName?: string;
  avatarUrl?: string;
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
  borrowingFeeUsd: BigNumber;
  fundingFeeUsd: BigNumber;
  positionFeeUsd: BigNumber;
  priceImpactUsd: BigNumber;
};

export type PerfByAccount = { [key: string]: AccountPerf };

export type TopAccountsRow = {
  id: string;
  rank: number;
  account: string;
  ensName?: string;
  avatarUrl?: string;
  absPnl: BigNumber;
  relPnl: BigNumber;
  rPnl: BigNumber;
  uPnl: BigNumber;
  maxCollateral: BigNumber;
  size: BigNumber;
  leverage: BigNumber;
  wins: BigNumber;
  losses: BigNumber;
};

export type OpenPositionJson = {
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
  borrowingFeeUsd: string;
  fundingFeeUsd: string;
  positionFeeUsd: string;
  priceImpactUsd: string;
};

export type AccountPositionsSummary = {
  account: string;
  unrealizedPnl: BigNumber;
  unrealizedPnlAfterFees: BigNumber;
  sumSize: BigNumber;
  sumCollateral: BigNumber;
  sumMaxSize: BigNumber;
  totalCollateral: BigNumber;
  priceImpactUsd: BigNumber;
  collectedFundingFeesUsd: BigNumber;
  collectedBorrowingFeesUsd: BigNumber;
  collectedPositionFeesUsd: BigNumber;
  pendingFundingFeesUsd: BigNumber;
  pendingClaimableFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  closingFeeUsd: BigNumber;
  openPositionsCount: number;
};

export type PositionsSummaryByAccount = Record<string, AccountPositionsSummary>;

export type TopPositionsRow = {
  key: TableCell;
  rank: TableCell;
  account: TableCell;
  unrealizedPnl: TableCell;
  position: TableCell;
  entryPrice: TableCell;
  size: TableCell;
  liqPrice: TableCell;
  leverage: TableCell;
};

export type Ranked<T> = T & { rank: number };

export type OpenPosition = {
  key: string;
  account: string;
  ensName?: string;
  avatarUrl?: string;
  isLong: boolean;
  marketInfo: MarketInfo;
  markPrice: BigNumber;
  collateralToken: TokenData;
  unrealizedPnl: BigNumber;
  unrealizedPnlAfterFees: BigNumber;
  entryPrice: BigNumber;
  sizeInUsd: BigNumber;
  collateralAmount: BigNumber;
  collateralAmountUsd: BigNumber;
  maxSize: BigNumber;
  priceImpactUsd: BigNumber;
  collectedBorrowingFeesUsd: BigNumber;
  collectedFundingFeesUsd: BigNumber;
  collectedPositionFeesUsd: BigNumber;
  pendingFundingFeesUsd: BigNumber;
  pendingClaimableFundingFeesUsd: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  closingFeeUsd: BigNumber;
  liquidationPrice?: BigNumber;
  liquidationPriceDelta?: BigNumber;
  liquidationPriceDeltaRel?: BigNumber;
  leverage?: BigNumber;
};

export type DataByPeriod<T> = {
  [key in PerfPeriod]?: T[];
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
  data: T[];
  error: Error | null; 
};

export type LeaderboardContextType = {
  positions: RemoteData<OpenPosition>;
  accounts: RemoteData<TopAccountsRow>;
  period: PerfPeriod;
  setPeriod: (_: PerfPeriod) => void;
};
