import { BigNumber } from "ethers";
import { TokenData } from "../tokens";
import { MarketInfo } from "../markets";

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
  key: string;
  rank: number;
  account: string;
  ensName?: string;
  avatarUrl?: string;
  unrealizedPnl: BigNumber;
  market: MarketInfo;
  entryPrice: BigNumber;
  size: BigNumber;
  liqPrice?: BigNumber;
  isLong: boolean;
  markPrice: BigNumber;
  liqPriceDelta?: BigNumber;
  liqPriceDeltaRel?: BigNumber;
  leverage?: BigNumber;
  collateral: BigNumber;
};

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
  topPositions: RemoteData<TopPositionsRow>;
  topAccounts: RemoteData<TopAccountsRow>;
  period: PerfPeriod;
  setPeriod: (_: PerfPeriod) => void;
  setAccountsOrderBy: React.Dispatch<React.SetStateAction<keyof TopAccountsRow>>;
  setAccountsOrderDirection: React.Dispatch<React.SetStateAction<number>>;
  setPositionsOrderBy: React.Dispatch<React.SetStateAction<keyof TopPositionsRow>>;
  setPositionsOrderDirection: React.Dispatch<React.SetStateAction<number>>;
  topAccountsHeaderClick: (key: keyof TopAccountsRow) => () => void;
  topPositionsHeaderClick: (key: keyof TopPositionsRow) => () => void;
};
