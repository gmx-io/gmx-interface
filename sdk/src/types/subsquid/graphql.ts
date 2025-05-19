/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** Big number integer */
  BigInt: { input: any; output: any };
};

export type AccountPnlHistoryPointObject = {
  __typename?: "AccountPnlHistoryPointObject";
  account: Scalars["String"]["output"];
  cumulativePnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedPnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedPriceImpact: Scalars["BigInt"]["output"];
  pnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPriceImpact: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedPnl: Scalars["BigInt"]["output"];
  timestamp: Scalars["Int"]["output"];
  /** Field for debug */
  unrealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedPnl: Scalars["BigInt"]["output"];
};

export type AccountPnlSummaryBucketObject = {
  __typename?: "AccountPnlSummaryBucketObject";
  bucketLabel: Scalars["String"]["output"];
  losses: Scalars["Int"]["output"];
  pnlBps: Scalars["BigInt"]["output"];
  pnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedFeesUsd: Scalars["BigInt"]["output"];
  realizedPnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPriceImpactUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedFeesUsd: Scalars["BigInt"]["output"];
  startUnrealizedPnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedFeesUsd: Scalars["BigInt"]["output"];
  unrealizedPnlUsd: Scalars["BigInt"]["output"];
  usedCapitalUsd: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Int"]["output"];
  /** Null when no losses and no wins */
  winsLossesRatioBps?: Maybe<Scalars["BigInt"]["output"]>;
};

export type AccountStat = {
  __typename?: "AccountStat";
  closedCount: Scalars["Int"]["output"];
  cumsumCollateral: Scalars["BigInt"]["output"];
  cumsumSize: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  losses: Scalars["Int"]["output"];
  maxCapital: Scalars["BigInt"]["output"];
  netCapital: Scalars["BigInt"]["output"];
  positions: Array<Position>;
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  sumMaxSize: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Int"]["output"];
};

export type AccountStatPositionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
};

export type AccountStatEdge = {
  __typename?: "AccountStatEdge";
  cursor: Scalars["String"]["output"];
  node: AccountStat;
};

export enum AccountStatOrderByInput {
  ClosedCountAsc = "closedCount_ASC",
  ClosedCountAscNullsFirst = "closedCount_ASC_NULLS_FIRST",
  ClosedCountAscNullsLast = "closedCount_ASC_NULLS_LAST",
  ClosedCountDesc = "closedCount_DESC",
  ClosedCountDescNullsFirst = "closedCount_DESC_NULLS_FIRST",
  ClosedCountDescNullsLast = "closedCount_DESC_NULLS_LAST",
  CumsumCollateralAsc = "cumsumCollateral_ASC",
  CumsumCollateralAscNullsFirst = "cumsumCollateral_ASC_NULLS_FIRST",
  CumsumCollateralAscNullsLast = "cumsumCollateral_ASC_NULLS_LAST",
  CumsumCollateralDesc = "cumsumCollateral_DESC",
  CumsumCollateralDescNullsFirst = "cumsumCollateral_DESC_NULLS_FIRST",
  CumsumCollateralDescNullsLast = "cumsumCollateral_DESC_NULLS_LAST",
  CumsumSizeAsc = "cumsumSize_ASC",
  CumsumSizeAscNullsFirst = "cumsumSize_ASC_NULLS_FIRST",
  CumsumSizeAscNullsLast = "cumsumSize_ASC_NULLS_LAST",
  CumsumSizeDesc = "cumsumSize_DESC",
  CumsumSizeDescNullsFirst = "cumsumSize_DESC_NULLS_FIRST",
  CumsumSizeDescNullsLast = "cumsumSize_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LossesAsc = "losses_ASC",
  LossesAscNullsFirst = "losses_ASC_NULLS_FIRST",
  LossesAscNullsLast = "losses_ASC_NULLS_LAST",
  LossesDesc = "losses_DESC",
  LossesDescNullsFirst = "losses_DESC_NULLS_FIRST",
  LossesDescNullsLast = "losses_DESC_NULLS_LAST",
  MaxCapitalAsc = "maxCapital_ASC",
  MaxCapitalAscNullsFirst = "maxCapital_ASC_NULLS_FIRST",
  MaxCapitalAscNullsLast = "maxCapital_ASC_NULLS_LAST",
  MaxCapitalDesc = "maxCapital_DESC",
  MaxCapitalDescNullsFirst = "maxCapital_DESC_NULLS_FIRST",
  MaxCapitalDescNullsLast = "maxCapital_DESC_NULLS_LAST",
  NetCapitalAsc = "netCapital_ASC",
  NetCapitalAscNullsFirst = "netCapital_ASC_NULLS_FIRST",
  NetCapitalAscNullsLast = "netCapital_ASC_NULLS_LAST",
  NetCapitalDesc = "netCapital_DESC",
  NetCapitalDescNullsFirst = "netCapital_DESC_NULLS_FIRST",
  NetCapitalDescNullsLast = "netCapital_DESC_NULLS_LAST",
  RealizedFeesAsc = "realizedFees_ASC",
  RealizedFeesAscNullsFirst = "realizedFees_ASC_NULLS_FIRST",
  RealizedFeesAscNullsLast = "realizedFees_ASC_NULLS_LAST",
  RealizedFeesDesc = "realizedFees_DESC",
  RealizedFeesDescNullsFirst = "realizedFees_DESC_NULLS_FIRST",
  RealizedFeesDescNullsLast = "realizedFees_DESC_NULLS_LAST",
  RealizedPnlAsc = "realizedPnl_ASC",
  RealizedPnlAscNullsFirst = "realizedPnl_ASC_NULLS_FIRST",
  RealizedPnlAscNullsLast = "realizedPnl_ASC_NULLS_LAST",
  RealizedPnlDesc = "realizedPnl_DESC",
  RealizedPnlDescNullsFirst = "realizedPnl_DESC_NULLS_FIRST",
  RealizedPnlDescNullsLast = "realizedPnl_DESC_NULLS_LAST",
  RealizedPriceImpactAsc = "realizedPriceImpact_ASC",
  RealizedPriceImpactAscNullsFirst = "realizedPriceImpact_ASC_NULLS_FIRST",
  RealizedPriceImpactAscNullsLast = "realizedPriceImpact_ASC_NULLS_LAST",
  RealizedPriceImpactDesc = "realizedPriceImpact_DESC",
  RealizedPriceImpactDescNullsFirst = "realizedPriceImpact_DESC_NULLS_FIRST",
  RealizedPriceImpactDescNullsLast = "realizedPriceImpact_DESC_NULLS_LAST",
  SumMaxSizeAsc = "sumMaxSize_ASC",
  SumMaxSizeAscNullsFirst = "sumMaxSize_ASC_NULLS_FIRST",
  SumMaxSizeAscNullsLast = "sumMaxSize_ASC_NULLS_LAST",
  SumMaxSizeDesc = "sumMaxSize_DESC",
  SumMaxSizeDescNullsFirst = "sumMaxSize_DESC_NULLS_FIRST",
  SumMaxSizeDescNullsLast = "sumMaxSize_DESC_NULLS_LAST",
  VolumeAsc = "volume_ASC",
  VolumeAscNullsFirst = "volume_ASC_NULLS_FIRST",
  VolumeAscNullsLast = "volume_ASC_NULLS_LAST",
  VolumeDesc = "volume_DESC",
  VolumeDescNullsFirst = "volume_DESC_NULLS_FIRST",
  VolumeDescNullsLast = "volume_DESC_NULLS_LAST",
  WinsAsc = "wins_ASC",
  WinsAscNullsFirst = "wins_ASC_NULLS_FIRST",
  WinsAscNullsLast = "wins_ASC_NULLS_LAST",
  WinsDesc = "wins_DESC",
  WinsDescNullsFirst = "wins_DESC_NULLS_FIRST",
  WinsDescNullsLast = "wins_DESC_NULLS_LAST",
}

export type AccountStatWhereInput = {
  AND?: InputMaybe<Array<AccountStatWhereInput>>;
  OR?: InputMaybe<Array<AccountStatWhereInput>>;
  closedCount_eq?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_gt?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_gte?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  closedCount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  closedCount_lt?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_lte?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  cumsumCollateral_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumCollateral_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumsumCollateral_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumsumSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  losses_eq?: InputMaybe<Scalars["Int"]["input"]>;
  losses_gt?: InputMaybe<Scalars["Int"]["input"]>;
  losses_gte?: InputMaybe<Scalars["Int"]["input"]>;
  losses_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  losses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  losses_lt?: InputMaybe<Scalars["Int"]["input"]>;
  losses_lte?: InputMaybe<Scalars["Int"]["input"]>;
  losses_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  losses_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  maxCapital_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxCapital_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxCapital_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  netCapital_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  netCapital_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  netCapital_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positions_every?: InputMaybe<PositionWhereInput>;
  positions_none?: InputMaybe<PositionWhereInput>;
  positions_some?: InputMaybe<PositionWhereInput>;
  realizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sumMaxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sumMaxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sumMaxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  volume_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  volume_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  volume_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  wins_eq?: InputMaybe<Scalars["Int"]["input"]>;
  wins_gt?: InputMaybe<Scalars["Int"]["input"]>;
  wins_gte?: InputMaybe<Scalars["Int"]["input"]>;
  wins_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  wins_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  wins_lt?: InputMaybe<Scalars["Int"]["input"]>;
  wins_lte?: InputMaybe<Scalars["Int"]["input"]>;
  wins_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  wins_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type AccountStatsConnection = {
  __typename?: "AccountStatsConnection";
  edges: Array<AccountStatEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type AprSnapshot = {
  __typename?: "AprSnapshot";
  address: Scalars["String"]["output"];
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
};

export type AprSnapshotEdge = {
  __typename?: "AprSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: AprSnapshot;
};

export enum AprSnapshotOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  AprByBorrowingFeeAsc = "aprByBorrowingFee_ASC",
  AprByBorrowingFeeAscNullsFirst = "aprByBorrowingFee_ASC_NULLS_FIRST",
  AprByBorrowingFeeAscNullsLast = "aprByBorrowingFee_ASC_NULLS_LAST",
  AprByBorrowingFeeDesc = "aprByBorrowingFee_DESC",
  AprByBorrowingFeeDescNullsFirst = "aprByBorrowingFee_DESC_NULLS_FIRST",
  AprByBorrowingFeeDescNullsLast = "aprByBorrowingFee_DESC_NULLS_LAST",
  AprByFeeAsc = "aprByFee_ASC",
  AprByFeeAscNullsFirst = "aprByFee_ASC_NULLS_FIRST",
  AprByFeeAscNullsLast = "aprByFee_ASC_NULLS_LAST",
  AprByFeeDesc = "aprByFee_DESC",
  AprByFeeDescNullsFirst = "aprByFee_DESC_NULLS_FIRST",
  AprByFeeDescNullsLast = "aprByFee_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type AprSnapshotWhereInput = {
  AND?: InputMaybe<Array<AprSnapshotWhereInput>>;
  OR?: InputMaybe<Array<AprSnapshotWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  aprByBorrowingFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByBorrowingFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aprByBorrowingFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aprByFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type AprSnapshotsConnection = {
  __typename?: "AprSnapshotsConnection";
  edges: Array<AprSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type BorrowingRateSnapshot = {
  __typename?: "BorrowingRateSnapshot";
  address: Scalars["String"]["output"];
  borrowingFactorPerSecondLong: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondShort: Scalars["BigInt"]["output"];
  borrowingRateForPool: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
};

export type BorrowingRateSnapshotEdge = {
  __typename?: "BorrowingRateSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: BorrowingRateSnapshot;
};

export enum BorrowingRateSnapshotOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  BorrowingFactorPerSecondLongAsc = "borrowingFactorPerSecondLong_ASC",
  BorrowingFactorPerSecondLongAscNullsFirst = "borrowingFactorPerSecondLong_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondLongAscNullsLast = "borrowingFactorPerSecondLong_ASC_NULLS_LAST",
  BorrowingFactorPerSecondLongDesc = "borrowingFactorPerSecondLong_DESC",
  BorrowingFactorPerSecondLongDescNullsFirst = "borrowingFactorPerSecondLong_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondLongDescNullsLast = "borrowingFactorPerSecondLong_DESC_NULLS_LAST",
  BorrowingFactorPerSecondShortAsc = "borrowingFactorPerSecondShort_ASC",
  BorrowingFactorPerSecondShortAscNullsFirst = "borrowingFactorPerSecondShort_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondShortAscNullsLast = "borrowingFactorPerSecondShort_ASC_NULLS_LAST",
  BorrowingFactorPerSecondShortDesc = "borrowingFactorPerSecondShort_DESC",
  BorrowingFactorPerSecondShortDescNullsFirst = "borrowingFactorPerSecondShort_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondShortDescNullsLast = "borrowingFactorPerSecondShort_DESC_NULLS_LAST",
  BorrowingRateForPoolAsc = "borrowingRateForPool_ASC",
  BorrowingRateForPoolAscNullsFirst = "borrowingRateForPool_ASC_NULLS_FIRST",
  BorrowingRateForPoolAscNullsLast = "borrowingRateForPool_ASC_NULLS_LAST",
  BorrowingRateForPoolDesc = "borrowingRateForPool_DESC",
  BorrowingRateForPoolDescNullsFirst = "borrowingRateForPool_DESC_NULLS_FIRST",
  BorrowingRateForPoolDescNullsLast = "borrowingRateForPool_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type BorrowingRateSnapshotWhereInput = {
  AND?: InputMaybe<Array<BorrowingRateSnapshotWhereInput>>;
  OR?: InputMaybe<Array<BorrowingRateSnapshotWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFactorPerSecondLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingRateForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingRateForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingRateForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type BorrowingRateSnapshotsConnection = {
  __typename?: "BorrowingRateSnapshotsConnection";
  edges: Array<BorrowingRateSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimAction = {
  __typename?: "ClaimAction";
  account: Scalars["String"]["output"];
  amounts: Array<Scalars["String"]["output"]>;
  eventName: ClaimActionType;
  id: Scalars["String"]["output"];
  isLongOrders: Array<Scalars["Boolean"]["output"]>;
  marketAddresses: Array<Scalars["String"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  tokenAddresses: Array<Scalars["String"]["output"]>;
  tokenPrices: Array<Scalars["String"]["output"]>;
  transaction: Transaction;
};

export type ClaimActionEdge = {
  __typename?: "ClaimActionEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimAction;
};

export enum ClaimActionOrderByInput {
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export enum ClaimActionType {
  ClaimFunding = "ClaimFunding",
  ClaimPriceImpact = "ClaimPriceImpact",
  SettleFundingFeeCancelled = "SettleFundingFeeCancelled",
  SettleFundingFeeCreated = "SettleFundingFeeCreated",
  SettleFundingFeeExecuted = "SettleFundingFeeExecuted",
}

export type ClaimActionWhereInput = {
  AND?: InputMaybe<Array<ClaimActionWhereInput>>;
  OR?: InputMaybe<Array<ClaimActionWhereInput>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  amounts_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_eq?: InputMaybe<ClaimActionType>;
  eventName_in?: InputMaybe<Array<ClaimActionType>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_not_eq?: InputMaybe<ClaimActionType>;
  eventName_not_in?: InputMaybe<Array<ClaimActionType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLongOrders_containsAll?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_containsAny?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_containsNone?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  tokenAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenPrices_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ClaimActionsConnection = {
  __typename?: "ClaimActionsConnection";
  edges: Array<ClaimActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimRef = {
  __typename?: "ClaimRef";
  id: Scalars["String"]["output"];
};

export type ClaimRefEdge = {
  __typename?: "ClaimRefEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimRef;
};

export enum ClaimRefOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
}

export type ClaimRefWhereInput = {
  AND?: InputMaybe<Array<ClaimRefWhereInput>>;
  OR?: InputMaybe<Array<ClaimRefWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type ClaimRefsConnection = {
  __typename?: "ClaimRefsConnection";
  edges: Array<ClaimRefEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimableFundingFeeInfo = {
  __typename?: "ClaimableFundingFeeInfo";
  amounts: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  marketAddresses: Array<Scalars["String"]["output"]>;
  tokenAddresses: Array<Scalars["String"]["output"]>;
};

export type ClaimableFundingFeeInfoEdge = {
  __typename?: "ClaimableFundingFeeInfoEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimableFundingFeeInfo;
};

export enum ClaimableFundingFeeInfoOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
}

export type ClaimableFundingFeeInfoWhereInput = {
  AND?: InputMaybe<Array<ClaimableFundingFeeInfoWhereInput>>;
  OR?: InputMaybe<Array<ClaimableFundingFeeInfoWhereInput>>;
  amounts_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ClaimableFundingFeeInfosConnection = {
  __typename?: "ClaimableFundingFeeInfosConnection";
  edges: Array<ClaimableFundingFeeInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type CollectedFeesInfo = {
  __typename?: "CollectedFeesInfo";
  address: Scalars["String"]["output"];
  borrowingFeeUsdForPool: Scalars["BigInt"]["output"];
  borrowingFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  cumulativeBorrowingFeeUsdForPool: Scalars["BigInt"]["output"];
  cumulativeBorrowingFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  cumulativeFeeUsdForPool: Scalars["BigInt"]["output"];
  cumulativeFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  entityType: EntityType;
  feeUsdForPool: Scalars["BigInt"]["output"];
  feeUsdPerPoolValue: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  period: Scalars["String"]["output"];
  timestampGroup: Scalars["Int"]["output"];
};

export type CollectedFeesInfoEdge = {
  __typename?: "CollectedFeesInfoEdge";
  cursor: Scalars["String"]["output"];
  node: CollectedFeesInfo;
};

export enum CollectedFeesInfoOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  BorrowingFeeUsdForPoolAsc = "borrowingFeeUsdForPool_ASC",
  BorrowingFeeUsdForPoolAscNullsFirst = "borrowingFeeUsdForPool_ASC_NULLS_FIRST",
  BorrowingFeeUsdForPoolAscNullsLast = "borrowingFeeUsdForPool_ASC_NULLS_LAST",
  BorrowingFeeUsdForPoolDesc = "borrowingFeeUsdForPool_DESC",
  BorrowingFeeUsdForPoolDescNullsFirst = "borrowingFeeUsdForPool_DESC_NULLS_FIRST",
  BorrowingFeeUsdForPoolDescNullsLast = "borrowingFeeUsdForPool_DESC_NULLS_LAST",
  BorrowingFeeUsdPerPoolValueAsc = "borrowingFeeUsdPerPoolValue_ASC",
  BorrowingFeeUsdPerPoolValueAscNullsFirst = "borrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  BorrowingFeeUsdPerPoolValueAscNullsLast = "borrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  BorrowingFeeUsdPerPoolValueDesc = "borrowingFeeUsdPerPoolValue_DESC",
  BorrowingFeeUsdPerPoolValueDescNullsFirst = "borrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  BorrowingFeeUsdPerPoolValueDescNullsLast = "borrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  CumulativeBorrowingFeeUsdForPoolAsc = "cumulativeBorrowingFeeUsdForPool_ASC",
  CumulativeBorrowingFeeUsdForPoolAscNullsFirst = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdForPoolAscNullsLast = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_LAST",
  CumulativeBorrowingFeeUsdForPoolDesc = "cumulativeBorrowingFeeUsdForPool_DESC",
  CumulativeBorrowingFeeUsdForPoolDescNullsFirst = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdForPoolDescNullsLast = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_LAST",
  CumulativeBorrowingFeeUsdPerPoolValueAsc = "cumulativeBorrowingFeeUsdPerPoolValue_ASC",
  CumulativeBorrowingFeeUsdPerPoolValueAscNullsFirst = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdPerPoolValueAscNullsLast = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  CumulativeBorrowingFeeUsdPerPoolValueDesc = "cumulativeBorrowingFeeUsdPerPoolValue_DESC",
  CumulativeBorrowingFeeUsdPerPoolValueDescNullsFirst = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdPerPoolValueDescNullsLast = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  CumulativeFeeUsdForPoolAsc = "cumulativeFeeUsdForPool_ASC",
  CumulativeFeeUsdForPoolAscNullsFirst = "cumulativeFeeUsdForPool_ASC_NULLS_FIRST",
  CumulativeFeeUsdForPoolAscNullsLast = "cumulativeFeeUsdForPool_ASC_NULLS_LAST",
  CumulativeFeeUsdForPoolDesc = "cumulativeFeeUsdForPool_DESC",
  CumulativeFeeUsdForPoolDescNullsFirst = "cumulativeFeeUsdForPool_DESC_NULLS_FIRST",
  CumulativeFeeUsdForPoolDescNullsLast = "cumulativeFeeUsdForPool_DESC_NULLS_LAST",
  CumulativeFeeUsdPerPoolValueAsc = "cumulativeFeeUsdPerPoolValue_ASC",
  CumulativeFeeUsdPerPoolValueAscNullsFirst = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  CumulativeFeeUsdPerPoolValueAscNullsLast = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_LAST",
  CumulativeFeeUsdPerPoolValueDesc = "cumulativeFeeUsdPerPoolValue_DESC",
  CumulativeFeeUsdPerPoolValueDescNullsFirst = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  CumulativeFeeUsdPerPoolValueDescNullsLast = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  FeeUsdForPoolAsc = "feeUsdForPool_ASC",
  FeeUsdForPoolAscNullsFirst = "feeUsdForPool_ASC_NULLS_FIRST",
  FeeUsdForPoolAscNullsLast = "feeUsdForPool_ASC_NULLS_LAST",
  FeeUsdForPoolDesc = "feeUsdForPool_DESC",
  FeeUsdForPoolDescNullsFirst = "feeUsdForPool_DESC_NULLS_FIRST",
  FeeUsdForPoolDescNullsLast = "feeUsdForPool_DESC_NULLS_LAST",
  FeeUsdPerPoolValueAsc = "feeUsdPerPoolValue_ASC",
  FeeUsdPerPoolValueAscNullsFirst = "feeUsdPerPoolValue_ASC_NULLS_FIRST",
  FeeUsdPerPoolValueAscNullsLast = "feeUsdPerPoolValue_ASC_NULLS_LAST",
  FeeUsdPerPoolValueDesc = "feeUsdPerPoolValue_DESC",
  FeeUsdPerPoolValueDescNullsFirst = "feeUsdPerPoolValue_DESC_NULLS_FIRST",
  FeeUsdPerPoolValueDescNullsLast = "feeUsdPerPoolValue_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  PeriodAsc = "period_ASC",
  PeriodAscNullsFirst = "period_ASC_NULLS_FIRST",
  PeriodAscNullsLast = "period_ASC_NULLS_LAST",
  PeriodDesc = "period_DESC",
  PeriodDescNullsFirst = "period_DESC_NULLS_FIRST",
  PeriodDescNullsLast = "period_DESC_NULLS_LAST",
  TimestampGroupAsc = "timestampGroup_ASC",
  TimestampGroupAscNullsFirst = "timestampGroup_ASC_NULLS_FIRST",
  TimestampGroupAscNullsLast = "timestampGroup_ASC_NULLS_LAST",
  TimestampGroupDesc = "timestampGroup_DESC",
  TimestampGroupDescNullsFirst = "timestampGroup_DESC_NULLS_FIRST",
  TimestampGroupDescNullsLast = "timestampGroup_DESC_NULLS_LAST",
}

export type CollectedFeesInfoWhereInput = {
  AND?: InputMaybe<Array<CollectedFeesInfoWhereInput>>;
  OR?: InputMaybe<Array<CollectedFeesInfoWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  feeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_contains?: InputMaybe<Scalars["String"]["input"]>;
  period_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  period_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_eq?: InputMaybe<Scalars["String"]["input"]>;
  period_gt?: InputMaybe<Scalars["String"]["input"]>;
  period_gte?: InputMaybe<Scalars["String"]["input"]>;
  period_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  period_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  period_lt?: InputMaybe<Scalars["String"]["input"]>;
  period_lte?: InputMaybe<Scalars["String"]["input"]>;
  period_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  period_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  period_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  period_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  period_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  timestampGroup_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestampGroup_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestampGroup_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type CollectedFeesInfosConnection = {
  __typename?: "CollectedFeesInfosConnection";
  edges: Array<CollectedFeesInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type CumulativePoolValue = {
  __typename?: "CumulativePoolValue";
  address: Scalars["String"]["output"];
  cumulativePoolValueByTime: Scalars["BigInt"]["output"];
  cumulativeTime: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  lastPoolValue: Scalars["BigInt"]["output"];
  lastUpdateTimestamp: Scalars["Int"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
};

export type CumulativePoolValueEdge = {
  __typename?: "CumulativePoolValueEdge";
  cursor: Scalars["String"]["output"];
  node: CumulativePoolValue;
};

export enum CumulativePoolValueOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  CumulativePoolValueByTimeAsc = "cumulativePoolValueByTime_ASC",
  CumulativePoolValueByTimeAscNullsFirst = "cumulativePoolValueByTime_ASC_NULLS_FIRST",
  CumulativePoolValueByTimeAscNullsLast = "cumulativePoolValueByTime_ASC_NULLS_LAST",
  CumulativePoolValueByTimeDesc = "cumulativePoolValueByTime_DESC",
  CumulativePoolValueByTimeDescNullsFirst = "cumulativePoolValueByTime_DESC_NULLS_FIRST",
  CumulativePoolValueByTimeDescNullsLast = "cumulativePoolValueByTime_DESC_NULLS_LAST",
  CumulativeTimeAsc = "cumulativeTime_ASC",
  CumulativeTimeAscNullsFirst = "cumulativeTime_ASC_NULLS_FIRST",
  CumulativeTimeAscNullsLast = "cumulativeTime_ASC_NULLS_LAST",
  CumulativeTimeDesc = "cumulativeTime_DESC",
  CumulativeTimeDescNullsFirst = "cumulativeTime_DESC_NULLS_FIRST",
  CumulativeTimeDescNullsLast = "cumulativeTime_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  LastPoolValueAsc = "lastPoolValue_ASC",
  LastPoolValueAscNullsFirst = "lastPoolValue_ASC_NULLS_FIRST",
  LastPoolValueAscNullsLast = "lastPoolValue_ASC_NULLS_LAST",
  LastPoolValueDesc = "lastPoolValue_DESC",
  LastPoolValueDescNullsFirst = "lastPoolValue_DESC_NULLS_FIRST",
  LastPoolValueDescNullsLast = "lastPoolValue_DESC_NULLS_LAST",
  LastUpdateTimestampAsc = "lastUpdateTimestamp_ASC",
  LastUpdateTimestampAscNullsFirst = "lastUpdateTimestamp_ASC_NULLS_FIRST",
  LastUpdateTimestampAscNullsLast = "lastUpdateTimestamp_ASC_NULLS_LAST",
  LastUpdateTimestampDesc = "lastUpdateTimestamp_DESC",
  LastUpdateTimestampDescNullsFirst = "lastUpdateTimestamp_DESC_NULLS_FIRST",
  LastUpdateTimestampDescNullsLast = "lastUpdateTimestamp_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type CumulativePoolValueWhereInput = {
  AND?: InputMaybe<Array<CumulativePoolValueWhereInput>>;
  OR?: InputMaybe<Array<CumulativePoolValueWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cumulativePoolValueByTime_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativePoolValueByTime_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativePoolValueByTime_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeTime_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeTime_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeTime_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  lastPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  lastUpdateTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  lastUpdateTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastUpdateTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type CumulativePoolValuesConnection = {
  __typename?: "CumulativePoolValuesConnection";
  edges: Array<CumulativePoolValueEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export enum EntityType {
  Glv = "Glv",
  Market = "Market",
}

export type Glv = {
  __typename?: "Glv";
  glvTokenAddress: Scalars["String"]["output"];
  gmComposition: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  longTokenAddress: Scalars["String"]["output"];
  markets: Array<Scalars["String"]["output"]>;
  poolValue: Scalars["BigInt"]["output"];
  shortTokenAddress: Scalars["String"]["output"];
};

export type GlvApr = {
  __typename?: "GlvApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  glvAddress: Scalars["String"]["output"];
};

export type GlvAprsWhereInputWhereInput = {
  glvAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
};

export type GlvEdge = {
  __typename?: "GlvEdge";
  cursor: Scalars["String"]["output"];
  node: Glv;
};

export enum GlvOrderByInput {
  GlvTokenAddressAsc = "glvTokenAddress_ASC",
  GlvTokenAddressAscNullsFirst = "glvTokenAddress_ASC_NULLS_FIRST",
  GlvTokenAddressAscNullsLast = "glvTokenAddress_ASC_NULLS_LAST",
  GlvTokenAddressDesc = "glvTokenAddress_DESC",
  GlvTokenAddressDescNullsFirst = "glvTokenAddress_DESC_NULLS_FIRST",
  GlvTokenAddressDescNullsLast = "glvTokenAddress_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LongTokenAddressAsc = "longTokenAddress_ASC",
  LongTokenAddressAscNullsFirst = "longTokenAddress_ASC_NULLS_FIRST",
  LongTokenAddressAscNullsLast = "longTokenAddress_ASC_NULLS_LAST",
  LongTokenAddressDesc = "longTokenAddress_DESC",
  LongTokenAddressDescNullsFirst = "longTokenAddress_DESC_NULLS_FIRST",
  LongTokenAddressDescNullsLast = "longTokenAddress_DESC_NULLS_LAST",
  PoolValueAsc = "poolValue_ASC",
  PoolValueAscNullsFirst = "poolValue_ASC_NULLS_FIRST",
  PoolValueAscNullsLast = "poolValue_ASC_NULLS_LAST",
  PoolValueDesc = "poolValue_DESC",
  PoolValueDescNullsFirst = "poolValue_DESC_NULLS_FIRST",
  PoolValueDescNullsLast = "poolValue_DESC_NULLS_LAST",
  ShortTokenAddressAsc = "shortTokenAddress_ASC",
  ShortTokenAddressAscNullsFirst = "shortTokenAddress_ASC_NULLS_FIRST",
  ShortTokenAddressAscNullsLast = "shortTokenAddress_ASC_NULLS_LAST",
  ShortTokenAddressDesc = "shortTokenAddress_DESC",
  ShortTokenAddressDescNullsFirst = "shortTokenAddress_DESC_NULLS_FIRST",
  ShortTokenAddressDescNullsLast = "shortTokenAddress_DESC_NULLS_LAST",
}

export type GlvWhereInput = {
  AND?: InputMaybe<Array<GlvWhereInput>>;
  OR?: InputMaybe<Array<GlvWhereInput>>;
  glvTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  glvTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  glvTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  glvTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  gmComposition_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  markets_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type GlvsConnection = {
  __typename?: "GlvsConnection";
  edges: Array<GlvEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Market = {
  __typename?: "Market";
  id: Scalars["String"]["output"];
  indexToken: Scalars["String"]["output"];
  longToken: Scalars["String"]["output"];
  shortToken: Scalars["String"]["output"];
};

export type MarketApr = {
  __typename?: "MarketApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  marketAddress: Scalars["String"]["output"];
};

export type MarketAprsWhereInput = {
  marketAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
};

export type MarketEdge = {
  __typename?: "MarketEdge";
  cursor: Scalars["String"]["output"];
  node: Market;
};

export type MarketInfo = {
  __typename?: "MarketInfo";
  aboveOptimalUsageBorrowingFactorLong: Scalars["BigInt"]["output"];
  aboveOptimalUsageBorrowingFactorShort: Scalars["BigInt"]["output"];
  baseBorrowingFactorLong: Scalars["BigInt"]["output"];
  baseBorrowingFactorShort: Scalars["BigInt"]["output"];
  borrowingExponentFactorLong: Scalars["BigInt"]["output"];
  borrowingExponentFactorShort: Scalars["BigInt"]["output"];
  borrowingFactorLong: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondForLongs: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondForShorts: Scalars["BigInt"]["output"];
  borrowingFactorShort: Scalars["BigInt"]["output"];
  fundingDecreaseFactorPerSecond: Scalars["BigInt"]["output"];
  fundingExponentFactor: Scalars["BigInt"]["output"];
  fundingFactor: Scalars["BigInt"]["output"];
  fundingFactorPerSecond: Scalars["BigInt"]["output"];
  fundingIncreaseFactorPerSecond: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  indexTokenAddress: Scalars["String"]["output"];
  isDisabled: Scalars["Boolean"]["output"];
  longOpenInterestInTokens: Scalars["BigInt"]["output"];
  longOpenInterestInTokensUsingLongToken: Scalars["BigInt"]["output"];
  longOpenInterestInTokensUsingShortToken: Scalars["BigInt"]["output"];
  longOpenInterestUsd: Scalars["BigInt"]["output"];
  longOpenInterestUsingLongToken: Scalars["BigInt"]["output"];
  longOpenInterestUsingShortToken: Scalars["BigInt"]["output"];
  longPoolAmount: Scalars["BigInt"]["output"];
  longPoolAmountAdjustment: Scalars["BigInt"]["output"];
  longTokenAddress: Scalars["String"]["output"];
  longsPayShorts: Scalars["Boolean"]["output"];
  marketTokenAddress: Scalars["String"]["output"];
  marketTokenSupply: Scalars["BigInt"]["output"];
  maxFundingFactorPerSecond: Scalars["BigInt"]["output"];
  maxLongPoolAmount: Scalars["BigInt"]["output"];
  maxLongPoolUsdForDeposit: Scalars["BigInt"]["output"];
  maxOpenInterestLong: Scalars["BigInt"]["output"];
  maxOpenInterestShort: Scalars["BigInt"]["output"];
  maxPnlFactorForTradersLong: Scalars["BigInt"]["output"];
  maxPnlFactorForTradersShort: Scalars["BigInt"]["output"];
  maxPositionImpactFactorForLiquidations: Scalars["BigInt"]["output"];
  maxPositionImpactFactorNegative: Scalars["BigInt"]["output"];
  maxPositionImpactFactorPositive: Scalars["BigInt"]["output"];
  maxShortPoolAmount: Scalars["BigInt"]["output"];
  maxShortPoolUsdForDeposit: Scalars["BigInt"]["output"];
  minCollateralFactor: Scalars["BigInt"]["output"];
  minCollateralFactorForOpenInterestLong: Scalars["BigInt"]["output"];
  minCollateralFactorForOpenInterestShort: Scalars["BigInt"]["output"];
  minFundingFactorPerSecond: Scalars["BigInt"]["output"];
  minPositionImpactPoolAmount: Scalars["BigInt"]["output"];
  openInterestReserveFactorLong: Scalars["BigInt"]["output"];
  openInterestReserveFactorShort: Scalars["BigInt"]["output"];
  optimalUsageFactorLong: Scalars["BigInt"]["output"];
  optimalUsageFactorShort: Scalars["BigInt"]["output"];
  poolValue: Scalars["BigInt"]["output"];
  poolValueMax: Scalars["BigInt"]["output"];
  poolValueMin: Scalars["BigInt"]["output"];
  positionFeeFactorForNegativeImpact: Scalars["BigInt"]["output"];
  positionFeeFactorForPositiveImpact: Scalars["BigInt"]["output"];
  positionImpactExponentFactor: Scalars["BigInt"]["output"];
  positionImpactFactorNegative: Scalars["BigInt"]["output"];
  positionImpactFactorPositive: Scalars["BigInt"]["output"];
  positionImpactPoolAmount: Scalars["BigInt"]["output"];
  positionImpactPoolDistributionRate: Scalars["BigInt"]["output"];
  reserveFactorLong: Scalars["BigInt"]["output"];
  reserveFactorShort: Scalars["BigInt"]["output"];
  shortOpenInterestInTokens: Scalars["BigInt"]["output"];
  shortOpenInterestInTokensUsingLongToken: Scalars["BigInt"]["output"];
  shortOpenInterestInTokensUsingShortToken: Scalars["BigInt"]["output"];
  shortOpenInterestUsd: Scalars["BigInt"]["output"];
  shortOpenInterestUsingLongToken: Scalars["BigInt"]["output"];
  shortOpenInterestUsingShortToken: Scalars["BigInt"]["output"];
  shortPoolAmount: Scalars["BigInt"]["output"];
  shortPoolAmountAdjustment: Scalars["BigInt"]["output"];
  shortTokenAddress: Scalars["String"]["output"];
  swapFeeFactorForNegativeImpact: Scalars["BigInt"]["output"];
  swapFeeFactorForPositiveImpact: Scalars["BigInt"]["output"];
  swapImpactExponentFactor: Scalars["BigInt"]["output"];
  swapImpactFactorNegative: Scalars["BigInt"]["output"];
  swapImpactFactorPositive: Scalars["BigInt"]["output"];
  swapImpactPoolAmountLong: Scalars["BigInt"]["output"];
  swapImpactPoolAmountShort: Scalars["BigInt"]["output"];
  thresholdForDecreaseFunding: Scalars["BigInt"]["output"];
  thresholdForStableFunding: Scalars["BigInt"]["output"];
  totalBorrowingFees: Scalars["BigInt"]["output"];
  virtualIndexTokenId: Scalars["String"]["output"];
  virtualInventoryForPositions: Scalars["BigInt"]["output"];
  virtualLongTokenId: Scalars["String"]["output"];
  virtualMarketId: Scalars["String"]["output"];
  virtualPoolAmountForLongToken: Scalars["BigInt"]["output"];
  virtualPoolAmountForShortToken: Scalars["BigInt"]["output"];
  virtualShortTokenId: Scalars["String"]["output"];
};

export type MarketInfoEdge = {
  __typename?: "MarketInfoEdge";
  cursor: Scalars["String"]["output"];
  node: MarketInfo;
};

export enum MarketInfoOrderByInput {
  AboveOptimalUsageBorrowingFactorLongAsc = "aboveOptimalUsageBorrowingFactorLong_ASC",
  AboveOptimalUsageBorrowingFactorLongAscNullsFirst = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorLongAscNullsLast = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorLongDesc = "aboveOptimalUsageBorrowingFactorLong_DESC",
  AboveOptimalUsageBorrowingFactorLongDescNullsFirst = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorLongDescNullsLast = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorShortAsc = "aboveOptimalUsageBorrowingFactorShort_ASC",
  AboveOptimalUsageBorrowingFactorShortAscNullsFirst = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorShortAscNullsLast = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorShortDesc = "aboveOptimalUsageBorrowingFactorShort_DESC",
  AboveOptimalUsageBorrowingFactorShortDescNullsFirst = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorShortDescNullsLast = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_LAST",
  BaseBorrowingFactorLongAsc = "baseBorrowingFactorLong_ASC",
  BaseBorrowingFactorLongAscNullsFirst = "baseBorrowingFactorLong_ASC_NULLS_FIRST",
  BaseBorrowingFactorLongAscNullsLast = "baseBorrowingFactorLong_ASC_NULLS_LAST",
  BaseBorrowingFactorLongDesc = "baseBorrowingFactorLong_DESC",
  BaseBorrowingFactorLongDescNullsFirst = "baseBorrowingFactorLong_DESC_NULLS_FIRST",
  BaseBorrowingFactorLongDescNullsLast = "baseBorrowingFactorLong_DESC_NULLS_LAST",
  BaseBorrowingFactorShortAsc = "baseBorrowingFactorShort_ASC",
  BaseBorrowingFactorShortAscNullsFirst = "baseBorrowingFactorShort_ASC_NULLS_FIRST",
  BaseBorrowingFactorShortAscNullsLast = "baseBorrowingFactorShort_ASC_NULLS_LAST",
  BaseBorrowingFactorShortDesc = "baseBorrowingFactorShort_DESC",
  BaseBorrowingFactorShortDescNullsFirst = "baseBorrowingFactorShort_DESC_NULLS_FIRST",
  BaseBorrowingFactorShortDescNullsLast = "baseBorrowingFactorShort_DESC_NULLS_LAST",
  BorrowingExponentFactorLongAsc = "borrowingExponentFactorLong_ASC",
  BorrowingExponentFactorLongAscNullsFirst = "borrowingExponentFactorLong_ASC_NULLS_FIRST",
  BorrowingExponentFactorLongAscNullsLast = "borrowingExponentFactorLong_ASC_NULLS_LAST",
  BorrowingExponentFactorLongDesc = "borrowingExponentFactorLong_DESC",
  BorrowingExponentFactorLongDescNullsFirst = "borrowingExponentFactorLong_DESC_NULLS_FIRST",
  BorrowingExponentFactorLongDescNullsLast = "borrowingExponentFactorLong_DESC_NULLS_LAST",
  BorrowingExponentFactorShortAsc = "borrowingExponentFactorShort_ASC",
  BorrowingExponentFactorShortAscNullsFirst = "borrowingExponentFactorShort_ASC_NULLS_FIRST",
  BorrowingExponentFactorShortAscNullsLast = "borrowingExponentFactorShort_ASC_NULLS_LAST",
  BorrowingExponentFactorShortDesc = "borrowingExponentFactorShort_DESC",
  BorrowingExponentFactorShortDescNullsFirst = "borrowingExponentFactorShort_DESC_NULLS_FIRST",
  BorrowingExponentFactorShortDescNullsLast = "borrowingExponentFactorShort_DESC_NULLS_LAST",
  BorrowingFactorLongAsc = "borrowingFactorLong_ASC",
  BorrowingFactorLongAscNullsFirst = "borrowingFactorLong_ASC_NULLS_FIRST",
  BorrowingFactorLongAscNullsLast = "borrowingFactorLong_ASC_NULLS_LAST",
  BorrowingFactorLongDesc = "borrowingFactorLong_DESC",
  BorrowingFactorLongDescNullsFirst = "borrowingFactorLong_DESC_NULLS_FIRST",
  BorrowingFactorLongDescNullsLast = "borrowingFactorLong_DESC_NULLS_LAST",
  BorrowingFactorPerSecondForLongsAsc = "borrowingFactorPerSecondForLongs_ASC",
  BorrowingFactorPerSecondForLongsAscNullsFirst = "borrowingFactorPerSecondForLongs_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondForLongsAscNullsLast = "borrowingFactorPerSecondForLongs_ASC_NULLS_LAST",
  BorrowingFactorPerSecondForLongsDesc = "borrowingFactorPerSecondForLongs_DESC",
  BorrowingFactorPerSecondForLongsDescNullsFirst = "borrowingFactorPerSecondForLongs_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondForLongsDescNullsLast = "borrowingFactorPerSecondForLongs_DESC_NULLS_LAST",
  BorrowingFactorPerSecondForShortsAsc = "borrowingFactorPerSecondForShorts_ASC",
  BorrowingFactorPerSecondForShortsAscNullsFirst = "borrowingFactorPerSecondForShorts_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondForShortsAscNullsLast = "borrowingFactorPerSecondForShorts_ASC_NULLS_LAST",
  BorrowingFactorPerSecondForShortsDesc = "borrowingFactorPerSecondForShorts_DESC",
  BorrowingFactorPerSecondForShortsDescNullsFirst = "borrowingFactorPerSecondForShorts_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondForShortsDescNullsLast = "borrowingFactorPerSecondForShorts_DESC_NULLS_LAST",
  BorrowingFactorShortAsc = "borrowingFactorShort_ASC",
  BorrowingFactorShortAscNullsFirst = "borrowingFactorShort_ASC_NULLS_FIRST",
  BorrowingFactorShortAscNullsLast = "borrowingFactorShort_ASC_NULLS_LAST",
  BorrowingFactorShortDesc = "borrowingFactorShort_DESC",
  BorrowingFactorShortDescNullsFirst = "borrowingFactorShort_DESC_NULLS_FIRST",
  BorrowingFactorShortDescNullsLast = "borrowingFactorShort_DESC_NULLS_LAST",
  FundingDecreaseFactorPerSecondAsc = "fundingDecreaseFactorPerSecond_ASC",
  FundingDecreaseFactorPerSecondAscNullsFirst = "fundingDecreaseFactorPerSecond_ASC_NULLS_FIRST",
  FundingDecreaseFactorPerSecondAscNullsLast = "fundingDecreaseFactorPerSecond_ASC_NULLS_LAST",
  FundingDecreaseFactorPerSecondDesc = "fundingDecreaseFactorPerSecond_DESC",
  FundingDecreaseFactorPerSecondDescNullsFirst = "fundingDecreaseFactorPerSecond_DESC_NULLS_FIRST",
  FundingDecreaseFactorPerSecondDescNullsLast = "fundingDecreaseFactorPerSecond_DESC_NULLS_LAST",
  FundingExponentFactorAsc = "fundingExponentFactor_ASC",
  FundingExponentFactorAscNullsFirst = "fundingExponentFactor_ASC_NULLS_FIRST",
  FundingExponentFactorAscNullsLast = "fundingExponentFactor_ASC_NULLS_LAST",
  FundingExponentFactorDesc = "fundingExponentFactor_DESC",
  FundingExponentFactorDescNullsFirst = "fundingExponentFactor_DESC_NULLS_FIRST",
  FundingExponentFactorDescNullsLast = "fundingExponentFactor_DESC_NULLS_LAST",
  FundingFactorPerSecondAsc = "fundingFactorPerSecond_ASC",
  FundingFactorPerSecondAscNullsFirst = "fundingFactorPerSecond_ASC_NULLS_FIRST",
  FundingFactorPerSecondAscNullsLast = "fundingFactorPerSecond_ASC_NULLS_LAST",
  FundingFactorPerSecondDesc = "fundingFactorPerSecond_DESC",
  FundingFactorPerSecondDescNullsFirst = "fundingFactorPerSecond_DESC_NULLS_FIRST",
  FundingFactorPerSecondDescNullsLast = "fundingFactorPerSecond_DESC_NULLS_LAST",
  FundingFactorAsc = "fundingFactor_ASC",
  FundingFactorAscNullsFirst = "fundingFactor_ASC_NULLS_FIRST",
  FundingFactorAscNullsLast = "fundingFactor_ASC_NULLS_LAST",
  FundingFactorDesc = "fundingFactor_DESC",
  FundingFactorDescNullsFirst = "fundingFactor_DESC_NULLS_FIRST",
  FundingFactorDescNullsLast = "fundingFactor_DESC_NULLS_LAST",
  FundingIncreaseFactorPerSecondAsc = "fundingIncreaseFactorPerSecond_ASC",
  FundingIncreaseFactorPerSecondAscNullsFirst = "fundingIncreaseFactorPerSecond_ASC_NULLS_FIRST",
  FundingIncreaseFactorPerSecondAscNullsLast = "fundingIncreaseFactorPerSecond_ASC_NULLS_LAST",
  FundingIncreaseFactorPerSecondDesc = "fundingIncreaseFactorPerSecond_DESC",
  FundingIncreaseFactorPerSecondDescNullsFirst = "fundingIncreaseFactorPerSecond_DESC_NULLS_FIRST",
  FundingIncreaseFactorPerSecondDescNullsLast = "fundingIncreaseFactorPerSecond_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenAddressAsc = "indexTokenAddress_ASC",
  IndexTokenAddressAscNullsFirst = "indexTokenAddress_ASC_NULLS_FIRST",
  IndexTokenAddressAscNullsLast = "indexTokenAddress_ASC_NULLS_LAST",
  IndexTokenAddressDesc = "indexTokenAddress_DESC",
  IndexTokenAddressDescNullsFirst = "indexTokenAddress_DESC_NULLS_FIRST",
  IndexTokenAddressDescNullsLast = "indexTokenAddress_DESC_NULLS_LAST",
  IsDisabledAsc = "isDisabled_ASC",
  IsDisabledAscNullsFirst = "isDisabled_ASC_NULLS_FIRST",
  IsDisabledAscNullsLast = "isDisabled_ASC_NULLS_LAST",
  IsDisabledDesc = "isDisabled_DESC",
  IsDisabledDescNullsFirst = "isDisabled_DESC_NULLS_FIRST",
  IsDisabledDescNullsLast = "isDisabled_DESC_NULLS_LAST",
  LongOpenInterestInTokensUsingLongTokenAsc = "longOpenInterestInTokensUsingLongToken_ASC",
  LongOpenInterestInTokensUsingLongTokenAscNullsFirst = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  LongOpenInterestInTokensUsingLongTokenAscNullsLast = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  LongOpenInterestInTokensUsingLongTokenDesc = "longOpenInterestInTokensUsingLongToken_DESC",
  LongOpenInterestInTokensUsingLongTokenDescNullsFirst = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  LongOpenInterestInTokensUsingLongTokenDescNullsLast = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  LongOpenInterestInTokensUsingShortTokenAsc = "longOpenInterestInTokensUsingShortToken_ASC",
  LongOpenInterestInTokensUsingShortTokenAscNullsFirst = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  LongOpenInterestInTokensUsingShortTokenAscNullsLast = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  LongOpenInterestInTokensUsingShortTokenDesc = "longOpenInterestInTokensUsingShortToken_DESC",
  LongOpenInterestInTokensUsingShortTokenDescNullsFirst = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  LongOpenInterestInTokensUsingShortTokenDescNullsLast = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  LongOpenInterestInTokensAsc = "longOpenInterestInTokens_ASC",
  LongOpenInterestInTokensAscNullsFirst = "longOpenInterestInTokens_ASC_NULLS_FIRST",
  LongOpenInterestInTokensAscNullsLast = "longOpenInterestInTokens_ASC_NULLS_LAST",
  LongOpenInterestInTokensDesc = "longOpenInterestInTokens_DESC",
  LongOpenInterestInTokensDescNullsFirst = "longOpenInterestInTokens_DESC_NULLS_FIRST",
  LongOpenInterestInTokensDescNullsLast = "longOpenInterestInTokens_DESC_NULLS_LAST",
  LongOpenInterestUsdAsc = "longOpenInterestUsd_ASC",
  LongOpenInterestUsdAscNullsFirst = "longOpenInterestUsd_ASC_NULLS_FIRST",
  LongOpenInterestUsdAscNullsLast = "longOpenInterestUsd_ASC_NULLS_LAST",
  LongOpenInterestUsdDesc = "longOpenInterestUsd_DESC",
  LongOpenInterestUsdDescNullsFirst = "longOpenInterestUsd_DESC_NULLS_FIRST",
  LongOpenInterestUsdDescNullsLast = "longOpenInterestUsd_DESC_NULLS_LAST",
  LongOpenInterestUsingLongTokenAsc = "longOpenInterestUsingLongToken_ASC",
  LongOpenInterestUsingLongTokenAscNullsFirst = "longOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  LongOpenInterestUsingLongTokenAscNullsLast = "longOpenInterestUsingLongToken_ASC_NULLS_LAST",
  LongOpenInterestUsingLongTokenDesc = "longOpenInterestUsingLongToken_DESC",
  LongOpenInterestUsingLongTokenDescNullsFirst = "longOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  LongOpenInterestUsingLongTokenDescNullsLast = "longOpenInterestUsingLongToken_DESC_NULLS_LAST",
  LongOpenInterestUsingShortTokenAsc = "longOpenInterestUsingShortToken_ASC",
  LongOpenInterestUsingShortTokenAscNullsFirst = "longOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  LongOpenInterestUsingShortTokenAscNullsLast = "longOpenInterestUsingShortToken_ASC_NULLS_LAST",
  LongOpenInterestUsingShortTokenDesc = "longOpenInterestUsingShortToken_DESC",
  LongOpenInterestUsingShortTokenDescNullsFirst = "longOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  LongOpenInterestUsingShortTokenDescNullsLast = "longOpenInterestUsingShortToken_DESC_NULLS_LAST",
  LongPoolAmountAdjustmentAsc = "longPoolAmountAdjustment_ASC",
  LongPoolAmountAdjustmentAscNullsFirst = "longPoolAmountAdjustment_ASC_NULLS_FIRST",
  LongPoolAmountAdjustmentAscNullsLast = "longPoolAmountAdjustment_ASC_NULLS_LAST",
  LongPoolAmountAdjustmentDesc = "longPoolAmountAdjustment_DESC",
  LongPoolAmountAdjustmentDescNullsFirst = "longPoolAmountAdjustment_DESC_NULLS_FIRST",
  LongPoolAmountAdjustmentDescNullsLast = "longPoolAmountAdjustment_DESC_NULLS_LAST",
  LongPoolAmountAsc = "longPoolAmount_ASC",
  LongPoolAmountAscNullsFirst = "longPoolAmount_ASC_NULLS_FIRST",
  LongPoolAmountAscNullsLast = "longPoolAmount_ASC_NULLS_LAST",
  LongPoolAmountDesc = "longPoolAmount_DESC",
  LongPoolAmountDescNullsFirst = "longPoolAmount_DESC_NULLS_FIRST",
  LongPoolAmountDescNullsLast = "longPoolAmount_DESC_NULLS_LAST",
  LongTokenAddressAsc = "longTokenAddress_ASC",
  LongTokenAddressAscNullsFirst = "longTokenAddress_ASC_NULLS_FIRST",
  LongTokenAddressAscNullsLast = "longTokenAddress_ASC_NULLS_LAST",
  LongTokenAddressDesc = "longTokenAddress_DESC",
  LongTokenAddressDescNullsFirst = "longTokenAddress_DESC_NULLS_FIRST",
  LongTokenAddressDescNullsLast = "longTokenAddress_DESC_NULLS_LAST",
  LongsPayShortsAsc = "longsPayShorts_ASC",
  LongsPayShortsAscNullsFirst = "longsPayShorts_ASC_NULLS_FIRST",
  LongsPayShortsAscNullsLast = "longsPayShorts_ASC_NULLS_LAST",
  LongsPayShortsDesc = "longsPayShorts_DESC",
  LongsPayShortsDescNullsFirst = "longsPayShorts_DESC_NULLS_FIRST",
  LongsPayShortsDescNullsLast = "longsPayShorts_DESC_NULLS_LAST",
  MarketTokenAddressAsc = "marketTokenAddress_ASC",
  MarketTokenAddressAscNullsFirst = "marketTokenAddress_ASC_NULLS_FIRST",
  MarketTokenAddressAscNullsLast = "marketTokenAddress_ASC_NULLS_LAST",
  MarketTokenAddressDesc = "marketTokenAddress_DESC",
  MarketTokenAddressDescNullsFirst = "marketTokenAddress_DESC_NULLS_FIRST",
  MarketTokenAddressDescNullsLast = "marketTokenAddress_DESC_NULLS_LAST",
  MarketTokenSupplyAsc = "marketTokenSupply_ASC",
  MarketTokenSupplyAscNullsFirst = "marketTokenSupply_ASC_NULLS_FIRST",
  MarketTokenSupplyAscNullsLast = "marketTokenSupply_ASC_NULLS_LAST",
  MarketTokenSupplyDesc = "marketTokenSupply_DESC",
  MarketTokenSupplyDescNullsFirst = "marketTokenSupply_DESC_NULLS_FIRST",
  MarketTokenSupplyDescNullsLast = "marketTokenSupply_DESC_NULLS_LAST",
  MaxFundingFactorPerSecondAsc = "maxFundingFactorPerSecond_ASC",
  MaxFundingFactorPerSecondAscNullsFirst = "maxFundingFactorPerSecond_ASC_NULLS_FIRST",
  MaxFundingFactorPerSecondAscNullsLast = "maxFundingFactorPerSecond_ASC_NULLS_LAST",
  MaxFundingFactorPerSecondDesc = "maxFundingFactorPerSecond_DESC",
  MaxFundingFactorPerSecondDescNullsFirst = "maxFundingFactorPerSecond_DESC_NULLS_FIRST",
  MaxFundingFactorPerSecondDescNullsLast = "maxFundingFactorPerSecond_DESC_NULLS_LAST",
  MaxLongPoolAmountAsc = "maxLongPoolAmount_ASC",
  MaxLongPoolAmountAscNullsFirst = "maxLongPoolAmount_ASC_NULLS_FIRST",
  MaxLongPoolAmountAscNullsLast = "maxLongPoolAmount_ASC_NULLS_LAST",
  MaxLongPoolAmountDesc = "maxLongPoolAmount_DESC",
  MaxLongPoolAmountDescNullsFirst = "maxLongPoolAmount_DESC_NULLS_FIRST",
  MaxLongPoolAmountDescNullsLast = "maxLongPoolAmount_DESC_NULLS_LAST",
  MaxLongPoolUsdForDepositAsc = "maxLongPoolUsdForDeposit_ASC",
  MaxLongPoolUsdForDepositAscNullsFirst = "maxLongPoolUsdForDeposit_ASC_NULLS_FIRST",
  MaxLongPoolUsdForDepositAscNullsLast = "maxLongPoolUsdForDeposit_ASC_NULLS_LAST",
  MaxLongPoolUsdForDepositDesc = "maxLongPoolUsdForDeposit_DESC",
  MaxLongPoolUsdForDepositDescNullsFirst = "maxLongPoolUsdForDeposit_DESC_NULLS_FIRST",
  MaxLongPoolUsdForDepositDescNullsLast = "maxLongPoolUsdForDeposit_DESC_NULLS_LAST",
  MaxOpenInterestLongAsc = "maxOpenInterestLong_ASC",
  MaxOpenInterestLongAscNullsFirst = "maxOpenInterestLong_ASC_NULLS_FIRST",
  MaxOpenInterestLongAscNullsLast = "maxOpenInterestLong_ASC_NULLS_LAST",
  MaxOpenInterestLongDesc = "maxOpenInterestLong_DESC",
  MaxOpenInterestLongDescNullsFirst = "maxOpenInterestLong_DESC_NULLS_FIRST",
  MaxOpenInterestLongDescNullsLast = "maxOpenInterestLong_DESC_NULLS_LAST",
  MaxOpenInterestShortAsc = "maxOpenInterestShort_ASC",
  MaxOpenInterestShortAscNullsFirst = "maxOpenInterestShort_ASC_NULLS_FIRST",
  MaxOpenInterestShortAscNullsLast = "maxOpenInterestShort_ASC_NULLS_LAST",
  MaxOpenInterestShortDesc = "maxOpenInterestShort_DESC",
  MaxOpenInterestShortDescNullsFirst = "maxOpenInterestShort_DESC_NULLS_FIRST",
  MaxOpenInterestShortDescNullsLast = "maxOpenInterestShort_DESC_NULLS_LAST",
  MaxPnlFactorForTradersLongAsc = "maxPnlFactorForTradersLong_ASC",
  MaxPnlFactorForTradersLongAscNullsFirst = "maxPnlFactorForTradersLong_ASC_NULLS_FIRST",
  MaxPnlFactorForTradersLongAscNullsLast = "maxPnlFactorForTradersLong_ASC_NULLS_LAST",
  MaxPnlFactorForTradersLongDesc = "maxPnlFactorForTradersLong_DESC",
  MaxPnlFactorForTradersLongDescNullsFirst = "maxPnlFactorForTradersLong_DESC_NULLS_FIRST",
  MaxPnlFactorForTradersLongDescNullsLast = "maxPnlFactorForTradersLong_DESC_NULLS_LAST",
  MaxPnlFactorForTradersShortAsc = "maxPnlFactorForTradersShort_ASC",
  MaxPnlFactorForTradersShortAscNullsFirst = "maxPnlFactorForTradersShort_ASC_NULLS_FIRST",
  MaxPnlFactorForTradersShortAscNullsLast = "maxPnlFactorForTradersShort_ASC_NULLS_LAST",
  MaxPnlFactorForTradersShortDesc = "maxPnlFactorForTradersShort_DESC",
  MaxPnlFactorForTradersShortDescNullsFirst = "maxPnlFactorForTradersShort_DESC_NULLS_FIRST",
  MaxPnlFactorForTradersShortDescNullsLast = "maxPnlFactorForTradersShort_DESC_NULLS_LAST",
  MaxPositionImpactFactorForLiquidationsAsc = "maxPositionImpactFactorForLiquidations_ASC",
  MaxPositionImpactFactorForLiquidationsAscNullsFirst = "maxPositionImpactFactorForLiquidations_ASC_NULLS_FIRST",
  MaxPositionImpactFactorForLiquidationsAscNullsLast = "maxPositionImpactFactorForLiquidations_ASC_NULLS_LAST",
  MaxPositionImpactFactorForLiquidationsDesc = "maxPositionImpactFactorForLiquidations_DESC",
  MaxPositionImpactFactorForLiquidationsDescNullsFirst = "maxPositionImpactFactorForLiquidations_DESC_NULLS_FIRST",
  MaxPositionImpactFactorForLiquidationsDescNullsLast = "maxPositionImpactFactorForLiquidations_DESC_NULLS_LAST",
  MaxPositionImpactFactorNegativeAsc = "maxPositionImpactFactorNegative_ASC",
  MaxPositionImpactFactorNegativeAscNullsFirst = "maxPositionImpactFactorNegative_ASC_NULLS_FIRST",
  MaxPositionImpactFactorNegativeAscNullsLast = "maxPositionImpactFactorNegative_ASC_NULLS_LAST",
  MaxPositionImpactFactorNegativeDesc = "maxPositionImpactFactorNegative_DESC",
  MaxPositionImpactFactorNegativeDescNullsFirst = "maxPositionImpactFactorNegative_DESC_NULLS_FIRST",
  MaxPositionImpactFactorNegativeDescNullsLast = "maxPositionImpactFactorNegative_DESC_NULLS_LAST",
  MaxPositionImpactFactorPositiveAsc = "maxPositionImpactFactorPositive_ASC",
  MaxPositionImpactFactorPositiveAscNullsFirst = "maxPositionImpactFactorPositive_ASC_NULLS_FIRST",
  MaxPositionImpactFactorPositiveAscNullsLast = "maxPositionImpactFactorPositive_ASC_NULLS_LAST",
  MaxPositionImpactFactorPositiveDesc = "maxPositionImpactFactorPositive_DESC",
  MaxPositionImpactFactorPositiveDescNullsFirst = "maxPositionImpactFactorPositive_DESC_NULLS_FIRST",
  MaxPositionImpactFactorPositiveDescNullsLast = "maxPositionImpactFactorPositive_DESC_NULLS_LAST",
  MaxShortPoolAmountAsc = "maxShortPoolAmount_ASC",
  MaxShortPoolAmountAscNullsFirst = "maxShortPoolAmount_ASC_NULLS_FIRST",
  MaxShortPoolAmountAscNullsLast = "maxShortPoolAmount_ASC_NULLS_LAST",
  MaxShortPoolAmountDesc = "maxShortPoolAmount_DESC",
  MaxShortPoolAmountDescNullsFirst = "maxShortPoolAmount_DESC_NULLS_FIRST",
  MaxShortPoolAmountDescNullsLast = "maxShortPoolAmount_DESC_NULLS_LAST",
  MaxShortPoolUsdForDepositAsc = "maxShortPoolUsdForDeposit_ASC",
  MaxShortPoolUsdForDepositAscNullsFirst = "maxShortPoolUsdForDeposit_ASC_NULLS_FIRST",
  MaxShortPoolUsdForDepositAscNullsLast = "maxShortPoolUsdForDeposit_ASC_NULLS_LAST",
  MaxShortPoolUsdForDepositDesc = "maxShortPoolUsdForDeposit_DESC",
  MaxShortPoolUsdForDepositDescNullsFirst = "maxShortPoolUsdForDeposit_DESC_NULLS_FIRST",
  MaxShortPoolUsdForDepositDescNullsLast = "maxShortPoolUsdForDeposit_DESC_NULLS_LAST",
  MinCollateralFactorForOpenInterestLongAsc = "minCollateralFactorForOpenInterestLong_ASC",
  MinCollateralFactorForOpenInterestLongAscNullsFirst = "minCollateralFactorForOpenInterestLong_ASC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestLongAscNullsLast = "minCollateralFactorForOpenInterestLong_ASC_NULLS_LAST",
  MinCollateralFactorForOpenInterestLongDesc = "minCollateralFactorForOpenInterestLong_DESC",
  MinCollateralFactorForOpenInterestLongDescNullsFirst = "minCollateralFactorForOpenInterestLong_DESC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestLongDescNullsLast = "minCollateralFactorForOpenInterestLong_DESC_NULLS_LAST",
  MinCollateralFactorForOpenInterestShortAsc = "minCollateralFactorForOpenInterestShort_ASC",
  MinCollateralFactorForOpenInterestShortAscNullsFirst = "minCollateralFactorForOpenInterestShort_ASC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestShortAscNullsLast = "minCollateralFactorForOpenInterestShort_ASC_NULLS_LAST",
  MinCollateralFactorForOpenInterestShortDesc = "minCollateralFactorForOpenInterestShort_DESC",
  MinCollateralFactorForOpenInterestShortDescNullsFirst = "minCollateralFactorForOpenInterestShort_DESC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestShortDescNullsLast = "minCollateralFactorForOpenInterestShort_DESC_NULLS_LAST",
  MinCollateralFactorAsc = "minCollateralFactor_ASC",
  MinCollateralFactorAscNullsFirst = "minCollateralFactor_ASC_NULLS_FIRST",
  MinCollateralFactorAscNullsLast = "minCollateralFactor_ASC_NULLS_LAST",
  MinCollateralFactorDesc = "minCollateralFactor_DESC",
  MinCollateralFactorDescNullsFirst = "minCollateralFactor_DESC_NULLS_FIRST",
  MinCollateralFactorDescNullsLast = "minCollateralFactor_DESC_NULLS_LAST",
  MinFundingFactorPerSecondAsc = "minFundingFactorPerSecond_ASC",
  MinFundingFactorPerSecondAscNullsFirst = "minFundingFactorPerSecond_ASC_NULLS_FIRST",
  MinFundingFactorPerSecondAscNullsLast = "minFundingFactorPerSecond_ASC_NULLS_LAST",
  MinFundingFactorPerSecondDesc = "minFundingFactorPerSecond_DESC",
  MinFundingFactorPerSecondDescNullsFirst = "minFundingFactorPerSecond_DESC_NULLS_FIRST",
  MinFundingFactorPerSecondDescNullsLast = "minFundingFactorPerSecond_DESC_NULLS_LAST",
  MinPositionImpactPoolAmountAsc = "minPositionImpactPoolAmount_ASC",
  MinPositionImpactPoolAmountAscNullsFirst = "minPositionImpactPoolAmount_ASC_NULLS_FIRST",
  MinPositionImpactPoolAmountAscNullsLast = "minPositionImpactPoolAmount_ASC_NULLS_LAST",
  MinPositionImpactPoolAmountDesc = "minPositionImpactPoolAmount_DESC",
  MinPositionImpactPoolAmountDescNullsFirst = "minPositionImpactPoolAmount_DESC_NULLS_FIRST",
  MinPositionImpactPoolAmountDescNullsLast = "minPositionImpactPoolAmount_DESC_NULLS_LAST",
  OpenInterestReserveFactorLongAsc = "openInterestReserveFactorLong_ASC",
  OpenInterestReserveFactorLongAscNullsFirst = "openInterestReserveFactorLong_ASC_NULLS_FIRST",
  OpenInterestReserveFactorLongAscNullsLast = "openInterestReserveFactorLong_ASC_NULLS_LAST",
  OpenInterestReserveFactorLongDesc = "openInterestReserveFactorLong_DESC",
  OpenInterestReserveFactorLongDescNullsFirst = "openInterestReserveFactorLong_DESC_NULLS_FIRST",
  OpenInterestReserveFactorLongDescNullsLast = "openInterestReserveFactorLong_DESC_NULLS_LAST",
  OpenInterestReserveFactorShortAsc = "openInterestReserveFactorShort_ASC",
  OpenInterestReserveFactorShortAscNullsFirst = "openInterestReserveFactorShort_ASC_NULLS_FIRST",
  OpenInterestReserveFactorShortAscNullsLast = "openInterestReserveFactorShort_ASC_NULLS_LAST",
  OpenInterestReserveFactorShortDesc = "openInterestReserveFactorShort_DESC",
  OpenInterestReserveFactorShortDescNullsFirst = "openInterestReserveFactorShort_DESC_NULLS_FIRST",
  OpenInterestReserveFactorShortDescNullsLast = "openInterestReserveFactorShort_DESC_NULLS_LAST",
  OptimalUsageFactorLongAsc = "optimalUsageFactorLong_ASC",
  OptimalUsageFactorLongAscNullsFirst = "optimalUsageFactorLong_ASC_NULLS_FIRST",
  OptimalUsageFactorLongAscNullsLast = "optimalUsageFactorLong_ASC_NULLS_LAST",
  OptimalUsageFactorLongDesc = "optimalUsageFactorLong_DESC",
  OptimalUsageFactorLongDescNullsFirst = "optimalUsageFactorLong_DESC_NULLS_FIRST",
  OptimalUsageFactorLongDescNullsLast = "optimalUsageFactorLong_DESC_NULLS_LAST",
  OptimalUsageFactorShortAsc = "optimalUsageFactorShort_ASC",
  OptimalUsageFactorShortAscNullsFirst = "optimalUsageFactorShort_ASC_NULLS_FIRST",
  OptimalUsageFactorShortAscNullsLast = "optimalUsageFactorShort_ASC_NULLS_LAST",
  OptimalUsageFactorShortDesc = "optimalUsageFactorShort_DESC",
  OptimalUsageFactorShortDescNullsFirst = "optimalUsageFactorShort_DESC_NULLS_FIRST",
  OptimalUsageFactorShortDescNullsLast = "optimalUsageFactorShort_DESC_NULLS_LAST",
  PoolValueMaxAsc = "poolValueMax_ASC",
  PoolValueMaxAscNullsFirst = "poolValueMax_ASC_NULLS_FIRST",
  PoolValueMaxAscNullsLast = "poolValueMax_ASC_NULLS_LAST",
  PoolValueMaxDesc = "poolValueMax_DESC",
  PoolValueMaxDescNullsFirst = "poolValueMax_DESC_NULLS_FIRST",
  PoolValueMaxDescNullsLast = "poolValueMax_DESC_NULLS_LAST",
  PoolValueMinAsc = "poolValueMin_ASC",
  PoolValueMinAscNullsFirst = "poolValueMin_ASC_NULLS_FIRST",
  PoolValueMinAscNullsLast = "poolValueMin_ASC_NULLS_LAST",
  PoolValueMinDesc = "poolValueMin_DESC",
  PoolValueMinDescNullsFirst = "poolValueMin_DESC_NULLS_FIRST",
  PoolValueMinDescNullsLast = "poolValueMin_DESC_NULLS_LAST",
  PoolValueAsc = "poolValue_ASC",
  PoolValueAscNullsFirst = "poolValue_ASC_NULLS_FIRST",
  PoolValueAscNullsLast = "poolValue_ASC_NULLS_LAST",
  PoolValueDesc = "poolValue_DESC",
  PoolValueDescNullsFirst = "poolValue_DESC_NULLS_FIRST",
  PoolValueDescNullsLast = "poolValue_DESC_NULLS_LAST",
  PositionFeeFactorForNegativeImpactAsc = "positionFeeFactorForNegativeImpact_ASC",
  PositionFeeFactorForNegativeImpactAscNullsFirst = "positionFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  PositionFeeFactorForNegativeImpactAscNullsLast = "positionFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  PositionFeeFactorForNegativeImpactDesc = "positionFeeFactorForNegativeImpact_DESC",
  PositionFeeFactorForNegativeImpactDescNullsFirst = "positionFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  PositionFeeFactorForNegativeImpactDescNullsLast = "positionFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  PositionFeeFactorForPositiveImpactAsc = "positionFeeFactorForPositiveImpact_ASC",
  PositionFeeFactorForPositiveImpactAscNullsFirst = "positionFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  PositionFeeFactorForPositiveImpactAscNullsLast = "positionFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  PositionFeeFactorForPositiveImpactDesc = "positionFeeFactorForPositiveImpact_DESC",
  PositionFeeFactorForPositiveImpactDescNullsFirst = "positionFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  PositionFeeFactorForPositiveImpactDescNullsLast = "positionFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  PositionImpactExponentFactorAsc = "positionImpactExponentFactor_ASC",
  PositionImpactExponentFactorAscNullsFirst = "positionImpactExponentFactor_ASC_NULLS_FIRST",
  PositionImpactExponentFactorAscNullsLast = "positionImpactExponentFactor_ASC_NULLS_LAST",
  PositionImpactExponentFactorDesc = "positionImpactExponentFactor_DESC",
  PositionImpactExponentFactorDescNullsFirst = "positionImpactExponentFactor_DESC_NULLS_FIRST",
  PositionImpactExponentFactorDescNullsLast = "positionImpactExponentFactor_DESC_NULLS_LAST",
  PositionImpactFactorNegativeAsc = "positionImpactFactorNegative_ASC",
  PositionImpactFactorNegativeAscNullsFirst = "positionImpactFactorNegative_ASC_NULLS_FIRST",
  PositionImpactFactorNegativeAscNullsLast = "positionImpactFactorNegative_ASC_NULLS_LAST",
  PositionImpactFactorNegativeDesc = "positionImpactFactorNegative_DESC",
  PositionImpactFactorNegativeDescNullsFirst = "positionImpactFactorNegative_DESC_NULLS_FIRST",
  PositionImpactFactorNegativeDescNullsLast = "positionImpactFactorNegative_DESC_NULLS_LAST",
  PositionImpactFactorPositiveAsc = "positionImpactFactorPositive_ASC",
  PositionImpactFactorPositiveAscNullsFirst = "positionImpactFactorPositive_ASC_NULLS_FIRST",
  PositionImpactFactorPositiveAscNullsLast = "positionImpactFactorPositive_ASC_NULLS_LAST",
  PositionImpactFactorPositiveDesc = "positionImpactFactorPositive_DESC",
  PositionImpactFactorPositiveDescNullsFirst = "positionImpactFactorPositive_DESC_NULLS_FIRST",
  PositionImpactFactorPositiveDescNullsLast = "positionImpactFactorPositive_DESC_NULLS_LAST",
  PositionImpactPoolAmountAsc = "positionImpactPoolAmount_ASC",
  PositionImpactPoolAmountAscNullsFirst = "positionImpactPoolAmount_ASC_NULLS_FIRST",
  PositionImpactPoolAmountAscNullsLast = "positionImpactPoolAmount_ASC_NULLS_LAST",
  PositionImpactPoolAmountDesc = "positionImpactPoolAmount_DESC",
  PositionImpactPoolAmountDescNullsFirst = "positionImpactPoolAmount_DESC_NULLS_FIRST",
  PositionImpactPoolAmountDescNullsLast = "positionImpactPoolAmount_DESC_NULLS_LAST",
  PositionImpactPoolDistributionRateAsc = "positionImpactPoolDistributionRate_ASC",
  PositionImpactPoolDistributionRateAscNullsFirst = "positionImpactPoolDistributionRate_ASC_NULLS_FIRST",
  PositionImpactPoolDistributionRateAscNullsLast = "positionImpactPoolDistributionRate_ASC_NULLS_LAST",
  PositionImpactPoolDistributionRateDesc = "positionImpactPoolDistributionRate_DESC",
  PositionImpactPoolDistributionRateDescNullsFirst = "positionImpactPoolDistributionRate_DESC_NULLS_FIRST",
  PositionImpactPoolDistributionRateDescNullsLast = "positionImpactPoolDistributionRate_DESC_NULLS_LAST",
  ReserveFactorLongAsc = "reserveFactorLong_ASC",
  ReserveFactorLongAscNullsFirst = "reserveFactorLong_ASC_NULLS_FIRST",
  ReserveFactorLongAscNullsLast = "reserveFactorLong_ASC_NULLS_LAST",
  ReserveFactorLongDesc = "reserveFactorLong_DESC",
  ReserveFactorLongDescNullsFirst = "reserveFactorLong_DESC_NULLS_FIRST",
  ReserveFactorLongDescNullsLast = "reserveFactorLong_DESC_NULLS_LAST",
  ReserveFactorShortAsc = "reserveFactorShort_ASC",
  ReserveFactorShortAscNullsFirst = "reserveFactorShort_ASC_NULLS_FIRST",
  ReserveFactorShortAscNullsLast = "reserveFactorShort_ASC_NULLS_LAST",
  ReserveFactorShortDesc = "reserveFactorShort_DESC",
  ReserveFactorShortDescNullsFirst = "reserveFactorShort_DESC_NULLS_FIRST",
  ReserveFactorShortDescNullsLast = "reserveFactorShort_DESC_NULLS_LAST",
  ShortOpenInterestInTokensUsingLongTokenAsc = "shortOpenInterestInTokensUsingLongToken_ASC",
  ShortOpenInterestInTokensUsingLongTokenAscNullsFirst = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingLongTokenAscNullsLast = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  ShortOpenInterestInTokensUsingLongTokenDesc = "shortOpenInterestInTokensUsingLongToken_DESC",
  ShortOpenInterestInTokensUsingLongTokenDescNullsFirst = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingLongTokenDescNullsLast = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  ShortOpenInterestInTokensUsingShortTokenAsc = "shortOpenInterestInTokensUsingShortToken_ASC",
  ShortOpenInterestInTokensUsingShortTokenAscNullsFirst = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingShortTokenAscNullsLast = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  ShortOpenInterestInTokensUsingShortTokenDesc = "shortOpenInterestInTokensUsingShortToken_DESC",
  ShortOpenInterestInTokensUsingShortTokenDescNullsFirst = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingShortTokenDescNullsLast = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  ShortOpenInterestInTokensAsc = "shortOpenInterestInTokens_ASC",
  ShortOpenInterestInTokensAscNullsFirst = "shortOpenInterestInTokens_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensAscNullsLast = "shortOpenInterestInTokens_ASC_NULLS_LAST",
  ShortOpenInterestInTokensDesc = "shortOpenInterestInTokens_DESC",
  ShortOpenInterestInTokensDescNullsFirst = "shortOpenInterestInTokens_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensDescNullsLast = "shortOpenInterestInTokens_DESC_NULLS_LAST",
  ShortOpenInterestUsdAsc = "shortOpenInterestUsd_ASC",
  ShortOpenInterestUsdAscNullsFirst = "shortOpenInterestUsd_ASC_NULLS_FIRST",
  ShortOpenInterestUsdAscNullsLast = "shortOpenInterestUsd_ASC_NULLS_LAST",
  ShortOpenInterestUsdDesc = "shortOpenInterestUsd_DESC",
  ShortOpenInterestUsdDescNullsFirst = "shortOpenInterestUsd_DESC_NULLS_FIRST",
  ShortOpenInterestUsdDescNullsLast = "shortOpenInterestUsd_DESC_NULLS_LAST",
  ShortOpenInterestUsingLongTokenAsc = "shortOpenInterestUsingLongToken_ASC",
  ShortOpenInterestUsingLongTokenAscNullsFirst = "shortOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  ShortOpenInterestUsingLongTokenAscNullsLast = "shortOpenInterestUsingLongToken_ASC_NULLS_LAST",
  ShortOpenInterestUsingLongTokenDesc = "shortOpenInterestUsingLongToken_DESC",
  ShortOpenInterestUsingLongTokenDescNullsFirst = "shortOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  ShortOpenInterestUsingLongTokenDescNullsLast = "shortOpenInterestUsingLongToken_DESC_NULLS_LAST",
  ShortOpenInterestUsingShortTokenAsc = "shortOpenInterestUsingShortToken_ASC",
  ShortOpenInterestUsingShortTokenAscNullsFirst = "shortOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  ShortOpenInterestUsingShortTokenAscNullsLast = "shortOpenInterestUsingShortToken_ASC_NULLS_LAST",
  ShortOpenInterestUsingShortTokenDesc = "shortOpenInterestUsingShortToken_DESC",
  ShortOpenInterestUsingShortTokenDescNullsFirst = "shortOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  ShortOpenInterestUsingShortTokenDescNullsLast = "shortOpenInterestUsingShortToken_DESC_NULLS_LAST",
  ShortPoolAmountAdjustmentAsc = "shortPoolAmountAdjustment_ASC",
  ShortPoolAmountAdjustmentAscNullsFirst = "shortPoolAmountAdjustment_ASC_NULLS_FIRST",
  ShortPoolAmountAdjustmentAscNullsLast = "shortPoolAmountAdjustment_ASC_NULLS_LAST",
  ShortPoolAmountAdjustmentDesc = "shortPoolAmountAdjustment_DESC",
  ShortPoolAmountAdjustmentDescNullsFirst = "shortPoolAmountAdjustment_DESC_NULLS_FIRST",
  ShortPoolAmountAdjustmentDescNullsLast = "shortPoolAmountAdjustment_DESC_NULLS_LAST",
  ShortPoolAmountAsc = "shortPoolAmount_ASC",
  ShortPoolAmountAscNullsFirst = "shortPoolAmount_ASC_NULLS_FIRST",
  ShortPoolAmountAscNullsLast = "shortPoolAmount_ASC_NULLS_LAST",
  ShortPoolAmountDesc = "shortPoolAmount_DESC",
  ShortPoolAmountDescNullsFirst = "shortPoolAmount_DESC_NULLS_FIRST",
  ShortPoolAmountDescNullsLast = "shortPoolAmount_DESC_NULLS_LAST",
  ShortTokenAddressAsc = "shortTokenAddress_ASC",
  ShortTokenAddressAscNullsFirst = "shortTokenAddress_ASC_NULLS_FIRST",
  ShortTokenAddressAscNullsLast = "shortTokenAddress_ASC_NULLS_LAST",
  ShortTokenAddressDesc = "shortTokenAddress_DESC",
  ShortTokenAddressDescNullsFirst = "shortTokenAddress_DESC_NULLS_FIRST",
  ShortTokenAddressDescNullsLast = "shortTokenAddress_DESC_NULLS_LAST",
  SwapFeeFactorForNegativeImpactAsc = "swapFeeFactorForNegativeImpact_ASC",
  SwapFeeFactorForNegativeImpactAscNullsFirst = "swapFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  SwapFeeFactorForNegativeImpactAscNullsLast = "swapFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  SwapFeeFactorForNegativeImpactDesc = "swapFeeFactorForNegativeImpact_DESC",
  SwapFeeFactorForNegativeImpactDescNullsFirst = "swapFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  SwapFeeFactorForNegativeImpactDescNullsLast = "swapFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  SwapFeeFactorForPositiveImpactAsc = "swapFeeFactorForPositiveImpact_ASC",
  SwapFeeFactorForPositiveImpactAscNullsFirst = "swapFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  SwapFeeFactorForPositiveImpactAscNullsLast = "swapFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  SwapFeeFactorForPositiveImpactDesc = "swapFeeFactorForPositiveImpact_DESC",
  SwapFeeFactorForPositiveImpactDescNullsFirst = "swapFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  SwapFeeFactorForPositiveImpactDescNullsLast = "swapFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  SwapImpactExponentFactorAsc = "swapImpactExponentFactor_ASC",
  SwapImpactExponentFactorAscNullsFirst = "swapImpactExponentFactor_ASC_NULLS_FIRST",
  SwapImpactExponentFactorAscNullsLast = "swapImpactExponentFactor_ASC_NULLS_LAST",
  SwapImpactExponentFactorDesc = "swapImpactExponentFactor_DESC",
  SwapImpactExponentFactorDescNullsFirst = "swapImpactExponentFactor_DESC_NULLS_FIRST",
  SwapImpactExponentFactorDescNullsLast = "swapImpactExponentFactor_DESC_NULLS_LAST",
  SwapImpactFactorNegativeAsc = "swapImpactFactorNegative_ASC",
  SwapImpactFactorNegativeAscNullsFirst = "swapImpactFactorNegative_ASC_NULLS_FIRST",
  SwapImpactFactorNegativeAscNullsLast = "swapImpactFactorNegative_ASC_NULLS_LAST",
  SwapImpactFactorNegativeDesc = "swapImpactFactorNegative_DESC",
  SwapImpactFactorNegativeDescNullsFirst = "swapImpactFactorNegative_DESC_NULLS_FIRST",
  SwapImpactFactorNegativeDescNullsLast = "swapImpactFactorNegative_DESC_NULLS_LAST",
  SwapImpactFactorPositiveAsc = "swapImpactFactorPositive_ASC",
  SwapImpactFactorPositiveAscNullsFirst = "swapImpactFactorPositive_ASC_NULLS_FIRST",
  SwapImpactFactorPositiveAscNullsLast = "swapImpactFactorPositive_ASC_NULLS_LAST",
  SwapImpactFactorPositiveDesc = "swapImpactFactorPositive_DESC",
  SwapImpactFactorPositiveDescNullsFirst = "swapImpactFactorPositive_DESC_NULLS_FIRST",
  SwapImpactFactorPositiveDescNullsLast = "swapImpactFactorPositive_DESC_NULLS_LAST",
  SwapImpactPoolAmountLongAsc = "swapImpactPoolAmountLong_ASC",
  SwapImpactPoolAmountLongAscNullsFirst = "swapImpactPoolAmountLong_ASC_NULLS_FIRST",
  SwapImpactPoolAmountLongAscNullsLast = "swapImpactPoolAmountLong_ASC_NULLS_LAST",
  SwapImpactPoolAmountLongDesc = "swapImpactPoolAmountLong_DESC",
  SwapImpactPoolAmountLongDescNullsFirst = "swapImpactPoolAmountLong_DESC_NULLS_FIRST",
  SwapImpactPoolAmountLongDescNullsLast = "swapImpactPoolAmountLong_DESC_NULLS_LAST",
  SwapImpactPoolAmountShortAsc = "swapImpactPoolAmountShort_ASC",
  SwapImpactPoolAmountShortAscNullsFirst = "swapImpactPoolAmountShort_ASC_NULLS_FIRST",
  SwapImpactPoolAmountShortAscNullsLast = "swapImpactPoolAmountShort_ASC_NULLS_LAST",
  SwapImpactPoolAmountShortDesc = "swapImpactPoolAmountShort_DESC",
  SwapImpactPoolAmountShortDescNullsFirst = "swapImpactPoolAmountShort_DESC_NULLS_FIRST",
  SwapImpactPoolAmountShortDescNullsLast = "swapImpactPoolAmountShort_DESC_NULLS_LAST",
  ThresholdForDecreaseFundingAsc = "thresholdForDecreaseFunding_ASC",
  ThresholdForDecreaseFundingAscNullsFirst = "thresholdForDecreaseFunding_ASC_NULLS_FIRST",
  ThresholdForDecreaseFundingAscNullsLast = "thresholdForDecreaseFunding_ASC_NULLS_LAST",
  ThresholdForDecreaseFundingDesc = "thresholdForDecreaseFunding_DESC",
  ThresholdForDecreaseFundingDescNullsFirst = "thresholdForDecreaseFunding_DESC_NULLS_FIRST",
  ThresholdForDecreaseFundingDescNullsLast = "thresholdForDecreaseFunding_DESC_NULLS_LAST",
  ThresholdForStableFundingAsc = "thresholdForStableFunding_ASC",
  ThresholdForStableFundingAscNullsFirst = "thresholdForStableFunding_ASC_NULLS_FIRST",
  ThresholdForStableFundingAscNullsLast = "thresholdForStableFunding_ASC_NULLS_LAST",
  ThresholdForStableFundingDesc = "thresholdForStableFunding_DESC",
  ThresholdForStableFundingDescNullsFirst = "thresholdForStableFunding_DESC_NULLS_FIRST",
  ThresholdForStableFundingDescNullsLast = "thresholdForStableFunding_DESC_NULLS_LAST",
  TotalBorrowingFeesAsc = "totalBorrowingFees_ASC",
  TotalBorrowingFeesAscNullsFirst = "totalBorrowingFees_ASC_NULLS_FIRST",
  TotalBorrowingFeesAscNullsLast = "totalBorrowingFees_ASC_NULLS_LAST",
  TotalBorrowingFeesDesc = "totalBorrowingFees_DESC",
  TotalBorrowingFeesDescNullsFirst = "totalBorrowingFees_DESC_NULLS_FIRST",
  TotalBorrowingFeesDescNullsLast = "totalBorrowingFees_DESC_NULLS_LAST",
  VirtualIndexTokenIdAsc = "virtualIndexTokenId_ASC",
  VirtualIndexTokenIdAscNullsFirst = "virtualIndexTokenId_ASC_NULLS_FIRST",
  VirtualIndexTokenIdAscNullsLast = "virtualIndexTokenId_ASC_NULLS_LAST",
  VirtualIndexTokenIdDesc = "virtualIndexTokenId_DESC",
  VirtualIndexTokenIdDescNullsFirst = "virtualIndexTokenId_DESC_NULLS_FIRST",
  VirtualIndexTokenIdDescNullsLast = "virtualIndexTokenId_DESC_NULLS_LAST",
  VirtualInventoryForPositionsAsc = "virtualInventoryForPositions_ASC",
  VirtualInventoryForPositionsAscNullsFirst = "virtualInventoryForPositions_ASC_NULLS_FIRST",
  VirtualInventoryForPositionsAscNullsLast = "virtualInventoryForPositions_ASC_NULLS_LAST",
  VirtualInventoryForPositionsDesc = "virtualInventoryForPositions_DESC",
  VirtualInventoryForPositionsDescNullsFirst = "virtualInventoryForPositions_DESC_NULLS_FIRST",
  VirtualInventoryForPositionsDescNullsLast = "virtualInventoryForPositions_DESC_NULLS_LAST",
  VirtualLongTokenIdAsc = "virtualLongTokenId_ASC",
  VirtualLongTokenIdAscNullsFirst = "virtualLongTokenId_ASC_NULLS_FIRST",
  VirtualLongTokenIdAscNullsLast = "virtualLongTokenId_ASC_NULLS_LAST",
  VirtualLongTokenIdDesc = "virtualLongTokenId_DESC",
  VirtualLongTokenIdDescNullsFirst = "virtualLongTokenId_DESC_NULLS_FIRST",
  VirtualLongTokenIdDescNullsLast = "virtualLongTokenId_DESC_NULLS_LAST",
  VirtualMarketIdAsc = "virtualMarketId_ASC",
  VirtualMarketIdAscNullsFirst = "virtualMarketId_ASC_NULLS_FIRST",
  VirtualMarketIdAscNullsLast = "virtualMarketId_ASC_NULLS_LAST",
  VirtualMarketIdDesc = "virtualMarketId_DESC",
  VirtualMarketIdDescNullsFirst = "virtualMarketId_DESC_NULLS_FIRST",
  VirtualMarketIdDescNullsLast = "virtualMarketId_DESC_NULLS_LAST",
  VirtualPoolAmountForLongTokenAsc = "virtualPoolAmountForLongToken_ASC",
  VirtualPoolAmountForLongTokenAscNullsFirst = "virtualPoolAmountForLongToken_ASC_NULLS_FIRST",
  VirtualPoolAmountForLongTokenAscNullsLast = "virtualPoolAmountForLongToken_ASC_NULLS_LAST",
  VirtualPoolAmountForLongTokenDesc = "virtualPoolAmountForLongToken_DESC",
  VirtualPoolAmountForLongTokenDescNullsFirst = "virtualPoolAmountForLongToken_DESC_NULLS_FIRST",
  VirtualPoolAmountForLongTokenDescNullsLast = "virtualPoolAmountForLongToken_DESC_NULLS_LAST",
  VirtualPoolAmountForShortTokenAsc = "virtualPoolAmountForShortToken_ASC",
  VirtualPoolAmountForShortTokenAscNullsFirst = "virtualPoolAmountForShortToken_ASC_NULLS_FIRST",
  VirtualPoolAmountForShortTokenAscNullsLast = "virtualPoolAmountForShortToken_ASC_NULLS_LAST",
  VirtualPoolAmountForShortTokenDesc = "virtualPoolAmountForShortToken_DESC",
  VirtualPoolAmountForShortTokenDescNullsFirst = "virtualPoolAmountForShortToken_DESC_NULLS_FIRST",
  VirtualPoolAmountForShortTokenDescNullsLast = "virtualPoolAmountForShortToken_DESC_NULLS_LAST",
  VirtualShortTokenIdAsc = "virtualShortTokenId_ASC",
  VirtualShortTokenIdAscNullsFirst = "virtualShortTokenId_ASC_NULLS_FIRST",
  VirtualShortTokenIdAscNullsLast = "virtualShortTokenId_ASC_NULLS_LAST",
  VirtualShortTokenIdDesc = "virtualShortTokenId_DESC",
  VirtualShortTokenIdDescNullsFirst = "virtualShortTokenId_DESC_NULLS_FIRST",
  VirtualShortTokenIdDescNullsLast = "virtualShortTokenId_DESC_NULLS_LAST",
}

export type MarketInfoWhereInput = {
  AND?: InputMaybe<Array<MarketInfoWhereInput>>;
  OR?: InputMaybe<Array<MarketInfoWhereInput>>;
  aboveOptimalUsageBorrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  baseBorrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  baseBorrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingExponentFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingExponentFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForLongs_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForLongs_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondForLongs_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForShorts_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForShorts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondForShorts_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingDecreaseFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingDecreaseFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingDecreaseFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingIncreaseFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingIncreaseFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingIncreaseFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isDisabled_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDisabled_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDisabled_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmountAdjustment_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmountAdjustment_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longPoolAmountAdjustment_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longsPayShorts_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  longsPayShorts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longsPayShorts_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenSupply_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketTokenSupply_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenSupply_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxFundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxFundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxFundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxLongPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolUsdForDeposit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolUsdForDeposit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxLongPoolUsdForDeposit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxOpenInterestLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxOpenInterestShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPnlFactorForTradersLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPnlFactorForTradersShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorForLiquidations_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorForLiquidations_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorForLiquidations_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxShortPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolUsdForDeposit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolUsdForDeposit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxShortPoolUsdForDeposit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactorForOpenInterestLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactorForOpenInterestShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minFundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minFundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minFundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPositionImpactPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPositionImpactPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minPositionImpactPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openInterestReserveFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openInterestReserveFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  optimalUsageFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  optimalUsageFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValueMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValueMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForNegativeImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForNegativeImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeFactorForNegativeImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForPositiveImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForPositiveImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeFactorForPositiveImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolDistributionRate_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolDistributionRate_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactPoolDistributionRate_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reserveFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reserveFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmountAdjustment_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmountAdjustment_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortPoolAmountAdjustment_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  swapFeeFactorForNegativeImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForNegativeImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapFeeFactorForNegativeImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForPositiveImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForPositiveImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapFeeFactorForPositiveImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactPoolAmountLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactPoolAmountShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForDecreaseFunding_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForDecreaseFunding_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  thresholdForDecreaseFunding_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForStableFunding_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForStableFunding_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  thresholdForStableFunding_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalBorrowingFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalBorrowingFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalBorrowingFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualIndexTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualIndexTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualIndexTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualIndexTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualInventoryForPositions_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualInventoryForPositions_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualInventoryForPositions_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualLongTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualLongTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualLongTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualLongTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualMarketId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualMarketId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualMarketId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualPoolAmountForLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualPoolAmountForLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualPoolAmountForShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualShortTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualShortTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualShortTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualShortTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type MarketInfosConnection = {
  __typename?: "MarketInfosConnection";
  edges: Array<MarketInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export enum MarketOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenAsc = "indexToken_ASC",
  IndexTokenAscNullsFirst = "indexToken_ASC_NULLS_FIRST",
  IndexTokenAscNullsLast = "indexToken_ASC_NULLS_LAST",
  IndexTokenDesc = "indexToken_DESC",
  IndexTokenDescNullsFirst = "indexToken_DESC_NULLS_FIRST",
  IndexTokenDescNullsLast = "indexToken_DESC_NULLS_LAST",
  LongTokenAsc = "longToken_ASC",
  LongTokenAscNullsFirst = "longToken_ASC_NULLS_FIRST",
  LongTokenAscNullsLast = "longToken_ASC_NULLS_LAST",
  LongTokenDesc = "longToken_DESC",
  LongTokenDescNullsFirst = "longToken_DESC_NULLS_FIRST",
  LongTokenDescNullsLast = "longToken_DESC_NULLS_LAST",
  ShortTokenAsc = "shortToken_ASC",
  ShortTokenAscNullsFirst = "shortToken_ASC_NULLS_FIRST",
  ShortTokenAscNullsLast = "shortToken_ASC_NULLS_LAST",
  ShortTokenDesc = "shortToken_DESC",
  ShortTokenDescNullsFirst = "shortToken_DESC_NULLS_FIRST",
  ShortTokenDescNullsLast = "shortToken_DESC_NULLS_LAST",
}

export type MarketWhereInput = {
  AND?: InputMaybe<Array<MarketWhereInput>>;
  OR?: InputMaybe<Array<MarketWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  longToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  longToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  longToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  longToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  longToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type MarketsConnection = {
  __typename?: "MarketsConnection";
  edges: Array<MarketEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type OnChainSetting = {
  __typename?: "OnChainSetting";
  id: Scalars["String"]["output"];
  key: Scalars["String"]["output"];
  type: OnChainSettingType;
  value: Scalars["String"]["output"];
};

export type OnChainSettingEdge = {
  __typename?: "OnChainSettingEdge";
  cursor: Scalars["String"]["output"];
  node: OnChainSetting;
};

export enum OnChainSettingOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  KeyAsc = "key_ASC",
  KeyAscNullsFirst = "key_ASC_NULLS_FIRST",
  KeyAscNullsLast = "key_ASC_NULLS_LAST",
  KeyDesc = "key_DESC",
  KeyDescNullsFirst = "key_DESC_NULLS_FIRST",
  KeyDescNullsLast = "key_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
  ValueAsc = "value_ASC",
  ValueAscNullsFirst = "value_ASC_NULLS_FIRST",
  ValueAscNullsLast = "value_ASC_NULLS_LAST",
  ValueDesc = "value_DESC",
  ValueDescNullsFirst = "value_DESC_NULLS_FIRST",
  ValueDescNullsLast = "value_DESC_NULLS_LAST",
}

export enum OnChainSettingType {
  Bool = "bool",
  Bytes32 = "bytes32",
  String = "string",
  Uint = "uint",
}

export type OnChainSettingWhereInput = {
  AND?: InputMaybe<Array<OnChainSettingWhereInput>>;
  OR?: InputMaybe<Array<OnChainSettingWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_contains?: InputMaybe<Scalars["String"]["input"]>;
  key_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  key_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_eq?: InputMaybe<Scalars["String"]["input"]>;
  key_gt?: InputMaybe<Scalars["String"]["input"]>;
  key_gte?: InputMaybe<Scalars["String"]["input"]>;
  key_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  key_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  key_lt?: InputMaybe<Scalars["String"]["input"]>;
  key_lte?: InputMaybe<Scalars["String"]["input"]>;
  key_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  key_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  key_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  key_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  key_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  type_eq?: InputMaybe<OnChainSettingType>;
  type_in?: InputMaybe<Array<OnChainSettingType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<OnChainSettingType>;
  type_not_in?: InputMaybe<Array<OnChainSettingType>>;
  value_contains?: InputMaybe<Scalars["String"]["input"]>;
  value_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  value_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_eq?: InputMaybe<Scalars["String"]["input"]>;
  value_gt?: InputMaybe<Scalars["String"]["input"]>;
  value_gte?: InputMaybe<Scalars["String"]["input"]>;
  value_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  value_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  value_lt?: InputMaybe<Scalars["String"]["input"]>;
  value_lte?: InputMaybe<Scalars["String"]["input"]>;
  value_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  value_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  value_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  value_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  value_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type OnChainSettingsConnection = {
  __typename?: "OnChainSettingsConnection";
  edges: Array<OnChainSettingEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Order = {
  __typename?: "Order";
  acceptablePrice: Scalars["BigInt"]["output"];
  account: Scalars["String"]["output"];
  callbackContract: Scalars["String"]["output"];
  callbackGasLimit: Scalars["BigInt"]["output"];
  cancelledReason?: Maybe<Scalars["String"]["output"]>;
  cancelledReasonBytes?: Maybe<Scalars["String"]["output"]>;
  cancelledTxn?: Maybe<Transaction>;
  createdTxn: Transaction;
  executedTxn?: Maybe<Transaction>;
  executionFee: Scalars["BigInt"]["output"];
  frozenReason?: Maybe<Scalars["String"]["output"]>;
  frozenReasonBytes?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  initialCollateralDeltaAmount: Scalars["BigInt"]["output"];
  initialCollateralTokenAddress: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  marketAddress: Scalars["String"]["output"];
  minOutputAmount: Scalars["BigInt"]["output"];
  numberOfParts?: Maybe<Scalars["Int"]["output"]>;
  orderType: Scalars["Int"]["output"];
  receiver: Scalars["String"]["output"];
  shouldUnwrapNativeToken: Scalars["Boolean"]["output"];
  sizeDeltaUsd: Scalars["BigInt"]["output"];
  status: OrderStatus;
  swapPath: Array<Scalars["String"]["output"]>;
  triggerPrice: Scalars["BigInt"]["output"];
  twapGroupId?: Maybe<Scalars["String"]["output"]>;
  uiFeeReceiver: Scalars["String"]["output"];
  updatedAtBlock: Scalars["BigInt"]["output"];
};

export type OrderEdge = {
  __typename?: "OrderEdge";
  cursor: Scalars["String"]["output"];
  node: Order;
};

export enum OrderOrderByInput {
  AcceptablePriceAsc = "acceptablePrice_ASC",
  AcceptablePriceAscNullsFirst = "acceptablePrice_ASC_NULLS_FIRST",
  AcceptablePriceAscNullsLast = "acceptablePrice_ASC_NULLS_LAST",
  AcceptablePriceDesc = "acceptablePrice_DESC",
  AcceptablePriceDescNullsFirst = "acceptablePrice_DESC_NULLS_FIRST",
  AcceptablePriceDescNullsLast = "acceptablePrice_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  CallbackContractAsc = "callbackContract_ASC",
  CallbackContractAscNullsFirst = "callbackContract_ASC_NULLS_FIRST",
  CallbackContractAscNullsLast = "callbackContract_ASC_NULLS_LAST",
  CallbackContractDesc = "callbackContract_DESC",
  CallbackContractDescNullsFirst = "callbackContract_DESC_NULLS_FIRST",
  CallbackContractDescNullsLast = "callbackContract_DESC_NULLS_LAST",
  CallbackGasLimitAsc = "callbackGasLimit_ASC",
  CallbackGasLimitAscNullsFirst = "callbackGasLimit_ASC_NULLS_FIRST",
  CallbackGasLimitAscNullsLast = "callbackGasLimit_ASC_NULLS_LAST",
  CallbackGasLimitDesc = "callbackGasLimit_DESC",
  CallbackGasLimitDescNullsFirst = "callbackGasLimit_DESC_NULLS_FIRST",
  CallbackGasLimitDescNullsLast = "callbackGasLimit_DESC_NULLS_LAST",
  CancelledReasonBytesAsc = "cancelledReasonBytes_ASC",
  CancelledReasonBytesAscNullsFirst = "cancelledReasonBytes_ASC_NULLS_FIRST",
  CancelledReasonBytesAscNullsLast = "cancelledReasonBytes_ASC_NULLS_LAST",
  CancelledReasonBytesDesc = "cancelledReasonBytes_DESC",
  CancelledReasonBytesDescNullsFirst = "cancelledReasonBytes_DESC_NULLS_FIRST",
  CancelledReasonBytesDescNullsLast = "cancelledReasonBytes_DESC_NULLS_LAST",
  CancelledReasonAsc = "cancelledReason_ASC",
  CancelledReasonAscNullsFirst = "cancelledReason_ASC_NULLS_FIRST",
  CancelledReasonAscNullsLast = "cancelledReason_ASC_NULLS_LAST",
  CancelledReasonDesc = "cancelledReason_DESC",
  CancelledReasonDescNullsFirst = "cancelledReason_DESC_NULLS_FIRST",
  CancelledReasonDescNullsLast = "cancelledReason_DESC_NULLS_LAST",
  CancelledTxnBlockNumberAsc = "cancelledTxn_blockNumber_ASC",
  CancelledTxnBlockNumberAscNullsFirst = "cancelledTxn_blockNumber_ASC_NULLS_FIRST",
  CancelledTxnBlockNumberAscNullsLast = "cancelledTxn_blockNumber_ASC_NULLS_LAST",
  CancelledTxnBlockNumberDesc = "cancelledTxn_blockNumber_DESC",
  CancelledTxnBlockNumberDescNullsFirst = "cancelledTxn_blockNumber_DESC_NULLS_FIRST",
  CancelledTxnBlockNumberDescNullsLast = "cancelledTxn_blockNumber_DESC_NULLS_LAST",
  CancelledTxnFromAsc = "cancelledTxn_from_ASC",
  CancelledTxnFromAscNullsFirst = "cancelledTxn_from_ASC_NULLS_FIRST",
  CancelledTxnFromAscNullsLast = "cancelledTxn_from_ASC_NULLS_LAST",
  CancelledTxnFromDesc = "cancelledTxn_from_DESC",
  CancelledTxnFromDescNullsFirst = "cancelledTxn_from_DESC_NULLS_FIRST",
  CancelledTxnFromDescNullsLast = "cancelledTxn_from_DESC_NULLS_LAST",
  CancelledTxnHashAsc = "cancelledTxn_hash_ASC",
  CancelledTxnHashAscNullsFirst = "cancelledTxn_hash_ASC_NULLS_FIRST",
  CancelledTxnHashAscNullsLast = "cancelledTxn_hash_ASC_NULLS_LAST",
  CancelledTxnHashDesc = "cancelledTxn_hash_DESC",
  CancelledTxnHashDescNullsFirst = "cancelledTxn_hash_DESC_NULLS_FIRST",
  CancelledTxnHashDescNullsLast = "cancelledTxn_hash_DESC_NULLS_LAST",
  CancelledTxnIdAsc = "cancelledTxn_id_ASC",
  CancelledTxnIdAscNullsFirst = "cancelledTxn_id_ASC_NULLS_FIRST",
  CancelledTxnIdAscNullsLast = "cancelledTxn_id_ASC_NULLS_LAST",
  CancelledTxnIdDesc = "cancelledTxn_id_DESC",
  CancelledTxnIdDescNullsFirst = "cancelledTxn_id_DESC_NULLS_FIRST",
  CancelledTxnIdDescNullsLast = "cancelledTxn_id_DESC_NULLS_LAST",
  CancelledTxnTimestampAsc = "cancelledTxn_timestamp_ASC",
  CancelledTxnTimestampAscNullsFirst = "cancelledTxn_timestamp_ASC_NULLS_FIRST",
  CancelledTxnTimestampAscNullsLast = "cancelledTxn_timestamp_ASC_NULLS_LAST",
  CancelledTxnTimestampDesc = "cancelledTxn_timestamp_DESC",
  CancelledTxnTimestampDescNullsFirst = "cancelledTxn_timestamp_DESC_NULLS_FIRST",
  CancelledTxnTimestampDescNullsLast = "cancelledTxn_timestamp_DESC_NULLS_LAST",
  CancelledTxnToAsc = "cancelledTxn_to_ASC",
  CancelledTxnToAscNullsFirst = "cancelledTxn_to_ASC_NULLS_FIRST",
  CancelledTxnToAscNullsLast = "cancelledTxn_to_ASC_NULLS_LAST",
  CancelledTxnToDesc = "cancelledTxn_to_DESC",
  CancelledTxnToDescNullsFirst = "cancelledTxn_to_DESC_NULLS_FIRST",
  CancelledTxnToDescNullsLast = "cancelledTxn_to_DESC_NULLS_LAST",
  CancelledTxnTransactionIndexAsc = "cancelledTxn_transactionIndex_ASC",
  CancelledTxnTransactionIndexAscNullsFirst = "cancelledTxn_transactionIndex_ASC_NULLS_FIRST",
  CancelledTxnTransactionIndexAscNullsLast = "cancelledTxn_transactionIndex_ASC_NULLS_LAST",
  CancelledTxnTransactionIndexDesc = "cancelledTxn_transactionIndex_DESC",
  CancelledTxnTransactionIndexDescNullsFirst = "cancelledTxn_transactionIndex_DESC_NULLS_FIRST",
  CancelledTxnTransactionIndexDescNullsLast = "cancelledTxn_transactionIndex_DESC_NULLS_LAST",
  CreatedTxnBlockNumberAsc = "createdTxn_blockNumber_ASC",
  CreatedTxnBlockNumberAscNullsFirst = "createdTxn_blockNumber_ASC_NULLS_FIRST",
  CreatedTxnBlockNumberAscNullsLast = "createdTxn_blockNumber_ASC_NULLS_LAST",
  CreatedTxnBlockNumberDesc = "createdTxn_blockNumber_DESC",
  CreatedTxnBlockNumberDescNullsFirst = "createdTxn_blockNumber_DESC_NULLS_FIRST",
  CreatedTxnBlockNumberDescNullsLast = "createdTxn_blockNumber_DESC_NULLS_LAST",
  CreatedTxnFromAsc = "createdTxn_from_ASC",
  CreatedTxnFromAscNullsFirst = "createdTxn_from_ASC_NULLS_FIRST",
  CreatedTxnFromAscNullsLast = "createdTxn_from_ASC_NULLS_LAST",
  CreatedTxnFromDesc = "createdTxn_from_DESC",
  CreatedTxnFromDescNullsFirst = "createdTxn_from_DESC_NULLS_FIRST",
  CreatedTxnFromDescNullsLast = "createdTxn_from_DESC_NULLS_LAST",
  CreatedTxnHashAsc = "createdTxn_hash_ASC",
  CreatedTxnHashAscNullsFirst = "createdTxn_hash_ASC_NULLS_FIRST",
  CreatedTxnHashAscNullsLast = "createdTxn_hash_ASC_NULLS_LAST",
  CreatedTxnHashDesc = "createdTxn_hash_DESC",
  CreatedTxnHashDescNullsFirst = "createdTxn_hash_DESC_NULLS_FIRST",
  CreatedTxnHashDescNullsLast = "createdTxn_hash_DESC_NULLS_LAST",
  CreatedTxnIdAsc = "createdTxn_id_ASC",
  CreatedTxnIdAscNullsFirst = "createdTxn_id_ASC_NULLS_FIRST",
  CreatedTxnIdAscNullsLast = "createdTxn_id_ASC_NULLS_LAST",
  CreatedTxnIdDesc = "createdTxn_id_DESC",
  CreatedTxnIdDescNullsFirst = "createdTxn_id_DESC_NULLS_FIRST",
  CreatedTxnIdDescNullsLast = "createdTxn_id_DESC_NULLS_LAST",
  CreatedTxnTimestampAsc = "createdTxn_timestamp_ASC",
  CreatedTxnTimestampAscNullsFirst = "createdTxn_timestamp_ASC_NULLS_FIRST",
  CreatedTxnTimestampAscNullsLast = "createdTxn_timestamp_ASC_NULLS_LAST",
  CreatedTxnTimestampDesc = "createdTxn_timestamp_DESC",
  CreatedTxnTimestampDescNullsFirst = "createdTxn_timestamp_DESC_NULLS_FIRST",
  CreatedTxnTimestampDescNullsLast = "createdTxn_timestamp_DESC_NULLS_LAST",
  CreatedTxnToAsc = "createdTxn_to_ASC",
  CreatedTxnToAscNullsFirst = "createdTxn_to_ASC_NULLS_FIRST",
  CreatedTxnToAscNullsLast = "createdTxn_to_ASC_NULLS_LAST",
  CreatedTxnToDesc = "createdTxn_to_DESC",
  CreatedTxnToDescNullsFirst = "createdTxn_to_DESC_NULLS_FIRST",
  CreatedTxnToDescNullsLast = "createdTxn_to_DESC_NULLS_LAST",
  CreatedTxnTransactionIndexAsc = "createdTxn_transactionIndex_ASC",
  CreatedTxnTransactionIndexAscNullsFirst = "createdTxn_transactionIndex_ASC_NULLS_FIRST",
  CreatedTxnTransactionIndexAscNullsLast = "createdTxn_transactionIndex_ASC_NULLS_LAST",
  CreatedTxnTransactionIndexDesc = "createdTxn_transactionIndex_DESC",
  CreatedTxnTransactionIndexDescNullsFirst = "createdTxn_transactionIndex_DESC_NULLS_FIRST",
  CreatedTxnTransactionIndexDescNullsLast = "createdTxn_transactionIndex_DESC_NULLS_LAST",
  ExecutedTxnBlockNumberAsc = "executedTxn_blockNumber_ASC",
  ExecutedTxnBlockNumberAscNullsFirst = "executedTxn_blockNumber_ASC_NULLS_FIRST",
  ExecutedTxnBlockNumberAscNullsLast = "executedTxn_blockNumber_ASC_NULLS_LAST",
  ExecutedTxnBlockNumberDesc = "executedTxn_blockNumber_DESC",
  ExecutedTxnBlockNumberDescNullsFirst = "executedTxn_blockNumber_DESC_NULLS_FIRST",
  ExecutedTxnBlockNumberDescNullsLast = "executedTxn_blockNumber_DESC_NULLS_LAST",
  ExecutedTxnFromAsc = "executedTxn_from_ASC",
  ExecutedTxnFromAscNullsFirst = "executedTxn_from_ASC_NULLS_FIRST",
  ExecutedTxnFromAscNullsLast = "executedTxn_from_ASC_NULLS_LAST",
  ExecutedTxnFromDesc = "executedTxn_from_DESC",
  ExecutedTxnFromDescNullsFirst = "executedTxn_from_DESC_NULLS_FIRST",
  ExecutedTxnFromDescNullsLast = "executedTxn_from_DESC_NULLS_LAST",
  ExecutedTxnHashAsc = "executedTxn_hash_ASC",
  ExecutedTxnHashAscNullsFirst = "executedTxn_hash_ASC_NULLS_FIRST",
  ExecutedTxnHashAscNullsLast = "executedTxn_hash_ASC_NULLS_LAST",
  ExecutedTxnHashDesc = "executedTxn_hash_DESC",
  ExecutedTxnHashDescNullsFirst = "executedTxn_hash_DESC_NULLS_FIRST",
  ExecutedTxnHashDescNullsLast = "executedTxn_hash_DESC_NULLS_LAST",
  ExecutedTxnIdAsc = "executedTxn_id_ASC",
  ExecutedTxnIdAscNullsFirst = "executedTxn_id_ASC_NULLS_FIRST",
  ExecutedTxnIdAscNullsLast = "executedTxn_id_ASC_NULLS_LAST",
  ExecutedTxnIdDesc = "executedTxn_id_DESC",
  ExecutedTxnIdDescNullsFirst = "executedTxn_id_DESC_NULLS_FIRST",
  ExecutedTxnIdDescNullsLast = "executedTxn_id_DESC_NULLS_LAST",
  ExecutedTxnTimestampAsc = "executedTxn_timestamp_ASC",
  ExecutedTxnTimestampAscNullsFirst = "executedTxn_timestamp_ASC_NULLS_FIRST",
  ExecutedTxnTimestampAscNullsLast = "executedTxn_timestamp_ASC_NULLS_LAST",
  ExecutedTxnTimestampDesc = "executedTxn_timestamp_DESC",
  ExecutedTxnTimestampDescNullsFirst = "executedTxn_timestamp_DESC_NULLS_FIRST",
  ExecutedTxnTimestampDescNullsLast = "executedTxn_timestamp_DESC_NULLS_LAST",
  ExecutedTxnToAsc = "executedTxn_to_ASC",
  ExecutedTxnToAscNullsFirst = "executedTxn_to_ASC_NULLS_FIRST",
  ExecutedTxnToAscNullsLast = "executedTxn_to_ASC_NULLS_LAST",
  ExecutedTxnToDesc = "executedTxn_to_DESC",
  ExecutedTxnToDescNullsFirst = "executedTxn_to_DESC_NULLS_FIRST",
  ExecutedTxnToDescNullsLast = "executedTxn_to_DESC_NULLS_LAST",
  ExecutedTxnTransactionIndexAsc = "executedTxn_transactionIndex_ASC",
  ExecutedTxnTransactionIndexAscNullsFirst = "executedTxn_transactionIndex_ASC_NULLS_FIRST",
  ExecutedTxnTransactionIndexAscNullsLast = "executedTxn_transactionIndex_ASC_NULLS_LAST",
  ExecutedTxnTransactionIndexDesc = "executedTxn_transactionIndex_DESC",
  ExecutedTxnTransactionIndexDescNullsFirst = "executedTxn_transactionIndex_DESC_NULLS_FIRST",
  ExecutedTxnTransactionIndexDescNullsLast = "executedTxn_transactionIndex_DESC_NULLS_LAST",
  ExecutionFeeAsc = "executionFee_ASC",
  ExecutionFeeAscNullsFirst = "executionFee_ASC_NULLS_FIRST",
  ExecutionFeeAscNullsLast = "executionFee_ASC_NULLS_LAST",
  ExecutionFeeDesc = "executionFee_DESC",
  ExecutionFeeDescNullsFirst = "executionFee_DESC_NULLS_FIRST",
  ExecutionFeeDescNullsLast = "executionFee_DESC_NULLS_LAST",
  FrozenReasonBytesAsc = "frozenReasonBytes_ASC",
  FrozenReasonBytesAscNullsFirst = "frozenReasonBytes_ASC_NULLS_FIRST",
  FrozenReasonBytesAscNullsLast = "frozenReasonBytes_ASC_NULLS_LAST",
  FrozenReasonBytesDesc = "frozenReasonBytes_DESC",
  FrozenReasonBytesDescNullsFirst = "frozenReasonBytes_DESC_NULLS_FIRST",
  FrozenReasonBytesDescNullsLast = "frozenReasonBytes_DESC_NULLS_LAST",
  FrozenReasonAsc = "frozenReason_ASC",
  FrozenReasonAscNullsFirst = "frozenReason_ASC_NULLS_FIRST",
  FrozenReasonAscNullsLast = "frozenReason_ASC_NULLS_LAST",
  FrozenReasonDesc = "frozenReason_DESC",
  FrozenReasonDescNullsFirst = "frozenReason_DESC_NULLS_FIRST",
  FrozenReasonDescNullsLast = "frozenReason_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  InitialCollateralDeltaAmountAsc = "initialCollateralDeltaAmount_ASC",
  InitialCollateralDeltaAmountAscNullsFirst = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  InitialCollateralDeltaAmountAscNullsLast = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  InitialCollateralDeltaAmountDesc = "initialCollateralDeltaAmount_DESC",
  InitialCollateralDeltaAmountDescNullsFirst = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  InitialCollateralDeltaAmountDescNullsLast = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  InitialCollateralTokenAddressAsc = "initialCollateralTokenAddress_ASC",
  InitialCollateralTokenAddressAscNullsFirst = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  InitialCollateralTokenAddressAscNullsLast = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  InitialCollateralTokenAddressDesc = "initialCollateralTokenAddress_DESC",
  InitialCollateralTokenAddressDescNullsFirst = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  InitialCollateralTokenAddressDescNullsLast = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  MinOutputAmountAsc = "minOutputAmount_ASC",
  MinOutputAmountAscNullsFirst = "minOutputAmount_ASC_NULLS_FIRST",
  MinOutputAmountAscNullsLast = "minOutputAmount_ASC_NULLS_LAST",
  MinOutputAmountDesc = "minOutputAmount_DESC",
  MinOutputAmountDescNullsFirst = "minOutputAmount_DESC_NULLS_FIRST",
  MinOutputAmountDescNullsLast = "minOutputAmount_DESC_NULLS_LAST",
  NumberOfPartsAsc = "numberOfParts_ASC",
  NumberOfPartsAscNullsFirst = "numberOfParts_ASC_NULLS_FIRST",
  NumberOfPartsAscNullsLast = "numberOfParts_ASC_NULLS_LAST",
  NumberOfPartsDesc = "numberOfParts_DESC",
  NumberOfPartsDescNullsFirst = "numberOfParts_DESC_NULLS_FIRST",
  NumberOfPartsDescNullsLast = "numberOfParts_DESC_NULLS_LAST",
  OrderTypeAsc = "orderType_ASC",
  OrderTypeAscNullsFirst = "orderType_ASC_NULLS_FIRST",
  OrderTypeAscNullsLast = "orderType_ASC_NULLS_LAST",
  OrderTypeDesc = "orderType_DESC",
  OrderTypeDescNullsFirst = "orderType_DESC_NULLS_FIRST",
  OrderTypeDescNullsLast = "orderType_DESC_NULLS_LAST",
  ReceiverAsc = "receiver_ASC",
  ReceiverAscNullsFirst = "receiver_ASC_NULLS_FIRST",
  ReceiverAscNullsLast = "receiver_ASC_NULLS_LAST",
  ReceiverDesc = "receiver_DESC",
  ReceiverDescNullsFirst = "receiver_DESC_NULLS_FIRST",
  ReceiverDescNullsLast = "receiver_DESC_NULLS_LAST",
  ShouldUnwrapNativeTokenAsc = "shouldUnwrapNativeToken_ASC",
  ShouldUnwrapNativeTokenAscNullsFirst = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  ShouldUnwrapNativeTokenAscNullsLast = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  ShouldUnwrapNativeTokenDesc = "shouldUnwrapNativeToken_DESC",
  ShouldUnwrapNativeTokenDescNullsFirst = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  ShouldUnwrapNativeTokenDescNullsLast = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  StatusAsc = "status_ASC",
  StatusAscNullsFirst = "status_ASC_NULLS_FIRST",
  StatusAscNullsLast = "status_ASC_NULLS_LAST",
  StatusDesc = "status_DESC",
  StatusDescNullsFirst = "status_DESC_NULLS_FIRST",
  StatusDescNullsLast = "status_DESC_NULLS_LAST",
  TriggerPriceAsc = "triggerPrice_ASC",
  TriggerPriceAscNullsFirst = "triggerPrice_ASC_NULLS_FIRST",
  TriggerPriceAscNullsLast = "triggerPrice_ASC_NULLS_LAST",
  TriggerPriceDesc = "triggerPrice_DESC",
  TriggerPriceDescNullsFirst = "triggerPrice_DESC_NULLS_FIRST",
  TriggerPriceDescNullsLast = "triggerPrice_DESC_NULLS_LAST",
  TwapGroupIdAsc = "twapGroupId_ASC",
  TwapGroupIdAscNullsFirst = "twapGroupId_ASC_NULLS_FIRST",
  TwapGroupIdAscNullsLast = "twapGroupId_ASC_NULLS_LAST",
  TwapGroupIdDesc = "twapGroupId_DESC",
  TwapGroupIdDescNullsFirst = "twapGroupId_DESC_NULLS_FIRST",
  TwapGroupIdDescNullsLast = "twapGroupId_DESC_NULLS_LAST",
  UiFeeReceiverAsc = "uiFeeReceiver_ASC",
  UiFeeReceiverAscNullsFirst = "uiFeeReceiver_ASC_NULLS_FIRST",
  UiFeeReceiverAscNullsLast = "uiFeeReceiver_ASC_NULLS_LAST",
  UiFeeReceiverDesc = "uiFeeReceiver_DESC",
  UiFeeReceiverDescNullsFirst = "uiFeeReceiver_DESC_NULLS_FIRST",
  UiFeeReceiverDescNullsLast = "uiFeeReceiver_DESC_NULLS_LAST",
  UpdatedAtBlockAsc = "updatedAtBlock_ASC",
  UpdatedAtBlockAscNullsFirst = "updatedAtBlock_ASC_NULLS_FIRST",
  UpdatedAtBlockAscNullsLast = "updatedAtBlock_ASC_NULLS_LAST",
  UpdatedAtBlockDesc = "updatedAtBlock_DESC",
  UpdatedAtBlockDescNullsFirst = "updatedAtBlock_DESC_NULLS_FIRST",
  UpdatedAtBlockDescNullsLast = "updatedAtBlock_DESC_NULLS_LAST",
}

export enum OrderStatus {
  Cancelled = "Cancelled",
  Created = "Created",
  Executed = "Executed",
  Frozen = "Frozen",
}

export type OrderWhereInput = {
  AND?: InputMaybe<Array<OrderWhereInput>>;
  OR?: InputMaybe<Array<OrderWhereInput>>;
  acceptablePrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  acceptablePrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  acceptablePrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_contains?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_eq?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_gt?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_gte?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  callbackContract_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  callbackContract_lt?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_lte?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  callbackContract_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackGasLimit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  callbackGasLimit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  callbackGasLimit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cancelledReasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cancelledReasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_gt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_gte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cancelledReason_lt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_lte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledTxn?: InputMaybe<TransactionWhereInput>;
  cancelledTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  createdTxn?: InputMaybe<TransactionWhereInput>;
  createdTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executedTxn?: InputMaybe<TransactionWhereInput>;
  executedTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  frozenReasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  frozenReasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_gt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_gte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  frozenReason_lt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_lte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  minOutputAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minOutputAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minOutputAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  numberOfParts_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  numberOfParts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  numberOfParts_lt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_lte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderType_lt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_lte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  receiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  receiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shouldUnwrapNativeToken_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  status_eq?: InputMaybe<OrderStatus>;
  status_in?: InputMaybe<Array<OrderStatus>>;
  status_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  status_not_eq?: InputMaybe<OrderStatus>;
  status_not_in?: InputMaybe<Array<OrderStatus>>;
  swapPath_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  triggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  twapGroupId_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  twapGroupId_lt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_lte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  uiFeeReceiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  updatedAtBlock_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  updatedAtBlock_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  updatedAtBlock_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
};

export type OrdersConnection = {
  __typename?: "OrdersConnection";
  edges: Array<OrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PageInfo = {
  __typename?: "PageInfo";
  endCursor: Scalars["String"]["output"];
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor: Scalars["String"]["output"];
};

export type PeriodAccountStatObject = {
  __typename?: "PeriodAccountStatObject";
  closedCount: Scalars["Float"]["output"];
  cumsumCollateral: Scalars["BigInt"]["output"];
  cumsumSize: Scalars["BigInt"]["output"];
  id: Scalars["ID"]["output"];
  losses: Scalars["Float"]["output"];
  maxCapital: Scalars["BigInt"]["output"];
  netCapital: Scalars["BigInt"]["output"];
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  startUnrealizedFees: Scalars["BigInt"]["output"];
  startUnrealizedPnl: Scalars["BigInt"]["output"];
  startUnrealizedPriceImpact: Scalars["BigInt"]["output"];
  sumMaxSize: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Float"]["output"];
};

export type Position = {
  __typename?: "Position";
  account: Scalars["String"]["output"];
  accountStat: AccountStat;
  collateralAmount: Scalars["BigInt"]["output"];
  collateralToken: Scalars["String"]["output"];
  entryPrice: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  market: Scalars["String"]["output"];
  maxSize: Scalars["BigInt"]["output"];
  openedAt: Scalars["Int"]["output"];
  positionKey: Scalars["String"]["output"];
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  sizeInTokens: Scalars["BigInt"]["output"];
  sizeInUsd: Scalars["BigInt"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
  unrealizedFees: Scalars["BigInt"]["output"];
  unrealizedPnl: Scalars["BigInt"]["output"];
  unrealizedPriceImpact: Scalars["BigInt"]["output"];
};

export type PositionChange = {
  __typename?: "PositionChange";
  account: Scalars["String"]["output"];
  basePnlUsd: Scalars["BigInt"]["output"];
  block: Scalars["Int"]["output"];
  collateralAmount: Scalars["BigInt"]["output"];
  collateralDeltaAmount: Scalars["BigInt"]["output"];
  collateralToken: Scalars["String"]["output"];
  collateralTokenPriceMin: Scalars["BigInt"]["output"];
  executionPrice: Scalars["BigInt"]["output"];
  feesAmount: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  isWin?: Maybe<Scalars["Boolean"]["output"]>;
  market: Scalars["String"]["output"];
  maxSize: Scalars["BigInt"]["output"];
  priceImpactAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactDiffUsd?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactUsd: Scalars["BigInt"]["output"];
  sizeDeltaUsd: Scalars["BigInt"]["output"];
  sizeInUsd: Scalars["BigInt"]["output"];
  timestamp: Scalars["Int"]["output"];
  type: PositionChangeType;
};

export type PositionChangeEdge = {
  __typename?: "PositionChangeEdge";
  cursor: Scalars["String"]["output"];
  node: PositionChange;
};

export enum PositionChangeOrderByInput {
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  BasePnlUsdAsc = "basePnlUsd_ASC",
  BasePnlUsdAscNullsFirst = "basePnlUsd_ASC_NULLS_FIRST",
  BasePnlUsdAscNullsLast = "basePnlUsd_ASC_NULLS_LAST",
  BasePnlUsdDesc = "basePnlUsd_DESC",
  BasePnlUsdDescNullsFirst = "basePnlUsd_DESC_NULLS_FIRST",
  BasePnlUsdDescNullsLast = "basePnlUsd_DESC_NULLS_LAST",
  BlockAsc = "block_ASC",
  BlockAscNullsFirst = "block_ASC_NULLS_FIRST",
  BlockAscNullsLast = "block_ASC_NULLS_LAST",
  BlockDesc = "block_DESC",
  BlockDescNullsFirst = "block_DESC_NULLS_FIRST",
  BlockDescNullsLast = "block_DESC_NULLS_LAST",
  CollateralAmountAsc = "collateralAmount_ASC",
  CollateralAmountAscNullsFirst = "collateralAmount_ASC_NULLS_FIRST",
  CollateralAmountAscNullsLast = "collateralAmount_ASC_NULLS_LAST",
  CollateralAmountDesc = "collateralAmount_DESC",
  CollateralAmountDescNullsFirst = "collateralAmount_DESC_NULLS_FIRST",
  CollateralAmountDescNullsLast = "collateralAmount_DESC_NULLS_LAST",
  CollateralDeltaAmountAsc = "collateralDeltaAmount_ASC",
  CollateralDeltaAmountAscNullsFirst = "collateralDeltaAmount_ASC_NULLS_FIRST",
  CollateralDeltaAmountAscNullsLast = "collateralDeltaAmount_ASC_NULLS_LAST",
  CollateralDeltaAmountDesc = "collateralDeltaAmount_DESC",
  CollateralDeltaAmountDescNullsFirst = "collateralDeltaAmount_DESC_NULLS_FIRST",
  CollateralDeltaAmountDescNullsLast = "collateralDeltaAmount_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  CollateralTokenAsc = "collateralToken_ASC",
  CollateralTokenAscNullsFirst = "collateralToken_ASC_NULLS_FIRST",
  CollateralTokenAscNullsLast = "collateralToken_ASC_NULLS_LAST",
  CollateralTokenDesc = "collateralToken_DESC",
  CollateralTokenDescNullsFirst = "collateralToken_DESC_NULLS_FIRST",
  CollateralTokenDescNullsLast = "collateralToken_DESC_NULLS_LAST",
  ExecutionPriceAsc = "executionPrice_ASC",
  ExecutionPriceAscNullsFirst = "executionPrice_ASC_NULLS_FIRST",
  ExecutionPriceAscNullsLast = "executionPrice_ASC_NULLS_LAST",
  ExecutionPriceDesc = "executionPrice_DESC",
  ExecutionPriceDescNullsFirst = "executionPrice_DESC_NULLS_FIRST",
  ExecutionPriceDescNullsLast = "executionPrice_DESC_NULLS_LAST",
  FeesAmountAsc = "feesAmount_ASC",
  FeesAmountAscNullsFirst = "feesAmount_ASC_NULLS_FIRST",
  FeesAmountAscNullsLast = "feesAmount_ASC_NULLS_LAST",
  FeesAmountDesc = "feesAmount_DESC",
  FeesAmountDescNullsFirst = "feesAmount_DESC_NULLS_FIRST",
  FeesAmountDescNullsLast = "feesAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  IsWinAsc = "isWin_ASC",
  IsWinAscNullsFirst = "isWin_ASC_NULLS_FIRST",
  IsWinAscNullsLast = "isWin_ASC_NULLS_LAST",
  IsWinDesc = "isWin_DESC",
  IsWinDescNullsFirst = "isWin_DESC_NULLS_FIRST",
  IsWinDescNullsLast = "isWin_DESC_NULLS_LAST",
  MarketAsc = "market_ASC",
  MarketAscNullsFirst = "market_ASC_NULLS_FIRST",
  MarketAscNullsLast = "market_ASC_NULLS_LAST",
  MarketDesc = "market_DESC",
  MarketDescNullsFirst = "market_DESC_NULLS_FIRST",
  MarketDescNullsLast = "market_DESC_NULLS_LAST",
  MaxSizeAsc = "maxSize_ASC",
  MaxSizeAscNullsFirst = "maxSize_ASC_NULLS_FIRST",
  MaxSizeAscNullsLast = "maxSize_ASC_NULLS_LAST",
  MaxSizeDesc = "maxSize_DESC",
  MaxSizeDescNullsFirst = "maxSize_DESC_NULLS_FIRST",
  MaxSizeDescNullsLast = "maxSize_DESC_NULLS_LAST",
  PriceImpactAmountAsc = "priceImpactAmount_ASC",
  PriceImpactAmountAscNullsFirst = "priceImpactAmount_ASC_NULLS_FIRST",
  PriceImpactAmountAscNullsLast = "priceImpactAmount_ASC_NULLS_LAST",
  PriceImpactAmountDesc = "priceImpactAmount_DESC",
  PriceImpactAmountDescNullsFirst = "priceImpactAmount_DESC_NULLS_FIRST",
  PriceImpactAmountDescNullsLast = "priceImpactAmount_DESC_NULLS_LAST",
  PriceImpactDiffUsdAsc = "priceImpactDiffUsd_ASC",
  PriceImpactDiffUsdAscNullsFirst = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  PriceImpactDiffUsdAscNullsLast = "priceImpactDiffUsd_ASC_NULLS_LAST",
  PriceImpactDiffUsdDesc = "priceImpactDiffUsd_DESC",
  PriceImpactDiffUsdDescNullsFirst = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  PriceImpactDiffUsdDescNullsLast = "priceImpactDiffUsd_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  SizeInUsdAsc = "sizeInUsd_ASC",
  SizeInUsdAscNullsFirst = "sizeInUsd_ASC_NULLS_FIRST",
  SizeInUsdAscNullsLast = "sizeInUsd_ASC_NULLS_LAST",
  SizeInUsdDesc = "sizeInUsd_DESC",
  SizeInUsdDescNullsFirst = "sizeInUsd_DESC_NULLS_FIRST",
  SizeInUsdDescNullsLast = "sizeInUsd_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PositionChangeType {
  Decrease = "decrease",
  Increase = "increase",
}

export type PositionChangeWhereInput = {
  AND?: InputMaybe<Array<PositionChangeWhereInput>>;
  OR?: InputMaybe<Array<PositionChangeWhereInput>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  basePnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  basePnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  basePnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  block_eq?: InputMaybe<Scalars["Int"]["input"]>;
  block_gt?: InputMaybe<Scalars["Int"]["input"]>;
  block_gte?: InputMaybe<Scalars["Int"]["input"]>;
  block_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  block_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  block_lt?: InputMaybe<Scalars["Int"]["input"]>;
  block_lte?: InputMaybe<Scalars["Int"]["input"]>;
  block_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  block_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  collateralAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  executionPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feesAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feesAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feesAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_gt?: InputMaybe<Scalars["String"]["input"]>;
  market_gte?: InputMaybe<Scalars["String"]["input"]>;
  market_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_lt?: InputMaybe<Scalars["String"]["input"]>;
  market_lte?: InputMaybe<Scalars["String"]["input"]>;
  market_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  maxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactDiffUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  type_eq?: InputMaybe<PositionChangeType>;
  type_in?: InputMaybe<Array<PositionChangeType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PositionChangeType>;
  type_not_in?: InputMaybe<Array<PositionChangeType>>;
};

export type PositionChangesConnection = {
  __typename?: "PositionChangesConnection";
  edges: Array<PositionChangeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PositionEdge = {
  __typename?: "PositionEdge";
  cursor: Scalars["String"]["output"];
  node: Position;
};

export type PositionFeesEntitiesConnection = {
  __typename?: "PositionFeesEntitiesConnection";
  edges: Array<PositionFeesEntityEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PositionFeesEntity = {
  __typename?: "PositionFeesEntity";
  affiliate: Scalars["String"]["output"];
  affiliateRewardAmount: Scalars["BigInt"]["output"];
  borrowingFeeAmount: Scalars["BigInt"]["output"];
  collateralTokenAddress: Scalars["String"]["output"];
  collateralTokenPriceMax: Scalars["BigInt"]["output"];
  collateralTokenPriceMin: Scalars["BigInt"]["output"];
  eventName: Scalars["String"]["output"];
  feeUsdForPool: Scalars["BigInt"]["output"];
  fundingFeeAmount: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  liquidationFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  marketAddress: Scalars["String"]["output"];
  orderKey: Scalars["String"]["output"];
  positionFeeAmount: Scalars["BigInt"]["output"];
  totalRebateAmount: Scalars["BigInt"]["output"];
  totalRebateFactor: Scalars["BigInt"]["output"];
  trader: Scalars["String"]["output"];
  traderDiscountAmount: Scalars["BigInt"]["output"];
  transaction: Transaction;
  type: PositionFeesEntityType;
};

export type PositionFeesEntityEdge = {
  __typename?: "PositionFeesEntityEdge";
  cursor: Scalars["String"]["output"];
  node: PositionFeesEntity;
};

export enum PositionFeesEntityOrderByInput {
  AffiliateRewardAmountAsc = "affiliateRewardAmount_ASC",
  AffiliateRewardAmountAscNullsFirst = "affiliateRewardAmount_ASC_NULLS_FIRST",
  AffiliateRewardAmountAscNullsLast = "affiliateRewardAmount_ASC_NULLS_LAST",
  AffiliateRewardAmountDesc = "affiliateRewardAmount_DESC",
  AffiliateRewardAmountDescNullsFirst = "affiliateRewardAmount_DESC_NULLS_FIRST",
  AffiliateRewardAmountDescNullsLast = "affiliateRewardAmount_DESC_NULLS_LAST",
  AffiliateAsc = "affiliate_ASC",
  AffiliateAscNullsFirst = "affiliate_ASC_NULLS_FIRST",
  AffiliateAscNullsLast = "affiliate_ASC_NULLS_LAST",
  AffiliateDesc = "affiliate_DESC",
  AffiliateDescNullsFirst = "affiliate_DESC_NULLS_FIRST",
  AffiliateDescNullsLast = "affiliate_DESC_NULLS_LAST",
  BorrowingFeeAmountAsc = "borrowingFeeAmount_ASC",
  BorrowingFeeAmountAscNullsFirst = "borrowingFeeAmount_ASC_NULLS_FIRST",
  BorrowingFeeAmountAscNullsLast = "borrowingFeeAmount_ASC_NULLS_LAST",
  BorrowingFeeAmountDesc = "borrowingFeeAmount_DESC",
  BorrowingFeeAmountDescNullsFirst = "borrowingFeeAmount_DESC_NULLS_FIRST",
  BorrowingFeeAmountDescNullsLast = "borrowingFeeAmount_DESC_NULLS_LAST",
  CollateralTokenAddressAsc = "collateralTokenAddress_ASC",
  CollateralTokenAddressAscNullsFirst = "collateralTokenAddress_ASC_NULLS_FIRST",
  CollateralTokenAddressAscNullsLast = "collateralTokenAddress_ASC_NULLS_LAST",
  CollateralTokenAddressDesc = "collateralTokenAddress_DESC",
  CollateralTokenAddressDescNullsFirst = "collateralTokenAddress_DESC_NULLS_FIRST",
  CollateralTokenAddressDescNullsLast = "collateralTokenAddress_DESC_NULLS_LAST",
  CollateralTokenPriceMaxAsc = "collateralTokenPriceMax_ASC",
  CollateralTokenPriceMaxAscNullsFirst = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  CollateralTokenPriceMaxAscNullsLast = "collateralTokenPriceMax_ASC_NULLS_LAST",
  CollateralTokenPriceMaxDesc = "collateralTokenPriceMax_DESC",
  CollateralTokenPriceMaxDescNullsFirst = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  CollateralTokenPriceMaxDescNullsLast = "collateralTokenPriceMax_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  FeeUsdForPoolAsc = "feeUsdForPool_ASC",
  FeeUsdForPoolAscNullsFirst = "feeUsdForPool_ASC_NULLS_FIRST",
  FeeUsdForPoolAscNullsLast = "feeUsdForPool_ASC_NULLS_LAST",
  FeeUsdForPoolDesc = "feeUsdForPool_DESC",
  FeeUsdForPoolDescNullsFirst = "feeUsdForPool_DESC_NULLS_FIRST",
  FeeUsdForPoolDescNullsLast = "feeUsdForPool_DESC_NULLS_LAST",
  FundingFeeAmountAsc = "fundingFeeAmount_ASC",
  FundingFeeAmountAscNullsFirst = "fundingFeeAmount_ASC_NULLS_FIRST",
  FundingFeeAmountAscNullsLast = "fundingFeeAmount_ASC_NULLS_LAST",
  FundingFeeAmountDesc = "fundingFeeAmount_DESC",
  FundingFeeAmountDescNullsFirst = "fundingFeeAmount_DESC_NULLS_FIRST",
  FundingFeeAmountDescNullsLast = "fundingFeeAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LiquidationFeeAmountAsc = "liquidationFeeAmount_ASC",
  LiquidationFeeAmountAscNullsFirst = "liquidationFeeAmount_ASC_NULLS_FIRST",
  LiquidationFeeAmountAscNullsLast = "liquidationFeeAmount_ASC_NULLS_LAST",
  LiquidationFeeAmountDesc = "liquidationFeeAmount_DESC",
  LiquidationFeeAmountDescNullsFirst = "liquidationFeeAmount_DESC_NULLS_FIRST",
  LiquidationFeeAmountDescNullsLast = "liquidationFeeAmount_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  PositionFeeAmountAsc = "positionFeeAmount_ASC",
  PositionFeeAmountAscNullsFirst = "positionFeeAmount_ASC_NULLS_FIRST",
  PositionFeeAmountAscNullsLast = "positionFeeAmount_ASC_NULLS_LAST",
  PositionFeeAmountDesc = "positionFeeAmount_DESC",
  PositionFeeAmountDescNullsFirst = "positionFeeAmount_DESC_NULLS_FIRST",
  PositionFeeAmountDescNullsLast = "positionFeeAmount_DESC_NULLS_LAST",
  TotalRebateAmountAsc = "totalRebateAmount_ASC",
  TotalRebateAmountAscNullsFirst = "totalRebateAmount_ASC_NULLS_FIRST",
  TotalRebateAmountAscNullsLast = "totalRebateAmount_ASC_NULLS_LAST",
  TotalRebateAmountDesc = "totalRebateAmount_DESC",
  TotalRebateAmountDescNullsFirst = "totalRebateAmount_DESC_NULLS_FIRST",
  TotalRebateAmountDescNullsLast = "totalRebateAmount_DESC_NULLS_LAST",
  TotalRebateFactorAsc = "totalRebateFactor_ASC",
  TotalRebateFactorAscNullsFirst = "totalRebateFactor_ASC_NULLS_FIRST",
  TotalRebateFactorAscNullsLast = "totalRebateFactor_ASC_NULLS_LAST",
  TotalRebateFactorDesc = "totalRebateFactor_DESC",
  TotalRebateFactorDescNullsFirst = "totalRebateFactor_DESC_NULLS_FIRST",
  TotalRebateFactorDescNullsLast = "totalRebateFactor_DESC_NULLS_LAST",
  TraderDiscountAmountAsc = "traderDiscountAmount_ASC",
  TraderDiscountAmountAscNullsFirst = "traderDiscountAmount_ASC_NULLS_FIRST",
  TraderDiscountAmountAscNullsLast = "traderDiscountAmount_ASC_NULLS_LAST",
  TraderDiscountAmountDesc = "traderDiscountAmount_DESC",
  TraderDiscountAmountDescNullsFirst = "traderDiscountAmount_DESC_NULLS_FIRST",
  TraderDiscountAmountDescNullsLast = "traderDiscountAmount_DESC_NULLS_LAST",
  TraderAsc = "trader_ASC",
  TraderAscNullsFirst = "trader_ASC_NULLS_FIRST",
  TraderAscNullsLast = "trader_ASC_NULLS_LAST",
  TraderDesc = "trader_DESC",
  TraderDescNullsFirst = "trader_DESC_NULLS_FIRST",
  TraderDescNullsLast = "trader_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PositionFeesEntityType {
  PositionFeesCollected = "PositionFeesCollected",
  PositionFeesInfo = "PositionFeesInfo",
}

export type PositionFeesEntityWhereInput = {
  AND?: InputMaybe<Array<PositionFeesEntityWhereInput>>;
  OR?: InputMaybe<Array<PositionFeesEntityWhereInput>>;
  affiliateRewardAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  affiliateRewardAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  affiliateRewardAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  affiliate_contains?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_eq?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_gt?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_gte?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  affiliate_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  affiliate_lt?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_lte?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  affiliate_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  eventName_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_lt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_lte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  feeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  liquidationFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  liquidationFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalRebateAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalRebateFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  traderDiscountAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  traderDiscountAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  traderDiscountAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  trader_contains?: InputMaybe<Scalars["String"]["input"]>;
  trader_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  trader_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_eq?: InputMaybe<Scalars["String"]["input"]>;
  trader_gt?: InputMaybe<Scalars["String"]["input"]>;
  trader_gte?: InputMaybe<Scalars["String"]["input"]>;
  trader_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  trader_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  trader_lt?: InputMaybe<Scalars["String"]["input"]>;
  trader_lte?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  trader_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_eq?: InputMaybe<PositionFeesEntityType>;
  type_in?: InputMaybe<Array<PositionFeesEntityType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PositionFeesEntityType>;
  type_not_in?: InputMaybe<Array<PositionFeesEntityType>>;
};

export type PositionMarketVolumeInfo = {
  __typename?: "PositionMarketVolumeInfo";
  market: Scalars["String"]["output"];
  volume: Scalars["BigInt"]["output"];
};

export enum PositionOrderByInput {
  AccountStatClosedCountAsc = "accountStat_closedCount_ASC",
  AccountStatClosedCountAscNullsFirst = "accountStat_closedCount_ASC_NULLS_FIRST",
  AccountStatClosedCountAscNullsLast = "accountStat_closedCount_ASC_NULLS_LAST",
  AccountStatClosedCountDesc = "accountStat_closedCount_DESC",
  AccountStatClosedCountDescNullsFirst = "accountStat_closedCount_DESC_NULLS_FIRST",
  AccountStatClosedCountDescNullsLast = "accountStat_closedCount_DESC_NULLS_LAST",
  AccountStatCumsumCollateralAsc = "accountStat_cumsumCollateral_ASC",
  AccountStatCumsumCollateralAscNullsFirst = "accountStat_cumsumCollateral_ASC_NULLS_FIRST",
  AccountStatCumsumCollateralAscNullsLast = "accountStat_cumsumCollateral_ASC_NULLS_LAST",
  AccountStatCumsumCollateralDesc = "accountStat_cumsumCollateral_DESC",
  AccountStatCumsumCollateralDescNullsFirst = "accountStat_cumsumCollateral_DESC_NULLS_FIRST",
  AccountStatCumsumCollateralDescNullsLast = "accountStat_cumsumCollateral_DESC_NULLS_LAST",
  AccountStatCumsumSizeAsc = "accountStat_cumsumSize_ASC",
  AccountStatCumsumSizeAscNullsFirst = "accountStat_cumsumSize_ASC_NULLS_FIRST",
  AccountStatCumsumSizeAscNullsLast = "accountStat_cumsumSize_ASC_NULLS_LAST",
  AccountStatCumsumSizeDesc = "accountStat_cumsumSize_DESC",
  AccountStatCumsumSizeDescNullsFirst = "accountStat_cumsumSize_DESC_NULLS_FIRST",
  AccountStatCumsumSizeDescNullsLast = "accountStat_cumsumSize_DESC_NULLS_LAST",
  AccountStatIdAsc = "accountStat_id_ASC",
  AccountStatIdAscNullsFirst = "accountStat_id_ASC_NULLS_FIRST",
  AccountStatIdAscNullsLast = "accountStat_id_ASC_NULLS_LAST",
  AccountStatIdDesc = "accountStat_id_DESC",
  AccountStatIdDescNullsFirst = "accountStat_id_DESC_NULLS_FIRST",
  AccountStatIdDescNullsLast = "accountStat_id_DESC_NULLS_LAST",
  AccountStatLossesAsc = "accountStat_losses_ASC",
  AccountStatLossesAscNullsFirst = "accountStat_losses_ASC_NULLS_FIRST",
  AccountStatLossesAscNullsLast = "accountStat_losses_ASC_NULLS_LAST",
  AccountStatLossesDesc = "accountStat_losses_DESC",
  AccountStatLossesDescNullsFirst = "accountStat_losses_DESC_NULLS_FIRST",
  AccountStatLossesDescNullsLast = "accountStat_losses_DESC_NULLS_LAST",
  AccountStatMaxCapitalAsc = "accountStat_maxCapital_ASC",
  AccountStatMaxCapitalAscNullsFirst = "accountStat_maxCapital_ASC_NULLS_FIRST",
  AccountStatMaxCapitalAscNullsLast = "accountStat_maxCapital_ASC_NULLS_LAST",
  AccountStatMaxCapitalDesc = "accountStat_maxCapital_DESC",
  AccountStatMaxCapitalDescNullsFirst = "accountStat_maxCapital_DESC_NULLS_FIRST",
  AccountStatMaxCapitalDescNullsLast = "accountStat_maxCapital_DESC_NULLS_LAST",
  AccountStatNetCapitalAsc = "accountStat_netCapital_ASC",
  AccountStatNetCapitalAscNullsFirst = "accountStat_netCapital_ASC_NULLS_FIRST",
  AccountStatNetCapitalAscNullsLast = "accountStat_netCapital_ASC_NULLS_LAST",
  AccountStatNetCapitalDesc = "accountStat_netCapital_DESC",
  AccountStatNetCapitalDescNullsFirst = "accountStat_netCapital_DESC_NULLS_FIRST",
  AccountStatNetCapitalDescNullsLast = "accountStat_netCapital_DESC_NULLS_LAST",
  AccountStatRealizedFeesAsc = "accountStat_realizedFees_ASC",
  AccountStatRealizedFeesAscNullsFirst = "accountStat_realizedFees_ASC_NULLS_FIRST",
  AccountStatRealizedFeesAscNullsLast = "accountStat_realizedFees_ASC_NULLS_LAST",
  AccountStatRealizedFeesDesc = "accountStat_realizedFees_DESC",
  AccountStatRealizedFeesDescNullsFirst = "accountStat_realizedFees_DESC_NULLS_FIRST",
  AccountStatRealizedFeesDescNullsLast = "accountStat_realizedFees_DESC_NULLS_LAST",
  AccountStatRealizedPnlAsc = "accountStat_realizedPnl_ASC",
  AccountStatRealizedPnlAscNullsFirst = "accountStat_realizedPnl_ASC_NULLS_FIRST",
  AccountStatRealizedPnlAscNullsLast = "accountStat_realizedPnl_ASC_NULLS_LAST",
  AccountStatRealizedPnlDesc = "accountStat_realizedPnl_DESC",
  AccountStatRealizedPnlDescNullsFirst = "accountStat_realizedPnl_DESC_NULLS_FIRST",
  AccountStatRealizedPnlDescNullsLast = "accountStat_realizedPnl_DESC_NULLS_LAST",
  AccountStatRealizedPriceImpactAsc = "accountStat_realizedPriceImpact_ASC",
  AccountStatRealizedPriceImpactAscNullsFirst = "accountStat_realizedPriceImpact_ASC_NULLS_FIRST",
  AccountStatRealizedPriceImpactAscNullsLast = "accountStat_realizedPriceImpact_ASC_NULLS_LAST",
  AccountStatRealizedPriceImpactDesc = "accountStat_realizedPriceImpact_DESC",
  AccountStatRealizedPriceImpactDescNullsFirst = "accountStat_realizedPriceImpact_DESC_NULLS_FIRST",
  AccountStatRealizedPriceImpactDescNullsLast = "accountStat_realizedPriceImpact_DESC_NULLS_LAST",
  AccountStatSumMaxSizeAsc = "accountStat_sumMaxSize_ASC",
  AccountStatSumMaxSizeAscNullsFirst = "accountStat_sumMaxSize_ASC_NULLS_FIRST",
  AccountStatSumMaxSizeAscNullsLast = "accountStat_sumMaxSize_ASC_NULLS_LAST",
  AccountStatSumMaxSizeDesc = "accountStat_sumMaxSize_DESC",
  AccountStatSumMaxSizeDescNullsFirst = "accountStat_sumMaxSize_DESC_NULLS_FIRST",
  AccountStatSumMaxSizeDescNullsLast = "accountStat_sumMaxSize_DESC_NULLS_LAST",
  AccountStatVolumeAsc = "accountStat_volume_ASC",
  AccountStatVolumeAscNullsFirst = "accountStat_volume_ASC_NULLS_FIRST",
  AccountStatVolumeAscNullsLast = "accountStat_volume_ASC_NULLS_LAST",
  AccountStatVolumeDesc = "accountStat_volume_DESC",
  AccountStatVolumeDescNullsFirst = "accountStat_volume_DESC_NULLS_FIRST",
  AccountStatVolumeDescNullsLast = "accountStat_volume_DESC_NULLS_LAST",
  AccountStatWinsAsc = "accountStat_wins_ASC",
  AccountStatWinsAscNullsFirst = "accountStat_wins_ASC_NULLS_FIRST",
  AccountStatWinsAscNullsLast = "accountStat_wins_ASC_NULLS_LAST",
  AccountStatWinsDesc = "accountStat_wins_DESC",
  AccountStatWinsDescNullsFirst = "accountStat_wins_DESC_NULLS_FIRST",
  AccountStatWinsDescNullsLast = "accountStat_wins_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  CollateralAmountAsc = "collateralAmount_ASC",
  CollateralAmountAscNullsFirst = "collateralAmount_ASC_NULLS_FIRST",
  CollateralAmountAscNullsLast = "collateralAmount_ASC_NULLS_LAST",
  CollateralAmountDesc = "collateralAmount_DESC",
  CollateralAmountDescNullsFirst = "collateralAmount_DESC_NULLS_FIRST",
  CollateralAmountDescNullsLast = "collateralAmount_DESC_NULLS_LAST",
  CollateralTokenAsc = "collateralToken_ASC",
  CollateralTokenAscNullsFirst = "collateralToken_ASC_NULLS_FIRST",
  CollateralTokenAscNullsLast = "collateralToken_ASC_NULLS_LAST",
  CollateralTokenDesc = "collateralToken_DESC",
  CollateralTokenDescNullsFirst = "collateralToken_DESC_NULLS_FIRST",
  CollateralTokenDescNullsLast = "collateralToken_DESC_NULLS_LAST",
  EntryPriceAsc = "entryPrice_ASC",
  EntryPriceAscNullsFirst = "entryPrice_ASC_NULLS_FIRST",
  EntryPriceAscNullsLast = "entryPrice_ASC_NULLS_LAST",
  EntryPriceDesc = "entryPrice_DESC",
  EntryPriceDescNullsFirst = "entryPrice_DESC_NULLS_FIRST",
  EntryPriceDescNullsLast = "entryPrice_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  MarketAsc = "market_ASC",
  MarketAscNullsFirst = "market_ASC_NULLS_FIRST",
  MarketAscNullsLast = "market_ASC_NULLS_LAST",
  MarketDesc = "market_DESC",
  MarketDescNullsFirst = "market_DESC_NULLS_FIRST",
  MarketDescNullsLast = "market_DESC_NULLS_LAST",
  MaxSizeAsc = "maxSize_ASC",
  MaxSizeAscNullsFirst = "maxSize_ASC_NULLS_FIRST",
  MaxSizeAscNullsLast = "maxSize_ASC_NULLS_LAST",
  MaxSizeDesc = "maxSize_DESC",
  MaxSizeDescNullsFirst = "maxSize_DESC_NULLS_FIRST",
  MaxSizeDescNullsLast = "maxSize_DESC_NULLS_LAST",
  OpenedAtAsc = "openedAt_ASC",
  OpenedAtAscNullsFirst = "openedAt_ASC_NULLS_FIRST",
  OpenedAtAscNullsLast = "openedAt_ASC_NULLS_LAST",
  OpenedAtDesc = "openedAt_DESC",
  OpenedAtDescNullsFirst = "openedAt_DESC_NULLS_FIRST",
  OpenedAtDescNullsLast = "openedAt_DESC_NULLS_LAST",
  PositionKeyAsc = "positionKey_ASC",
  PositionKeyAscNullsFirst = "positionKey_ASC_NULLS_FIRST",
  PositionKeyAscNullsLast = "positionKey_ASC_NULLS_LAST",
  PositionKeyDesc = "positionKey_DESC",
  PositionKeyDescNullsFirst = "positionKey_DESC_NULLS_FIRST",
  PositionKeyDescNullsLast = "positionKey_DESC_NULLS_LAST",
  RealizedFeesAsc = "realizedFees_ASC",
  RealizedFeesAscNullsFirst = "realizedFees_ASC_NULLS_FIRST",
  RealizedFeesAscNullsLast = "realizedFees_ASC_NULLS_LAST",
  RealizedFeesDesc = "realizedFees_DESC",
  RealizedFeesDescNullsFirst = "realizedFees_DESC_NULLS_FIRST",
  RealizedFeesDescNullsLast = "realizedFees_DESC_NULLS_LAST",
  RealizedPnlAsc = "realizedPnl_ASC",
  RealizedPnlAscNullsFirst = "realizedPnl_ASC_NULLS_FIRST",
  RealizedPnlAscNullsLast = "realizedPnl_ASC_NULLS_LAST",
  RealizedPnlDesc = "realizedPnl_DESC",
  RealizedPnlDescNullsFirst = "realizedPnl_DESC_NULLS_FIRST",
  RealizedPnlDescNullsLast = "realizedPnl_DESC_NULLS_LAST",
  RealizedPriceImpactAsc = "realizedPriceImpact_ASC",
  RealizedPriceImpactAscNullsFirst = "realizedPriceImpact_ASC_NULLS_FIRST",
  RealizedPriceImpactAscNullsLast = "realizedPriceImpact_ASC_NULLS_LAST",
  RealizedPriceImpactDesc = "realizedPriceImpact_DESC",
  RealizedPriceImpactDescNullsFirst = "realizedPriceImpact_DESC_NULLS_FIRST",
  RealizedPriceImpactDescNullsLast = "realizedPriceImpact_DESC_NULLS_LAST",
  SizeInTokensAsc = "sizeInTokens_ASC",
  SizeInTokensAscNullsFirst = "sizeInTokens_ASC_NULLS_FIRST",
  SizeInTokensAscNullsLast = "sizeInTokens_ASC_NULLS_LAST",
  SizeInTokensDesc = "sizeInTokens_DESC",
  SizeInTokensDescNullsFirst = "sizeInTokens_DESC_NULLS_FIRST",
  SizeInTokensDescNullsLast = "sizeInTokens_DESC_NULLS_LAST",
  SizeInUsdAsc = "sizeInUsd_ASC",
  SizeInUsdAscNullsFirst = "sizeInUsd_ASC_NULLS_FIRST",
  SizeInUsdAscNullsLast = "sizeInUsd_ASC_NULLS_LAST",
  SizeInUsdDesc = "sizeInUsd_DESC",
  SizeInUsdDescNullsFirst = "sizeInUsd_DESC_NULLS_FIRST",
  SizeInUsdDescNullsLast = "sizeInUsd_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
  UnrealizedFeesAsc = "unrealizedFees_ASC",
  UnrealizedFeesAscNullsFirst = "unrealizedFees_ASC_NULLS_FIRST",
  UnrealizedFeesAscNullsLast = "unrealizedFees_ASC_NULLS_LAST",
  UnrealizedFeesDesc = "unrealizedFees_DESC",
  UnrealizedFeesDescNullsFirst = "unrealizedFees_DESC_NULLS_FIRST",
  UnrealizedFeesDescNullsLast = "unrealizedFees_DESC_NULLS_LAST",
  UnrealizedPnlAsc = "unrealizedPnl_ASC",
  UnrealizedPnlAscNullsFirst = "unrealizedPnl_ASC_NULLS_FIRST",
  UnrealizedPnlAscNullsLast = "unrealizedPnl_ASC_NULLS_LAST",
  UnrealizedPnlDesc = "unrealizedPnl_DESC",
  UnrealizedPnlDescNullsFirst = "unrealizedPnl_DESC_NULLS_FIRST",
  UnrealizedPnlDescNullsLast = "unrealizedPnl_DESC_NULLS_LAST",
  UnrealizedPriceImpactAsc = "unrealizedPriceImpact_ASC",
  UnrealizedPriceImpactAscNullsFirst = "unrealizedPriceImpact_ASC_NULLS_FIRST",
  UnrealizedPriceImpactAscNullsLast = "unrealizedPriceImpact_ASC_NULLS_LAST",
  UnrealizedPriceImpactDesc = "unrealizedPriceImpact_DESC",
  UnrealizedPriceImpactDescNullsFirst = "unrealizedPriceImpact_DESC_NULLS_FIRST",
  UnrealizedPriceImpactDescNullsLast = "unrealizedPriceImpact_DESC_NULLS_LAST",
}

export type PositionTotalCollateralAmount = {
  __typename?: "PositionTotalCollateralAmount";
  amount: Scalars["BigInt"]["output"];
  token: Scalars["String"]["output"];
};

export type PositionTotalCollateralAmountWhereInput = {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
};

export type PositionVolumeByAllMarketsWhereInput = {
  timestamp: Scalars["Float"]["input"];
};

export type PositionVolumeWhereInput = {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
  timestamp: Scalars["Float"]["input"];
};

export type PositionWhereInput = {
  AND?: InputMaybe<Array<PositionWhereInput>>;
  OR?: InputMaybe<Array<PositionWhereInput>>;
  accountStat?: InputMaybe<AccountStatWhereInput>;
  accountStat_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  entryPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entryPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entryPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_gt?: InputMaybe<Scalars["String"]["input"]>;
  market_gte?: InputMaybe<Scalars["String"]["input"]>;
  market_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_lt?: InputMaybe<Scalars["String"]["input"]>;
  market_lte?: InputMaybe<Scalars["String"]["input"]>;
  market_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  maxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openedAt_eq?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_gt?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_gte?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  openedAt_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openedAt_lt?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_lte?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  positionKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  positionKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  positionKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  realizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  unrealizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
};

export type PositionsConnection = {
  __typename?: "PositionsConnection";
  edges: Array<PositionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Price = {
  __typename?: "Price";
  id: Scalars["String"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  maxPrice: Scalars["BigInt"]["output"];
  minPrice: Scalars["BigInt"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  token: Scalars["String"]["output"];
  type: PriceType;
};

export type PriceEdge = {
  __typename?: "PriceEdge";
  cursor: Scalars["String"]["output"];
  node: Price;
};

export enum PriceOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  MaxPriceAsc = "maxPrice_ASC",
  MaxPriceAscNullsFirst = "maxPrice_ASC_NULLS_FIRST",
  MaxPriceAscNullsLast = "maxPrice_ASC_NULLS_LAST",
  MaxPriceDesc = "maxPrice_DESC",
  MaxPriceDescNullsFirst = "maxPrice_DESC_NULLS_FIRST",
  MaxPriceDescNullsLast = "maxPrice_DESC_NULLS_LAST",
  MinPriceAsc = "minPrice_ASC",
  MinPriceAscNullsFirst = "minPrice_ASC_NULLS_FIRST",
  MinPriceAscNullsLast = "minPrice_ASC_NULLS_LAST",
  MinPriceDesc = "minPrice_DESC",
  MinPriceDescNullsFirst = "minPrice_DESC_NULLS_FIRST",
  MinPriceDescNullsLast = "minPrice_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TokenAsc = "token_ASC",
  TokenAscNullsFirst = "token_ASC_NULLS_FIRST",
  TokenAscNullsLast = "token_ASC_NULLS_LAST",
  TokenDesc = "token_DESC",
  TokenDescNullsFirst = "token_DESC_NULLS_FIRST",
  TokenDescNullsLast = "token_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PriceType {
  Glv = "glv",
  Gm = "gm",
  OnchainFeed = "onchainFeed",
  V2 = "v2",
}

export type PriceWhereInput = {
  AND?: InputMaybe<Array<PriceWhereInput>>;
  OR?: InputMaybe<Array<PriceWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  token_contains?: InputMaybe<Scalars["String"]["input"]>;
  token_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  token_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_eq?: InputMaybe<Scalars["String"]["input"]>;
  token_gt?: InputMaybe<Scalars["String"]["input"]>;
  token_gte?: InputMaybe<Scalars["String"]["input"]>;
  token_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  token_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  token_lt?: InputMaybe<Scalars["String"]["input"]>;
  token_lte?: InputMaybe<Scalars["String"]["input"]>;
  token_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  token_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  token_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  token_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  token_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  type_eq?: InputMaybe<PriceType>;
  type_in?: InputMaybe<Array<PriceType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PriceType>;
  type_not_in?: InputMaybe<Array<PriceType>>;
};

export type PricesConnection = {
  __typename?: "PricesConnection";
  edges: Array<PriceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Query = {
  __typename?: "Query";
  accountPnlHistoryStats: Array<AccountPnlHistoryPointObject>;
  accountPnlSummaryStats: Array<AccountPnlSummaryBucketObject>;
  accountStatById?: Maybe<AccountStat>;
  accountStats: Array<AccountStat>;
  accountStatsConnection: AccountStatsConnection;
  aprSnapshotById?: Maybe<AprSnapshot>;
  aprSnapshots: Array<AprSnapshot>;
  aprSnapshotsConnection: AprSnapshotsConnection;
  borrowingRateSnapshotById?: Maybe<BorrowingRateSnapshot>;
  borrowingRateSnapshots: Array<BorrowingRateSnapshot>;
  borrowingRateSnapshotsConnection: BorrowingRateSnapshotsConnection;
  claimActionById?: Maybe<ClaimAction>;
  claimActions: Array<ClaimAction>;
  claimActionsConnection: ClaimActionsConnection;
  claimRefById?: Maybe<ClaimRef>;
  claimRefs: Array<ClaimRef>;
  claimRefsConnection: ClaimRefsConnection;
  claimableFundingFeeInfoById?: Maybe<ClaimableFundingFeeInfo>;
  claimableFundingFeeInfos: Array<ClaimableFundingFeeInfo>;
  claimableFundingFeeInfosConnection: ClaimableFundingFeeInfosConnection;
  collectedFeesInfoById?: Maybe<CollectedFeesInfo>;
  collectedFeesInfos: Array<CollectedFeesInfo>;
  collectedFeesInfosConnection: CollectedFeesInfosConnection;
  cumulativePoolValueById?: Maybe<CumulativePoolValue>;
  cumulativePoolValues: Array<CumulativePoolValue>;
  cumulativePoolValuesConnection: CumulativePoolValuesConnection;
  glvById?: Maybe<Glv>;
  glvs: Array<Glv>;
  glvsAprByPeriod: Array<GlvApr>;
  glvsConnection: GlvsConnection;
  marketById?: Maybe<Market>;
  marketInfoById?: Maybe<MarketInfo>;
  marketInfos: Array<MarketInfo>;
  marketInfosConnection: MarketInfosConnection;
  markets: Array<Market>;
  marketsAprByPeriod: Array<MarketApr>;
  marketsConnection: MarketsConnection;
  onChainSettingById?: Maybe<OnChainSetting>;
  onChainSettings: Array<OnChainSetting>;
  onChainSettingsConnection: OnChainSettingsConnection;
  orderById?: Maybe<Order>;
  orders: Array<Order>;
  ordersConnection: OrdersConnection;
  periodAccountStats: Array<PeriodAccountStatObject>;
  positionById?: Maybe<Position>;
  positionChangeById?: Maybe<PositionChange>;
  positionChanges: Array<PositionChange>;
  positionChangesConnection: PositionChangesConnection;
  positionFeesEntities: Array<PositionFeesEntity>;
  positionFeesEntitiesConnection: PositionFeesEntitiesConnection;
  positionFeesEntityById?: Maybe<PositionFeesEntity>;
  positionTotalCollateralAmount: Array<PositionTotalCollateralAmount>;
  positions: Array<Position>;
  positionsConnection: PositionsConnection;
  positionsVolume: Array<PositionMarketVolumeInfo>;
  positionsVolume24hByMarket: Scalars["BigInt"]["output"];
  priceById?: Maybe<Price>;
  prices: Array<Price>;
  pricesConnection: PricesConnection;
  squidStatus?: Maybe<SquidStatus>;
  swapInfoById?: Maybe<SwapInfo>;
  swapInfos: Array<SwapInfo>;
  swapInfosConnection: SwapInfosConnection;
  totalPositionChanges: Scalars["Float"]["output"];
  tradeActionById?: Maybe<TradeAction>;
  tradeActions: Array<TradeAction>;
  tradeActionsConnection: TradeActionsConnection;
  transactionById?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  transactionsConnection: TransactionsConnection;
};

export type QueryAccountPnlHistoryStatsArgs = {
  account: Scalars["String"]["input"];
  from?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryAccountPnlSummaryStatsArgs = {
  account: Scalars["String"]["input"];
};

export type QueryAccountStatByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryAccountStatsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AccountStatOrderByInput>>;
  where?: InputMaybe<AccountStatWhereInput>;
};

export type QueryAccountStatsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AccountStatOrderByInput>;
  where?: InputMaybe<AccountStatWhereInput>;
};

export type QueryAprSnapshotByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryAprSnapshotsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AprSnapshotOrderByInput>>;
  where?: InputMaybe<AprSnapshotWhereInput>;
};

export type QueryAprSnapshotsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AprSnapshotOrderByInput>;
  where?: InputMaybe<AprSnapshotWhereInput>;
};

export type QueryBorrowingRateSnapshotByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryBorrowingRateSnapshotsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<BorrowingRateSnapshotOrderByInput>>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
};

export type QueryBorrowingRateSnapshotsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<BorrowingRateSnapshotOrderByInput>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
};

export type QueryClaimActionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimActionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimActionOrderByInput>>;
  where?: InputMaybe<ClaimActionWhereInput>;
};

export type QueryClaimActionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimActionOrderByInput>;
  where?: InputMaybe<ClaimActionWhereInput>;
};

export type QueryClaimRefByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimRefsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimRefOrderByInput>>;
  where?: InputMaybe<ClaimRefWhereInput>;
};

export type QueryClaimRefsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimRefOrderByInput>;
  where?: InputMaybe<ClaimRefWhereInput>;
};

export type QueryClaimableFundingFeeInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimableFundingFeeInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimableFundingFeeInfoOrderByInput>>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
};

export type QueryClaimableFundingFeeInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimableFundingFeeInfoOrderByInput>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
};

export type QueryCollectedFeesInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryCollectedFeesInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CollectedFeesInfoOrderByInput>>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
};

export type QueryCollectedFeesInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CollectedFeesInfoOrderByInput>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
};

export type QueryCumulativePoolValueByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryCumulativePoolValuesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CumulativePoolValueOrderByInput>>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
};

export type QueryCumulativePoolValuesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CumulativePoolValueOrderByInput>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
};

export type QueryGlvByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryGlvsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<GlvOrderByInput>>;
  where?: InputMaybe<GlvWhereInput>;
};

export type QueryGlvsAprByPeriodArgs = {
  where?: InputMaybe<GlvAprsWhereInputWhereInput>;
};

export type QueryGlvsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<GlvOrderByInput>;
  where?: InputMaybe<GlvWhereInput>;
};

export type QueryMarketByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryMarketInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryMarketInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketInfoOrderByInput>>;
  where?: InputMaybe<MarketInfoWhereInput>;
};

export type QueryMarketInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketInfoOrderByInput>;
  where?: InputMaybe<MarketInfoWhereInput>;
};

export type QueryMarketsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketOrderByInput>>;
  where?: InputMaybe<MarketWhereInput>;
};

export type QueryMarketsAprByPeriodArgs = {
  where?: InputMaybe<MarketAprsWhereInput>;
};

export type QueryMarketsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketOrderByInput>;
  where?: InputMaybe<MarketWhereInput>;
};

export type QueryOnChainSettingByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryOnChainSettingsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OnChainSettingOrderByInput>>;
  where?: InputMaybe<OnChainSettingWhereInput>;
};

export type QueryOnChainSettingsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OnChainSettingOrderByInput>;
  where?: InputMaybe<OnChainSettingWhereInput>;
};

export type QueryOrderByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryOrdersArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OrderOrderByInput>>;
  where?: InputMaybe<OrderWhereInput>;
};

export type QueryOrdersConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OrderOrderByInput>;
  where?: InputMaybe<OrderWhereInput>;
};

export type QueryPeriodAccountStatsArgs = {
  limit?: InputMaybe<Scalars["Float"]["input"]>;
  offset?: InputMaybe<Scalars["Float"]["input"]>;
  where?: InputMaybe<WhereInput>;
};

export type QueryPositionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionChangeByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionChangesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionChangeOrderByInput>>;
  where?: InputMaybe<PositionChangeWhereInput>;
};

export type QueryPositionChangesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionChangeOrderByInput>;
  where?: InputMaybe<PositionChangeWhereInput>;
};

export type QueryPositionFeesEntitiesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionFeesEntityOrderByInput>>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
};

export type QueryPositionFeesEntitiesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionFeesEntityOrderByInput>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
};

export type QueryPositionFeesEntityByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionTotalCollateralAmountArgs = {
  where?: InputMaybe<PositionTotalCollateralAmountWhereInput>;
};

export type QueryPositionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
};

export type QueryPositionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionOrderByInput>;
  where?: InputMaybe<PositionWhereInput>;
};

export type QueryPositionsVolumeArgs = {
  where?: InputMaybe<PositionVolumeByAllMarketsWhereInput>;
};

export type QueryPositionsVolume24hByMarketArgs = {
  where?: InputMaybe<PositionVolumeWhereInput>;
};

export type QueryPriceByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPricesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PriceOrderByInput>>;
  where?: InputMaybe<PriceWhereInput>;
};

export type QueryPricesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PriceOrderByInput>;
  where?: InputMaybe<PriceWhereInput>;
};

export type QuerySwapInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QuerySwapInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<SwapInfoOrderByInput>>;
  where?: InputMaybe<SwapInfoWhereInput>;
};

export type QuerySwapInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<SwapInfoOrderByInput>;
  where?: InputMaybe<SwapInfoWhereInput>;
};

export type QueryTradeActionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryTradeActionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TradeActionOrderByInput>>;
  where?: InputMaybe<TradeActionWhereInput>;
};

export type QueryTradeActionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TradeActionOrderByInput>;
  where?: InputMaybe<TradeActionWhereInput>;
};

export type QueryTransactionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryTransactionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TransactionOrderByInput>>;
  where?: InputMaybe<TransactionWhereInput>;
};

export type QueryTransactionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TransactionOrderByInput>;
  where?: InputMaybe<TransactionWhereInput>;
};

export type SquidStatus = {
  __typename?: "SquidStatus";
  /** The hash of the last processed finalized block */
  finalizedHash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed finalized block */
  finalizedHeight?: Maybe<Scalars["Int"]["output"]>;
  /** The hash of the last processed block */
  hash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed block */
  height?: Maybe<Scalars["Int"]["output"]>;
};

export type SwapInfo = {
  __typename?: "SwapInfo";
  amountIn: Scalars["BigInt"]["output"];
  amountInAfterFees: Scalars["BigInt"]["output"];
  amountOut: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  marketAddress: Scalars["String"]["output"];
  orderKey: Scalars["String"]["output"];
  priceImpactUsd: Scalars["BigInt"]["output"];
  receiver: Scalars["String"]["output"];
  tokenInAddress: Scalars["String"]["output"];
  tokenInPrice: Scalars["BigInt"]["output"];
  tokenOutAddress: Scalars["String"]["output"];
  tokenOutPrice: Scalars["BigInt"]["output"];
  transaction: Transaction;
};

export type SwapInfoEdge = {
  __typename?: "SwapInfoEdge";
  cursor: Scalars["String"]["output"];
  node: SwapInfo;
};

export enum SwapInfoOrderByInput {
  AmountInAfterFeesAsc = "amountInAfterFees_ASC",
  AmountInAfterFeesAscNullsFirst = "amountInAfterFees_ASC_NULLS_FIRST",
  AmountInAfterFeesAscNullsLast = "amountInAfterFees_ASC_NULLS_LAST",
  AmountInAfterFeesDesc = "amountInAfterFees_DESC",
  AmountInAfterFeesDescNullsFirst = "amountInAfterFees_DESC_NULLS_FIRST",
  AmountInAfterFeesDescNullsLast = "amountInAfterFees_DESC_NULLS_LAST",
  AmountInAsc = "amountIn_ASC",
  AmountInAscNullsFirst = "amountIn_ASC_NULLS_FIRST",
  AmountInAscNullsLast = "amountIn_ASC_NULLS_LAST",
  AmountInDesc = "amountIn_DESC",
  AmountInDescNullsFirst = "amountIn_DESC_NULLS_FIRST",
  AmountInDescNullsLast = "amountIn_DESC_NULLS_LAST",
  AmountOutAsc = "amountOut_ASC",
  AmountOutAscNullsFirst = "amountOut_ASC_NULLS_FIRST",
  AmountOutAscNullsLast = "amountOut_ASC_NULLS_LAST",
  AmountOutDesc = "amountOut_DESC",
  AmountOutDescNullsFirst = "amountOut_DESC_NULLS_FIRST",
  AmountOutDescNullsLast = "amountOut_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  ReceiverAsc = "receiver_ASC",
  ReceiverAscNullsFirst = "receiver_ASC_NULLS_FIRST",
  ReceiverAscNullsLast = "receiver_ASC_NULLS_LAST",
  ReceiverDesc = "receiver_DESC",
  ReceiverDescNullsFirst = "receiver_DESC_NULLS_FIRST",
  ReceiverDescNullsLast = "receiver_DESC_NULLS_LAST",
  TokenInAddressAsc = "tokenInAddress_ASC",
  TokenInAddressAscNullsFirst = "tokenInAddress_ASC_NULLS_FIRST",
  TokenInAddressAscNullsLast = "tokenInAddress_ASC_NULLS_LAST",
  TokenInAddressDesc = "tokenInAddress_DESC",
  TokenInAddressDescNullsFirst = "tokenInAddress_DESC_NULLS_FIRST",
  TokenInAddressDescNullsLast = "tokenInAddress_DESC_NULLS_LAST",
  TokenInPriceAsc = "tokenInPrice_ASC",
  TokenInPriceAscNullsFirst = "tokenInPrice_ASC_NULLS_FIRST",
  TokenInPriceAscNullsLast = "tokenInPrice_ASC_NULLS_LAST",
  TokenInPriceDesc = "tokenInPrice_DESC",
  TokenInPriceDescNullsFirst = "tokenInPrice_DESC_NULLS_FIRST",
  TokenInPriceDescNullsLast = "tokenInPrice_DESC_NULLS_LAST",
  TokenOutAddressAsc = "tokenOutAddress_ASC",
  TokenOutAddressAscNullsFirst = "tokenOutAddress_ASC_NULLS_FIRST",
  TokenOutAddressAscNullsLast = "tokenOutAddress_ASC_NULLS_LAST",
  TokenOutAddressDesc = "tokenOutAddress_DESC",
  TokenOutAddressDescNullsFirst = "tokenOutAddress_DESC_NULLS_FIRST",
  TokenOutAddressDescNullsLast = "tokenOutAddress_DESC_NULLS_LAST",
  TokenOutPriceAsc = "tokenOutPrice_ASC",
  TokenOutPriceAscNullsFirst = "tokenOutPrice_ASC_NULLS_FIRST",
  TokenOutPriceAscNullsLast = "tokenOutPrice_ASC_NULLS_LAST",
  TokenOutPriceDesc = "tokenOutPrice_DESC",
  TokenOutPriceDescNullsFirst = "tokenOutPrice_DESC_NULLS_FIRST",
  TokenOutPriceDescNullsLast = "tokenOutPrice_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export type SwapInfoWhereInput = {
  AND?: InputMaybe<Array<SwapInfoWhereInput>>;
  OR?: InputMaybe<Array<SwapInfoWhereInput>>;
  amountInAfterFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountInAfterFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountInAfterFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountIn_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountIn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountIn_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountOut_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountOut_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountOut_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  receiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  receiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenInAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenInAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenInAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenInPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenInPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenOutAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenOutAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenOutAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenOutAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenOutPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenOutPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type SwapInfosConnection = {
  __typename?: "SwapInfosConnection";
  edges: Array<SwapInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type TradeAction = {
  __typename?: "TradeAction";
  acceptablePrice?: Maybe<Scalars["BigInt"]["output"]>;
  account: Scalars["String"]["output"];
  basePnlUsd?: Maybe<Scalars["BigInt"]["output"]>;
  borrowingFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  collateralTokenPriceMax?: Maybe<Scalars["BigInt"]["output"]>;
  collateralTokenPriceMin?: Maybe<Scalars["BigInt"]["output"]>;
  contractTriggerPrice?: Maybe<Scalars["BigInt"]["output"]>;
  eventName: Scalars["String"]["output"];
  executionAmountOut?: Maybe<Scalars["BigInt"]["output"]>;
  executionPrice?: Maybe<Scalars["BigInt"]["output"]>;
  fundingFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  id: Scalars["String"]["output"];
  indexTokenPriceMax?: Maybe<Scalars["BigInt"]["output"]>;
  indexTokenPriceMin?: Maybe<Scalars["BigInt"]["output"]>;
  initialCollateralDeltaAmount: Scalars["BigInt"]["output"];
  initialCollateralTokenAddress: Scalars["String"]["output"];
  isLong?: Maybe<Scalars["Boolean"]["output"]>;
  liquidationFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  marketAddress?: Maybe<Scalars["String"]["output"]>;
  minOutputAmount?: Maybe<Scalars["BigInt"]["output"]>;
  numberOfParts?: Maybe<Scalars["Int"]["output"]>;
  orderKey: Scalars["String"]["output"];
  orderType: Scalars["Int"]["output"];
  pnlUsd?: Maybe<Scalars["BigInt"]["output"]>;
  positionFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactDiffUsd?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactUsd?: Maybe<Scalars["BigInt"]["output"]>;
  reason?: Maybe<Scalars["String"]["output"]>;
  reasonBytes?: Maybe<Scalars["String"]["output"]>;
  shouldUnwrapNativeToken?: Maybe<Scalars["Boolean"]["output"]>;
  sizeDeltaUsd?: Maybe<Scalars["BigInt"]["output"]>;
  swapPath: Array<Scalars["String"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  transaction: Transaction;
  triggerPrice?: Maybe<Scalars["BigInt"]["output"]>;
  twapGroupId?: Maybe<Scalars["String"]["output"]>;
  uiFeeReceiver: Scalars["String"]["output"];
};

export type TradeActionEdge = {
  __typename?: "TradeActionEdge";
  cursor: Scalars["String"]["output"];
  node: TradeAction;
};

export enum TradeActionOrderByInput {
  AcceptablePriceAsc = "acceptablePrice_ASC",
  AcceptablePriceAscNullsFirst = "acceptablePrice_ASC_NULLS_FIRST",
  AcceptablePriceAscNullsLast = "acceptablePrice_ASC_NULLS_LAST",
  AcceptablePriceDesc = "acceptablePrice_DESC",
  AcceptablePriceDescNullsFirst = "acceptablePrice_DESC_NULLS_FIRST",
  AcceptablePriceDescNullsLast = "acceptablePrice_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  BasePnlUsdAsc = "basePnlUsd_ASC",
  BasePnlUsdAscNullsFirst = "basePnlUsd_ASC_NULLS_FIRST",
  BasePnlUsdAscNullsLast = "basePnlUsd_ASC_NULLS_LAST",
  BasePnlUsdDesc = "basePnlUsd_DESC",
  BasePnlUsdDescNullsFirst = "basePnlUsd_DESC_NULLS_FIRST",
  BasePnlUsdDescNullsLast = "basePnlUsd_DESC_NULLS_LAST",
  BorrowingFeeAmountAsc = "borrowingFeeAmount_ASC",
  BorrowingFeeAmountAscNullsFirst = "borrowingFeeAmount_ASC_NULLS_FIRST",
  BorrowingFeeAmountAscNullsLast = "borrowingFeeAmount_ASC_NULLS_LAST",
  BorrowingFeeAmountDesc = "borrowingFeeAmount_DESC",
  BorrowingFeeAmountDescNullsFirst = "borrowingFeeAmount_DESC_NULLS_FIRST",
  BorrowingFeeAmountDescNullsLast = "borrowingFeeAmount_DESC_NULLS_LAST",
  CollateralTokenPriceMaxAsc = "collateralTokenPriceMax_ASC",
  CollateralTokenPriceMaxAscNullsFirst = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  CollateralTokenPriceMaxAscNullsLast = "collateralTokenPriceMax_ASC_NULLS_LAST",
  CollateralTokenPriceMaxDesc = "collateralTokenPriceMax_DESC",
  CollateralTokenPriceMaxDescNullsFirst = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  CollateralTokenPriceMaxDescNullsLast = "collateralTokenPriceMax_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  ContractTriggerPriceAsc = "contractTriggerPrice_ASC",
  ContractTriggerPriceAscNullsFirst = "contractTriggerPrice_ASC_NULLS_FIRST",
  ContractTriggerPriceAscNullsLast = "contractTriggerPrice_ASC_NULLS_LAST",
  ContractTriggerPriceDesc = "contractTriggerPrice_DESC",
  ContractTriggerPriceDescNullsFirst = "contractTriggerPrice_DESC_NULLS_FIRST",
  ContractTriggerPriceDescNullsLast = "contractTriggerPrice_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  ExecutionAmountOutAsc = "executionAmountOut_ASC",
  ExecutionAmountOutAscNullsFirst = "executionAmountOut_ASC_NULLS_FIRST",
  ExecutionAmountOutAscNullsLast = "executionAmountOut_ASC_NULLS_LAST",
  ExecutionAmountOutDesc = "executionAmountOut_DESC",
  ExecutionAmountOutDescNullsFirst = "executionAmountOut_DESC_NULLS_FIRST",
  ExecutionAmountOutDescNullsLast = "executionAmountOut_DESC_NULLS_LAST",
  ExecutionPriceAsc = "executionPrice_ASC",
  ExecutionPriceAscNullsFirst = "executionPrice_ASC_NULLS_FIRST",
  ExecutionPriceAscNullsLast = "executionPrice_ASC_NULLS_LAST",
  ExecutionPriceDesc = "executionPrice_DESC",
  ExecutionPriceDescNullsFirst = "executionPrice_DESC_NULLS_FIRST",
  ExecutionPriceDescNullsLast = "executionPrice_DESC_NULLS_LAST",
  FundingFeeAmountAsc = "fundingFeeAmount_ASC",
  FundingFeeAmountAscNullsFirst = "fundingFeeAmount_ASC_NULLS_FIRST",
  FundingFeeAmountAscNullsLast = "fundingFeeAmount_ASC_NULLS_LAST",
  FundingFeeAmountDesc = "fundingFeeAmount_DESC",
  FundingFeeAmountDescNullsFirst = "fundingFeeAmount_DESC_NULLS_FIRST",
  FundingFeeAmountDescNullsLast = "fundingFeeAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenPriceMaxAsc = "indexTokenPriceMax_ASC",
  IndexTokenPriceMaxAscNullsFirst = "indexTokenPriceMax_ASC_NULLS_FIRST",
  IndexTokenPriceMaxAscNullsLast = "indexTokenPriceMax_ASC_NULLS_LAST",
  IndexTokenPriceMaxDesc = "indexTokenPriceMax_DESC",
  IndexTokenPriceMaxDescNullsFirst = "indexTokenPriceMax_DESC_NULLS_FIRST",
  IndexTokenPriceMaxDescNullsLast = "indexTokenPriceMax_DESC_NULLS_LAST",
  IndexTokenPriceMinAsc = "indexTokenPriceMin_ASC",
  IndexTokenPriceMinAscNullsFirst = "indexTokenPriceMin_ASC_NULLS_FIRST",
  IndexTokenPriceMinAscNullsLast = "indexTokenPriceMin_ASC_NULLS_LAST",
  IndexTokenPriceMinDesc = "indexTokenPriceMin_DESC",
  IndexTokenPriceMinDescNullsFirst = "indexTokenPriceMin_DESC_NULLS_FIRST",
  IndexTokenPriceMinDescNullsLast = "indexTokenPriceMin_DESC_NULLS_LAST",
  InitialCollateralDeltaAmountAsc = "initialCollateralDeltaAmount_ASC",
  InitialCollateralDeltaAmountAscNullsFirst = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  InitialCollateralDeltaAmountAscNullsLast = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  InitialCollateralDeltaAmountDesc = "initialCollateralDeltaAmount_DESC",
  InitialCollateralDeltaAmountDescNullsFirst = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  InitialCollateralDeltaAmountDescNullsLast = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  InitialCollateralTokenAddressAsc = "initialCollateralTokenAddress_ASC",
  InitialCollateralTokenAddressAscNullsFirst = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  InitialCollateralTokenAddressAscNullsLast = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  InitialCollateralTokenAddressDesc = "initialCollateralTokenAddress_DESC",
  InitialCollateralTokenAddressDescNullsFirst = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  InitialCollateralTokenAddressDescNullsLast = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  LiquidationFeeAmountAsc = "liquidationFeeAmount_ASC",
  LiquidationFeeAmountAscNullsFirst = "liquidationFeeAmount_ASC_NULLS_FIRST",
  LiquidationFeeAmountAscNullsLast = "liquidationFeeAmount_ASC_NULLS_LAST",
  LiquidationFeeAmountDesc = "liquidationFeeAmount_DESC",
  LiquidationFeeAmountDescNullsFirst = "liquidationFeeAmount_DESC_NULLS_FIRST",
  LiquidationFeeAmountDescNullsLast = "liquidationFeeAmount_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  MinOutputAmountAsc = "minOutputAmount_ASC",
  MinOutputAmountAscNullsFirst = "minOutputAmount_ASC_NULLS_FIRST",
  MinOutputAmountAscNullsLast = "minOutputAmount_ASC_NULLS_LAST",
  MinOutputAmountDesc = "minOutputAmount_DESC",
  MinOutputAmountDescNullsFirst = "minOutputAmount_DESC_NULLS_FIRST",
  MinOutputAmountDescNullsLast = "minOutputAmount_DESC_NULLS_LAST",
  NumberOfPartsAsc = "numberOfParts_ASC",
  NumberOfPartsAscNullsFirst = "numberOfParts_ASC_NULLS_FIRST",
  NumberOfPartsAscNullsLast = "numberOfParts_ASC_NULLS_LAST",
  NumberOfPartsDesc = "numberOfParts_DESC",
  NumberOfPartsDescNullsFirst = "numberOfParts_DESC_NULLS_FIRST",
  NumberOfPartsDescNullsLast = "numberOfParts_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  OrderTypeAsc = "orderType_ASC",
  OrderTypeAscNullsFirst = "orderType_ASC_NULLS_FIRST",
  OrderTypeAscNullsLast = "orderType_ASC_NULLS_LAST",
  OrderTypeDesc = "orderType_DESC",
  OrderTypeDescNullsFirst = "orderType_DESC_NULLS_FIRST",
  OrderTypeDescNullsLast = "orderType_DESC_NULLS_LAST",
  PnlUsdAsc = "pnlUsd_ASC",
  PnlUsdAscNullsFirst = "pnlUsd_ASC_NULLS_FIRST",
  PnlUsdAscNullsLast = "pnlUsd_ASC_NULLS_LAST",
  PnlUsdDesc = "pnlUsd_DESC",
  PnlUsdDescNullsFirst = "pnlUsd_DESC_NULLS_FIRST",
  PnlUsdDescNullsLast = "pnlUsd_DESC_NULLS_LAST",
  PositionFeeAmountAsc = "positionFeeAmount_ASC",
  PositionFeeAmountAscNullsFirst = "positionFeeAmount_ASC_NULLS_FIRST",
  PositionFeeAmountAscNullsLast = "positionFeeAmount_ASC_NULLS_LAST",
  PositionFeeAmountDesc = "positionFeeAmount_DESC",
  PositionFeeAmountDescNullsFirst = "positionFeeAmount_DESC_NULLS_FIRST",
  PositionFeeAmountDescNullsLast = "positionFeeAmount_DESC_NULLS_LAST",
  PriceImpactAmountAsc = "priceImpactAmount_ASC",
  PriceImpactAmountAscNullsFirst = "priceImpactAmount_ASC_NULLS_FIRST",
  PriceImpactAmountAscNullsLast = "priceImpactAmount_ASC_NULLS_LAST",
  PriceImpactAmountDesc = "priceImpactAmount_DESC",
  PriceImpactAmountDescNullsFirst = "priceImpactAmount_DESC_NULLS_FIRST",
  PriceImpactAmountDescNullsLast = "priceImpactAmount_DESC_NULLS_LAST",
  PriceImpactDiffUsdAsc = "priceImpactDiffUsd_ASC",
  PriceImpactDiffUsdAscNullsFirst = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  PriceImpactDiffUsdAscNullsLast = "priceImpactDiffUsd_ASC_NULLS_LAST",
  PriceImpactDiffUsdDesc = "priceImpactDiffUsd_DESC",
  PriceImpactDiffUsdDescNullsFirst = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  PriceImpactDiffUsdDescNullsLast = "priceImpactDiffUsd_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  ReasonBytesAsc = "reasonBytes_ASC",
  ReasonBytesAscNullsFirst = "reasonBytes_ASC_NULLS_FIRST",
  ReasonBytesAscNullsLast = "reasonBytes_ASC_NULLS_LAST",
  ReasonBytesDesc = "reasonBytes_DESC",
  ReasonBytesDescNullsFirst = "reasonBytes_DESC_NULLS_FIRST",
  ReasonBytesDescNullsLast = "reasonBytes_DESC_NULLS_LAST",
  ReasonAsc = "reason_ASC",
  ReasonAscNullsFirst = "reason_ASC_NULLS_FIRST",
  ReasonAscNullsLast = "reason_ASC_NULLS_LAST",
  ReasonDesc = "reason_DESC",
  ReasonDescNullsFirst = "reason_DESC_NULLS_FIRST",
  ReasonDescNullsLast = "reason_DESC_NULLS_LAST",
  ShouldUnwrapNativeTokenAsc = "shouldUnwrapNativeToken_ASC",
  ShouldUnwrapNativeTokenAscNullsFirst = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  ShouldUnwrapNativeTokenAscNullsLast = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  ShouldUnwrapNativeTokenDesc = "shouldUnwrapNativeToken_DESC",
  ShouldUnwrapNativeTokenDescNullsFirst = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  ShouldUnwrapNativeTokenDescNullsLast = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
  TriggerPriceAsc = "triggerPrice_ASC",
  TriggerPriceAscNullsFirst = "triggerPrice_ASC_NULLS_FIRST",
  TriggerPriceAscNullsLast = "triggerPrice_ASC_NULLS_LAST",
  TriggerPriceDesc = "triggerPrice_DESC",
  TriggerPriceDescNullsFirst = "triggerPrice_DESC_NULLS_FIRST",
  TriggerPriceDescNullsLast = "triggerPrice_DESC_NULLS_LAST",
  TwapGroupIdAsc = "twapGroupId_ASC",
  TwapGroupIdAscNullsFirst = "twapGroupId_ASC_NULLS_FIRST",
  TwapGroupIdAscNullsLast = "twapGroupId_ASC_NULLS_LAST",
  TwapGroupIdDesc = "twapGroupId_DESC",
  TwapGroupIdDescNullsFirst = "twapGroupId_DESC_NULLS_FIRST",
  TwapGroupIdDescNullsLast = "twapGroupId_DESC_NULLS_LAST",
  UiFeeReceiverAsc = "uiFeeReceiver_ASC",
  UiFeeReceiverAscNullsFirst = "uiFeeReceiver_ASC_NULLS_FIRST",
  UiFeeReceiverAscNullsLast = "uiFeeReceiver_ASC_NULLS_LAST",
  UiFeeReceiverDesc = "uiFeeReceiver_DESC",
  UiFeeReceiverDescNullsFirst = "uiFeeReceiver_DESC_NULLS_FIRST",
  UiFeeReceiverDescNullsLast = "uiFeeReceiver_DESC_NULLS_LAST",
}

export type TradeActionWhereInput = {
  AND?: InputMaybe<Array<TradeActionWhereInput>>;
  OR?: InputMaybe<Array<TradeActionWhereInput>>;
  acceptablePrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  acceptablePrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  acceptablePrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  basePnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  basePnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  basePnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  contractTriggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  contractTriggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  contractTriggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  eventName_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_lt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_lte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  executionAmountOut_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionAmountOut_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionAmountOut_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  liquidationFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  minOutputAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minOutputAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minOutputAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  numberOfParts_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  numberOfParts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  numberOfParts_lt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_lte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderType_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderType_lt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_lte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  pnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  pnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  pnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactDiffUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_contains?: InputMaybe<Scalars["String"]["input"]>;
  reason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_eq?: InputMaybe<Scalars["String"]["input"]>;
  reason_gt?: InputMaybe<Scalars["String"]["input"]>;
  reason_gte?: InputMaybe<Scalars["String"]["input"]>;
  reason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reason_lt?: InputMaybe<Scalars["String"]["input"]>;
  reason_lte?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shouldUnwrapNativeToken_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapPath_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  triggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  twapGroupId_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  twapGroupId_lt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_lte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  uiFeeReceiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type TradeActionsConnection = {
  __typename?: "TradeActionsConnection";
  edges: Array<TradeActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Transaction = {
  __typename?: "Transaction";
  blockNumber: Scalars["Int"]["output"];
  from: Scalars["String"]["output"];
  hash: Scalars["String"]["output"];
  id: Scalars["String"]["output"];
  timestamp: Scalars["Int"]["output"];
  to: Scalars["String"]["output"];
  transactionIndex: Scalars["Int"]["output"];
};

export type TransactionEdge = {
  __typename?: "TransactionEdge";
  cursor: Scalars["String"]["output"];
  node: Transaction;
};

export enum TransactionOrderByInput {
  BlockNumberAsc = "blockNumber_ASC",
  BlockNumberAscNullsFirst = "blockNumber_ASC_NULLS_FIRST",
  BlockNumberAscNullsLast = "blockNumber_ASC_NULLS_LAST",
  BlockNumberDesc = "blockNumber_DESC",
  BlockNumberDescNullsFirst = "blockNumber_DESC_NULLS_FIRST",
  BlockNumberDescNullsLast = "blockNumber_DESC_NULLS_LAST",
  FromAsc = "from_ASC",
  FromAscNullsFirst = "from_ASC_NULLS_FIRST",
  FromAscNullsLast = "from_ASC_NULLS_LAST",
  FromDesc = "from_DESC",
  FromDescNullsFirst = "from_DESC_NULLS_FIRST",
  FromDescNullsLast = "from_DESC_NULLS_LAST",
  HashAsc = "hash_ASC",
  HashAscNullsFirst = "hash_ASC_NULLS_FIRST",
  HashAscNullsLast = "hash_ASC_NULLS_LAST",
  HashDesc = "hash_DESC",
  HashDescNullsFirst = "hash_DESC_NULLS_FIRST",
  HashDescNullsLast = "hash_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  ToAsc = "to_ASC",
  ToAscNullsFirst = "to_ASC_NULLS_FIRST",
  ToAscNullsLast = "to_ASC_NULLS_LAST",
  ToDesc = "to_DESC",
  ToDescNullsFirst = "to_DESC_NULLS_FIRST",
  ToDescNullsLast = "to_DESC_NULLS_LAST",
  TransactionIndexAsc = "transactionIndex_ASC",
  TransactionIndexAscNullsFirst = "transactionIndex_ASC_NULLS_FIRST",
  TransactionIndexAscNullsLast = "transactionIndex_ASC_NULLS_LAST",
  TransactionIndexDesc = "transactionIndex_DESC",
  TransactionIndexDescNullsFirst = "transactionIndex_DESC_NULLS_FIRST",
  TransactionIndexDescNullsLast = "transactionIndex_DESC_NULLS_LAST",
}

export type TransactionWhereInput = {
  AND?: InputMaybe<Array<TransactionWhereInput>>;
  OR?: InputMaybe<Array<TransactionWhereInput>>;
  blockNumber_eq?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_gt?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_gte?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  blockNumber_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  blockNumber_lt?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_lte?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  from_contains?: InputMaybe<Scalars["String"]["input"]>;
  from_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  from_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_eq?: InputMaybe<Scalars["String"]["input"]>;
  from_gt?: InputMaybe<Scalars["String"]["input"]>;
  from_gte?: InputMaybe<Scalars["String"]["input"]>;
  from_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  from_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  from_lt?: InputMaybe<Scalars["String"]["input"]>;
  from_lte?: InputMaybe<Scalars["String"]["input"]>;
  from_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  from_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  from_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  from_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  from_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_contains?: InputMaybe<Scalars["String"]["input"]>;
  hash_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  hash_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_eq?: InputMaybe<Scalars["String"]["input"]>;
  hash_gt?: InputMaybe<Scalars["String"]["input"]>;
  hash_gte?: InputMaybe<Scalars["String"]["input"]>;
  hash_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  hash_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  hash_lt?: InputMaybe<Scalars["String"]["input"]>;
  hash_lte?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  hash_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  to_contains?: InputMaybe<Scalars["String"]["input"]>;
  to_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  to_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_eq?: InputMaybe<Scalars["String"]["input"]>;
  to_gt?: InputMaybe<Scalars["String"]["input"]>;
  to_gte?: InputMaybe<Scalars["String"]["input"]>;
  to_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  to_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  to_lt?: InputMaybe<Scalars["String"]["input"]>;
  to_lte?: InputMaybe<Scalars["String"]["input"]>;
  to_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  to_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  to_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  to_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  to_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  transactionIndex_eq?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_gt?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_gte?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  transactionIndex_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  transactionIndex_lt?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_lte?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type TransactionsConnection = {
  __typename?: "TransactionsConnection";
  edges: Array<TransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type WhereInput = {
  from?: InputMaybe<Scalars["Int"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  maxCapital_gte?: InputMaybe<Scalars["String"]["input"]>;
  to?: InputMaybe<Scalars["Int"]["input"]>;
};

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** Big number integer */
  BigInt: { input: any; output: any };
};

export type AccountPnlHistoryPointObject = {
  __typename?: "AccountPnlHistoryPointObject";
  account: Scalars["String"]["output"];
  cumulativePnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedPnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  cumulativeRealizedPriceImpact: Scalars["BigInt"]["output"];
  pnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPnl: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPriceImpact: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedPnl: Scalars["BigInt"]["output"];
  timestamp: Scalars["Int"]["output"];
  /** Field for debug */
  unrealizedFees: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedPnl: Scalars["BigInt"]["output"];
};

export type AccountPnlSummaryBucketObject = {
  __typename?: "AccountPnlSummaryBucketObject";
  bucketLabel: Scalars["String"]["output"];
  losses: Scalars["Int"]["output"];
  pnlBps: Scalars["BigInt"]["output"];
  pnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedFeesUsd: Scalars["BigInt"]["output"];
  realizedPnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  realizedPriceImpactUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  startUnrealizedFeesUsd: Scalars["BigInt"]["output"];
  startUnrealizedPnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedBasePnlUsd: Scalars["BigInt"]["output"];
  /** Field for debug */
  unrealizedFeesUsd: Scalars["BigInt"]["output"];
  unrealizedPnlUsd: Scalars["BigInt"]["output"];
  usedCapitalUsd: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Int"]["output"];
  /** Null when no losses and no wins */
  winsLossesRatioBps?: Maybe<Scalars["BigInt"]["output"]>;
};

export type AccountStat = {
  __typename?: "AccountStat";
  closedCount: Scalars["Int"]["output"];
  cumsumCollateral: Scalars["BigInt"]["output"];
  cumsumSize: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  losses: Scalars["Int"]["output"];
  maxCapital: Scalars["BigInt"]["output"];
  netCapital: Scalars["BigInt"]["output"];
  positions: Array<Position>;
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  sumMaxSize: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Int"]["output"];
};

export type AccountStatPositionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
};

export type AccountStatEdge = {
  __typename?: "AccountStatEdge";
  cursor: Scalars["String"]["output"];
  node: AccountStat;
};

export enum AccountStatOrderByInput {
  ClosedCountAsc = "closedCount_ASC",
  ClosedCountAscNullsFirst = "closedCount_ASC_NULLS_FIRST",
  ClosedCountAscNullsLast = "closedCount_ASC_NULLS_LAST",
  ClosedCountDesc = "closedCount_DESC",
  ClosedCountDescNullsFirst = "closedCount_DESC_NULLS_FIRST",
  ClosedCountDescNullsLast = "closedCount_DESC_NULLS_LAST",
  CumsumCollateralAsc = "cumsumCollateral_ASC",
  CumsumCollateralAscNullsFirst = "cumsumCollateral_ASC_NULLS_FIRST",
  CumsumCollateralAscNullsLast = "cumsumCollateral_ASC_NULLS_LAST",
  CumsumCollateralDesc = "cumsumCollateral_DESC",
  CumsumCollateralDescNullsFirst = "cumsumCollateral_DESC_NULLS_FIRST",
  CumsumCollateralDescNullsLast = "cumsumCollateral_DESC_NULLS_LAST",
  CumsumSizeAsc = "cumsumSize_ASC",
  CumsumSizeAscNullsFirst = "cumsumSize_ASC_NULLS_FIRST",
  CumsumSizeAscNullsLast = "cumsumSize_ASC_NULLS_LAST",
  CumsumSizeDesc = "cumsumSize_DESC",
  CumsumSizeDescNullsFirst = "cumsumSize_DESC_NULLS_FIRST",
  CumsumSizeDescNullsLast = "cumsumSize_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LossesAsc = "losses_ASC",
  LossesAscNullsFirst = "losses_ASC_NULLS_FIRST",
  LossesAscNullsLast = "losses_ASC_NULLS_LAST",
  LossesDesc = "losses_DESC",
  LossesDescNullsFirst = "losses_DESC_NULLS_FIRST",
  LossesDescNullsLast = "losses_DESC_NULLS_LAST",
  MaxCapitalAsc = "maxCapital_ASC",
  MaxCapitalAscNullsFirst = "maxCapital_ASC_NULLS_FIRST",
  MaxCapitalAscNullsLast = "maxCapital_ASC_NULLS_LAST",
  MaxCapitalDesc = "maxCapital_DESC",
  MaxCapitalDescNullsFirst = "maxCapital_DESC_NULLS_FIRST",
  MaxCapitalDescNullsLast = "maxCapital_DESC_NULLS_LAST",
  NetCapitalAsc = "netCapital_ASC",
  NetCapitalAscNullsFirst = "netCapital_ASC_NULLS_FIRST",
  NetCapitalAscNullsLast = "netCapital_ASC_NULLS_LAST",
  NetCapitalDesc = "netCapital_DESC",
  NetCapitalDescNullsFirst = "netCapital_DESC_NULLS_FIRST",
  NetCapitalDescNullsLast = "netCapital_DESC_NULLS_LAST",
  RealizedFeesAsc = "realizedFees_ASC",
  RealizedFeesAscNullsFirst = "realizedFees_ASC_NULLS_FIRST",
  RealizedFeesAscNullsLast = "realizedFees_ASC_NULLS_LAST",
  RealizedFeesDesc = "realizedFees_DESC",
  RealizedFeesDescNullsFirst = "realizedFees_DESC_NULLS_FIRST",
  RealizedFeesDescNullsLast = "realizedFees_DESC_NULLS_LAST",
  RealizedPnlAsc = "realizedPnl_ASC",
  RealizedPnlAscNullsFirst = "realizedPnl_ASC_NULLS_FIRST",
  RealizedPnlAscNullsLast = "realizedPnl_ASC_NULLS_LAST",
  RealizedPnlDesc = "realizedPnl_DESC",
  RealizedPnlDescNullsFirst = "realizedPnl_DESC_NULLS_FIRST",
  RealizedPnlDescNullsLast = "realizedPnl_DESC_NULLS_LAST",
  RealizedPriceImpactAsc = "realizedPriceImpact_ASC",
  RealizedPriceImpactAscNullsFirst = "realizedPriceImpact_ASC_NULLS_FIRST",
  RealizedPriceImpactAscNullsLast = "realizedPriceImpact_ASC_NULLS_LAST",
  RealizedPriceImpactDesc = "realizedPriceImpact_DESC",
  RealizedPriceImpactDescNullsFirst = "realizedPriceImpact_DESC_NULLS_FIRST",
  RealizedPriceImpactDescNullsLast = "realizedPriceImpact_DESC_NULLS_LAST",
  SumMaxSizeAsc = "sumMaxSize_ASC",
  SumMaxSizeAscNullsFirst = "sumMaxSize_ASC_NULLS_FIRST",
  SumMaxSizeAscNullsLast = "sumMaxSize_ASC_NULLS_LAST",
  SumMaxSizeDesc = "sumMaxSize_DESC",
  SumMaxSizeDescNullsFirst = "sumMaxSize_DESC_NULLS_FIRST",
  SumMaxSizeDescNullsLast = "sumMaxSize_DESC_NULLS_LAST",
  VolumeAsc = "volume_ASC",
  VolumeAscNullsFirst = "volume_ASC_NULLS_FIRST",
  VolumeAscNullsLast = "volume_ASC_NULLS_LAST",
  VolumeDesc = "volume_DESC",
  VolumeDescNullsFirst = "volume_DESC_NULLS_FIRST",
  VolumeDescNullsLast = "volume_DESC_NULLS_LAST",
  WinsAsc = "wins_ASC",
  WinsAscNullsFirst = "wins_ASC_NULLS_FIRST",
  WinsAscNullsLast = "wins_ASC_NULLS_LAST",
  WinsDesc = "wins_DESC",
  WinsDescNullsFirst = "wins_DESC_NULLS_FIRST",
  WinsDescNullsLast = "wins_DESC_NULLS_LAST",
}

export type AccountStatWhereInput = {
  AND?: InputMaybe<Array<AccountStatWhereInput>>;
  OR?: InputMaybe<Array<AccountStatWhereInput>>;
  closedCount_eq?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_gt?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_gte?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  closedCount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  closedCount_lt?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_lte?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  closedCount_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  cumsumCollateral_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumCollateral_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumsumCollateral_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumCollateral_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumsumSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumsumSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumsumSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  losses_eq?: InputMaybe<Scalars["Int"]["input"]>;
  losses_gt?: InputMaybe<Scalars["Int"]["input"]>;
  losses_gte?: InputMaybe<Scalars["Int"]["input"]>;
  losses_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  losses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  losses_lt?: InputMaybe<Scalars["Int"]["input"]>;
  losses_lte?: InputMaybe<Scalars["Int"]["input"]>;
  losses_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  losses_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  maxCapital_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxCapital_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxCapital_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxCapital_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  netCapital_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  netCapital_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  netCapital_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  netCapital_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positions_every?: InputMaybe<PositionWhereInput>;
  positions_none?: InputMaybe<PositionWhereInput>;
  positions_some?: InputMaybe<PositionWhereInput>;
  realizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sumMaxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sumMaxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sumMaxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sumMaxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  volume_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  volume_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  volume_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  volume_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  wins_eq?: InputMaybe<Scalars["Int"]["input"]>;
  wins_gt?: InputMaybe<Scalars["Int"]["input"]>;
  wins_gte?: InputMaybe<Scalars["Int"]["input"]>;
  wins_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  wins_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  wins_lt?: InputMaybe<Scalars["Int"]["input"]>;
  wins_lte?: InputMaybe<Scalars["Int"]["input"]>;
  wins_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  wins_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type AccountStatsConnection = {
  __typename?: "AccountStatsConnection";
  edges: Array<AccountStatEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type AprSnapshot = {
  __typename?: "AprSnapshot";
  address: Scalars["String"]["output"];
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
};

export type AprSnapshotEdge = {
  __typename?: "AprSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: AprSnapshot;
};

export enum AprSnapshotOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  AprByBorrowingFeeAsc = "aprByBorrowingFee_ASC",
  AprByBorrowingFeeAscNullsFirst = "aprByBorrowingFee_ASC_NULLS_FIRST",
  AprByBorrowingFeeAscNullsLast = "aprByBorrowingFee_ASC_NULLS_LAST",
  AprByBorrowingFeeDesc = "aprByBorrowingFee_DESC",
  AprByBorrowingFeeDescNullsFirst = "aprByBorrowingFee_DESC_NULLS_FIRST",
  AprByBorrowingFeeDescNullsLast = "aprByBorrowingFee_DESC_NULLS_LAST",
  AprByFeeAsc = "aprByFee_ASC",
  AprByFeeAscNullsFirst = "aprByFee_ASC_NULLS_FIRST",
  AprByFeeAscNullsLast = "aprByFee_ASC_NULLS_LAST",
  AprByFeeDesc = "aprByFee_DESC",
  AprByFeeDescNullsFirst = "aprByFee_DESC_NULLS_FIRST",
  AprByFeeDescNullsLast = "aprByFee_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type AprSnapshotWhereInput = {
  AND?: InputMaybe<Array<AprSnapshotWhereInput>>;
  OR?: InputMaybe<Array<AprSnapshotWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  aprByBorrowingFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByBorrowingFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aprByBorrowingFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByBorrowingFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aprByFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aprByFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aprByFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type AprSnapshotsConnection = {
  __typename?: "AprSnapshotsConnection";
  edges: Array<AprSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type BorrowingRateSnapshot = {
  __typename?: "BorrowingRateSnapshot";
  address: Scalars["String"]["output"];
  borrowingFactorPerSecondLong: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondShort: Scalars["BigInt"]["output"];
  borrowingRateForPool: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
};

export type BorrowingRateSnapshotEdge = {
  __typename?: "BorrowingRateSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: BorrowingRateSnapshot;
};

export enum BorrowingRateSnapshotOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  BorrowingFactorPerSecondLongAsc = "borrowingFactorPerSecondLong_ASC",
  BorrowingFactorPerSecondLongAscNullsFirst = "borrowingFactorPerSecondLong_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondLongAscNullsLast = "borrowingFactorPerSecondLong_ASC_NULLS_LAST",
  BorrowingFactorPerSecondLongDesc = "borrowingFactorPerSecondLong_DESC",
  BorrowingFactorPerSecondLongDescNullsFirst = "borrowingFactorPerSecondLong_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondLongDescNullsLast = "borrowingFactorPerSecondLong_DESC_NULLS_LAST",
  BorrowingFactorPerSecondShortAsc = "borrowingFactorPerSecondShort_ASC",
  BorrowingFactorPerSecondShortAscNullsFirst = "borrowingFactorPerSecondShort_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondShortAscNullsLast = "borrowingFactorPerSecondShort_ASC_NULLS_LAST",
  BorrowingFactorPerSecondShortDesc = "borrowingFactorPerSecondShort_DESC",
  BorrowingFactorPerSecondShortDescNullsFirst = "borrowingFactorPerSecondShort_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondShortDescNullsLast = "borrowingFactorPerSecondShort_DESC_NULLS_LAST",
  BorrowingRateForPoolAsc = "borrowingRateForPool_ASC",
  BorrowingRateForPoolAscNullsFirst = "borrowingRateForPool_ASC_NULLS_FIRST",
  BorrowingRateForPoolAscNullsLast = "borrowingRateForPool_ASC_NULLS_LAST",
  BorrowingRateForPoolDesc = "borrowingRateForPool_DESC",
  BorrowingRateForPoolDescNullsFirst = "borrowingRateForPool_DESC_NULLS_FIRST",
  BorrowingRateForPoolDescNullsLast = "borrowingRateForPool_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type BorrowingRateSnapshotWhereInput = {
  AND?: InputMaybe<Array<BorrowingRateSnapshotWhereInput>>;
  OR?: InputMaybe<Array<BorrowingRateSnapshotWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFactorPerSecondLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingRateForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingRateForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingRateForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingRateForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type BorrowingRateSnapshotsConnection = {
  __typename?: "BorrowingRateSnapshotsConnection";
  edges: Array<BorrowingRateSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimAction = {
  __typename?: "ClaimAction";
  account: Scalars["String"]["output"];
  amounts: Array<Scalars["String"]["output"]>;
  eventName: ClaimActionType;
  id: Scalars["String"]["output"];
  isLongOrders: Array<Scalars["Boolean"]["output"]>;
  marketAddresses: Array<Scalars["String"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  tokenAddresses: Array<Scalars["String"]["output"]>;
  tokenPrices: Array<Scalars["String"]["output"]>;
  transaction: Transaction;
};

export type ClaimActionEdge = {
  __typename?: "ClaimActionEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimAction;
};

export enum ClaimActionOrderByInput {
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export enum ClaimActionType {
  ClaimFunding = "ClaimFunding",
  ClaimPriceImpact = "ClaimPriceImpact",
  SettleFundingFeeCancelled = "SettleFundingFeeCancelled",
  SettleFundingFeeCreated = "SettleFundingFeeCreated",
  SettleFundingFeeExecuted = "SettleFundingFeeExecuted",
}

export type ClaimActionWhereInput = {
  AND?: InputMaybe<Array<ClaimActionWhereInput>>;
  OR?: InputMaybe<Array<ClaimActionWhereInput>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  amounts_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_eq?: InputMaybe<ClaimActionType>;
  eventName_in?: InputMaybe<Array<ClaimActionType>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_not_eq?: InputMaybe<ClaimActionType>;
  eventName_not_in?: InputMaybe<Array<ClaimActionType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLongOrders_containsAll?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_containsAny?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_containsNone?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isLongOrders_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  tokenAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenPrices_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenPrices_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ClaimActionsConnection = {
  __typename?: "ClaimActionsConnection";
  edges: Array<ClaimActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimRef = {
  __typename?: "ClaimRef";
  id: Scalars["String"]["output"];
};

export type ClaimRefEdge = {
  __typename?: "ClaimRefEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimRef;
};

export enum ClaimRefOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
}

export type ClaimRefWhereInput = {
  AND?: InputMaybe<Array<ClaimRefWhereInput>>;
  OR?: InputMaybe<Array<ClaimRefWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type ClaimRefsConnection = {
  __typename?: "ClaimRefsConnection";
  edges: Array<ClaimRefEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type ClaimableFundingFeeInfo = {
  __typename?: "ClaimableFundingFeeInfo";
  amounts: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  marketAddresses: Array<Scalars["String"]["output"]>;
  tokenAddresses: Array<Scalars["String"]["output"]>;
};

export type ClaimableFundingFeeInfoEdge = {
  __typename?: "ClaimableFundingFeeInfoEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimableFundingFeeInfo;
};

export enum ClaimableFundingFeeInfoOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
}

export type ClaimableFundingFeeInfoWhereInput = {
  AND?: InputMaybe<Array<ClaimableFundingFeeInfoWhereInput>>;
  OR?: InputMaybe<Array<ClaimableFundingFeeInfoWhereInput>>;
  amounts_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  amounts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenAddresses_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenAddresses_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ClaimableFundingFeeInfosConnection = {
  __typename?: "ClaimableFundingFeeInfosConnection";
  edges: Array<ClaimableFundingFeeInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type CollectedFeesInfo = {
  __typename?: "CollectedFeesInfo";
  address: Scalars["String"]["output"];
  borrowingFeeUsdForPool: Scalars["BigInt"]["output"];
  borrowingFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  cumulativeBorrowingFeeUsdForPool: Scalars["BigInt"]["output"];
  cumulativeBorrowingFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  cumulativeFeeUsdForPool: Scalars["BigInt"]["output"];
  cumulativeFeeUsdPerPoolValue: Scalars["BigInt"]["output"];
  entityType: EntityType;
  feeUsdForPool: Scalars["BigInt"]["output"];
  feeUsdPerPoolValue: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  period: Scalars["String"]["output"];
  timestampGroup: Scalars["Int"]["output"];
};

export type CollectedFeesInfoEdge = {
  __typename?: "CollectedFeesInfoEdge";
  cursor: Scalars["String"]["output"];
  node: CollectedFeesInfo;
};

export enum CollectedFeesInfoOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  BorrowingFeeUsdForPoolAsc = "borrowingFeeUsdForPool_ASC",
  BorrowingFeeUsdForPoolAscNullsFirst = "borrowingFeeUsdForPool_ASC_NULLS_FIRST",
  BorrowingFeeUsdForPoolAscNullsLast = "borrowingFeeUsdForPool_ASC_NULLS_LAST",
  BorrowingFeeUsdForPoolDesc = "borrowingFeeUsdForPool_DESC",
  BorrowingFeeUsdForPoolDescNullsFirst = "borrowingFeeUsdForPool_DESC_NULLS_FIRST",
  BorrowingFeeUsdForPoolDescNullsLast = "borrowingFeeUsdForPool_DESC_NULLS_LAST",
  BorrowingFeeUsdPerPoolValueAsc = "borrowingFeeUsdPerPoolValue_ASC",
  BorrowingFeeUsdPerPoolValueAscNullsFirst = "borrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  BorrowingFeeUsdPerPoolValueAscNullsLast = "borrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  BorrowingFeeUsdPerPoolValueDesc = "borrowingFeeUsdPerPoolValue_DESC",
  BorrowingFeeUsdPerPoolValueDescNullsFirst = "borrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  BorrowingFeeUsdPerPoolValueDescNullsLast = "borrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  CumulativeBorrowingFeeUsdForPoolAsc = "cumulativeBorrowingFeeUsdForPool_ASC",
  CumulativeBorrowingFeeUsdForPoolAscNullsFirst = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdForPoolAscNullsLast = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_LAST",
  CumulativeBorrowingFeeUsdForPoolDesc = "cumulativeBorrowingFeeUsdForPool_DESC",
  CumulativeBorrowingFeeUsdForPoolDescNullsFirst = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdForPoolDescNullsLast = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_LAST",
  CumulativeBorrowingFeeUsdPerPoolValueAsc = "cumulativeBorrowingFeeUsdPerPoolValue_ASC",
  CumulativeBorrowingFeeUsdPerPoolValueAscNullsFirst = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdPerPoolValueAscNullsLast = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  CumulativeBorrowingFeeUsdPerPoolValueDesc = "cumulativeBorrowingFeeUsdPerPoolValue_DESC",
  CumulativeBorrowingFeeUsdPerPoolValueDescNullsFirst = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  CumulativeBorrowingFeeUsdPerPoolValueDescNullsLast = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  CumulativeFeeUsdForPoolAsc = "cumulativeFeeUsdForPool_ASC",
  CumulativeFeeUsdForPoolAscNullsFirst = "cumulativeFeeUsdForPool_ASC_NULLS_FIRST",
  CumulativeFeeUsdForPoolAscNullsLast = "cumulativeFeeUsdForPool_ASC_NULLS_LAST",
  CumulativeFeeUsdForPoolDesc = "cumulativeFeeUsdForPool_DESC",
  CumulativeFeeUsdForPoolDescNullsFirst = "cumulativeFeeUsdForPool_DESC_NULLS_FIRST",
  CumulativeFeeUsdForPoolDescNullsLast = "cumulativeFeeUsdForPool_DESC_NULLS_LAST",
  CumulativeFeeUsdPerPoolValueAsc = "cumulativeFeeUsdPerPoolValue_ASC",
  CumulativeFeeUsdPerPoolValueAscNullsFirst = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  CumulativeFeeUsdPerPoolValueAscNullsLast = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_LAST",
  CumulativeFeeUsdPerPoolValueDesc = "cumulativeFeeUsdPerPoolValue_DESC",
  CumulativeFeeUsdPerPoolValueDescNullsFirst = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  CumulativeFeeUsdPerPoolValueDescNullsLast = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  FeeUsdForPoolAsc = "feeUsdForPool_ASC",
  FeeUsdForPoolAscNullsFirst = "feeUsdForPool_ASC_NULLS_FIRST",
  FeeUsdForPoolAscNullsLast = "feeUsdForPool_ASC_NULLS_LAST",
  FeeUsdForPoolDesc = "feeUsdForPool_DESC",
  FeeUsdForPoolDescNullsFirst = "feeUsdForPool_DESC_NULLS_FIRST",
  FeeUsdForPoolDescNullsLast = "feeUsdForPool_DESC_NULLS_LAST",
  FeeUsdPerPoolValueAsc = "feeUsdPerPoolValue_ASC",
  FeeUsdPerPoolValueAscNullsFirst = "feeUsdPerPoolValue_ASC_NULLS_FIRST",
  FeeUsdPerPoolValueAscNullsLast = "feeUsdPerPoolValue_ASC_NULLS_LAST",
  FeeUsdPerPoolValueDesc = "feeUsdPerPoolValue_DESC",
  FeeUsdPerPoolValueDescNullsFirst = "feeUsdPerPoolValue_DESC_NULLS_FIRST",
  FeeUsdPerPoolValueDescNullsLast = "feeUsdPerPoolValue_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  PeriodAsc = "period_ASC",
  PeriodAscNullsFirst = "period_ASC_NULLS_FIRST",
  PeriodAscNullsLast = "period_ASC_NULLS_LAST",
  PeriodDesc = "period_DESC",
  PeriodDescNullsFirst = "period_DESC_NULLS_FIRST",
  PeriodDescNullsLast = "period_DESC_NULLS_LAST",
  TimestampGroupAsc = "timestampGroup_ASC",
  TimestampGroupAscNullsFirst = "timestampGroup_ASC_NULLS_FIRST",
  TimestampGroupAscNullsLast = "timestampGroup_ASC_NULLS_LAST",
  TimestampGroupDesc = "timestampGroup_DESC",
  TimestampGroupDescNullsFirst = "timestampGroup_DESC_NULLS_FIRST",
  TimestampGroupDescNullsLast = "timestampGroup_DESC_NULLS_LAST",
}

export type CollectedFeesInfoWhereInput = {
  AND?: InputMaybe<Array<CollectedFeesInfoWhereInput>>;
  OR?: InputMaybe<Array<CollectedFeesInfoWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeBorrowingFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeBorrowingFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeFeeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeFeeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeFeeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeFeeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  feeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdPerPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdPerPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdPerPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdPerPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_contains?: InputMaybe<Scalars["String"]["input"]>;
  period_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  period_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_eq?: InputMaybe<Scalars["String"]["input"]>;
  period_gt?: InputMaybe<Scalars["String"]["input"]>;
  period_gte?: InputMaybe<Scalars["String"]["input"]>;
  period_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  period_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  period_lt?: InputMaybe<Scalars["String"]["input"]>;
  period_lte?: InputMaybe<Scalars["String"]["input"]>;
  period_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  period_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  period_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  period_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  period_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  period_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  timestampGroup_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestampGroup_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestampGroup_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestampGroup_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type CollectedFeesInfosConnection = {
  __typename?: "CollectedFeesInfosConnection";
  edges: Array<CollectedFeesInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type CumulativePoolValue = {
  __typename?: "CumulativePoolValue";
  address: Scalars["String"]["output"];
  cumulativePoolValueByTime: Scalars["BigInt"]["output"];
  cumulativeTime: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  lastPoolValue: Scalars["BigInt"]["output"];
  lastUpdateTimestamp: Scalars["Int"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
};

export type CumulativePoolValueEdge = {
  __typename?: "CumulativePoolValueEdge";
  cursor: Scalars["String"]["output"];
  node: CumulativePoolValue;
};

export enum CumulativePoolValueOrderByInput {
  AddressAsc = "address_ASC",
  AddressAscNullsFirst = "address_ASC_NULLS_FIRST",
  AddressAscNullsLast = "address_ASC_NULLS_LAST",
  AddressDesc = "address_DESC",
  AddressDescNullsFirst = "address_DESC_NULLS_FIRST",
  AddressDescNullsLast = "address_DESC_NULLS_LAST",
  CumulativePoolValueByTimeAsc = "cumulativePoolValueByTime_ASC",
  CumulativePoolValueByTimeAscNullsFirst = "cumulativePoolValueByTime_ASC_NULLS_FIRST",
  CumulativePoolValueByTimeAscNullsLast = "cumulativePoolValueByTime_ASC_NULLS_LAST",
  CumulativePoolValueByTimeDesc = "cumulativePoolValueByTime_DESC",
  CumulativePoolValueByTimeDescNullsFirst = "cumulativePoolValueByTime_DESC_NULLS_FIRST",
  CumulativePoolValueByTimeDescNullsLast = "cumulativePoolValueByTime_DESC_NULLS_LAST",
  CumulativeTimeAsc = "cumulativeTime_ASC",
  CumulativeTimeAscNullsFirst = "cumulativeTime_ASC_NULLS_FIRST",
  CumulativeTimeAscNullsLast = "cumulativeTime_ASC_NULLS_LAST",
  CumulativeTimeDesc = "cumulativeTime_DESC",
  CumulativeTimeDescNullsFirst = "cumulativeTime_DESC_NULLS_FIRST",
  CumulativeTimeDescNullsLast = "cumulativeTime_DESC_NULLS_LAST",
  EntityTypeAsc = "entityType_ASC",
  EntityTypeAscNullsFirst = "entityType_ASC_NULLS_FIRST",
  EntityTypeAscNullsLast = "entityType_ASC_NULLS_LAST",
  EntityTypeDesc = "entityType_DESC",
  EntityTypeDescNullsFirst = "entityType_DESC_NULLS_FIRST",
  EntityTypeDescNullsLast = "entityType_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  LastPoolValueAsc = "lastPoolValue_ASC",
  LastPoolValueAscNullsFirst = "lastPoolValue_ASC_NULLS_FIRST",
  LastPoolValueAscNullsLast = "lastPoolValue_ASC_NULLS_LAST",
  LastPoolValueDesc = "lastPoolValue_DESC",
  LastPoolValueDescNullsFirst = "lastPoolValue_DESC_NULLS_FIRST",
  LastPoolValueDescNullsLast = "lastPoolValue_DESC_NULLS_LAST",
  LastUpdateTimestampAsc = "lastUpdateTimestamp_ASC",
  LastUpdateTimestampAscNullsFirst = "lastUpdateTimestamp_ASC_NULLS_FIRST",
  LastUpdateTimestampAscNullsLast = "lastUpdateTimestamp_ASC_NULLS_LAST",
  LastUpdateTimestampDesc = "lastUpdateTimestamp_DESC",
  LastUpdateTimestampDescNullsFirst = "lastUpdateTimestamp_DESC_NULLS_FIRST",
  LastUpdateTimestampDescNullsLast = "lastUpdateTimestamp_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
}

export type CumulativePoolValueWhereInput = {
  AND?: InputMaybe<Array<CumulativePoolValueWhereInput>>;
  OR?: InputMaybe<Array<CumulativePoolValueWhereInput>>;
  address_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_gt?: InputMaybe<Scalars["String"]["input"]>;
  address_gte?: InputMaybe<Scalars["String"]["input"]>;
  address_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  address_lt?: InputMaybe<Scalars["String"]["input"]>;
  address_lte?: InputMaybe<Scalars["String"]["input"]>;
  address_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  address_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  address_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  address_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  address_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  address_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cumulativePoolValueByTime_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativePoolValueByTime_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativePoolValueByTime_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativePoolValueByTime_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeTime_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cumulativeTime_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cumulativeTime_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  cumulativeTime_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entityType_eq?: InputMaybe<EntityType>;
  entityType_in?: InputMaybe<Array<EntityType>>;
  entityType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entityType_not_eq?: InputMaybe<EntityType>;
  entityType_not_in?: InputMaybe<Array<EntityType>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastPoolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  lastPoolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastPoolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  lastPoolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  lastUpdateTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  lastUpdateTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  lastUpdateTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  lastUpdateTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type CumulativePoolValuesConnection = {
  __typename?: "CumulativePoolValuesConnection";
  edges: Array<CumulativePoolValueEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export enum EntityType {
  Glv = "Glv",
  Market = "Market",
}

export type Glv = {
  __typename?: "Glv";
  glvTokenAddress: Scalars["String"]["output"];
  gmComposition: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  longTokenAddress: Scalars["String"]["output"];
  markets: Array<Scalars["String"]["output"]>;
  poolValue: Scalars["BigInt"]["output"];
  shortTokenAddress: Scalars["String"]["output"];
};

export type GlvApr = {
  __typename?: "GlvApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  glvAddress: Scalars["String"]["output"];
};

export type GlvAprsWhereInputWhereInput = {
  glvAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
};

export type GlvEdge = {
  __typename?: "GlvEdge";
  cursor: Scalars["String"]["output"];
  node: Glv;
};

export enum GlvOrderByInput {
  GlvTokenAddressAsc = "glvTokenAddress_ASC",
  GlvTokenAddressAscNullsFirst = "glvTokenAddress_ASC_NULLS_FIRST",
  GlvTokenAddressAscNullsLast = "glvTokenAddress_ASC_NULLS_LAST",
  GlvTokenAddressDesc = "glvTokenAddress_DESC",
  GlvTokenAddressDescNullsFirst = "glvTokenAddress_DESC_NULLS_FIRST",
  GlvTokenAddressDescNullsLast = "glvTokenAddress_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LongTokenAddressAsc = "longTokenAddress_ASC",
  LongTokenAddressAscNullsFirst = "longTokenAddress_ASC_NULLS_FIRST",
  LongTokenAddressAscNullsLast = "longTokenAddress_ASC_NULLS_LAST",
  LongTokenAddressDesc = "longTokenAddress_DESC",
  LongTokenAddressDescNullsFirst = "longTokenAddress_DESC_NULLS_FIRST",
  LongTokenAddressDescNullsLast = "longTokenAddress_DESC_NULLS_LAST",
  PoolValueAsc = "poolValue_ASC",
  PoolValueAscNullsFirst = "poolValue_ASC_NULLS_FIRST",
  PoolValueAscNullsLast = "poolValue_ASC_NULLS_LAST",
  PoolValueDesc = "poolValue_DESC",
  PoolValueDescNullsFirst = "poolValue_DESC_NULLS_FIRST",
  PoolValueDescNullsLast = "poolValue_DESC_NULLS_LAST",
  ShortTokenAddressAsc = "shortTokenAddress_ASC",
  ShortTokenAddressAscNullsFirst = "shortTokenAddress_ASC_NULLS_FIRST",
  ShortTokenAddressAscNullsLast = "shortTokenAddress_ASC_NULLS_LAST",
  ShortTokenAddressDesc = "shortTokenAddress_DESC",
  ShortTokenAddressDescNullsFirst = "shortTokenAddress_DESC_NULLS_FIRST",
  ShortTokenAddressDescNullsLast = "shortTokenAddress_DESC_NULLS_LAST",
}

export type GlvWhereInput = {
  AND?: InputMaybe<Array<GlvWhereInput>>;
  OR?: InputMaybe<Array<GlvWhereInput>>;
  glvTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  glvTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  glvTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  glvTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  glvTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  gmComposition_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  gmComposition_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  markets_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  markets_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type GlvsConnection = {
  __typename?: "GlvsConnection";
  edges: Array<GlvEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Market = {
  __typename?: "Market";
  id: Scalars["String"]["output"];
  indexToken: Scalars["String"]["output"];
  longToken: Scalars["String"]["output"];
  shortToken: Scalars["String"]["output"];
};

export type MarketApr = {
  __typename?: "MarketApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  marketAddress: Scalars["String"]["output"];
};

export type MarketAprsWhereInput = {
  marketAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
};

export type MarketEdge = {
  __typename?: "MarketEdge";
  cursor: Scalars["String"]["output"];
  node: Market;
};

export type MarketInfo = {
  __typename?: "MarketInfo";
  aboveOptimalUsageBorrowingFactorLong: Scalars["BigInt"]["output"];
  aboveOptimalUsageBorrowingFactorShort: Scalars["BigInt"]["output"];
  baseBorrowingFactorLong: Scalars["BigInt"]["output"];
  baseBorrowingFactorShort: Scalars["BigInt"]["output"];
  borrowingExponentFactorLong: Scalars["BigInt"]["output"];
  borrowingExponentFactorShort: Scalars["BigInt"]["output"];
  borrowingFactorLong: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondForLongs: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondForShorts: Scalars["BigInt"]["output"];
  borrowingFactorShort: Scalars["BigInt"]["output"];
  fundingDecreaseFactorPerSecond: Scalars["BigInt"]["output"];
  fundingExponentFactor: Scalars["BigInt"]["output"];
  fundingFactor: Scalars["BigInt"]["output"];
  fundingFactorPerSecond: Scalars["BigInt"]["output"];
  fundingIncreaseFactorPerSecond: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  indexTokenAddress: Scalars["String"]["output"];
  isDisabled: Scalars["Boolean"]["output"];
  longOpenInterestInTokens: Scalars["BigInt"]["output"];
  longOpenInterestInTokensUsingLongToken: Scalars["BigInt"]["output"];
  longOpenInterestInTokensUsingShortToken: Scalars["BigInt"]["output"];
  longOpenInterestUsd: Scalars["BigInt"]["output"];
  longOpenInterestUsingLongToken: Scalars["BigInt"]["output"];
  longOpenInterestUsingShortToken: Scalars["BigInt"]["output"];
  longPoolAmount: Scalars["BigInt"]["output"];
  longPoolAmountAdjustment: Scalars["BigInt"]["output"];
  longTokenAddress: Scalars["String"]["output"];
  longsPayShorts: Scalars["Boolean"]["output"];
  marketTokenAddress: Scalars["String"]["output"];
  marketTokenSupply: Scalars["BigInt"]["output"];
  maxFundingFactorPerSecond: Scalars["BigInt"]["output"];
  maxLongPoolAmount: Scalars["BigInt"]["output"];
  maxLongPoolUsdForDeposit: Scalars["BigInt"]["output"];
  maxOpenInterestLong: Scalars["BigInt"]["output"];
  maxOpenInterestShort: Scalars["BigInt"]["output"];
  maxPnlFactorForTradersLong: Scalars["BigInt"]["output"];
  maxPnlFactorForTradersShort: Scalars["BigInt"]["output"];
  maxPositionImpactFactorForLiquidations: Scalars["BigInt"]["output"];
  maxPositionImpactFactorNegative: Scalars["BigInt"]["output"];
  maxPositionImpactFactorPositive: Scalars["BigInt"]["output"];
  maxShortPoolAmount: Scalars["BigInt"]["output"];
  maxShortPoolUsdForDeposit: Scalars["BigInt"]["output"];
  minCollateralFactor: Scalars["BigInt"]["output"];
  minCollateralFactorForOpenInterestLong: Scalars["BigInt"]["output"];
  minCollateralFactorForOpenInterestShort: Scalars["BigInt"]["output"];
  minFundingFactorPerSecond: Scalars["BigInt"]["output"];
  minPositionImpactPoolAmount: Scalars["BigInt"]["output"];
  openInterestReserveFactorLong: Scalars["BigInt"]["output"];
  openInterestReserveFactorShort: Scalars["BigInt"]["output"];
  optimalUsageFactorLong: Scalars["BigInt"]["output"];
  optimalUsageFactorShort: Scalars["BigInt"]["output"];
  poolValue: Scalars["BigInt"]["output"];
  poolValueMax: Scalars["BigInt"]["output"];
  poolValueMin: Scalars["BigInt"]["output"];
  positionFeeFactorForNegativeImpact: Scalars["BigInt"]["output"];
  positionFeeFactorForPositiveImpact: Scalars["BigInt"]["output"];
  positionImpactExponentFactor: Scalars["BigInt"]["output"];
  positionImpactFactorNegative: Scalars["BigInt"]["output"];
  positionImpactFactorPositive: Scalars["BigInt"]["output"];
  positionImpactPoolAmount: Scalars["BigInt"]["output"];
  positionImpactPoolDistributionRate: Scalars["BigInt"]["output"];
  reserveFactorLong: Scalars["BigInt"]["output"];
  reserveFactorShort: Scalars["BigInt"]["output"];
  shortOpenInterestInTokens: Scalars["BigInt"]["output"];
  shortOpenInterestInTokensUsingLongToken: Scalars["BigInt"]["output"];
  shortOpenInterestInTokensUsingShortToken: Scalars["BigInt"]["output"];
  shortOpenInterestUsd: Scalars["BigInt"]["output"];
  shortOpenInterestUsingLongToken: Scalars["BigInt"]["output"];
  shortOpenInterestUsingShortToken: Scalars["BigInt"]["output"];
  shortPoolAmount: Scalars["BigInt"]["output"];
  shortPoolAmountAdjustment: Scalars["BigInt"]["output"];
  shortTokenAddress: Scalars["String"]["output"];
  swapFeeFactorForNegativeImpact: Scalars["BigInt"]["output"];
  swapFeeFactorForPositiveImpact: Scalars["BigInt"]["output"];
  swapImpactExponentFactor: Scalars["BigInt"]["output"];
  swapImpactFactorNegative: Scalars["BigInt"]["output"];
  swapImpactFactorPositive: Scalars["BigInt"]["output"];
  swapImpactPoolAmountLong: Scalars["BigInt"]["output"];
  swapImpactPoolAmountShort: Scalars["BigInt"]["output"];
  thresholdForDecreaseFunding: Scalars["BigInt"]["output"];
  thresholdForStableFunding: Scalars["BigInt"]["output"];
  totalBorrowingFees: Scalars["BigInt"]["output"];
  virtualIndexTokenId: Scalars["String"]["output"];
  virtualInventoryForPositions: Scalars["BigInt"]["output"];
  virtualLongTokenId: Scalars["String"]["output"];
  virtualMarketId: Scalars["String"]["output"];
  virtualPoolAmountForLongToken: Scalars["BigInt"]["output"];
  virtualPoolAmountForShortToken: Scalars["BigInt"]["output"];
  virtualShortTokenId: Scalars["String"]["output"];
};

export type MarketInfoEdge = {
  __typename?: "MarketInfoEdge";
  cursor: Scalars["String"]["output"];
  node: MarketInfo;
};

export enum MarketInfoOrderByInput {
  AboveOptimalUsageBorrowingFactorLongAsc = "aboveOptimalUsageBorrowingFactorLong_ASC",
  AboveOptimalUsageBorrowingFactorLongAscNullsFirst = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorLongAscNullsLast = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorLongDesc = "aboveOptimalUsageBorrowingFactorLong_DESC",
  AboveOptimalUsageBorrowingFactorLongDescNullsFirst = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorLongDescNullsLast = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorShortAsc = "aboveOptimalUsageBorrowingFactorShort_ASC",
  AboveOptimalUsageBorrowingFactorShortAscNullsFirst = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorShortAscNullsLast = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_LAST",
  AboveOptimalUsageBorrowingFactorShortDesc = "aboveOptimalUsageBorrowingFactorShort_DESC",
  AboveOptimalUsageBorrowingFactorShortDescNullsFirst = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_FIRST",
  AboveOptimalUsageBorrowingFactorShortDescNullsLast = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_LAST",
  BaseBorrowingFactorLongAsc = "baseBorrowingFactorLong_ASC",
  BaseBorrowingFactorLongAscNullsFirst = "baseBorrowingFactorLong_ASC_NULLS_FIRST",
  BaseBorrowingFactorLongAscNullsLast = "baseBorrowingFactorLong_ASC_NULLS_LAST",
  BaseBorrowingFactorLongDesc = "baseBorrowingFactorLong_DESC",
  BaseBorrowingFactorLongDescNullsFirst = "baseBorrowingFactorLong_DESC_NULLS_FIRST",
  BaseBorrowingFactorLongDescNullsLast = "baseBorrowingFactorLong_DESC_NULLS_LAST",
  BaseBorrowingFactorShortAsc = "baseBorrowingFactorShort_ASC",
  BaseBorrowingFactorShortAscNullsFirst = "baseBorrowingFactorShort_ASC_NULLS_FIRST",
  BaseBorrowingFactorShortAscNullsLast = "baseBorrowingFactorShort_ASC_NULLS_LAST",
  BaseBorrowingFactorShortDesc = "baseBorrowingFactorShort_DESC",
  BaseBorrowingFactorShortDescNullsFirst = "baseBorrowingFactorShort_DESC_NULLS_FIRST",
  BaseBorrowingFactorShortDescNullsLast = "baseBorrowingFactorShort_DESC_NULLS_LAST",
  BorrowingExponentFactorLongAsc = "borrowingExponentFactorLong_ASC",
  BorrowingExponentFactorLongAscNullsFirst = "borrowingExponentFactorLong_ASC_NULLS_FIRST",
  BorrowingExponentFactorLongAscNullsLast = "borrowingExponentFactorLong_ASC_NULLS_LAST",
  BorrowingExponentFactorLongDesc = "borrowingExponentFactorLong_DESC",
  BorrowingExponentFactorLongDescNullsFirst = "borrowingExponentFactorLong_DESC_NULLS_FIRST",
  BorrowingExponentFactorLongDescNullsLast = "borrowingExponentFactorLong_DESC_NULLS_LAST",
  BorrowingExponentFactorShortAsc = "borrowingExponentFactorShort_ASC",
  BorrowingExponentFactorShortAscNullsFirst = "borrowingExponentFactorShort_ASC_NULLS_FIRST",
  BorrowingExponentFactorShortAscNullsLast = "borrowingExponentFactorShort_ASC_NULLS_LAST",
  BorrowingExponentFactorShortDesc = "borrowingExponentFactorShort_DESC",
  BorrowingExponentFactorShortDescNullsFirst = "borrowingExponentFactorShort_DESC_NULLS_FIRST",
  BorrowingExponentFactorShortDescNullsLast = "borrowingExponentFactorShort_DESC_NULLS_LAST",
  BorrowingFactorLongAsc = "borrowingFactorLong_ASC",
  BorrowingFactorLongAscNullsFirst = "borrowingFactorLong_ASC_NULLS_FIRST",
  BorrowingFactorLongAscNullsLast = "borrowingFactorLong_ASC_NULLS_LAST",
  BorrowingFactorLongDesc = "borrowingFactorLong_DESC",
  BorrowingFactorLongDescNullsFirst = "borrowingFactorLong_DESC_NULLS_FIRST",
  BorrowingFactorLongDescNullsLast = "borrowingFactorLong_DESC_NULLS_LAST",
  BorrowingFactorPerSecondForLongsAsc = "borrowingFactorPerSecondForLongs_ASC",
  BorrowingFactorPerSecondForLongsAscNullsFirst = "borrowingFactorPerSecondForLongs_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondForLongsAscNullsLast = "borrowingFactorPerSecondForLongs_ASC_NULLS_LAST",
  BorrowingFactorPerSecondForLongsDesc = "borrowingFactorPerSecondForLongs_DESC",
  BorrowingFactorPerSecondForLongsDescNullsFirst = "borrowingFactorPerSecondForLongs_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondForLongsDescNullsLast = "borrowingFactorPerSecondForLongs_DESC_NULLS_LAST",
  BorrowingFactorPerSecondForShortsAsc = "borrowingFactorPerSecondForShorts_ASC",
  BorrowingFactorPerSecondForShortsAscNullsFirst = "borrowingFactorPerSecondForShorts_ASC_NULLS_FIRST",
  BorrowingFactorPerSecondForShortsAscNullsLast = "borrowingFactorPerSecondForShorts_ASC_NULLS_LAST",
  BorrowingFactorPerSecondForShortsDesc = "borrowingFactorPerSecondForShorts_DESC",
  BorrowingFactorPerSecondForShortsDescNullsFirst = "borrowingFactorPerSecondForShorts_DESC_NULLS_FIRST",
  BorrowingFactorPerSecondForShortsDescNullsLast = "borrowingFactorPerSecondForShorts_DESC_NULLS_LAST",
  BorrowingFactorShortAsc = "borrowingFactorShort_ASC",
  BorrowingFactorShortAscNullsFirst = "borrowingFactorShort_ASC_NULLS_FIRST",
  BorrowingFactorShortAscNullsLast = "borrowingFactorShort_ASC_NULLS_LAST",
  BorrowingFactorShortDesc = "borrowingFactorShort_DESC",
  BorrowingFactorShortDescNullsFirst = "borrowingFactorShort_DESC_NULLS_FIRST",
  BorrowingFactorShortDescNullsLast = "borrowingFactorShort_DESC_NULLS_LAST",
  FundingDecreaseFactorPerSecondAsc = "fundingDecreaseFactorPerSecond_ASC",
  FundingDecreaseFactorPerSecondAscNullsFirst = "fundingDecreaseFactorPerSecond_ASC_NULLS_FIRST",
  FundingDecreaseFactorPerSecondAscNullsLast = "fundingDecreaseFactorPerSecond_ASC_NULLS_LAST",
  FundingDecreaseFactorPerSecondDesc = "fundingDecreaseFactorPerSecond_DESC",
  FundingDecreaseFactorPerSecondDescNullsFirst = "fundingDecreaseFactorPerSecond_DESC_NULLS_FIRST",
  FundingDecreaseFactorPerSecondDescNullsLast = "fundingDecreaseFactorPerSecond_DESC_NULLS_LAST",
  FundingExponentFactorAsc = "fundingExponentFactor_ASC",
  FundingExponentFactorAscNullsFirst = "fundingExponentFactor_ASC_NULLS_FIRST",
  FundingExponentFactorAscNullsLast = "fundingExponentFactor_ASC_NULLS_LAST",
  FundingExponentFactorDesc = "fundingExponentFactor_DESC",
  FundingExponentFactorDescNullsFirst = "fundingExponentFactor_DESC_NULLS_FIRST",
  FundingExponentFactorDescNullsLast = "fundingExponentFactor_DESC_NULLS_LAST",
  FundingFactorPerSecondAsc = "fundingFactorPerSecond_ASC",
  FundingFactorPerSecondAscNullsFirst = "fundingFactorPerSecond_ASC_NULLS_FIRST",
  FundingFactorPerSecondAscNullsLast = "fundingFactorPerSecond_ASC_NULLS_LAST",
  FundingFactorPerSecondDesc = "fundingFactorPerSecond_DESC",
  FundingFactorPerSecondDescNullsFirst = "fundingFactorPerSecond_DESC_NULLS_FIRST",
  FundingFactorPerSecondDescNullsLast = "fundingFactorPerSecond_DESC_NULLS_LAST",
  FundingFactorAsc = "fundingFactor_ASC",
  FundingFactorAscNullsFirst = "fundingFactor_ASC_NULLS_FIRST",
  FundingFactorAscNullsLast = "fundingFactor_ASC_NULLS_LAST",
  FundingFactorDesc = "fundingFactor_DESC",
  FundingFactorDescNullsFirst = "fundingFactor_DESC_NULLS_FIRST",
  FundingFactorDescNullsLast = "fundingFactor_DESC_NULLS_LAST",
  FundingIncreaseFactorPerSecondAsc = "fundingIncreaseFactorPerSecond_ASC",
  FundingIncreaseFactorPerSecondAscNullsFirst = "fundingIncreaseFactorPerSecond_ASC_NULLS_FIRST",
  FundingIncreaseFactorPerSecondAscNullsLast = "fundingIncreaseFactorPerSecond_ASC_NULLS_LAST",
  FundingIncreaseFactorPerSecondDesc = "fundingIncreaseFactorPerSecond_DESC",
  FundingIncreaseFactorPerSecondDescNullsFirst = "fundingIncreaseFactorPerSecond_DESC_NULLS_FIRST",
  FundingIncreaseFactorPerSecondDescNullsLast = "fundingIncreaseFactorPerSecond_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenAddressAsc = "indexTokenAddress_ASC",
  IndexTokenAddressAscNullsFirst = "indexTokenAddress_ASC_NULLS_FIRST",
  IndexTokenAddressAscNullsLast = "indexTokenAddress_ASC_NULLS_LAST",
  IndexTokenAddressDesc = "indexTokenAddress_DESC",
  IndexTokenAddressDescNullsFirst = "indexTokenAddress_DESC_NULLS_FIRST",
  IndexTokenAddressDescNullsLast = "indexTokenAddress_DESC_NULLS_LAST",
  IsDisabledAsc = "isDisabled_ASC",
  IsDisabledAscNullsFirst = "isDisabled_ASC_NULLS_FIRST",
  IsDisabledAscNullsLast = "isDisabled_ASC_NULLS_LAST",
  IsDisabledDesc = "isDisabled_DESC",
  IsDisabledDescNullsFirst = "isDisabled_DESC_NULLS_FIRST",
  IsDisabledDescNullsLast = "isDisabled_DESC_NULLS_LAST",
  LongOpenInterestInTokensUsingLongTokenAsc = "longOpenInterestInTokensUsingLongToken_ASC",
  LongOpenInterestInTokensUsingLongTokenAscNullsFirst = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  LongOpenInterestInTokensUsingLongTokenAscNullsLast = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  LongOpenInterestInTokensUsingLongTokenDesc = "longOpenInterestInTokensUsingLongToken_DESC",
  LongOpenInterestInTokensUsingLongTokenDescNullsFirst = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  LongOpenInterestInTokensUsingLongTokenDescNullsLast = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  LongOpenInterestInTokensUsingShortTokenAsc = "longOpenInterestInTokensUsingShortToken_ASC",
  LongOpenInterestInTokensUsingShortTokenAscNullsFirst = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  LongOpenInterestInTokensUsingShortTokenAscNullsLast = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  LongOpenInterestInTokensUsingShortTokenDesc = "longOpenInterestInTokensUsingShortToken_DESC",
  LongOpenInterestInTokensUsingShortTokenDescNullsFirst = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  LongOpenInterestInTokensUsingShortTokenDescNullsLast = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  LongOpenInterestInTokensAsc = "longOpenInterestInTokens_ASC",
  LongOpenInterestInTokensAscNullsFirst = "longOpenInterestInTokens_ASC_NULLS_FIRST",
  LongOpenInterestInTokensAscNullsLast = "longOpenInterestInTokens_ASC_NULLS_LAST",
  LongOpenInterestInTokensDesc = "longOpenInterestInTokens_DESC",
  LongOpenInterestInTokensDescNullsFirst = "longOpenInterestInTokens_DESC_NULLS_FIRST",
  LongOpenInterestInTokensDescNullsLast = "longOpenInterestInTokens_DESC_NULLS_LAST",
  LongOpenInterestUsdAsc = "longOpenInterestUsd_ASC",
  LongOpenInterestUsdAscNullsFirst = "longOpenInterestUsd_ASC_NULLS_FIRST",
  LongOpenInterestUsdAscNullsLast = "longOpenInterestUsd_ASC_NULLS_LAST",
  LongOpenInterestUsdDesc = "longOpenInterestUsd_DESC",
  LongOpenInterestUsdDescNullsFirst = "longOpenInterestUsd_DESC_NULLS_FIRST",
  LongOpenInterestUsdDescNullsLast = "longOpenInterestUsd_DESC_NULLS_LAST",
  LongOpenInterestUsingLongTokenAsc = "longOpenInterestUsingLongToken_ASC",
  LongOpenInterestUsingLongTokenAscNullsFirst = "longOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  LongOpenInterestUsingLongTokenAscNullsLast = "longOpenInterestUsingLongToken_ASC_NULLS_LAST",
  LongOpenInterestUsingLongTokenDesc = "longOpenInterestUsingLongToken_DESC",
  LongOpenInterestUsingLongTokenDescNullsFirst = "longOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  LongOpenInterestUsingLongTokenDescNullsLast = "longOpenInterestUsingLongToken_DESC_NULLS_LAST",
  LongOpenInterestUsingShortTokenAsc = "longOpenInterestUsingShortToken_ASC",
  LongOpenInterestUsingShortTokenAscNullsFirst = "longOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  LongOpenInterestUsingShortTokenAscNullsLast = "longOpenInterestUsingShortToken_ASC_NULLS_LAST",
  LongOpenInterestUsingShortTokenDesc = "longOpenInterestUsingShortToken_DESC",
  LongOpenInterestUsingShortTokenDescNullsFirst = "longOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  LongOpenInterestUsingShortTokenDescNullsLast = "longOpenInterestUsingShortToken_DESC_NULLS_LAST",
  LongPoolAmountAdjustmentAsc = "longPoolAmountAdjustment_ASC",
  LongPoolAmountAdjustmentAscNullsFirst = "longPoolAmountAdjustment_ASC_NULLS_FIRST",
  LongPoolAmountAdjustmentAscNullsLast = "longPoolAmountAdjustment_ASC_NULLS_LAST",
  LongPoolAmountAdjustmentDesc = "longPoolAmountAdjustment_DESC",
  LongPoolAmountAdjustmentDescNullsFirst = "longPoolAmountAdjustment_DESC_NULLS_FIRST",
  LongPoolAmountAdjustmentDescNullsLast = "longPoolAmountAdjustment_DESC_NULLS_LAST",
  LongPoolAmountAsc = "longPoolAmount_ASC",
  LongPoolAmountAscNullsFirst = "longPoolAmount_ASC_NULLS_FIRST",
  LongPoolAmountAscNullsLast = "longPoolAmount_ASC_NULLS_LAST",
  LongPoolAmountDesc = "longPoolAmount_DESC",
  LongPoolAmountDescNullsFirst = "longPoolAmount_DESC_NULLS_FIRST",
  LongPoolAmountDescNullsLast = "longPoolAmount_DESC_NULLS_LAST",
  LongTokenAddressAsc = "longTokenAddress_ASC",
  LongTokenAddressAscNullsFirst = "longTokenAddress_ASC_NULLS_FIRST",
  LongTokenAddressAscNullsLast = "longTokenAddress_ASC_NULLS_LAST",
  LongTokenAddressDesc = "longTokenAddress_DESC",
  LongTokenAddressDescNullsFirst = "longTokenAddress_DESC_NULLS_FIRST",
  LongTokenAddressDescNullsLast = "longTokenAddress_DESC_NULLS_LAST",
  LongsPayShortsAsc = "longsPayShorts_ASC",
  LongsPayShortsAscNullsFirst = "longsPayShorts_ASC_NULLS_FIRST",
  LongsPayShortsAscNullsLast = "longsPayShorts_ASC_NULLS_LAST",
  LongsPayShortsDesc = "longsPayShorts_DESC",
  LongsPayShortsDescNullsFirst = "longsPayShorts_DESC_NULLS_FIRST",
  LongsPayShortsDescNullsLast = "longsPayShorts_DESC_NULLS_LAST",
  MarketTokenAddressAsc = "marketTokenAddress_ASC",
  MarketTokenAddressAscNullsFirst = "marketTokenAddress_ASC_NULLS_FIRST",
  MarketTokenAddressAscNullsLast = "marketTokenAddress_ASC_NULLS_LAST",
  MarketTokenAddressDesc = "marketTokenAddress_DESC",
  MarketTokenAddressDescNullsFirst = "marketTokenAddress_DESC_NULLS_FIRST",
  MarketTokenAddressDescNullsLast = "marketTokenAddress_DESC_NULLS_LAST",
  MarketTokenSupplyAsc = "marketTokenSupply_ASC",
  MarketTokenSupplyAscNullsFirst = "marketTokenSupply_ASC_NULLS_FIRST",
  MarketTokenSupplyAscNullsLast = "marketTokenSupply_ASC_NULLS_LAST",
  MarketTokenSupplyDesc = "marketTokenSupply_DESC",
  MarketTokenSupplyDescNullsFirst = "marketTokenSupply_DESC_NULLS_FIRST",
  MarketTokenSupplyDescNullsLast = "marketTokenSupply_DESC_NULLS_LAST",
  MaxFundingFactorPerSecondAsc = "maxFundingFactorPerSecond_ASC",
  MaxFundingFactorPerSecondAscNullsFirst = "maxFundingFactorPerSecond_ASC_NULLS_FIRST",
  MaxFundingFactorPerSecondAscNullsLast = "maxFundingFactorPerSecond_ASC_NULLS_LAST",
  MaxFundingFactorPerSecondDesc = "maxFundingFactorPerSecond_DESC",
  MaxFundingFactorPerSecondDescNullsFirst = "maxFundingFactorPerSecond_DESC_NULLS_FIRST",
  MaxFundingFactorPerSecondDescNullsLast = "maxFundingFactorPerSecond_DESC_NULLS_LAST",
  MaxLongPoolAmountAsc = "maxLongPoolAmount_ASC",
  MaxLongPoolAmountAscNullsFirst = "maxLongPoolAmount_ASC_NULLS_FIRST",
  MaxLongPoolAmountAscNullsLast = "maxLongPoolAmount_ASC_NULLS_LAST",
  MaxLongPoolAmountDesc = "maxLongPoolAmount_DESC",
  MaxLongPoolAmountDescNullsFirst = "maxLongPoolAmount_DESC_NULLS_FIRST",
  MaxLongPoolAmountDescNullsLast = "maxLongPoolAmount_DESC_NULLS_LAST",
  MaxLongPoolUsdForDepositAsc = "maxLongPoolUsdForDeposit_ASC",
  MaxLongPoolUsdForDepositAscNullsFirst = "maxLongPoolUsdForDeposit_ASC_NULLS_FIRST",
  MaxLongPoolUsdForDepositAscNullsLast = "maxLongPoolUsdForDeposit_ASC_NULLS_LAST",
  MaxLongPoolUsdForDepositDesc = "maxLongPoolUsdForDeposit_DESC",
  MaxLongPoolUsdForDepositDescNullsFirst = "maxLongPoolUsdForDeposit_DESC_NULLS_FIRST",
  MaxLongPoolUsdForDepositDescNullsLast = "maxLongPoolUsdForDeposit_DESC_NULLS_LAST",
  MaxOpenInterestLongAsc = "maxOpenInterestLong_ASC",
  MaxOpenInterestLongAscNullsFirst = "maxOpenInterestLong_ASC_NULLS_FIRST",
  MaxOpenInterestLongAscNullsLast = "maxOpenInterestLong_ASC_NULLS_LAST",
  MaxOpenInterestLongDesc = "maxOpenInterestLong_DESC",
  MaxOpenInterestLongDescNullsFirst = "maxOpenInterestLong_DESC_NULLS_FIRST",
  MaxOpenInterestLongDescNullsLast = "maxOpenInterestLong_DESC_NULLS_LAST",
  MaxOpenInterestShortAsc = "maxOpenInterestShort_ASC",
  MaxOpenInterestShortAscNullsFirst = "maxOpenInterestShort_ASC_NULLS_FIRST",
  MaxOpenInterestShortAscNullsLast = "maxOpenInterestShort_ASC_NULLS_LAST",
  MaxOpenInterestShortDesc = "maxOpenInterestShort_DESC",
  MaxOpenInterestShortDescNullsFirst = "maxOpenInterestShort_DESC_NULLS_FIRST",
  MaxOpenInterestShortDescNullsLast = "maxOpenInterestShort_DESC_NULLS_LAST",
  MaxPnlFactorForTradersLongAsc = "maxPnlFactorForTradersLong_ASC",
  MaxPnlFactorForTradersLongAscNullsFirst = "maxPnlFactorForTradersLong_ASC_NULLS_FIRST",
  MaxPnlFactorForTradersLongAscNullsLast = "maxPnlFactorForTradersLong_ASC_NULLS_LAST",
  MaxPnlFactorForTradersLongDesc = "maxPnlFactorForTradersLong_DESC",
  MaxPnlFactorForTradersLongDescNullsFirst = "maxPnlFactorForTradersLong_DESC_NULLS_FIRST",
  MaxPnlFactorForTradersLongDescNullsLast = "maxPnlFactorForTradersLong_DESC_NULLS_LAST",
  MaxPnlFactorForTradersShortAsc = "maxPnlFactorForTradersShort_ASC",
  MaxPnlFactorForTradersShortAscNullsFirst = "maxPnlFactorForTradersShort_ASC_NULLS_FIRST",
  MaxPnlFactorForTradersShortAscNullsLast = "maxPnlFactorForTradersShort_ASC_NULLS_LAST",
  MaxPnlFactorForTradersShortDesc = "maxPnlFactorForTradersShort_DESC",
  MaxPnlFactorForTradersShortDescNullsFirst = "maxPnlFactorForTradersShort_DESC_NULLS_FIRST",
  MaxPnlFactorForTradersShortDescNullsLast = "maxPnlFactorForTradersShort_DESC_NULLS_LAST",
  MaxPositionImpactFactorForLiquidationsAsc = "maxPositionImpactFactorForLiquidations_ASC",
  MaxPositionImpactFactorForLiquidationsAscNullsFirst = "maxPositionImpactFactorForLiquidations_ASC_NULLS_FIRST",
  MaxPositionImpactFactorForLiquidationsAscNullsLast = "maxPositionImpactFactorForLiquidations_ASC_NULLS_LAST",
  MaxPositionImpactFactorForLiquidationsDesc = "maxPositionImpactFactorForLiquidations_DESC",
  MaxPositionImpactFactorForLiquidationsDescNullsFirst = "maxPositionImpactFactorForLiquidations_DESC_NULLS_FIRST",
  MaxPositionImpactFactorForLiquidationsDescNullsLast = "maxPositionImpactFactorForLiquidations_DESC_NULLS_LAST",
  MaxPositionImpactFactorNegativeAsc = "maxPositionImpactFactorNegative_ASC",
  MaxPositionImpactFactorNegativeAscNullsFirst = "maxPositionImpactFactorNegative_ASC_NULLS_FIRST",
  MaxPositionImpactFactorNegativeAscNullsLast = "maxPositionImpactFactorNegative_ASC_NULLS_LAST",
  MaxPositionImpactFactorNegativeDesc = "maxPositionImpactFactorNegative_DESC",
  MaxPositionImpactFactorNegativeDescNullsFirst = "maxPositionImpactFactorNegative_DESC_NULLS_FIRST",
  MaxPositionImpactFactorNegativeDescNullsLast = "maxPositionImpactFactorNegative_DESC_NULLS_LAST",
  MaxPositionImpactFactorPositiveAsc = "maxPositionImpactFactorPositive_ASC",
  MaxPositionImpactFactorPositiveAscNullsFirst = "maxPositionImpactFactorPositive_ASC_NULLS_FIRST",
  MaxPositionImpactFactorPositiveAscNullsLast = "maxPositionImpactFactorPositive_ASC_NULLS_LAST",
  MaxPositionImpactFactorPositiveDesc = "maxPositionImpactFactorPositive_DESC",
  MaxPositionImpactFactorPositiveDescNullsFirst = "maxPositionImpactFactorPositive_DESC_NULLS_FIRST",
  MaxPositionImpactFactorPositiveDescNullsLast = "maxPositionImpactFactorPositive_DESC_NULLS_LAST",
  MaxShortPoolAmountAsc = "maxShortPoolAmount_ASC",
  MaxShortPoolAmountAscNullsFirst = "maxShortPoolAmount_ASC_NULLS_FIRST",
  MaxShortPoolAmountAscNullsLast = "maxShortPoolAmount_ASC_NULLS_LAST",
  MaxShortPoolAmountDesc = "maxShortPoolAmount_DESC",
  MaxShortPoolAmountDescNullsFirst = "maxShortPoolAmount_DESC_NULLS_FIRST",
  MaxShortPoolAmountDescNullsLast = "maxShortPoolAmount_DESC_NULLS_LAST",
  MaxShortPoolUsdForDepositAsc = "maxShortPoolUsdForDeposit_ASC",
  MaxShortPoolUsdForDepositAscNullsFirst = "maxShortPoolUsdForDeposit_ASC_NULLS_FIRST",
  MaxShortPoolUsdForDepositAscNullsLast = "maxShortPoolUsdForDeposit_ASC_NULLS_LAST",
  MaxShortPoolUsdForDepositDesc = "maxShortPoolUsdForDeposit_DESC",
  MaxShortPoolUsdForDepositDescNullsFirst = "maxShortPoolUsdForDeposit_DESC_NULLS_FIRST",
  MaxShortPoolUsdForDepositDescNullsLast = "maxShortPoolUsdForDeposit_DESC_NULLS_LAST",
  MinCollateralFactorForOpenInterestLongAsc = "minCollateralFactorForOpenInterestLong_ASC",
  MinCollateralFactorForOpenInterestLongAscNullsFirst = "minCollateralFactorForOpenInterestLong_ASC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestLongAscNullsLast = "minCollateralFactorForOpenInterestLong_ASC_NULLS_LAST",
  MinCollateralFactorForOpenInterestLongDesc = "minCollateralFactorForOpenInterestLong_DESC",
  MinCollateralFactorForOpenInterestLongDescNullsFirst = "minCollateralFactorForOpenInterestLong_DESC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestLongDescNullsLast = "minCollateralFactorForOpenInterestLong_DESC_NULLS_LAST",
  MinCollateralFactorForOpenInterestShortAsc = "minCollateralFactorForOpenInterestShort_ASC",
  MinCollateralFactorForOpenInterestShortAscNullsFirst = "minCollateralFactorForOpenInterestShort_ASC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestShortAscNullsLast = "minCollateralFactorForOpenInterestShort_ASC_NULLS_LAST",
  MinCollateralFactorForOpenInterestShortDesc = "minCollateralFactorForOpenInterestShort_DESC",
  MinCollateralFactorForOpenInterestShortDescNullsFirst = "minCollateralFactorForOpenInterestShort_DESC_NULLS_FIRST",
  MinCollateralFactorForOpenInterestShortDescNullsLast = "minCollateralFactorForOpenInterestShort_DESC_NULLS_LAST",
  MinCollateralFactorAsc = "minCollateralFactor_ASC",
  MinCollateralFactorAscNullsFirst = "minCollateralFactor_ASC_NULLS_FIRST",
  MinCollateralFactorAscNullsLast = "minCollateralFactor_ASC_NULLS_LAST",
  MinCollateralFactorDesc = "minCollateralFactor_DESC",
  MinCollateralFactorDescNullsFirst = "minCollateralFactor_DESC_NULLS_FIRST",
  MinCollateralFactorDescNullsLast = "minCollateralFactor_DESC_NULLS_LAST",
  MinFundingFactorPerSecondAsc = "minFundingFactorPerSecond_ASC",
  MinFundingFactorPerSecondAscNullsFirst = "minFundingFactorPerSecond_ASC_NULLS_FIRST",
  MinFundingFactorPerSecondAscNullsLast = "minFundingFactorPerSecond_ASC_NULLS_LAST",
  MinFundingFactorPerSecondDesc = "minFundingFactorPerSecond_DESC",
  MinFundingFactorPerSecondDescNullsFirst = "minFundingFactorPerSecond_DESC_NULLS_FIRST",
  MinFundingFactorPerSecondDescNullsLast = "minFundingFactorPerSecond_DESC_NULLS_LAST",
  MinPositionImpactPoolAmountAsc = "minPositionImpactPoolAmount_ASC",
  MinPositionImpactPoolAmountAscNullsFirst = "minPositionImpactPoolAmount_ASC_NULLS_FIRST",
  MinPositionImpactPoolAmountAscNullsLast = "minPositionImpactPoolAmount_ASC_NULLS_LAST",
  MinPositionImpactPoolAmountDesc = "minPositionImpactPoolAmount_DESC",
  MinPositionImpactPoolAmountDescNullsFirst = "minPositionImpactPoolAmount_DESC_NULLS_FIRST",
  MinPositionImpactPoolAmountDescNullsLast = "minPositionImpactPoolAmount_DESC_NULLS_LAST",
  OpenInterestReserveFactorLongAsc = "openInterestReserveFactorLong_ASC",
  OpenInterestReserveFactorLongAscNullsFirst = "openInterestReserveFactorLong_ASC_NULLS_FIRST",
  OpenInterestReserveFactorLongAscNullsLast = "openInterestReserveFactorLong_ASC_NULLS_LAST",
  OpenInterestReserveFactorLongDesc = "openInterestReserveFactorLong_DESC",
  OpenInterestReserveFactorLongDescNullsFirst = "openInterestReserveFactorLong_DESC_NULLS_FIRST",
  OpenInterestReserveFactorLongDescNullsLast = "openInterestReserveFactorLong_DESC_NULLS_LAST",
  OpenInterestReserveFactorShortAsc = "openInterestReserveFactorShort_ASC",
  OpenInterestReserveFactorShortAscNullsFirst = "openInterestReserveFactorShort_ASC_NULLS_FIRST",
  OpenInterestReserveFactorShortAscNullsLast = "openInterestReserveFactorShort_ASC_NULLS_LAST",
  OpenInterestReserveFactorShortDesc = "openInterestReserveFactorShort_DESC",
  OpenInterestReserveFactorShortDescNullsFirst = "openInterestReserveFactorShort_DESC_NULLS_FIRST",
  OpenInterestReserveFactorShortDescNullsLast = "openInterestReserveFactorShort_DESC_NULLS_LAST",
  OptimalUsageFactorLongAsc = "optimalUsageFactorLong_ASC",
  OptimalUsageFactorLongAscNullsFirst = "optimalUsageFactorLong_ASC_NULLS_FIRST",
  OptimalUsageFactorLongAscNullsLast = "optimalUsageFactorLong_ASC_NULLS_LAST",
  OptimalUsageFactorLongDesc = "optimalUsageFactorLong_DESC",
  OptimalUsageFactorLongDescNullsFirst = "optimalUsageFactorLong_DESC_NULLS_FIRST",
  OptimalUsageFactorLongDescNullsLast = "optimalUsageFactorLong_DESC_NULLS_LAST",
  OptimalUsageFactorShortAsc = "optimalUsageFactorShort_ASC",
  OptimalUsageFactorShortAscNullsFirst = "optimalUsageFactorShort_ASC_NULLS_FIRST",
  OptimalUsageFactorShortAscNullsLast = "optimalUsageFactorShort_ASC_NULLS_LAST",
  OptimalUsageFactorShortDesc = "optimalUsageFactorShort_DESC",
  OptimalUsageFactorShortDescNullsFirst = "optimalUsageFactorShort_DESC_NULLS_FIRST",
  OptimalUsageFactorShortDescNullsLast = "optimalUsageFactorShort_DESC_NULLS_LAST",
  PoolValueMaxAsc = "poolValueMax_ASC",
  PoolValueMaxAscNullsFirst = "poolValueMax_ASC_NULLS_FIRST",
  PoolValueMaxAscNullsLast = "poolValueMax_ASC_NULLS_LAST",
  PoolValueMaxDesc = "poolValueMax_DESC",
  PoolValueMaxDescNullsFirst = "poolValueMax_DESC_NULLS_FIRST",
  PoolValueMaxDescNullsLast = "poolValueMax_DESC_NULLS_LAST",
  PoolValueMinAsc = "poolValueMin_ASC",
  PoolValueMinAscNullsFirst = "poolValueMin_ASC_NULLS_FIRST",
  PoolValueMinAscNullsLast = "poolValueMin_ASC_NULLS_LAST",
  PoolValueMinDesc = "poolValueMin_DESC",
  PoolValueMinDescNullsFirst = "poolValueMin_DESC_NULLS_FIRST",
  PoolValueMinDescNullsLast = "poolValueMin_DESC_NULLS_LAST",
  PoolValueAsc = "poolValue_ASC",
  PoolValueAscNullsFirst = "poolValue_ASC_NULLS_FIRST",
  PoolValueAscNullsLast = "poolValue_ASC_NULLS_LAST",
  PoolValueDesc = "poolValue_DESC",
  PoolValueDescNullsFirst = "poolValue_DESC_NULLS_FIRST",
  PoolValueDescNullsLast = "poolValue_DESC_NULLS_LAST",
  PositionFeeFactorForNegativeImpactAsc = "positionFeeFactorForNegativeImpact_ASC",
  PositionFeeFactorForNegativeImpactAscNullsFirst = "positionFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  PositionFeeFactorForNegativeImpactAscNullsLast = "positionFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  PositionFeeFactorForNegativeImpactDesc = "positionFeeFactorForNegativeImpact_DESC",
  PositionFeeFactorForNegativeImpactDescNullsFirst = "positionFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  PositionFeeFactorForNegativeImpactDescNullsLast = "positionFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  PositionFeeFactorForPositiveImpactAsc = "positionFeeFactorForPositiveImpact_ASC",
  PositionFeeFactorForPositiveImpactAscNullsFirst = "positionFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  PositionFeeFactorForPositiveImpactAscNullsLast = "positionFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  PositionFeeFactorForPositiveImpactDesc = "positionFeeFactorForPositiveImpact_DESC",
  PositionFeeFactorForPositiveImpactDescNullsFirst = "positionFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  PositionFeeFactorForPositiveImpactDescNullsLast = "positionFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  PositionImpactExponentFactorAsc = "positionImpactExponentFactor_ASC",
  PositionImpactExponentFactorAscNullsFirst = "positionImpactExponentFactor_ASC_NULLS_FIRST",
  PositionImpactExponentFactorAscNullsLast = "positionImpactExponentFactor_ASC_NULLS_LAST",
  PositionImpactExponentFactorDesc = "positionImpactExponentFactor_DESC",
  PositionImpactExponentFactorDescNullsFirst = "positionImpactExponentFactor_DESC_NULLS_FIRST",
  PositionImpactExponentFactorDescNullsLast = "positionImpactExponentFactor_DESC_NULLS_LAST",
  PositionImpactFactorNegativeAsc = "positionImpactFactorNegative_ASC",
  PositionImpactFactorNegativeAscNullsFirst = "positionImpactFactorNegative_ASC_NULLS_FIRST",
  PositionImpactFactorNegativeAscNullsLast = "positionImpactFactorNegative_ASC_NULLS_LAST",
  PositionImpactFactorNegativeDesc = "positionImpactFactorNegative_DESC",
  PositionImpactFactorNegativeDescNullsFirst = "positionImpactFactorNegative_DESC_NULLS_FIRST",
  PositionImpactFactorNegativeDescNullsLast = "positionImpactFactorNegative_DESC_NULLS_LAST",
  PositionImpactFactorPositiveAsc = "positionImpactFactorPositive_ASC",
  PositionImpactFactorPositiveAscNullsFirst = "positionImpactFactorPositive_ASC_NULLS_FIRST",
  PositionImpactFactorPositiveAscNullsLast = "positionImpactFactorPositive_ASC_NULLS_LAST",
  PositionImpactFactorPositiveDesc = "positionImpactFactorPositive_DESC",
  PositionImpactFactorPositiveDescNullsFirst = "positionImpactFactorPositive_DESC_NULLS_FIRST",
  PositionImpactFactorPositiveDescNullsLast = "positionImpactFactorPositive_DESC_NULLS_LAST",
  PositionImpactPoolAmountAsc = "positionImpactPoolAmount_ASC",
  PositionImpactPoolAmountAscNullsFirst = "positionImpactPoolAmount_ASC_NULLS_FIRST",
  PositionImpactPoolAmountAscNullsLast = "positionImpactPoolAmount_ASC_NULLS_LAST",
  PositionImpactPoolAmountDesc = "positionImpactPoolAmount_DESC",
  PositionImpactPoolAmountDescNullsFirst = "positionImpactPoolAmount_DESC_NULLS_FIRST",
  PositionImpactPoolAmountDescNullsLast = "positionImpactPoolAmount_DESC_NULLS_LAST",
  PositionImpactPoolDistributionRateAsc = "positionImpactPoolDistributionRate_ASC",
  PositionImpactPoolDistributionRateAscNullsFirst = "positionImpactPoolDistributionRate_ASC_NULLS_FIRST",
  PositionImpactPoolDistributionRateAscNullsLast = "positionImpactPoolDistributionRate_ASC_NULLS_LAST",
  PositionImpactPoolDistributionRateDesc = "positionImpactPoolDistributionRate_DESC",
  PositionImpactPoolDistributionRateDescNullsFirst = "positionImpactPoolDistributionRate_DESC_NULLS_FIRST",
  PositionImpactPoolDistributionRateDescNullsLast = "positionImpactPoolDistributionRate_DESC_NULLS_LAST",
  ReserveFactorLongAsc = "reserveFactorLong_ASC",
  ReserveFactorLongAscNullsFirst = "reserveFactorLong_ASC_NULLS_FIRST",
  ReserveFactorLongAscNullsLast = "reserveFactorLong_ASC_NULLS_LAST",
  ReserveFactorLongDesc = "reserveFactorLong_DESC",
  ReserveFactorLongDescNullsFirst = "reserveFactorLong_DESC_NULLS_FIRST",
  ReserveFactorLongDescNullsLast = "reserveFactorLong_DESC_NULLS_LAST",
  ReserveFactorShortAsc = "reserveFactorShort_ASC",
  ReserveFactorShortAscNullsFirst = "reserveFactorShort_ASC_NULLS_FIRST",
  ReserveFactorShortAscNullsLast = "reserveFactorShort_ASC_NULLS_LAST",
  ReserveFactorShortDesc = "reserveFactorShort_DESC",
  ReserveFactorShortDescNullsFirst = "reserveFactorShort_DESC_NULLS_FIRST",
  ReserveFactorShortDescNullsLast = "reserveFactorShort_DESC_NULLS_LAST",
  ShortOpenInterestInTokensUsingLongTokenAsc = "shortOpenInterestInTokensUsingLongToken_ASC",
  ShortOpenInterestInTokensUsingLongTokenAscNullsFirst = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingLongTokenAscNullsLast = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  ShortOpenInterestInTokensUsingLongTokenDesc = "shortOpenInterestInTokensUsingLongToken_DESC",
  ShortOpenInterestInTokensUsingLongTokenDescNullsFirst = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingLongTokenDescNullsLast = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  ShortOpenInterestInTokensUsingShortTokenAsc = "shortOpenInterestInTokensUsingShortToken_ASC",
  ShortOpenInterestInTokensUsingShortTokenAscNullsFirst = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingShortTokenAscNullsLast = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  ShortOpenInterestInTokensUsingShortTokenDesc = "shortOpenInterestInTokensUsingShortToken_DESC",
  ShortOpenInterestInTokensUsingShortTokenDescNullsFirst = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensUsingShortTokenDescNullsLast = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  ShortOpenInterestInTokensAsc = "shortOpenInterestInTokens_ASC",
  ShortOpenInterestInTokensAscNullsFirst = "shortOpenInterestInTokens_ASC_NULLS_FIRST",
  ShortOpenInterestInTokensAscNullsLast = "shortOpenInterestInTokens_ASC_NULLS_LAST",
  ShortOpenInterestInTokensDesc = "shortOpenInterestInTokens_DESC",
  ShortOpenInterestInTokensDescNullsFirst = "shortOpenInterestInTokens_DESC_NULLS_FIRST",
  ShortOpenInterestInTokensDescNullsLast = "shortOpenInterestInTokens_DESC_NULLS_LAST",
  ShortOpenInterestUsdAsc = "shortOpenInterestUsd_ASC",
  ShortOpenInterestUsdAscNullsFirst = "shortOpenInterestUsd_ASC_NULLS_FIRST",
  ShortOpenInterestUsdAscNullsLast = "shortOpenInterestUsd_ASC_NULLS_LAST",
  ShortOpenInterestUsdDesc = "shortOpenInterestUsd_DESC",
  ShortOpenInterestUsdDescNullsFirst = "shortOpenInterestUsd_DESC_NULLS_FIRST",
  ShortOpenInterestUsdDescNullsLast = "shortOpenInterestUsd_DESC_NULLS_LAST",
  ShortOpenInterestUsingLongTokenAsc = "shortOpenInterestUsingLongToken_ASC",
  ShortOpenInterestUsingLongTokenAscNullsFirst = "shortOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  ShortOpenInterestUsingLongTokenAscNullsLast = "shortOpenInterestUsingLongToken_ASC_NULLS_LAST",
  ShortOpenInterestUsingLongTokenDesc = "shortOpenInterestUsingLongToken_DESC",
  ShortOpenInterestUsingLongTokenDescNullsFirst = "shortOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  ShortOpenInterestUsingLongTokenDescNullsLast = "shortOpenInterestUsingLongToken_DESC_NULLS_LAST",
  ShortOpenInterestUsingShortTokenAsc = "shortOpenInterestUsingShortToken_ASC",
  ShortOpenInterestUsingShortTokenAscNullsFirst = "shortOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  ShortOpenInterestUsingShortTokenAscNullsLast = "shortOpenInterestUsingShortToken_ASC_NULLS_LAST",
  ShortOpenInterestUsingShortTokenDesc = "shortOpenInterestUsingShortToken_DESC",
  ShortOpenInterestUsingShortTokenDescNullsFirst = "shortOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  ShortOpenInterestUsingShortTokenDescNullsLast = "shortOpenInterestUsingShortToken_DESC_NULLS_LAST",
  ShortPoolAmountAdjustmentAsc = "shortPoolAmountAdjustment_ASC",
  ShortPoolAmountAdjustmentAscNullsFirst = "shortPoolAmountAdjustment_ASC_NULLS_FIRST",
  ShortPoolAmountAdjustmentAscNullsLast = "shortPoolAmountAdjustment_ASC_NULLS_LAST",
  ShortPoolAmountAdjustmentDesc = "shortPoolAmountAdjustment_DESC",
  ShortPoolAmountAdjustmentDescNullsFirst = "shortPoolAmountAdjustment_DESC_NULLS_FIRST",
  ShortPoolAmountAdjustmentDescNullsLast = "shortPoolAmountAdjustment_DESC_NULLS_LAST",
  ShortPoolAmountAsc = "shortPoolAmount_ASC",
  ShortPoolAmountAscNullsFirst = "shortPoolAmount_ASC_NULLS_FIRST",
  ShortPoolAmountAscNullsLast = "shortPoolAmount_ASC_NULLS_LAST",
  ShortPoolAmountDesc = "shortPoolAmount_DESC",
  ShortPoolAmountDescNullsFirst = "shortPoolAmount_DESC_NULLS_FIRST",
  ShortPoolAmountDescNullsLast = "shortPoolAmount_DESC_NULLS_LAST",
  ShortTokenAddressAsc = "shortTokenAddress_ASC",
  ShortTokenAddressAscNullsFirst = "shortTokenAddress_ASC_NULLS_FIRST",
  ShortTokenAddressAscNullsLast = "shortTokenAddress_ASC_NULLS_LAST",
  ShortTokenAddressDesc = "shortTokenAddress_DESC",
  ShortTokenAddressDescNullsFirst = "shortTokenAddress_DESC_NULLS_FIRST",
  ShortTokenAddressDescNullsLast = "shortTokenAddress_DESC_NULLS_LAST",
  SwapFeeFactorForNegativeImpactAsc = "swapFeeFactorForNegativeImpact_ASC",
  SwapFeeFactorForNegativeImpactAscNullsFirst = "swapFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  SwapFeeFactorForNegativeImpactAscNullsLast = "swapFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  SwapFeeFactorForNegativeImpactDesc = "swapFeeFactorForNegativeImpact_DESC",
  SwapFeeFactorForNegativeImpactDescNullsFirst = "swapFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  SwapFeeFactorForNegativeImpactDescNullsLast = "swapFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  SwapFeeFactorForPositiveImpactAsc = "swapFeeFactorForPositiveImpact_ASC",
  SwapFeeFactorForPositiveImpactAscNullsFirst = "swapFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  SwapFeeFactorForPositiveImpactAscNullsLast = "swapFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  SwapFeeFactorForPositiveImpactDesc = "swapFeeFactorForPositiveImpact_DESC",
  SwapFeeFactorForPositiveImpactDescNullsFirst = "swapFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  SwapFeeFactorForPositiveImpactDescNullsLast = "swapFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  SwapImpactExponentFactorAsc = "swapImpactExponentFactor_ASC",
  SwapImpactExponentFactorAscNullsFirst = "swapImpactExponentFactor_ASC_NULLS_FIRST",
  SwapImpactExponentFactorAscNullsLast = "swapImpactExponentFactor_ASC_NULLS_LAST",
  SwapImpactExponentFactorDesc = "swapImpactExponentFactor_DESC",
  SwapImpactExponentFactorDescNullsFirst = "swapImpactExponentFactor_DESC_NULLS_FIRST",
  SwapImpactExponentFactorDescNullsLast = "swapImpactExponentFactor_DESC_NULLS_LAST",
  SwapImpactFactorNegativeAsc = "swapImpactFactorNegative_ASC",
  SwapImpactFactorNegativeAscNullsFirst = "swapImpactFactorNegative_ASC_NULLS_FIRST",
  SwapImpactFactorNegativeAscNullsLast = "swapImpactFactorNegative_ASC_NULLS_LAST",
  SwapImpactFactorNegativeDesc = "swapImpactFactorNegative_DESC",
  SwapImpactFactorNegativeDescNullsFirst = "swapImpactFactorNegative_DESC_NULLS_FIRST",
  SwapImpactFactorNegativeDescNullsLast = "swapImpactFactorNegative_DESC_NULLS_LAST",
  SwapImpactFactorPositiveAsc = "swapImpactFactorPositive_ASC",
  SwapImpactFactorPositiveAscNullsFirst = "swapImpactFactorPositive_ASC_NULLS_FIRST",
  SwapImpactFactorPositiveAscNullsLast = "swapImpactFactorPositive_ASC_NULLS_LAST",
  SwapImpactFactorPositiveDesc = "swapImpactFactorPositive_DESC",
  SwapImpactFactorPositiveDescNullsFirst = "swapImpactFactorPositive_DESC_NULLS_FIRST",
  SwapImpactFactorPositiveDescNullsLast = "swapImpactFactorPositive_DESC_NULLS_LAST",
  SwapImpactPoolAmountLongAsc = "swapImpactPoolAmountLong_ASC",
  SwapImpactPoolAmountLongAscNullsFirst = "swapImpactPoolAmountLong_ASC_NULLS_FIRST",
  SwapImpactPoolAmountLongAscNullsLast = "swapImpactPoolAmountLong_ASC_NULLS_LAST",
  SwapImpactPoolAmountLongDesc = "swapImpactPoolAmountLong_DESC",
  SwapImpactPoolAmountLongDescNullsFirst = "swapImpactPoolAmountLong_DESC_NULLS_FIRST",
  SwapImpactPoolAmountLongDescNullsLast = "swapImpactPoolAmountLong_DESC_NULLS_LAST",
  SwapImpactPoolAmountShortAsc = "swapImpactPoolAmountShort_ASC",
  SwapImpactPoolAmountShortAscNullsFirst = "swapImpactPoolAmountShort_ASC_NULLS_FIRST",
  SwapImpactPoolAmountShortAscNullsLast = "swapImpactPoolAmountShort_ASC_NULLS_LAST",
  SwapImpactPoolAmountShortDesc = "swapImpactPoolAmountShort_DESC",
  SwapImpactPoolAmountShortDescNullsFirst = "swapImpactPoolAmountShort_DESC_NULLS_FIRST",
  SwapImpactPoolAmountShortDescNullsLast = "swapImpactPoolAmountShort_DESC_NULLS_LAST",
  ThresholdForDecreaseFundingAsc = "thresholdForDecreaseFunding_ASC",
  ThresholdForDecreaseFundingAscNullsFirst = "thresholdForDecreaseFunding_ASC_NULLS_FIRST",
  ThresholdForDecreaseFundingAscNullsLast = "thresholdForDecreaseFunding_ASC_NULLS_LAST",
  ThresholdForDecreaseFundingDesc = "thresholdForDecreaseFunding_DESC",
  ThresholdForDecreaseFundingDescNullsFirst = "thresholdForDecreaseFunding_DESC_NULLS_FIRST",
  ThresholdForDecreaseFundingDescNullsLast = "thresholdForDecreaseFunding_DESC_NULLS_LAST",
  ThresholdForStableFundingAsc = "thresholdForStableFunding_ASC",
  ThresholdForStableFundingAscNullsFirst = "thresholdForStableFunding_ASC_NULLS_FIRST",
  ThresholdForStableFundingAscNullsLast = "thresholdForStableFunding_ASC_NULLS_LAST",
  ThresholdForStableFundingDesc = "thresholdForStableFunding_DESC",
  ThresholdForStableFundingDescNullsFirst = "thresholdForStableFunding_DESC_NULLS_FIRST",
  ThresholdForStableFundingDescNullsLast = "thresholdForStableFunding_DESC_NULLS_LAST",
  TotalBorrowingFeesAsc = "totalBorrowingFees_ASC",
  TotalBorrowingFeesAscNullsFirst = "totalBorrowingFees_ASC_NULLS_FIRST",
  TotalBorrowingFeesAscNullsLast = "totalBorrowingFees_ASC_NULLS_LAST",
  TotalBorrowingFeesDesc = "totalBorrowingFees_DESC",
  TotalBorrowingFeesDescNullsFirst = "totalBorrowingFees_DESC_NULLS_FIRST",
  TotalBorrowingFeesDescNullsLast = "totalBorrowingFees_DESC_NULLS_LAST",
  VirtualIndexTokenIdAsc = "virtualIndexTokenId_ASC",
  VirtualIndexTokenIdAscNullsFirst = "virtualIndexTokenId_ASC_NULLS_FIRST",
  VirtualIndexTokenIdAscNullsLast = "virtualIndexTokenId_ASC_NULLS_LAST",
  VirtualIndexTokenIdDesc = "virtualIndexTokenId_DESC",
  VirtualIndexTokenIdDescNullsFirst = "virtualIndexTokenId_DESC_NULLS_FIRST",
  VirtualIndexTokenIdDescNullsLast = "virtualIndexTokenId_DESC_NULLS_LAST",
  VirtualInventoryForPositionsAsc = "virtualInventoryForPositions_ASC",
  VirtualInventoryForPositionsAscNullsFirst = "virtualInventoryForPositions_ASC_NULLS_FIRST",
  VirtualInventoryForPositionsAscNullsLast = "virtualInventoryForPositions_ASC_NULLS_LAST",
  VirtualInventoryForPositionsDesc = "virtualInventoryForPositions_DESC",
  VirtualInventoryForPositionsDescNullsFirst = "virtualInventoryForPositions_DESC_NULLS_FIRST",
  VirtualInventoryForPositionsDescNullsLast = "virtualInventoryForPositions_DESC_NULLS_LAST",
  VirtualLongTokenIdAsc = "virtualLongTokenId_ASC",
  VirtualLongTokenIdAscNullsFirst = "virtualLongTokenId_ASC_NULLS_FIRST",
  VirtualLongTokenIdAscNullsLast = "virtualLongTokenId_ASC_NULLS_LAST",
  VirtualLongTokenIdDesc = "virtualLongTokenId_DESC",
  VirtualLongTokenIdDescNullsFirst = "virtualLongTokenId_DESC_NULLS_FIRST",
  VirtualLongTokenIdDescNullsLast = "virtualLongTokenId_DESC_NULLS_LAST",
  VirtualMarketIdAsc = "virtualMarketId_ASC",
  VirtualMarketIdAscNullsFirst = "virtualMarketId_ASC_NULLS_FIRST",
  VirtualMarketIdAscNullsLast = "virtualMarketId_ASC_NULLS_LAST",
  VirtualMarketIdDesc = "virtualMarketId_DESC",
  VirtualMarketIdDescNullsFirst = "virtualMarketId_DESC_NULLS_FIRST",
  VirtualMarketIdDescNullsLast = "virtualMarketId_DESC_NULLS_LAST",
  VirtualPoolAmountForLongTokenAsc = "virtualPoolAmountForLongToken_ASC",
  VirtualPoolAmountForLongTokenAscNullsFirst = "virtualPoolAmountForLongToken_ASC_NULLS_FIRST",
  VirtualPoolAmountForLongTokenAscNullsLast = "virtualPoolAmountForLongToken_ASC_NULLS_LAST",
  VirtualPoolAmountForLongTokenDesc = "virtualPoolAmountForLongToken_DESC",
  VirtualPoolAmountForLongTokenDescNullsFirst = "virtualPoolAmountForLongToken_DESC_NULLS_FIRST",
  VirtualPoolAmountForLongTokenDescNullsLast = "virtualPoolAmountForLongToken_DESC_NULLS_LAST",
  VirtualPoolAmountForShortTokenAsc = "virtualPoolAmountForShortToken_ASC",
  VirtualPoolAmountForShortTokenAscNullsFirst = "virtualPoolAmountForShortToken_ASC_NULLS_FIRST",
  VirtualPoolAmountForShortTokenAscNullsLast = "virtualPoolAmountForShortToken_ASC_NULLS_LAST",
  VirtualPoolAmountForShortTokenDesc = "virtualPoolAmountForShortToken_DESC",
  VirtualPoolAmountForShortTokenDescNullsFirst = "virtualPoolAmountForShortToken_DESC_NULLS_FIRST",
  VirtualPoolAmountForShortTokenDescNullsLast = "virtualPoolAmountForShortToken_DESC_NULLS_LAST",
  VirtualShortTokenIdAsc = "virtualShortTokenId_ASC",
  VirtualShortTokenIdAscNullsFirst = "virtualShortTokenId_ASC_NULLS_FIRST",
  VirtualShortTokenIdAscNullsLast = "virtualShortTokenId_ASC_NULLS_LAST",
  VirtualShortTokenIdDesc = "virtualShortTokenId_DESC",
  VirtualShortTokenIdDescNullsFirst = "virtualShortTokenId_DESC_NULLS_FIRST",
  VirtualShortTokenIdDescNullsLast = "virtualShortTokenId_DESC_NULLS_LAST",
}

export type MarketInfoWhereInput = {
  AND?: InputMaybe<Array<MarketInfoWhereInput>>;
  OR?: InputMaybe<Array<MarketInfoWhereInput>>;
  aboveOptimalUsageBorrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  aboveOptimalUsageBorrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  aboveOptimalUsageBorrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  baseBorrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  baseBorrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  baseBorrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  baseBorrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingExponentFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingExponentFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingExponentFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingExponentFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForLongs_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForLongs_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondForLongs_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForLongs_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForShorts_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorPerSecondForShorts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorPerSecondForShorts_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorPerSecondForShorts_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingDecreaseFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingDecreaseFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingDecreaseFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingDecreaseFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingIncreaseFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingIncreaseFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingIncreaseFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingIncreaseFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isDisabled_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDisabled_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isDisabled_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokensUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokensUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokensUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longOpenInterestUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longOpenInterestUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longOpenInterestUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmountAdjustment_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmountAdjustment_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longPoolAmountAdjustment_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmountAdjustment_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  longPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  longTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longsPayShorts_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  longsPayShorts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longsPayShorts_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketTokenSupply_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketTokenSupply_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketTokenSupply_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  marketTokenSupply_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxFundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxFundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxFundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxFundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxLongPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolUsdForDeposit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxLongPoolUsdForDeposit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxLongPoolUsdForDeposit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxLongPoolUsdForDeposit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxOpenInterestLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxOpenInterestShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxOpenInterestShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxOpenInterestShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPnlFactorForTradersLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPnlFactorForTradersShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPnlFactorForTradersShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPnlFactorForTradersShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorForLiquidations_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorForLiquidations_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorForLiquidations_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorForLiquidations_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPositionImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPositionImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPositionImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxShortPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolUsdForDeposit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxShortPoolUsdForDeposit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxShortPoolUsdForDeposit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxShortPoolUsdForDeposit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactorForOpenInterestLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactorForOpenInterestShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactorForOpenInterestShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactorForOpenInterestShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minCollateralFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minCollateralFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minCollateralFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minFundingFactorPerSecond_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minFundingFactorPerSecond_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minFundingFactorPerSecond_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minFundingFactorPerSecond_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPositionImpactPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPositionImpactPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minPositionImpactPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPositionImpactPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openInterestReserveFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openInterestReserveFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openInterestReserveFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  openInterestReserveFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  optimalUsageFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  optimalUsageFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  optimalUsageFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  optimalUsageFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValueMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValueMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValueMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValueMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  poolValue_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  poolValue_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  poolValue_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForNegativeImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForNegativeImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeFactorForNegativeImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForNegativeImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForPositiveImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeFactorForPositiveImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeFactorForPositiveImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeFactorForPositiveImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolDistributionRate_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionImpactPoolDistributionRate_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionImpactPoolDistributionRate_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionImpactPoolDistributionRate_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reserveFactorLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reserveFactorShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reserveFactorShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  reserveFactorShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokensUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokensUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsingLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortOpenInterestUsingShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortOpenInterestUsingShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortOpenInterestUsingShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmountAdjustment_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmountAdjustment_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortPoolAmountAdjustment_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmountAdjustment_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortPoolAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortPoolAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  shortPoolAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  shortTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  swapFeeFactorForNegativeImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForNegativeImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapFeeFactorForNegativeImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForNegativeImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForPositiveImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapFeeFactorForPositiveImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapFeeFactorForPositiveImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapFeeFactorForPositiveImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactExponentFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactExponentFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactExponentFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactExponentFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorNegative_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorNegative_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactFactorNegative_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorNegative_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorPositive_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactFactorPositive_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactFactorPositive_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactFactorPositive_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountLong_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactPoolAmountLong_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountLong_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountShort_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapImpactPoolAmountShort_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  swapImpactPoolAmountShort_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  swapImpactPoolAmountShort_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForDecreaseFunding_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForDecreaseFunding_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  thresholdForDecreaseFunding_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForDecreaseFunding_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForStableFunding_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  thresholdForStableFunding_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  thresholdForStableFunding_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  thresholdForStableFunding_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalBorrowingFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalBorrowingFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalBorrowingFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalBorrowingFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualIndexTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualIndexTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualIndexTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualIndexTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualIndexTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualInventoryForPositions_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualInventoryForPositions_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualInventoryForPositions_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualInventoryForPositions_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualLongTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualLongTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualLongTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualLongTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualLongTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualMarketId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualMarketId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualMarketId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualMarketId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualPoolAmountForLongToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForLongToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualPoolAmountForLongToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForLongToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForShortToken_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualPoolAmountForShortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualPoolAmountForShortToken_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  virtualPoolAmountForShortToken_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  virtualShortTokenId_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_gt?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_gte?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualShortTokenId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  virtualShortTokenId_lt?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_lte?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  virtualShortTokenId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  virtualShortTokenId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type MarketInfosConnection = {
  __typename?: "MarketInfosConnection";
  edges: Array<MarketInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export enum MarketOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenAsc = "indexToken_ASC",
  IndexTokenAscNullsFirst = "indexToken_ASC_NULLS_FIRST",
  IndexTokenAscNullsLast = "indexToken_ASC_NULLS_LAST",
  IndexTokenDesc = "indexToken_DESC",
  IndexTokenDescNullsFirst = "indexToken_DESC_NULLS_FIRST",
  IndexTokenDescNullsLast = "indexToken_DESC_NULLS_LAST",
  LongTokenAsc = "longToken_ASC",
  LongTokenAscNullsFirst = "longToken_ASC_NULLS_FIRST",
  LongTokenAscNullsLast = "longToken_ASC_NULLS_LAST",
  LongTokenDesc = "longToken_DESC",
  LongTokenDescNullsFirst = "longToken_DESC_NULLS_FIRST",
  LongTokenDescNullsLast = "longToken_DESC_NULLS_LAST",
  ShortTokenAsc = "shortToken_ASC",
  ShortTokenAscNullsFirst = "shortToken_ASC_NULLS_FIRST",
  ShortTokenAscNullsLast = "shortToken_ASC_NULLS_LAST",
  ShortTokenDesc = "shortToken_DESC",
  ShortTokenDescNullsFirst = "shortToken_DESC_NULLS_FIRST",
  ShortTokenDescNullsLast = "shortToken_DESC_NULLS_LAST",
}

export type MarketWhereInput = {
  AND?: InputMaybe<Array<MarketWhereInput>>;
  OR?: InputMaybe<Array<MarketWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  indexToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  longToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  longToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  longToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  longToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  longToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  longToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  longToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  longToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  longToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shortToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  shortToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shortToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type MarketsConnection = {
  __typename?: "MarketsConnection";
  edges: Array<MarketEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type OnChainSetting = {
  __typename?: "OnChainSetting";
  id: Scalars["String"]["output"];
  key: Scalars["String"]["output"];
  type: OnChainSettingType;
  value: Scalars["String"]["output"];
};

export type OnChainSettingEdge = {
  __typename?: "OnChainSettingEdge";
  cursor: Scalars["String"]["output"];
  node: OnChainSetting;
};

export enum OnChainSettingOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  KeyAsc = "key_ASC",
  KeyAscNullsFirst = "key_ASC_NULLS_FIRST",
  KeyAscNullsLast = "key_ASC_NULLS_LAST",
  KeyDesc = "key_DESC",
  KeyDescNullsFirst = "key_DESC_NULLS_FIRST",
  KeyDescNullsLast = "key_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
  ValueAsc = "value_ASC",
  ValueAscNullsFirst = "value_ASC_NULLS_FIRST",
  ValueAscNullsLast = "value_ASC_NULLS_LAST",
  ValueDesc = "value_DESC",
  ValueDescNullsFirst = "value_DESC_NULLS_FIRST",
  ValueDescNullsLast = "value_DESC_NULLS_LAST",
}

export enum OnChainSettingType {
  Bool = "bool",
  Bytes32 = "bytes32",
  String = "string",
  Uint = "uint",
}

export type OnChainSettingWhereInput = {
  AND?: InputMaybe<Array<OnChainSettingWhereInput>>;
  OR?: InputMaybe<Array<OnChainSettingWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_contains?: InputMaybe<Scalars["String"]["input"]>;
  key_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  key_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_eq?: InputMaybe<Scalars["String"]["input"]>;
  key_gt?: InputMaybe<Scalars["String"]["input"]>;
  key_gte?: InputMaybe<Scalars["String"]["input"]>;
  key_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  key_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  key_lt?: InputMaybe<Scalars["String"]["input"]>;
  key_lte?: InputMaybe<Scalars["String"]["input"]>;
  key_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  key_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  key_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  key_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  key_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  key_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  type_eq?: InputMaybe<OnChainSettingType>;
  type_in?: InputMaybe<Array<OnChainSettingType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<OnChainSettingType>;
  type_not_in?: InputMaybe<Array<OnChainSettingType>>;
  value_contains?: InputMaybe<Scalars["String"]["input"]>;
  value_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  value_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_eq?: InputMaybe<Scalars["String"]["input"]>;
  value_gt?: InputMaybe<Scalars["String"]["input"]>;
  value_gte?: InputMaybe<Scalars["String"]["input"]>;
  value_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  value_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  value_lt?: InputMaybe<Scalars["String"]["input"]>;
  value_lte?: InputMaybe<Scalars["String"]["input"]>;
  value_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  value_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  value_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  value_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  value_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  value_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type OnChainSettingsConnection = {
  __typename?: "OnChainSettingsConnection";
  edges: Array<OnChainSettingEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Order = {
  __typename?: "Order";
  acceptablePrice: Scalars["BigInt"]["output"];
  account: Scalars["String"]["output"];
  callbackContract: Scalars["String"]["output"];
  callbackGasLimit: Scalars["BigInt"]["output"];
  cancelledReason?: Maybe<Scalars["String"]["output"]>;
  cancelledReasonBytes?: Maybe<Scalars["String"]["output"]>;
  cancelledTxn?: Maybe<Transaction>;
  createdTxn: Transaction;
  executedTxn?: Maybe<Transaction>;
  executionFee: Scalars["BigInt"]["output"];
  frozenReason?: Maybe<Scalars["String"]["output"]>;
  frozenReasonBytes?: Maybe<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  initialCollateralDeltaAmount: Scalars["BigInt"]["output"];
  initialCollateralTokenAddress: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  marketAddress: Scalars["String"]["output"];
  minOutputAmount: Scalars["BigInt"]["output"];
  numberOfParts?: Maybe<Scalars["Int"]["output"]>;
  orderType: Scalars["Int"]["output"];
  receiver: Scalars["String"]["output"];
  shouldUnwrapNativeToken: Scalars["Boolean"]["output"];
  sizeDeltaUsd: Scalars["BigInt"]["output"];
  status: OrderStatus;
  swapPath: Array<Scalars["String"]["output"]>;
  triggerPrice: Scalars["BigInt"]["output"];
  twapGroupId?: Maybe<Scalars["String"]["output"]>;
  uiFeeReceiver: Scalars["String"]["output"];
  updatedAtBlock: Scalars["BigInt"]["output"];
};

export type OrderEdge = {
  __typename?: "OrderEdge";
  cursor: Scalars["String"]["output"];
  node: Order;
};

export enum OrderOrderByInput {
  AcceptablePriceAsc = "acceptablePrice_ASC",
  AcceptablePriceAscNullsFirst = "acceptablePrice_ASC_NULLS_FIRST",
  AcceptablePriceAscNullsLast = "acceptablePrice_ASC_NULLS_LAST",
  AcceptablePriceDesc = "acceptablePrice_DESC",
  AcceptablePriceDescNullsFirst = "acceptablePrice_DESC_NULLS_FIRST",
  AcceptablePriceDescNullsLast = "acceptablePrice_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  CallbackContractAsc = "callbackContract_ASC",
  CallbackContractAscNullsFirst = "callbackContract_ASC_NULLS_FIRST",
  CallbackContractAscNullsLast = "callbackContract_ASC_NULLS_LAST",
  CallbackContractDesc = "callbackContract_DESC",
  CallbackContractDescNullsFirst = "callbackContract_DESC_NULLS_FIRST",
  CallbackContractDescNullsLast = "callbackContract_DESC_NULLS_LAST",
  CallbackGasLimitAsc = "callbackGasLimit_ASC",
  CallbackGasLimitAscNullsFirst = "callbackGasLimit_ASC_NULLS_FIRST",
  CallbackGasLimitAscNullsLast = "callbackGasLimit_ASC_NULLS_LAST",
  CallbackGasLimitDesc = "callbackGasLimit_DESC",
  CallbackGasLimitDescNullsFirst = "callbackGasLimit_DESC_NULLS_FIRST",
  CallbackGasLimitDescNullsLast = "callbackGasLimit_DESC_NULLS_LAST",
  CancelledReasonBytesAsc = "cancelledReasonBytes_ASC",
  CancelledReasonBytesAscNullsFirst = "cancelledReasonBytes_ASC_NULLS_FIRST",
  CancelledReasonBytesAscNullsLast = "cancelledReasonBytes_ASC_NULLS_LAST",
  CancelledReasonBytesDesc = "cancelledReasonBytes_DESC",
  CancelledReasonBytesDescNullsFirst = "cancelledReasonBytes_DESC_NULLS_FIRST",
  CancelledReasonBytesDescNullsLast = "cancelledReasonBytes_DESC_NULLS_LAST",
  CancelledReasonAsc = "cancelledReason_ASC",
  CancelledReasonAscNullsFirst = "cancelledReason_ASC_NULLS_FIRST",
  CancelledReasonAscNullsLast = "cancelledReason_ASC_NULLS_LAST",
  CancelledReasonDesc = "cancelledReason_DESC",
  CancelledReasonDescNullsFirst = "cancelledReason_DESC_NULLS_FIRST",
  CancelledReasonDescNullsLast = "cancelledReason_DESC_NULLS_LAST",
  CancelledTxnBlockNumberAsc = "cancelledTxn_blockNumber_ASC",
  CancelledTxnBlockNumberAscNullsFirst = "cancelledTxn_blockNumber_ASC_NULLS_FIRST",
  CancelledTxnBlockNumberAscNullsLast = "cancelledTxn_blockNumber_ASC_NULLS_LAST",
  CancelledTxnBlockNumberDesc = "cancelledTxn_blockNumber_DESC",
  CancelledTxnBlockNumberDescNullsFirst = "cancelledTxn_blockNumber_DESC_NULLS_FIRST",
  CancelledTxnBlockNumberDescNullsLast = "cancelledTxn_blockNumber_DESC_NULLS_LAST",
  CancelledTxnFromAsc = "cancelledTxn_from_ASC",
  CancelledTxnFromAscNullsFirst = "cancelledTxn_from_ASC_NULLS_FIRST",
  CancelledTxnFromAscNullsLast = "cancelledTxn_from_ASC_NULLS_LAST",
  CancelledTxnFromDesc = "cancelledTxn_from_DESC",
  CancelledTxnFromDescNullsFirst = "cancelledTxn_from_DESC_NULLS_FIRST",
  CancelledTxnFromDescNullsLast = "cancelledTxn_from_DESC_NULLS_LAST",
  CancelledTxnHashAsc = "cancelledTxn_hash_ASC",
  CancelledTxnHashAscNullsFirst = "cancelledTxn_hash_ASC_NULLS_FIRST",
  CancelledTxnHashAscNullsLast = "cancelledTxn_hash_ASC_NULLS_LAST",
  CancelledTxnHashDesc = "cancelledTxn_hash_DESC",
  CancelledTxnHashDescNullsFirst = "cancelledTxn_hash_DESC_NULLS_FIRST",
  CancelledTxnHashDescNullsLast = "cancelledTxn_hash_DESC_NULLS_LAST",
  CancelledTxnIdAsc = "cancelledTxn_id_ASC",
  CancelledTxnIdAscNullsFirst = "cancelledTxn_id_ASC_NULLS_FIRST",
  CancelledTxnIdAscNullsLast = "cancelledTxn_id_ASC_NULLS_LAST",
  CancelledTxnIdDesc = "cancelledTxn_id_DESC",
  CancelledTxnIdDescNullsFirst = "cancelledTxn_id_DESC_NULLS_FIRST",
  CancelledTxnIdDescNullsLast = "cancelledTxn_id_DESC_NULLS_LAST",
  CancelledTxnTimestampAsc = "cancelledTxn_timestamp_ASC",
  CancelledTxnTimestampAscNullsFirst = "cancelledTxn_timestamp_ASC_NULLS_FIRST",
  CancelledTxnTimestampAscNullsLast = "cancelledTxn_timestamp_ASC_NULLS_LAST",
  CancelledTxnTimestampDesc = "cancelledTxn_timestamp_DESC",
  CancelledTxnTimestampDescNullsFirst = "cancelledTxn_timestamp_DESC_NULLS_FIRST",
  CancelledTxnTimestampDescNullsLast = "cancelledTxn_timestamp_DESC_NULLS_LAST",
  CancelledTxnToAsc = "cancelledTxn_to_ASC",
  CancelledTxnToAscNullsFirst = "cancelledTxn_to_ASC_NULLS_FIRST",
  CancelledTxnToAscNullsLast = "cancelledTxn_to_ASC_NULLS_LAST",
  CancelledTxnToDesc = "cancelledTxn_to_DESC",
  CancelledTxnToDescNullsFirst = "cancelledTxn_to_DESC_NULLS_FIRST",
  CancelledTxnToDescNullsLast = "cancelledTxn_to_DESC_NULLS_LAST",
  CancelledTxnTransactionIndexAsc = "cancelledTxn_transactionIndex_ASC",
  CancelledTxnTransactionIndexAscNullsFirst = "cancelledTxn_transactionIndex_ASC_NULLS_FIRST",
  CancelledTxnTransactionIndexAscNullsLast = "cancelledTxn_transactionIndex_ASC_NULLS_LAST",
  CancelledTxnTransactionIndexDesc = "cancelledTxn_transactionIndex_DESC",
  CancelledTxnTransactionIndexDescNullsFirst = "cancelledTxn_transactionIndex_DESC_NULLS_FIRST",
  CancelledTxnTransactionIndexDescNullsLast = "cancelledTxn_transactionIndex_DESC_NULLS_LAST",
  CreatedTxnBlockNumberAsc = "createdTxn_blockNumber_ASC",
  CreatedTxnBlockNumberAscNullsFirst = "createdTxn_blockNumber_ASC_NULLS_FIRST",
  CreatedTxnBlockNumberAscNullsLast = "createdTxn_blockNumber_ASC_NULLS_LAST",
  CreatedTxnBlockNumberDesc = "createdTxn_blockNumber_DESC",
  CreatedTxnBlockNumberDescNullsFirst = "createdTxn_blockNumber_DESC_NULLS_FIRST",
  CreatedTxnBlockNumberDescNullsLast = "createdTxn_blockNumber_DESC_NULLS_LAST",
  CreatedTxnFromAsc = "createdTxn_from_ASC",
  CreatedTxnFromAscNullsFirst = "createdTxn_from_ASC_NULLS_FIRST",
  CreatedTxnFromAscNullsLast = "createdTxn_from_ASC_NULLS_LAST",
  CreatedTxnFromDesc = "createdTxn_from_DESC",
  CreatedTxnFromDescNullsFirst = "createdTxn_from_DESC_NULLS_FIRST",
  CreatedTxnFromDescNullsLast = "createdTxn_from_DESC_NULLS_LAST",
  CreatedTxnHashAsc = "createdTxn_hash_ASC",
  CreatedTxnHashAscNullsFirst = "createdTxn_hash_ASC_NULLS_FIRST",
  CreatedTxnHashAscNullsLast = "createdTxn_hash_ASC_NULLS_LAST",
  CreatedTxnHashDesc = "createdTxn_hash_DESC",
  CreatedTxnHashDescNullsFirst = "createdTxn_hash_DESC_NULLS_FIRST",
  CreatedTxnHashDescNullsLast = "createdTxn_hash_DESC_NULLS_LAST",
  CreatedTxnIdAsc = "createdTxn_id_ASC",
  CreatedTxnIdAscNullsFirst = "createdTxn_id_ASC_NULLS_FIRST",
  CreatedTxnIdAscNullsLast = "createdTxn_id_ASC_NULLS_LAST",
  CreatedTxnIdDesc = "createdTxn_id_DESC",
  CreatedTxnIdDescNullsFirst = "createdTxn_id_DESC_NULLS_FIRST",
  CreatedTxnIdDescNullsLast = "createdTxn_id_DESC_NULLS_LAST",
  CreatedTxnTimestampAsc = "createdTxn_timestamp_ASC",
  CreatedTxnTimestampAscNullsFirst = "createdTxn_timestamp_ASC_NULLS_FIRST",
  CreatedTxnTimestampAscNullsLast = "createdTxn_timestamp_ASC_NULLS_LAST",
  CreatedTxnTimestampDesc = "createdTxn_timestamp_DESC",
  CreatedTxnTimestampDescNullsFirst = "createdTxn_timestamp_DESC_NULLS_FIRST",
  CreatedTxnTimestampDescNullsLast = "createdTxn_timestamp_DESC_NULLS_LAST",
  CreatedTxnToAsc = "createdTxn_to_ASC",
  CreatedTxnToAscNullsFirst = "createdTxn_to_ASC_NULLS_FIRST",
  CreatedTxnToAscNullsLast = "createdTxn_to_ASC_NULLS_LAST",
  CreatedTxnToDesc = "createdTxn_to_DESC",
  CreatedTxnToDescNullsFirst = "createdTxn_to_DESC_NULLS_FIRST",
  CreatedTxnToDescNullsLast = "createdTxn_to_DESC_NULLS_LAST",
  CreatedTxnTransactionIndexAsc = "createdTxn_transactionIndex_ASC",
  CreatedTxnTransactionIndexAscNullsFirst = "createdTxn_transactionIndex_ASC_NULLS_FIRST",
  CreatedTxnTransactionIndexAscNullsLast = "createdTxn_transactionIndex_ASC_NULLS_LAST",
  CreatedTxnTransactionIndexDesc = "createdTxn_transactionIndex_DESC",
  CreatedTxnTransactionIndexDescNullsFirst = "createdTxn_transactionIndex_DESC_NULLS_FIRST",
  CreatedTxnTransactionIndexDescNullsLast = "createdTxn_transactionIndex_DESC_NULLS_LAST",
  ExecutedTxnBlockNumberAsc = "executedTxn_blockNumber_ASC",
  ExecutedTxnBlockNumberAscNullsFirst = "executedTxn_blockNumber_ASC_NULLS_FIRST",
  ExecutedTxnBlockNumberAscNullsLast = "executedTxn_blockNumber_ASC_NULLS_LAST",
  ExecutedTxnBlockNumberDesc = "executedTxn_blockNumber_DESC",
  ExecutedTxnBlockNumberDescNullsFirst = "executedTxn_blockNumber_DESC_NULLS_FIRST",
  ExecutedTxnBlockNumberDescNullsLast = "executedTxn_blockNumber_DESC_NULLS_LAST",
  ExecutedTxnFromAsc = "executedTxn_from_ASC",
  ExecutedTxnFromAscNullsFirst = "executedTxn_from_ASC_NULLS_FIRST",
  ExecutedTxnFromAscNullsLast = "executedTxn_from_ASC_NULLS_LAST",
  ExecutedTxnFromDesc = "executedTxn_from_DESC",
  ExecutedTxnFromDescNullsFirst = "executedTxn_from_DESC_NULLS_FIRST",
  ExecutedTxnFromDescNullsLast = "executedTxn_from_DESC_NULLS_LAST",
  ExecutedTxnHashAsc = "executedTxn_hash_ASC",
  ExecutedTxnHashAscNullsFirst = "executedTxn_hash_ASC_NULLS_FIRST",
  ExecutedTxnHashAscNullsLast = "executedTxn_hash_ASC_NULLS_LAST",
  ExecutedTxnHashDesc = "executedTxn_hash_DESC",
  ExecutedTxnHashDescNullsFirst = "executedTxn_hash_DESC_NULLS_FIRST",
  ExecutedTxnHashDescNullsLast = "executedTxn_hash_DESC_NULLS_LAST",
  ExecutedTxnIdAsc = "executedTxn_id_ASC",
  ExecutedTxnIdAscNullsFirst = "executedTxn_id_ASC_NULLS_FIRST",
  ExecutedTxnIdAscNullsLast = "executedTxn_id_ASC_NULLS_LAST",
  ExecutedTxnIdDesc = "executedTxn_id_DESC",
  ExecutedTxnIdDescNullsFirst = "executedTxn_id_DESC_NULLS_FIRST",
  ExecutedTxnIdDescNullsLast = "executedTxn_id_DESC_NULLS_LAST",
  ExecutedTxnTimestampAsc = "executedTxn_timestamp_ASC",
  ExecutedTxnTimestampAscNullsFirst = "executedTxn_timestamp_ASC_NULLS_FIRST",
  ExecutedTxnTimestampAscNullsLast = "executedTxn_timestamp_ASC_NULLS_LAST",
  ExecutedTxnTimestampDesc = "executedTxn_timestamp_DESC",
  ExecutedTxnTimestampDescNullsFirst = "executedTxn_timestamp_DESC_NULLS_FIRST",
  ExecutedTxnTimestampDescNullsLast = "executedTxn_timestamp_DESC_NULLS_LAST",
  ExecutedTxnToAsc = "executedTxn_to_ASC",
  ExecutedTxnToAscNullsFirst = "executedTxn_to_ASC_NULLS_FIRST",
  ExecutedTxnToAscNullsLast = "executedTxn_to_ASC_NULLS_LAST",
  ExecutedTxnToDesc = "executedTxn_to_DESC",
  ExecutedTxnToDescNullsFirst = "executedTxn_to_DESC_NULLS_FIRST",
  ExecutedTxnToDescNullsLast = "executedTxn_to_DESC_NULLS_LAST",
  ExecutedTxnTransactionIndexAsc = "executedTxn_transactionIndex_ASC",
  ExecutedTxnTransactionIndexAscNullsFirst = "executedTxn_transactionIndex_ASC_NULLS_FIRST",
  ExecutedTxnTransactionIndexAscNullsLast = "executedTxn_transactionIndex_ASC_NULLS_LAST",
  ExecutedTxnTransactionIndexDesc = "executedTxn_transactionIndex_DESC",
  ExecutedTxnTransactionIndexDescNullsFirst = "executedTxn_transactionIndex_DESC_NULLS_FIRST",
  ExecutedTxnTransactionIndexDescNullsLast = "executedTxn_transactionIndex_DESC_NULLS_LAST",
  ExecutionFeeAsc = "executionFee_ASC",
  ExecutionFeeAscNullsFirst = "executionFee_ASC_NULLS_FIRST",
  ExecutionFeeAscNullsLast = "executionFee_ASC_NULLS_LAST",
  ExecutionFeeDesc = "executionFee_DESC",
  ExecutionFeeDescNullsFirst = "executionFee_DESC_NULLS_FIRST",
  ExecutionFeeDescNullsLast = "executionFee_DESC_NULLS_LAST",
  FrozenReasonBytesAsc = "frozenReasonBytes_ASC",
  FrozenReasonBytesAscNullsFirst = "frozenReasonBytes_ASC_NULLS_FIRST",
  FrozenReasonBytesAscNullsLast = "frozenReasonBytes_ASC_NULLS_LAST",
  FrozenReasonBytesDesc = "frozenReasonBytes_DESC",
  FrozenReasonBytesDescNullsFirst = "frozenReasonBytes_DESC_NULLS_FIRST",
  FrozenReasonBytesDescNullsLast = "frozenReasonBytes_DESC_NULLS_LAST",
  FrozenReasonAsc = "frozenReason_ASC",
  FrozenReasonAscNullsFirst = "frozenReason_ASC_NULLS_FIRST",
  FrozenReasonAscNullsLast = "frozenReason_ASC_NULLS_LAST",
  FrozenReasonDesc = "frozenReason_DESC",
  FrozenReasonDescNullsFirst = "frozenReason_DESC_NULLS_FIRST",
  FrozenReasonDescNullsLast = "frozenReason_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  InitialCollateralDeltaAmountAsc = "initialCollateralDeltaAmount_ASC",
  InitialCollateralDeltaAmountAscNullsFirst = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  InitialCollateralDeltaAmountAscNullsLast = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  InitialCollateralDeltaAmountDesc = "initialCollateralDeltaAmount_DESC",
  InitialCollateralDeltaAmountDescNullsFirst = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  InitialCollateralDeltaAmountDescNullsLast = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  InitialCollateralTokenAddressAsc = "initialCollateralTokenAddress_ASC",
  InitialCollateralTokenAddressAscNullsFirst = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  InitialCollateralTokenAddressAscNullsLast = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  InitialCollateralTokenAddressDesc = "initialCollateralTokenAddress_DESC",
  InitialCollateralTokenAddressDescNullsFirst = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  InitialCollateralTokenAddressDescNullsLast = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  MinOutputAmountAsc = "minOutputAmount_ASC",
  MinOutputAmountAscNullsFirst = "minOutputAmount_ASC_NULLS_FIRST",
  MinOutputAmountAscNullsLast = "minOutputAmount_ASC_NULLS_LAST",
  MinOutputAmountDesc = "minOutputAmount_DESC",
  MinOutputAmountDescNullsFirst = "minOutputAmount_DESC_NULLS_FIRST",
  MinOutputAmountDescNullsLast = "minOutputAmount_DESC_NULLS_LAST",
  NumberOfPartsAsc = "numberOfParts_ASC",
  NumberOfPartsAscNullsFirst = "numberOfParts_ASC_NULLS_FIRST",
  NumberOfPartsAscNullsLast = "numberOfParts_ASC_NULLS_LAST",
  NumberOfPartsDesc = "numberOfParts_DESC",
  NumberOfPartsDescNullsFirst = "numberOfParts_DESC_NULLS_FIRST",
  NumberOfPartsDescNullsLast = "numberOfParts_DESC_NULLS_LAST",
  OrderTypeAsc = "orderType_ASC",
  OrderTypeAscNullsFirst = "orderType_ASC_NULLS_FIRST",
  OrderTypeAscNullsLast = "orderType_ASC_NULLS_LAST",
  OrderTypeDesc = "orderType_DESC",
  OrderTypeDescNullsFirst = "orderType_DESC_NULLS_FIRST",
  OrderTypeDescNullsLast = "orderType_DESC_NULLS_LAST",
  ReceiverAsc = "receiver_ASC",
  ReceiverAscNullsFirst = "receiver_ASC_NULLS_FIRST",
  ReceiverAscNullsLast = "receiver_ASC_NULLS_LAST",
  ReceiverDesc = "receiver_DESC",
  ReceiverDescNullsFirst = "receiver_DESC_NULLS_FIRST",
  ReceiverDescNullsLast = "receiver_DESC_NULLS_LAST",
  ShouldUnwrapNativeTokenAsc = "shouldUnwrapNativeToken_ASC",
  ShouldUnwrapNativeTokenAscNullsFirst = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  ShouldUnwrapNativeTokenAscNullsLast = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  ShouldUnwrapNativeTokenDesc = "shouldUnwrapNativeToken_DESC",
  ShouldUnwrapNativeTokenDescNullsFirst = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  ShouldUnwrapNativeTokenDescNullsLast = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  StatusAsc = "status_ASC",
  StatusAscNullsFirst = "status_ASC_NULLS_FIRST",
  StatusAscNullsLast = "status_ASC_NULLS_LAST",
  StatusDesc = "status_DESC",
  StatusDescNullsFirst = "status_DESC_NULLS_FIRST",
  StatusDescNullsLast = "status_DESC_NULLS_LAST",
  TriggerPriceAsc = "triggerPrice_ASC",
  TriggerPriceAscNullsFirst = "triggerPrice_ASC_NULLS_FIRST",
  TriggerPriceAscNullsLast = "triggerPrice_ASC_NULLS_LAST",
  TriggerPriceDesc = "triggerPrice_DESC",
  TriggerPriceDescNullsFirst = "triggerPrice_DESC_NULLS_FIRST",
  TriggerPriceDescNullsLast = "triggerPrice_DESC_NULLS_LAST",
  TwapGroupIdAsc = "twapGroupId_ASC",
  TwapGroupIdAscNullsFirst = "twapGroupId_ASC_NULLS_FIRST",
  TwapGroupIdAscNullsLast = "twapGroupId_ASC_NULLS_LAST",
  TwapGroupIdDesc = "twapGroupId_DESC",
  TwapGroupIdDescNullsFirst = "twapGroupId_DESC_NULLS_FIRST",
  TwapGroupIdDescNullsLast = "twapGroupId_DESC_NULLS_LAST",
  UiFeeReceiverAsc = "uiFeeReceiver_ASC",
  UiFeeReceiverAscNullsFirst = "uiFeeReceiver_ASC_NULLS_FIRST",
  UiFeeReceiverAscNullsLast = "uiFeeReceiver_ASC_NULLS_LAST",
  UiFeeReceiverDesc = "uiFeeReceiver_DESC",
  UiFeeReceiverDescNullsFirst = "uiFeeReceiver_DESC_NULLS_FIRST",
  UiFeeReceiverDescNullsLast = "uiFeeReceiver_DESC_NULLS_LAST",
  UpdatedAtBlockAsc = "updatedAtBlock_ASC",
  UpdatedAtBlockAscNullsFirst = "updatedAtBlock_ASC_NULLS_FIRST",
  UpdatedAtBlockAscNullsLast = "updatedAtBlock_ASC_NULLS_LAST",
  UpdatedAtBlockDesc = "updatedAtBlock_DESC",
  UpdatedAtBlockDescNullsFirst = "updatedAtBlock_DESC_NULLS_FIRST",
  UpdatedAtBlockDescNullsLast = "updatedAtBlock_DESC_NULLS_LAST",
}

export enum OrderStatus {
  Cancelled = "Cancelled",
  Created = "Created",
  Executed = "Executed",
  Frozen = "Frozen",
}

export type OrderWhereInput = {
  AND?: InputMaybe<Array<OrderWhereInput>>;
  OR?: InputMaybe<Array<OrderWhereInput>>;
  acceptablePrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  acceptablePrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  acceptablePrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_contains?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_eq?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_gt?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_gte?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  callbackContract_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  callbackContract_lt?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_lte?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  callbackContract_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackContract_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  callbackGasLimit_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  callbackGasLimit_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  callbackGasLimit_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  callbackGasLimit_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  cancelledReasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cancelledReasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_gt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_gte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  cancelledReason_lt?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_lte?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  cancelledReason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledReason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  cancelledTxn?: InputMaybe<TransactionWhereInput>;
  cancelledTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  createdTxn?: InputMaybe<TransactionWhereInput>;
  createdTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executedTxn?: InputMaybe<TransactionWhereInput>;
  executedTxn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionFee_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionFee_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionFee_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionFee_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  frozenReasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  frozenReasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_gt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_gte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  frozenReason_lt?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_lte?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  frozenReason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  frozenReason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  minOutputAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minOutputAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minOutputAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  numberOfParts_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  numberOfParts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  numberOfParts_lt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_lte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderType_lt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_lte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  receiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  receiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shouldUnwrapNativeToken_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  status_eq?: InputMaybe<OrderStatus>;
  status_in?: InputMaybe<Array<OrderStatus>>;
  status_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  status_not_eq?: InputMaybe<OrderStatus>;
  status_not_in?: InputMaybe<Array<OrderStatus>>;
  swapPath_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  triggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  twapGroupId_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  twapGroupId_lt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_lte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  uiFeeReceiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  updatedAtBlock_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  updatedAtBlock_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  updatedAtBlock_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  updatedAtBlock_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
};

export type OrdersConnection = {
  __typename?: "OrdersConnection";
  edges: Array<OrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PageInfo = {
  __typename?: "PageInfo";
  endCursor: Scalars["String"]["output"];
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor: Scalars["String"]["output"];
};

export type PeriodAccountStatObject = {
  __typename?: "PeriodAccountStatObject";
  closedCount: Scalars["Float"]["output"];
  cumsumCollateral: Scalars["BigInt"]["output"];
  cumsumSize: Scalars["BigInt"]["output"];
  id: Scalars["ID"]["output"];
  losses: Scalars["Float"]["output"];
  maxCapital: Scalars["BigInt"]["output"];
  netCapital: Scalars["BigInt"]["output"];
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  startUnrealizedFees: Scalars["BigInt"]["output"];
  startUnrealizedPnl: Scalars["BigInt"]["output"];
  startUnrealizedPriceImpact: Scalars["BigInt"]["output"];
  sumMaxSize: Scalars["BigInt"]["output"];
  volume: Scalars["BigInt"]["output"];
  wins: Scalars["Float"]["output"];
};

export type Position = {
  __typename?: "Position";
  account: Scalars["String"]["output"];
  accountStat: AccountStat;
  collateralAmount: Scalars["BigInt"]["output"];
  collateralToken: Scalars["String"]["output"];
  entryPrice: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  market: Scalars["String"]["output"];
  maxSize: Scalars["BigInt"]["output"];
  openedAt: Scalars["Int"]["output"];
  positionKey: Scalars["String"]["output"];
  realizedFees: Scalars["BigInt"]["output"];
  realizedPnl: Scalars["BigInt"]["output"];
  realizedPriceImpact: Scalars["BigInt"]["output"];
  sizeInTokens: Scalars["BigInt"]["output"];
  sizeInUsd: Scalars["BigInt"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
  unrealizedFees: Scalars["BigInt"]["output"];
  unrealizedPnl: Scalars["BigInt"]["output"];
  unrealizedPriceImpact: Scalars["BigInt"]["output"];
};

export type PositionChange = {
  __typename?: "PositionChange";
  account: Scalars["String"]["output"];
  basePnlUsd: Scalars["BigInt"]["output"];
  block: Scalars["Int"]["output"];
  collateralAmount: Scalars["BigInt"]["output"];
  collateralDeltaAmount: Scalars["BigInt"]["output"];
  collateralToken: Scalars["String"]["output"];
  collateralTokenPriceMin: Scalars["BigInt"]["output"];
  executionPrice: Scalars["BigInt"]["output"];
  feesAmount: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  isLong: Scalars["Boolean"]["output"];
  isWin?: Maybe<Scalars["Boolean"]["output"]>;
  market: Scalars["String"]["output"];
  maxSize: Scalars["BigInt"]["output"];
  priceImpactAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactDiffUsd?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactUsd: Scalars["BigInt"]["output"];
  sizeDeltaUsd: Scalars["BigInt"]["output"];
  sizeInUsd: Scalars["BigInt"]["output"];
  timestamp: Scalars["Int"]["output"];
  type: PositionChangeType;
};

export type PositionChangeEdge = {
  __typename?: "PositionChangeEdge";
  cursor: Scalars["String"]["output"];
  node: PositionChange;
};

export enum PositionChangeOrderByInput {
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  BasePnlUsdAsc = "basePnlUsd_ASC",
  BasePnlUsdAscNullsFirst = "basePnlUsd_ASC_NULLS_FIRST",
  BasePnlUsdAscNullsLast = "basePnlUsd_ASC_NULLS_LAST",
  BasePnlUsdDesc = "basePnlUsd_DESC",
  BasePnlUsdDescNullsFirst = "basePnlUsd_DESC_NULLS_FIRST",
  BasePnlUsdDescNullsLast = "basePnlUsd_DESC_NULLS_LAST",
  BlockAsc = "block_ASC",
  BlockAscNullsFirst = "block_ASC_NULLS_FIRST",
  BlockAscNullsLast = "block_ASC_NULLS_LAST",
  BlockDesc = "block_DESC",
  BlockDescNullsFirst = "block_DESC_NULLS_FIRST",
  BlockDescNullsLast = "block_DESC_NULLS_LAST",
  CollateralAmountAsc = "collateralAmount_ASC",
  CollateralAmountAscNullsFirst = "collateralAmount_ASC_NULLS_FIRST",
  CollateralAmountAscNullsLast = "collateralAmount_ASC_NULLS_LAST",
  CollateralAmountDesc = "collateralAmount_DESC",
  CollateralAmountDescNullsFirst = "collateralAmount_DESC_NULLS_FIRST",
  CollateralAmountDescNullsLast = "collateralAmount_DESC_NULLS_LAST",
  CollateralDeltaAmountAsc = "collateralDeltaAmount_ASC",
  CollateralDeltaAmountAscNullsFirst = "collateralDeltaAmount_ASC_NULLS_FIRST",
  CollateralDeltaAmountAscNullsLast = "collateralDeltaAmount_ASC_NULLS_LAST",
  CollateralDeltaAmountDesc = "collateralDeltaAmount_DESC",
  CollateralDeltaAmountDescNullsFirst = "collateralDeltaAmount_DESC_NULLS_FIRST",
  CollateralDeltaAmountDescNullsLast = "collateralDeltaAmount_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  CollateralTokenAsc = "collateralToken_ASC",
  CollateralTokenAscNullsFirst = "collateralToken_ASC_NULLS_FIRST",
  CollateralTokenAscNullsLast = "collateralToken_ASC_NULLS_LAST",
  CollateralTokenDesc = "collateralToken_DESC",
  CollateralTokenDescNullsFirst = "collateralToken_DESC_NULLS_FIRST",
  CollateralTokenDescNullsLast = "collateralToken_DESC_NULLS_LAST",
  ExecutionPriceAsc = "executionPrice_ASC",
  ExecutionPriceAscNullsFirst = "executionPrice_ASC_NULLS_FIRST",
  ExecutionPriceAscNullsLast = "executionPrice_ASC_NULLS_LAST",
  ExecutionPriceDesc = "executionPrice_DESC",
  ExecutionPriceDescNullsFirst = "executionPrice_DESC_NULLS_FIRST",
  ExecutionPriceDescNullsLast = "executionPrice_DESC_NULLS_LAST",
  FeesAmountAsc = "feesAmount_ASC",
  FeesAmountAscNullsFirst = "feesAmount_ASC_NULLS_FIRST",
  FeesAmountAscNullsLast = "feesAmount_ASC_NULLS_LAST",
  FeesAmountDesc = "feesAmount_DESC",
  FeesAmountDescNullsFirst = "feesAmount_DESC_NULLS_FIRST",
  FeesAmountDescNullsLast = "feesAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  IsWinAsc = "isWin_ASC",
  IsWinAscNullsFirst = "isWin_ASC_NULLS_FIRST",
  IsWinAscNullsLast = "isWin_ASC_NULLS_LAST",
  IsWinDesc = "isWin_DESC",
  IsWinDescNullsFirst = "isWin_DESC_NULLS_FIRST",
  IsWinDescNullsLast = "isWin_DESC_NULLS_LAST",
  MarketAsc = "market_ASC",
  MarketAscNullsFirst = "market_ASC_NULLS_FIRST",
  MarketAscNullsLast = "market_ASC_NULLS_LAST",
  MarketDesc = "market_DESC",
  MarketDescNullsFirst = "market_DESC_NULLS_FIRST",
  MarketDescNullsLast = "market_DESC_NULLS_LAST",
  MaxSizeAsc = "maxSize_ASC",
  MaxSizeAscNullsFirst = "maxSize_ASC_NULLS_FIRST",
  MaxSizeAscNullsLast = "maxSize_ASC_NULLS_LAST",
  MaxSizeDesc = "maxSize_DESC",
  MaxSizeDescNullsFirst = "maxSize_DESC_NULLS_FIRST",
  MaxSizeDescNullsLast = "maxSize_DESC_NULLS_LAST",
  PriceImpactAmountAsc = "priceImpactAmount_ASC",
  PriceImpactAmountAscNullsFirst = "priceImpactAmount_ASC_NULLS_FIRST",
  PriceImpactAmountAscNullsLast = "priceImpactAmount_ASC_NULLS_LAST",
  PriceImpactAmountDesc = "priceImpactAmount_DESC",
  PriceImpactAmountDescNullsFirst = "priceImpactAmount_DESC_NULLS_FIRST",
  PriceImpactAmountDescNullsLast = "priceImpactAmount_DESC_NULLS_LAST",
  PriceImpactDiffUsdAsc = "priceImpactDiffUsd_ASC",
  PriceImpactDiffUsdAscNullsFirst = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  PriceImpactDiffUsdAscNullsLast = "priceImpactDiffUsd_ASC_NULLS_LAST",
  PriceImpactDiffUsdDesc = "priceImpactDiffUsd_DESC",
  PriceImpactDiffUsdDescNullsFirst = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  PriceImpactDiffUsdDescNullsLast = "priceImpactDiffUsd_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  SizeInUsdAsc = "sizeInUsd_ASC",
  SizeInUsdAscNullsFirst = "sizeInUsd_ASC_NULLS_FIRST",
  SizeInUsdAscNullsLast = "sizeInUsd_ASC_NULLS_LAST",
  SizeInUsdDesc = "sizeInUsd_DESC",
  SizeInUsdDescNullsFirst = "sizeInUsd_DESC_NULLS_FIRST",
  SizeInUsdDescNullsLast = "sizeInUsd_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PositionChangeType {
  Decrease = "decrease",
  Increase = "increase",
}

export type PositionChangeWhereInput = {
  AND?: InputMaybe<Array<PositionChangeWhereInput>>;
  OR?: InputMaybe<Array<PositionChangeWhereInput>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  basePnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  basePnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  basePnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  block_eq?: InputMaybe<Scalars["Int"]["input"]>;
  block_gt?: InputMaybe<Scalars["Int"]["input"]>;
  block_gte?: InputMaybe<Scalars["Int"]["input"]>;
  block_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  block_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  block_lt?: InputMaybe<Scalars["Int"]["input"]>;
  block_lte?: InputMaybe<Scalars["Int"]["input"]>;
  block_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  block_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  collateralAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  executionPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feesAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feesAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feesAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feesAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isWin_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_gt?: InputMaybe<Scalars["String"]["input"]>;
  market_gte?: InputMaybe<Scalars["String"]["input"]>;
  market_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_lt?: InputMaybe<Scalars["String"]["input"]>;
  market_lte?: InputMaybe<Scalars["String"]["input"]>;
  market_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  maxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactDiffUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  type_eq?: InputMaybe<PositionChangeType>;
  type_in?: InputMaybe<Array<PositionChangeType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PositionChangeType>;
  type_not_in?: InputMaybe<Array<PositionChangeType>>;
};

export type PositionChangesConnection = {
  __typename?: "PositionChangesConnection";
  edges: Array<PositionChangeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PositionEdge = {
  __typename?: "PositionEdge";
  cursor: Scalars["String"]["output"];
  node: Position;
};

export type PositionFeesEntitiesConnection = {
  __typename?: "PositionFeesEntitiesConnection";
  edges: Array<PositionFeesEntityEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type PositionFeesEntity = {
  __typename?: "PositionFeesEntity";
  affiliate: Scalars["String"]["output"];
  affiliateRewardAmount: Scalars["BigInt"]["output"];
  borrowingFeeAmount: Scalars["BigInt"]["output"];
  collateralTokenAddress: Scalars["String"]["output"];
  collateralTokenPriceMax: Scalars["BigInt"]["output"];
  collateralTokenPriceMin: Scalars["BigInt"]["output"];
  eventName: Scalars["String"]["output"];
  feeUsdForPool: Scalars["BigInt"]["output"];
  fundingFeeAmount: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  liquidationFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  marketAddress: Scalars["String"]["output"];
  orderKey: Scalars["String"]["output"];
  positionFeeAmount: Scalars["BigInt"]["output"];
  totalRebateAmount: Scalars["BigInt"]["output"];
  totalRebateFactor: Scalars["BigInt"]["output"];
  trader: Scalars["String"]["output"];
  traderDiscountAmount: Scalars["BigInt"]["output"];
  transaction: Transaction;
  type: PositionFeesEntityType;
};

export type PositionFeesEntityEdge = {
  __typename?: "PositionFeesEntityEdge";
  cursor: Scalars["String"]["output"];
  node: PositionFeesEntity;
};

export enum PositionFeesEntityOrderByInput {
  AffiliateRewardAmountAsc = "affiliateRewardAmount_ASC",
  AffiliateRewardAmountAscNullsFirst = "affiliateRewardAmount_ASC_NULLS_FIRST",
  AffiliateRewardAmountAscNullsLast = "affiliateRewardAmount_ASC_NULLS_LAST",
  AffiliateRewardAmountDesc = "affiliateRewardAmount_DESC",
  AffiliateRewardAmountDescNullsFirst = "affiliateRewardAmount_DESC_NULLS_FIRST",
  AffiliateRewardAmountDescNullsLast = "affiliateRewardAmount_DESC_NULLS_LAST",
  AffiliateAsc = "affiliate_ASC",
  AffiliateAscNullsFirst = "affiliate_ASC_NULLS_FIRST",
  AffiliateAscNullsLast = "affiliate_ASC_NULLS_LAST",
  AffiliateDesc = "affiliate_DESC",
  AffiliateDescNullsFirst = "affiliate_DESC_NULLS_FIRST",
  AffiliateDescNullsLast = "affiliate_DESC_NULLS_LAST",
  BorrowingFeeAmountAsc = "borrowingFeeAmount_ASC",
  BorrowingFeeAmountAscNullsFirst = "borrowingFeeAmount_ASC_NULLS_FIRST",
  BorrowingFeeAmountAscNullsLast = "borrowingFeeAmount_ASC_NULLS_LAST",
  BorrowingFeeAmountDesc = "borrowingFeeAmount_DESC",
  BorrowingFeeAmountDescNullsFirst = "borrowingFeeAmount_DESC_NULLS_FIRST",
  BorrowingFeeAmountDescNullsLast = "borrowingFeeAmount_DESC_NULLS_LAST",
  CollateralTokenAddressAsc = "collateralTokenAddress_ASC",
  CollateralTokenAddressAscNullsFirst = "collateralTokenAddress_ASC_NULLS_FIRST",
  CollateralTokenAddressAscNullsLast = "collateralTokenAddress_ASC_NULLS_LAST",
  CollateralTokenAddressDesc = "collateralTokenAddress_DESC",
  CollateralTokenAddressDescNullsFirst = "collateralTokenAddress_DESC_NULLS_FIRST",
  CollateralTokenAddressDescNullsLast = "collateralTokenAddress_DESC_NULLS_LAST",
  CollateralTokenPriceMaxAsc = "collateralTokenPriceMax_ASC",
  CollateralTokenPriceMaxAscNullsFirst = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  CollateralTokenPriceMaxAscNullsLast = "collateralTokenPriceMax_ASC_NULLS_LAST",
  CollateralTokenPriceMaxDesc = "collateralTokenPriceMax_DESC",
  CollateralTokenPriceMaxDescNullsFirst = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  CollateralTokenPriceMaxDescNullsLast = "collateralTokenPriceMax_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  FeeUsdForPoolAsc = "feeUsdForPool_ASC",
  FeeUsdForPoolAscNullsFirst = "feeUsdForPool_ASC_NULLS_FIRST",
  FeeUsdForPoolAscNullsLast = "feeUsdForPool_ASC_NULLS_LAST",
  FeeUsdForPoolDesc = "feeUsdForPool_DESC",
  FeeUsdForPoolDescNullsFirst = "feeUsdForPool_DESC_NULLS_FIRST",
  FeeUsdForPoolDescNullsLast = "feeUsdForPool_DESC_NULLS_LAST",
  FundingFeeAmountAsc = "fundingFeeAmount_ASC",
  FundingFeeAmountAscNullsFirst = "fundingFeeAmount_ASC_NULLS_FIRST",
  FundingFeeAmountAscNullsLast = "fundingFeeAmount_ASC_NULLS_LAST",
  FundingFeeAmountDesc = "fundingFeeAmount_DESC",
  FundingFeeAmountDescNullsFirst = "fundingFeeAmount_DESC_NULLS_FIRST",
  FundingFeeAmountDescNullsLast = "fundingFeeAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  LiquidationFeeAmountAsc = "liquidationFeeAmount_ASC",
  LiquidationFeeAmountAscNullsFirst = "liquidationFeeAmount_ASC_NULLS_FIRST",
  LiquidationFeeAmountAscNullsLast = "liquidationFeeAmount_ASC_NULLS_LAST",
  LiquidationFeeAmountDesc = "liquidationFeeAmount_DESC",
  LiquidationFeeAmountDescNullsFirst = "liquidationFeeAmount_DESC_NULLS_FIRST",
  LiquidationFeeAmountDescNullsLast = "liquidationFeeAmount_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  PositionFeeAmountAsc = "positionFeeAmount_ASC",
  PositionFeeAmountAscNullsFirst = "positionFeeAmount_ASC_NULLS_FIRST",
  PositionFeeAmountAscNullsLast = "positionFeeAmount_ASC_NULLS_LAST",
  PositionFeeAmountDesc = "positionFeeAmount_DESC",
  PositionFeeAmountDescNullsFirst = "positionFeeAmount_DESC_NULLS_FIRST",
  PositionFeeAmountDescNullsLast = "positionFeeAmount_DESC_NULLS_LAST",
  TotalRebateAmountAsc = "totalRebateAmount_ASC",
  TotalRebateAmountAscNullsFirst = "totalRebateAmount_ASC_NULLS_FIRST",
  TotalRebateAmountAscNullsLast = "totalRebateAmount_ASC_NULLS_LAST",
  TotalRebateAmountDesc = "totalRebateAmount_DESC",
  TotalRebateAmountDescNullsFirst = "totalRebateAmount_DESC_NULLS_FIRST",
  TotalRebateAmountDescNullsLast = "totalRebateAmount_DESC_NULLS_LAST",
  TotalRebateFactorAsc = "totalRebateFactor_ASC",
  TotalRebateFactorAscNullsFirst = "totalRebateFactor_ASC_NULLS_FIRST",
  TotalRebateFactorAscNullsLast = "totalRebateFactor_ASC_NULLS_LAST",
  TotalRebateFactorDesc = "totalRebateFactor_DESC",
  TotalRebateFactorDescNullsFirst = "totalRebateFactor_DESC_NULLS_FIRST",
  TotalRebateFactorDescNullsLast = "totalRebateFactor_DESC_NULLS_LAST",
  TraderDiscountAmountAsc = "traderDiscountAmount_ASC",
  TraderDiscountAmountAscNullsFirst = "traderDiscountAmount_ASC_NULLS_FIRST",
  TraderDiscountAmountAscNullsLast = "traderDiscountAmount_ASC_NULLS_LAST",
  TraderDiscountAmountDesc = "traderDiscountAmount_DESC",
  TraderDiscountAmountDescNullsFirst = "traderDiscountAmount_DESC_NULLS_FIRST",
  TraderDiscountAmountDescNullsLast = "traderDiscountAmount_DESC_NULLS_LAST",
  TraderAsc = "trader_ASC",
  TraderAscNullsFirst = "trader_ASC_NULLS_FIRST",
  TraderAscNullsLast = "trader_ASC_NULLS_LAST",
  TraderDesc = "trader_DESC",
  TraderDescNullsFirst = "trader_DESC_NULLS_FIRST",
  TraderDescNullsLast = "trader_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PositionFeesEntityType {
  PositionFeesCollected = "PositionFeesCollected",
  PositionFeesInfo = "PositionFeesInfo",
}

export type PositionFeesEntityWhereInput = {
  AND?: InputMaybe<Array<PositionFeesEntityWhereInput>>;
  OR?: InputMaybe<Array<PositionFeesEntityWhereInput>>;
  affiliateRewardAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  affiliateRewardAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  affiliateRewardAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  affiliateRewardAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  affiliate_contains?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_eq?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_gt?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_gte?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  affiliate_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  affiliate_lt?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_lte?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  affiliate_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  affiliate_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  borrowingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  eventName_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_lt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_lte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  feeUsdForPool_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  feeUsdForPool_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  feeUsdForPool_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  feeUsdForPool_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  liquidationFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  liquidationFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalRebateAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateFactor_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  totalRebateFactor_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  totalRebateFactor_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  totalRebateFactor_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  traderDiscountAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  traderDiscountAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  traderDiscountAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  traderDiscountAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  trader_contains?: InputMaybe<Scalars["String"]["input"]>;
  trader_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  trader_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_eq?: InputMaybe<Scalars["String"]["input"]>;
  trader_gt?: InputMaybe<Scalars["String"]["input"]>;
  trader_gte?: InputMaybe<Scalars["String"]["input"]>;
  trader_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  trader_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  trader_lt?: InputMaybe<Scalars["String"]["input"]>;
  trader_lte?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  trader_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  trader_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  trader_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_eq?: InputMaybe<PositionFeesEntityType>;
  type_in?: InputMaybe<Array<PositionFeesEntityType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PositionFeesEntityType>;
  type_not_in?: InputMaybe<Array<PositionFeesEntityType>>;
};

export type PositionMarketVolumeInfo = {
  __typename?: "PositionMarketVolumeInfo";
  market: Scalars["String"]["output"];
  volume: Scalars["BigInt"]["output"];
};

export enum PositionOrderByInput {
  AccountStatClosedCountAsc = "accountStat_closedCount_ASC",
  AccountStatClosedCountAscNullsFirst = "accountStat_closedCount_ASC_NULLS_FIRST",
  AccountStatClosedCountAscNullsLast = "accountStat_closedCount_ASC_NULLS_LAST",
  AccountStatClosedCountDesc = "accountStat_closedCount_DESC",
  AccountStatClosedCountDescNullsFirst = "accountStat_closedCount_DESC_NULLS_FIRST",
  AccountStatClosedCountDescNullsLast = "accountStat_closedCount_DESC_NULLS_LAST",
  AccountStatCumsumCollateralAsc = "accountStat_cumsumCollateral_ASC",
  AccountStatCumsumCollateralAscNullsFirst = "accountStat_cumsumCollateral_ASC_NULLS_FIRST",
  AccountStatCumsumCollateralAscNullsLast = "accountStat_cumsumCollateral_ASC_NULLS_LAST",
  AccountStatCumsumCollateralDesc = "accountStat_cumsumCollateral_DESC",
  AccountStatCumsumCollateralDescNullsFirst = "accountStat_cumsumCollateral_DESC_NULLS_FIRST",
  AccountStatCumsumCollateralDescNullsLast = "accountStat_cumsumCollateral_DESC_NULLS_LAST",
  AccountStatCumsumSizeAsc = "accountStat_cumsumSize_ASC",
  AccountStatCumsumSizeAscNullsFirst = "accountStat_cumsumSize_ASC_NULLS_FIRST",
  AccountStatCumsumSizeAscNullsLast = "accountStat_cumsumSize_ASC_NULLS_LAST",
  AccountStatCumsumSizeDesc = "accountStat_cumsumSize_DESC",
  AccountStatCumsumSizeDescNullsFirst = "accountStat_cumsumSize_DESC_NULLS_FIRST",
  AccountStatCumsumSizeDescNullsLast = "accountStat_cumsumSize_DESC_NULLS_LAST",
  AccountStatIdAsc = "accountStat_id_ASC",
  AccountStatIdAscNullsFirst = "accountStat_id_ASC_NULLS_FIRST",
  AccountStatIdAscNullsLast = "accountStat_id_ASC_NULLS_LAST",
  AccountStatIdDesc = "accountStat_id_DESC",
  AccountStatIdDescNullsFirst = "accountStat_id_DESC_NULLS_FIRST",
  AccountStatIdDescNullsLast = "accountStat_id_DESC_NULLS_LAST",
  AccountStatLossesAsc = "accountStat_losses_ASC",
  AccountStatLossesAscNullsFirst = "accountStat_losses_ASC_NULLS_FIRST",
  AccountStatLossesAscNullsLast = "accountStat_losses_ASC_NULLS_LAST",
  AccountStatLossesDesc = "accountStat_losses_DESC",
  AccountStatLossesDescNullsFirst = "accountStat_losses_DESC_NULLS_FIRST",
  AccountStatLossesDescNullsLast = "accountStat_losses_DESC_NULLS_LAST",
  AccountStatMaxCapitalAsc = "accountStat_maxCapital_ASC",
  AccountStatMaxCapitalAscNullsFirst = "accountStat_maxCapital_ASC_NULLS_FIRST",
  AccountStatMaxCapitalAscNullsLast = "accountStat_maxCapital_ASC_NULLS_LAST",
  AccountStatMaxCapitalDesc = "accountStat_maxCapital_DESC",
  AccountStatMaxCapitalDescNullsFirst = "accountStat_maxCapital_DESC_NULLS_FIRST",
  AccountStatMaxCapitalDescNullsLast = "accountStat_maxCapital_DESC_NULLS_LAST",
  AccountStatNetCapitalAsc = "accountStat_netCapital_ASC",
  AccountStatNetCapitalAscNullsFirst = "accountStat_netCapital_ASC_NULLS_FIRST",
  AccountStatNetCapitalAscNullsLast = "accountStat_netCapital_ASC_NULLS_LAST",
  AccountStatNetCapitalDesc = "accountStat_netCapital_DESC",
  AccountStatNetCapitalDescNullsFirst = "accountStat_netCapital_DESC_NULLS_FIRST",
  AccountStatNetCapitalDescNullsLast = "accountStat_netCapital_DESC_NULLS_LAST",
  AccountStatRealizedFeesAsc = "accountStat_realizedFees_ASC",
  AccountStatRealizedFeesAscNullsFirst = "accountStat_realizedFees_ASC_NULLS_FIRST",
  AccountStatRealizedFeesAscNullsLast = "accountStat_realizedFees_ASC_NULLS_LAST",
  AccountStatRealizedFeesDesc = "accountStat_realizedFees_DESC",
  AccountStatRealizedFeesDescNullsFirst = "accountStat_realizedFees_DESC_NULLS_FIRST",
  AccountStatRealizedFeesDescNullsLast = "accountStat_realizedFees_DESC_NULLS_LAST",
  AccountStatRealizedPnlAsc = "accountStat_realizedPnl_ASC",
  AccountStatRealizedPnlAscNullsFirst = "accountStat_realizedPnl_ASC_NULLS_FIRST",
  AccountStatRealizedPnlAscNullsLast = "accountStat_realizedPnl_ASC_NULLS_LAST",
  AccountStatRealizedPnlDesc = "accountStat_realizedPnl_DESC",
  AccountStatRealizedPnlDescNullsFirst = "accountStat_realizedPnl_DESC_NULLS_FIRST",
  AccountStatRealizedPnlDescNullsLast = "accountStat_realizedPnl_DESC_NULLS_LAST",
  AccountStatRealizedPriceImpactAsc = "accountStat_realizedPriceImpact_ASC",
  AccountStatRealizedPriceImpactAscNullsFirst = "accountStat_realizedPriceImpact_ASC_NULLS_FIRST",
  AccountStatRealizedPriceImpactAscNullsLast = "accountStat_realizedPriceImpact_ASC_NULLS_LAST",
  AccountStatRealizedPriceImpactDesc = "accountStat_realizedPriceImpact_DESC",
  AccountStatRealizedPriceImpactDescNullsFirst = "accountStat_realizedPriceImpact_DESC_NULLS_FIRST",
  AccountStatRealizedPriceImpactDescNullsLast = "accountStat_realizedPriceImpact_DESC_NULLS_LAST",
  AccountStatSumMaxSizeAsc = "accountStat_sumMaxSize_ASC",
  AccountStatSumMaxSizeAscNullsFirst = "accountStat_sumMaxSize_ASC_NULLS_FIRST",
  AccountStatSumMaxSizeAscNullsLast = "accountStat_sumMaxSize_ASC_NULLS_LAST",
  AccountStatSumMaxSizeDesc = "accountStat_sumMaxSize_DESC",
  AccountStatSumMaxSizeDescNullsFirst = "accountStat_sumMaxSize_DESC_NULLS_FIRST",
  AccountStatSumMaxSizeDescNullsLast = "accountStat_sumMaxSize_DESC_NULLS_LAST",
  AccountStatVolumeAsc = "accountStat_volume_ASC",
  AccountStatVolumeAscNullsFirst = "accountStat_volume_ASC_NULLS_FIRST",
  AccountStatVolumeAscNullsLast = "accountStat_volume_ASC_NULLS_LAST",
  AccountStatVolumeDesc = "accountStat_volume_DESC",
  AccountStatVolumeDescNullsFirst = "accountStat_volume_DESC_NULLS_FIRST",
  AccountStatVolumeDescNullsLast = "accountStat_volume_DESC_NULLS_LAST",
  AccountStatWinsAsc = "accountStat_wins_ASC",
  AccountStatWinsAscNullsFirst = "accountStat_wins_ASC_NULLS_FIRST",
  AccountStatWinsAscNullsLast = "accountStat_wins_ASC_NULLS_LAST",
  AccountStatWinsDesc = "accountStat_wins_DESC",
  AccountStatWinsDescNullsFirst = "accountStat_wins_DESC_NULLS_FIRST",
  AccountStatWinsDescNullsLast = "accountStat_wins_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  CollateralAmountAsc = "collateralAmount_ASC",
  CollateralAmountAscNullsFirst = "collateralAmount_ASC_NULLS_FIRST",
  CollateralAmountAscNullsLast = "collateralAmount_ASC_NULLS_LAST",
  CollateralAmountDesc = "collateralAmount_DESC",
  CollateralAmountDescNullsFirst = "collateralAmount_DESC_NULLS_FIRST",
  CollateralAmountDescNullsLast = "collateralAmount_DESC_NULLS_LAST",
  CollateralTokenAsc = "collateralToken_ASC",
  CollateralTokenAscNullsFirst = "collateralToken_ASC_NULLS_FIRST",
  CollateralTokenAscNullsLast = "collateralToken_ASC_NULLS_LAST",
  CollateralTokenDesc = "collateralToken_DESC",
  CollateralTokenDescNullsFirst = "collateralToken_DESC_NULLS_FIRST",
  CollateralTokenDescNullsLast = "collateralToken_DESC_NULLS_LAST",
  EntryPriceAsc = "entryPrice_ASC",
  EntryPriceAscNullsFirst = "entryPrice_ASC_NULLS_FIRST",
  EntryPriceAscNullsLast = "entryPrice_ASC_NULLS_LAST",
  EntryPriceDesc = "entryPrice_DESC",
  EntryPriceDescNullsFirst = "entryPrice_DESC_NULLS_FIRST",
  EntryPriceDescNullsLast = "entryPrice_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  MarketAsc = "market_ASC",
  MarketAscNullsFirst = "market_ASC_NULLS_FIRST",
  MarketAscNullsLast = "market_ASC_NULLS_LAST",
  MarketDesc = "market_DESC",
  MarketDescNullsFirst = "market_DESC_NULLS_FIRST",
  MarketDescNullsLast = "market_DESC_NULLS_LAST",
  MaxSizeAsc = "maxSize_ASC",
  MaxSizeAscNullsFirst = "maxSize_ASC_NULLS_FIRST",
  MaxSizeAscNullsLast = "maxSize_ASC_NULLS_LAST",
  MaxSizeDesc = "maxSize_DESC",
  MaxSizeDescNullsFirst = "maxSize_DESC_NULLS_FIRST",
  MaxSizeDescNullsLast = "maxSize_DESC_NULLS_LAST",
  OpenedAtAsc = "openedAt_ASC",
  OpenedAtAscNullsFirst = "openedAt_ASC_NULLS_FIRST",
  OpenedAtAscNullsLast = "openedAt_ASC_NULLS_LAST",
  OpenedAtDesc = "openedAt_DESC",
  OpenedAtDescNullsFirst = "openedAt_DESC_NULLS_FIRST",
  OpenedAtDescNullsLast = "openedAt_DESC_NULLS_LAST",
  PositionKeyAsc = "positionKey_ASC",
  PositionKeyAscNullsFirst = "positionKey_ASC_NULLS_FIRST",
  PositionKeyAscNullsLast = "positionKey_ASC_NULLS_LAST",
  PositionKeyDesc = "positionKey_DESC",
  PositionKeyDescNullsFirst = "positionKey_DESC_NULLS_FIRST",
  PositionKeyDescNullsLast = "positionKey_DESC_NULLS_LAST",
  RealizedFeesAsc = "realizedFees_ASC",
  RealizedFeesAscNullsFirst = "realizedFees_ASC_NULLS_FIRST",
  RealizedFeesAscNullsLast = "realizedFees_ASC_NULLS_LAST",
  RealizedFeesDesc = "realizedFees_DESC",
  RealizedFeesDescNullsFirst = "realizedFees_DESC_NULLS_FIRST",
  RealizedFeesDescNullsLast = "realizedFees_DESC_NULLS_LAST",
  RealizedPnlAsc = "realizedPnl_ASC",
  RealizedPnlAscNullsFirst = "realizedPnl_ASC_NULLS_FIRST",
  RealizedPnlAscNullsLast = "realizedPnl_ASC_NULLS_LAST",
  RealizedPnlDesc = "realizedPnl_DESC",
  RealizedPnlDescNullsFirst = "realizedPnl_DESC_NULLS_FIRST",
  RealizedPnlDescNullsLast = "realizedPnl_DESC_NULLS_LAST",
  RealizedPriceImpactAsc = "realizedPriceImpact_ASC",
  RealizedPriceImpactAscNullsFirst = "realizedPriceImpact_ASC_NULLS_FIRST",
  RealizedPriceImpactAscNullsLast = "realizedPriceImpact_ASC_NULLS_LAST",
  RealizedPriceImpactDesc = "realizedPriceImpact_DESC",
  RealizedPriceImpactDescNullsFirst = "realizedPriceImpact_DESC_NULLS_FIRST",
  RealizedPriceImpactDescNullsLast = "realizedPriceImpact_DESC_NULLS_LAST",
  SizeInTokensAsc = "sizeInTokens_ASC",
  SizeInTokensAscNullsFirst = "sizeInTokens_ASC_NULLS_FIRST",
  SizeInTokensAscNullsLast = "sizeInTokens_ASC_NULLS_LAST",
  SizeInTokensDesc = "sizeInTokens_DESC",
  SizeInTokensDescNullsFirst = "sizeInTokens_DESC_NULLS_FIRST",
  SizeInTokensDescNullsLast = "sizeInTokens_DESC_NULLS_LAST",
  SizeInUsdAsc = "sizeInUsd_ASC",
  SizeInUsdAscNullsFirst = "sizeInUsd_ASC_NULLS_FIRST",
  SizeInUsdAscNullsLast = "sizeInUsd_ASC_NULLS_LAST",
  SizeInUsdDesc = "sizeInUsd_DESC",
  SizeInUsdDescNullsFirst = "sizeInUsd_DESC_NULLS_FIRST",
  SizeInUsdDescNullsLast = "sizeInUsd_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
  UnrealizedFeesAsc = "unrealizedFees_ASC",
  UnrealizedFeesAscNullsFirst = "unrealizedFees_ASC_NULLS_FIRST",
  UnrealizedFeesAscNullsLast = "unrealizedFees_ASC_NULLS_LAST",
  UnrealizedFeesDesc = "unrealizedFees_DESC",
  UnrealizedFeesDescNullsFirst = "unrealizedFees_DESC_NULLS_FIRST",
  UnrealizedFeesDescNullsLast = "unrealizedFees_DESC_NULLS_LAST",
  UnrealizedPnlAsc = "unrealizedPnl_ASC",
  UnrealizedPnlAscNullsFirst = "unrealizedPnl_ASC_NULLS_FIRST",
  UnrealizedPnlAscNullsLast = "unrealizedPnl_ASC_NULLS_LAST",
  UnrealizedPnlDesc = "unrealizedPnl_DESC",
  UnrealizedPnlDescNullsFirst = "unrealizedPnl_DESC_NULLS_FIRST",
  UnrealizedPnlDescNullsLast = "unrealizedPnl_DESC_NULLS_LAST",
  UnrealizedPriceImpactAsc = "unrealizedPriceImpact_ASC",
  UnrealizedPriceImpactAscNullsFirst = "unrealizedPriceImpact_ASC_NULLS_FIRST",
  UnrealizedPriceImpactAscNullsLast = "unrealizedPriceImpact_ASC_NULLS_LAST",
  UnrealizedPriceImpactDesc = "unrealizedPriceImpact_DESC",
  UnrealizedPriceImpactDescNullsFirst = "unrealizedPriceImpact_DESC_NULLS_FIRST",
  UnrealizedPriceImpactDescNullsLast = "unrealizedPriceImpact_DESC_NULLS_LAST",
}

export type PositionTotalCollateralAmount = {
  __typename?: "PositionTotalCollateralAmount";
  amount: Scalars["BigInt"]["output"];
  token: Scalars["String"]["output"];
};

export type PositionTotalCollateralAmountWhereInput = {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
};

export type PositionVolumeByAllMarketsWhereInput = {
  timestamp: Scalars["Float"]["input"];
};

export type PositionVolumeWhereInput = {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
  timestamp: Scalars["Float"]["input"];
};

export type PositionWhereInput = {
  AND?: InputMaybe<Array<PositionWhereInput>>;
  OR?: InputMaybe<Array<PositionWhereInput>>;
  accountStat?: InputMaybe<AccountStatWhereInput>;
  accountStat_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralToken_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_gte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralToken_lt?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_lte?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  collateralToken_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  collateralToken_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  entryPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  entryPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  entryPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  entryPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_gt?: InputMaybe<Scalars["String"]["input"]>;
  market_gte?: InputMaybe<Scalars["String"]["input"]>;
  market_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  market_lt?: InputMaybe<Scalars["String"]["input"]>;
  market_lte?: InputMaybe<Scalars["String"]["input"]>;
  market_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  market_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  market_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  market_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  market_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  market_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  maxSize_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxSize_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxSize_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxSize_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  openedAt_eq?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_gt?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_gte?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  openedAt_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  openedAt_lt?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_lte?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  openedAt_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  positionKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  positionKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  positionKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  positionKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  realizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  realizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  realizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  realizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInTokens_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInTokens_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInTokens_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInTokens_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeInUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeInUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeInUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  unrealizedFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPnl_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPnl_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedPnl_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPnl_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPriceImpact_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  unrealizedPriceImpact_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  unrealizedPriceImpact_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  unrealizedPriceImpact_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
};

export type PositionsConnection = {
  __typename?: "PositionsConnection";
  edges: Array<PositionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Price = {
  __typename?: "Price";
  id: Scalars["String"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  maxPrice: Scalars["BigInt"]["output"];
  minPrice: Scalars["BigInt"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  token: Scalars["String"]["output"];
  type: PriceType;
};

export type PriceEdge = {
  __typename?: "PriceEdge";
  cursor: Scalars["String"]["output"];
  node: Price;
};

export enum PriceOrderByInput {
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IsSnapshotAsc = "isSnapshot_ASC",
  IsSnapshotAscNullsFirst = "isSnapshot_ASC_NULLS_FIRST",
  IsSnapshotAscNullsLast = "isSnapshot_ASC_NULLS_LAST",
  IsSnapshotDesc = "isSnapshot_DESC",
  IsSnapshotDescNullsFirst = "isSnapshot_DESC_NULLS_FIRST",
  IsSnapshotDescNullsLast = "isSnapshot_DESC_NULLS_LAST",
  MaxPriceAsc = "maxPrice_ASC",
  MaxPriceAscNullsFirst = "maxPrice_ASC_NULLS_FIRST",
  MaxPriceAscNullsLast = "maxPrice_ASC_NULLS_LAST",
  MaxPriceDesc = "maxPrice_DESC",
  MaxPriceDescNullsFirst = "maxPrice_DESC_NULLS_FIRST",
  MaxPriceDescNullsLast = "maxPrice_DESC_NULLS_LAST",
  MinPriceAsc = "minPrice_ASC",
  MinPriceAscNullsFirst = "minPrice_ASC_NULLS_FIRST",
  MinPriceAscNullsLast = "minPrice_ASC_NULLS_LAST",
  MinPriceDesc = "minPrice_DESC",
  MinPriceDescNullsFirst = "minPrice_DESC_NULLS_FIRST",
  MinPriceDescNullsLast = "minPrice_DESC_NULLS_LAST",
  SnapshotTimestampAsc = "snapshotTimestamp_ASC",
  SnapshotTimestampAscNullsFirst = "snapshotTimestamp_ASC_NULLS_FIRST",
  SnapshotTimestampAscNullsLast = "snapshotTimestamp_ASC_NULLS_LAST",
  SnapshotTimestampDesc = "snapshotTimestamp_DESC",
  SnapshotTimestampDescNullsFirst = "snapshotTimestamp_DESC_NULLS_FIRST",
  SnapshotTimestampDescNullsLast = "snapshotTimestamp_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TokenAsc = "token_ASC",
  TokenAscNullsFirst = "token_ASC_NULLS_FIRST",
  TokenAscNullsLast = "token_ASC_NULLS_LAST",
  TokenDesc = "token_DESC",
  TokenDescNullsFirst = "token_DESC_NULLS_FIRST",
  TokenDescNullsLast = "token_DESC_NULLS_LAST",
  TypeAsc = "type_ASC",
  TypeAscNullsFirst = "type_ASC_NULLS_FIRST",
  TypeAscNullsLast = "type_ASC_NULLS_LAST",
  TypeDesc = "type_DESC",
  TypeDescNullsFirst = "type_DESC_NULLS_FIRST",
  TypeDescNullsLast = "type_DESC_NULLS_LAST",
}

export enum PriceType {
  Glv = "glv",
  Gm = "gm",
  OnchainFeed = "onchainFeed",
  V2 = "v2",
}

export type PriceWhereInput = {
  AND?: InputMaybe<Array<PriceWhereInput>>;
  OR?: InputMaybe<Array<PriceWhereInput>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isSnapshot_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isSnapshot_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  maxPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  maxPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  maxPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  snapshotTimestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  snapshotTimestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  snapshotTimestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  snapshotTimestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  token_contains?: InputMaybe<Scalars["String"]["input"]>;
  token_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  token_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_eq?: InputMaybe<Scalars["String"]["input"]>;
  token_gt?: InputMaybe<Scalars["String"]["input"]>;
  token_gte?: InputMaybe<Scalars["String"]["input"]>;
  token_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  token_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  token_lt?: InputMaybe<Scalars["String"]["input"]>;
  token_lte?: InputMaybe<Scalars["String"]["input"]>;
  token_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  token_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  token_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  token_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  token_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  token_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  type_eq?: InputMaybe<PriceType>;
  type_in?: InputMaybe<Array<PriceType>>;
  type_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  type_not_eq?: InputMaybe<PriceType>;
  type_not_in?: InputMaybe<Array<PriceType>>;
};

export type PricesConnection = {
  __typename?: "PricesConnection";
  edges: Array<PriceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Query = {
  __typename?: "Query";
  accountPnlHistoryStats: Array<AccountPnlHistoryPointObject>;
  accountPnlSummaryStats: Array<AccountPnlSummaryBucketObject>;
  accountStatById?: Maybe<AccountStat>;
  accountStats: Array<AccountStat>;
  accountStatsConnection: AccountStatsConnection;
  aprSnapshotById?: Maybe<AprSnapshot>;
  aprSnapshots: Array<AprSnapshot>;
  aprSnapshotsConnection: AprSnapshotsConnection;
  borrowingRateSnapshotById?: Maybe<BorrowingRateSnapshot>;
  borrowingRateSnapshots: Array<BorrowingRateSnapshot>;
  borrowingRateSnapshotsConnection: BorrowingRateSnapshotsConnection;
  claimActionById?: Maybe<ClaimAction>;
  claimActions: Array<ClaimAction>;
  claimActionsConnection: ClaimActionsConnection;
  claimRefById?: Maybe<ClaimRef>;
  claimRefs: Array<ClaimRef>;
  claimRefsConnection: ClaimRefsConnection;
  claimableFundingFeeInfoById?: Maybe<ClaimableFundingFeeInfo>;
  claimableFundingFeeInfos: Array<ClaimableFundingFeeInfo>;
  claimableFundingFeeInfosConnection: ClaimableFundingFeeInfosConnection;
  collectedFeesInfoById?: Maybe<CollectedFeesInfo>;
  collectedFeesInfos: Array<CollectedFeesInfo>;
  collectedFeesInfosConnection: CollectedFeesInfosConnection;
  cumulativePoolValueById?: Maybe<CumulativePoolValue>;
  cumulativePoolValues: Array<CumulativePoolValue>;
  cumulativePoolValuesConnection: CumulativePoolValuesConnection;
  glvById?: Maybe<Glv>;
  glvs: Array<Glv>;
  glvsAprByPeriod: Array<GlvApr>;
  glvsConnection: GlvsConnection;
  marketById?: Maybe<Market>;
  marketInfoById?: Maybe<MarketInfo>;
  marketInfos: Array<MarketInfo>;
  marketInfosConnection: MarketInfosConnection;
  markets: Array<Market>;
  marketsAprByPeriod: Array<MarketApr>;
  marketsConnection: MarketsConnection;
  onChainSettingById?: Maybe<OnChainSetting>;
  onChainSettings: Array<OnChainSetting>;
  onChainSettingsConnection: OnChainSettingsConnection;
  orderById?: Maybe<Order>;
  orders: Array<Order>;
  ordersConnection: OrdersConnection;
  periodAccountStats: Array<PeriodAccountStatObject>;
  positionById?: Maybe<Position>;
  positionChangeById?: Maybe<PositionChange>;
  positionChanges: Array<PositionChange>;
  positionChangesConnection: PositionChangesConnection;
  positionFeesEntities: Array<PositionFeesEntity>;
  positionFeesEntitiesConnection: PositionFeesEntitiesConnection;
  positionFeesEntityById?: Maybe<PositionFeesEntity>;
  positionTotalCollateralAmount: Array<PositionTotalCollateralAmount>;
  positions: Array<Position>;
  positionsConnection: PositionsConnection;
  positionsVolume: Array<PositionMarketVolumeInfo>;
  positionsVolume24hByMarket: Scalars["BigInt"]["output"];
  priceById?: Maybe<Price>;
  prices: Array<Price>;
  pricesConnection: PricesConnection;
  squidStatus?: Maybe<SquidStatus>;
  swapInfoById?: Maybe<SwapInfo>;
  swapInfos: Array<SwapInfo>;
  swapInfosConnection: SwapInfosConnection;
  totalPositionChanges: Scalars["Float"]["output"];
  tradeActionById?: Maybe<TradeAction>;
  tradeActions: Array<TradeAction>;
  tradeActionsConnection: TradeActionsConnection;
  transactionById?: Maybe<Transaction>;
  transactions: Array<Transaction>;
  transactionsConnection: TransactionsConnection;
};

export type QueryAccountPnlHistoryStatsArgs = {
  account: Scalars["String"]["input"];
  from?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryAccountPnlSummaryStatsArgs = {
  account: Scalars["String"]["input"];
};

export type QueryAccountStatByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryAccountStatsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AccountStatOrderByInput>>;
  where?: InputMaybe<AccountStatWhereInput>;
};

export type QueryAccountStatsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AccountStatOrderByInput>;
  where?: InputMaybe<AccountStatWhereInput>;
};

export type QueryAprSnapshotByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryAprSnapshotsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AprSnapshotOrderByInput>>;
  where?: InputMaybe<AprSnapshotWhereInput>;
};

export type QueryAprSnapshotsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AprSnapshotOrderByInput>;
  where?: InputMaybe<AprSnapshotWhereInput>;
};

export type QueryBorrowingRateSnapshotByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryBorrowingRateSnapshotsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<BorrowingRateSnapshotOrderByInput>>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
};

export type QueryBorrowingRateSnapshotsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<BorrowingRateSnapshotOrderByInput>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
};

export type QueryClaimActionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimActionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimActionOrderByInput>>;
  where?: InputMaybe<ClaimActionWhereInput>;
};

export type QueryClaimActionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimActionOrderByInput>;
  where?: InputMaybe<ClaimActionWhereInput>;
};

export type QueryClaimRefByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimRefsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimRefOrderByInput>>;
  where?: InputMaybe<ClaimRefWhereInput>;
};

export type QueryClaimRefsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimRefOrderByInput>;
  where?: InputMaybe<ClaimRefWhereInput>;
};

export type QueryClaimableFundingFeeInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryClaimableFundingFeeInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimableFundingFeeInfoOrderByInput>>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
};

export type QueryClaimableFundingFeeInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimableFundingFeeInfoOrderByInput>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
};

export type QueryCollectedFeesInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryCollectedFeesInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CollectedFeesInfoOrderByInput>>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
};

export type QueryCollectedFeesInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CollectedFeesInfoOrderByInput>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
};

export type QueryCumulativePoolValueByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryCumulativePoolValuesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CumulativePoolValueOrderByInput>>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
};

export type QueryCumulativePoolValuesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CumulativePoolValueOrderByInput>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
};

export type QueryGlvByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryGlvsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<GlvOrderByInput>>;
  where?: InputMaybe<GlvWhereInput>;
};

export type QueryGlvsAprByPeriodArgs = {
  where?: InputMaybe<GlvAprsWhereInputWhereInput>;
};

export type QueryGlvsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<GlvOrderByInput>;
  where?: InputMaybe<GlvWhereInput>;
};

export type QueryMarketByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryMarketInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryMarketInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketInfoOrderByInput>>;
  where?: InputMaybe<MarketInfoWhereInput>;
};

export type QueryMarketInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketInfoOrderByInput>;
  where?: InputMaybe<MarketInfoWhereInput>;
};

export type QueryMarketsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketOrderByInput>>;
  where?: InputMaybe<MarketWhereInput>;
};

export type QueryMarketsAprByPeriodArgs = {
  where?: InputMaybe<MarketAprsWhereInput>;
};

export type QueryMarketsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketOrderByInput>;
  where?: InputMaybe<MarketWhereInput>;
};

export type QueryOnChainSettingByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryOnChainSettingsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OnChainSettingOrderByInput>>;
  where?: InputMaybe<OnChainSettingWhereInput>;
};

export type QueryOnChainSettingsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OnChainSettingOrderByInput>;
  where?: InputMaybe<OnChainSettingWhereInput>;
};

export type QueryOrderByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryOrdersArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OrderOrderByInput>>;
  where?: InputMaybe<OrderWhereInput>;
};

export type QueryOrdersConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OrderOrderByInput>;
  where?: InputMaybe<OrderWhereInput>;
};

export type QueryPeriodAccountStatsArgs = {
  limit?: InputMaybe<Scalars["Float"]["input"]>;
  offset?: InputMaybe<Scalars["Float"]["input"]>;
  where?: InputMaybe<WhereInput>;
};

export type QueryPositionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionChangeByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionChangesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionChangeOrderByInput>>;
  where?: InputMaybe<PositionChangeWhereInput>;
};

export type QueryPositionChangesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionChangeOrderByInput>;
  where?: InputMaybe<PositionChangeWhereInput>;
};

export type QueryPositionFeesEntitiesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionFeesEntityOrderByInput>>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
};

export type QueryPositionFeesEntitiesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionFeesEntityOrderByInput>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
};

export type QueryPositionFeesEntityByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPositionTotalCollateralAmountArgs = {
  where?: InputMaybe<PositionTotalCollateralAmountWhereInput>;
};

export type QueryPositionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
};

export type QueryPositionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionOrderByInput>;
  where?: InputMaybe<PositionWhereInput>;
};

export type QueryPositionsVolumeArgs = {
  where?: InputMaybe<PositionVolumeByAllMarketsWhereInput>;
};

export type QueryPositionsVolume24hByMarketArgs = {
  where?: InputMaybe<PositionVolumeWhereInput>;
};

export type QueryPriceByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryPricesArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PriceOrderByInput>>;
  where?: InputMaybe<PriceWhereInput>;
};

export type QueryPricesConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PriceOrderByInput>;
  where?: InputMaybe<PriceWhereInput>;
};

export type QuerySwapInfoByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QuerySwapInfosArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<SwapInfoOrderByInput>>;
  where?: InputMaybe<SwapInfoWhereInput>;
};

export type QuerySwapInfosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<SwapInfoOrderByInput>;
  where?: InputMaybe<SwapInfoWhereInput>;
};

export type QueryTradeActionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryTradeActionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TradeActionOrderByInput>>;
  where?: InputMaybe<TradeActionWhereInput>;
};

export type QueryTradeActionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TradeActionOrderByInput>;
  where?: InputMaybe<TradeActionWhereInput>;
};

export type QueryTransactionByIdArgs = {
  id: Scalars["String"]["input"];
};

export type QueryTransactionsArgs = {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TransactionOrderByInput>>;
  where?: InputMaybe<TransactionWhereInput>;
};

export type QueryTransactionsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TransactionOrderByInput>;
  where?: InputMaybe<TransactionWhereInput>;
};

export type SquidStatus = {
  __typename?: "SquidStatus";
  /** The hash of the last processed finalized block */
  finalizedHash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed finalized block */
  finalizedHeight?: Maybe<Scalars["Int"]["output"]>;
  /** The hash of the last processed block */
  hash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed block */
  height?: Maybe<Scalars["Int"]["output"]>;
};

export type SwapInfo = {
  __typename?: "SwapInfo";
  amountIn: Scalars["BigInt"]["output"];
  amountInAfterFees: Scalars["BigInt"]["output"];
  amountOut: Scalars["BigInt"]["output"];
  id: Scalars["String"]["output"];
  marketAddress: Scalars["String"]["output"];
  orderKey: Scalars["String"]["output"];
  priceImpactUsd: Scalars["BigInt"]["output"];
  receiver: Scalars["String"]["output"];
  tokenInAddress: Scalars["String"]["output"];
  tokenInPrice: Scalars["BigInt"]["output"];
  tokenOutAddress: Scalars["String"]["output"];
  tokenOutPrice: Scalars["BigInt"]["output"];
  transaction: Transaction;
};

export type SwapInfoEdge = {
  __typename?: "SwapInfoEdge";
  cursor: Scalars["String"]["output"];
  node: SwapInfo;
};

export enum SwapInfoOrderByInput {
  AmountInAfterFeesAsc = "amountInAfterFees_ASC",
  AmountInAfterFeesAscNullsFirst = "amountInAfterFees_ASC_NULLS_FIRST",
  AmountInAfterFeesAscNullsLast = "amountInAfterFees_ASC_NULLS_LAST",
  AmountInAfterFeesDesc = "amountInAfterFees_DESC",
  AmountInAfterFeesDescNullsFirst = "amountInAfterFees_DESC_NULLS_FIRST",
  AmountInAfterFeesDescNullsLast = "amountInAfterFees_DESC_NULLS_LAST",
  AmountInAsc = "amountIn_ASC",
  AmountInAscNullsFirst = "amountIn_ASC_NULLS_FIRST",
  AmountInAscNullsLast = "amountIn_ASC_NULLS_LAST",
  AmountInDesc = "amountIn_DESC",
  AmountInDescNullsFirst = "amountIn_DESC_NULLS_FIRST",
  AmountInDescNullsLast = "amountIn_DESC_NULLS_LAST",
  AmountOutAsc = "amountOut_ASC",
  AmountOutAscNullsFirst = "amountOut_ASC_NULLS_FIRST",
  AmountOutAscNullsLast = "amountOut_ASC_NULLS_LAST",
  AmountOutDesc = "amountOut_DESC",
  AmountOutDescNullsFirst = "amountOut_DESC_NULLS_FIRST",
  AmountOutDescNullsLast = "amountOut_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  ReceiverAsc = "receiver_ASC",
  ReceiverAscNullsFirst = "receiver_ASC_NULLS_FIRST",
  ReceiverAscNullsLast = "receiver_ASC_NULLS_LAST",
  ReceiverDesc = "receiver_DESC",
  ReceiverDescNullsFirst = "receiver_DESC_NULLS_FIRST",
  ReceiverDescNullsLast = "receiver_DESC_NULLS_LAST",
  TokenInAddressAsc = "tokenInAddress_ASC",
  TokenInAddressAscNullsFirst = "tokenInAddress_ASC_NULLS_FIRST",
  TokenInAddressAscNullsLast = "tokenInAddress_ASC_NULLS_LAST",
  TokenInAddressDesc = "tokenInAddress_DESC",
  TokenInAddressDescNullsFirst = "tokenInAddress_DESC_NULLS_FIRST",
  TokenInAddressDescNullsLast = "tokenInAddress_DESC_NULLS_LAST",
  TokenInPriceAsc = "tokenInPrice_ASC",
  TokenInPriceAscNullsFirst = "tokenInPrice_ASC_NULLS_FIRST",
  TokenInPriceAscNullsLast = "tokenInPrice_ASC_NULLS_LAST",
  TokenInPriceDesc = "tokenInPrice_DESC",
  TokenInPriceDescNullsFirst = "tokenInPrice_DESC_NULLS_FIRST",
  TokenInPriceDescNullsLast = "tokenInPrice_DESC_NULLS_LAST",
  TokenOutAddressAsc = "tokenOutAddress_ASC",
  TokenOutAddressAscNullsFirst = "tokenOutAddress_ASC_NULLS_FIRST",
  TokenOutAddressAscNullsLast = "tokenOutAddress_ASC_NULLS_LAST",
  TokenOutAddressDesc = "tokenOutAddress_DESC",
  TokenOutAddressDescNullsFirst = "tokenOutAddress_DESC_NULLS_FIRST",
  TokenOutAddressDescNullsLast = "tokenOutAddress_DESC_NULLS_LAST",
  TokenOutPriceAsc = "tokenOutPrice_ASC",
  TokenOutPriceAscNullsFirst = "tokenOutPrice_ASC_NULLS_FIRST",
  TokenOutPriceAscNullsLast = "tokenOutPrice_ASC_NULLS_LAST",
  TokenOutPriceDesc = "tokenOutPrice_DESC",
  TokenOutPriceDescNullsFirst = "tokenOutPrice_DESC_NULLS_FIRST",
  TokenOutPriceDescNullsLast = "tokenOutPrice_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export type SwapInfoWhereInput = {
  AND?: InputMaybe<Array<SwapInfoWhereInput>>;
  OR?: InputMaybe<Array<SwapInfoWhereInput>>;
  amountInAfterFees_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountInAfterFees_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountInAfterFees_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountInAfterFees_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountIn_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountIn_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountIn_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountIn_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountOut_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  amountOut_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  amountOut_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  amountOut_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  receiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  receiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  receiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  receiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  receiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  receiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenInAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenInAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenInAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenInPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenInPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenInPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenInPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenOutAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenOutAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenOutAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  tokenOutAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  tokenOutPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  tokenOutPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  tokenOutPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  tokenOutPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type SwapInfosConnection = {
  __typename?: "SwapInfosConnection";
  edges: Array<SwapInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type TradeAction = {
  __typename?: "TradeAction";
  acceptablePrice?: Maybe<Scalars["BigInt"]["output"]>;
  account: Scalars["String"]["output"];
  basePnlUsd?: Maybe<Scalars["BigInt"]["output"]>;
  borrowingFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  collateralTokenPriceMax?: Maybe<Scalars["BigInt"]["output"]>;
  collateralTokenPriceMin?: Maybe<Scalars["BigInt"]["output"]>;
  contractTriggerPrice?: Maybe<Scalars["BigInt"]["output"]>;
  eventName: Scalars["String"]["output"];
  executionAmountOut?: Maybe<Scalars["BigInt"]["output"]>;
  executionPrice?: Maybe<Scalars["BigInt"]["output"]>;
  fundingFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  id: Scalars["String"]["output"];
  indexTokenPriceMax?: Maybe<Scalars["BigInt"]["output"]>;
  indexTokenPriceMin?: Maybe<Scalars["BigInt"]["output"]>;
  initialCollateralDeltaAmount: Scalars["BigInt"]["output"];
  initialCollateralTokenAddress: Scalars["String"]["output"];
  isLong?: Maybe<Scalars["Boolean"]["output"]>;
  liquidationFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  marketAddress?: Maybe<Scalars["String"]["output"]>;
  minOutputAmount?: Maybe<Scalars["BigInt"]["output"]>;
  numberOfParts?: Maybe<Scalars["Int"]["output"]>;
  orderKey: Scalars["String"]["output"];
  orderType: Scalars["Int"]["output"];
  pnlUsd?: Maybe<Scalars["BigInt"]["output"]>;
  positionFeeAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactAmount?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactDiffUsd?: Maybe<Scalars["BigInt"]["output"]>;
  priceImpactUsd?: Maybe<Scalars["BigInt"]["output"]>;
  reason?: Maybe<Scalars["String"]["output"]>;
  reasonBytes?: Maybe<Scalars["String"]["output"]>;
  shouldUnwrapNativeToken?: Maybe<Scalars["Boolean"]["output"]>;
  sizeDeltaUsd?: Maybe<Scalars["BigInt"]["output"]>;
  swapPath: Array<Scalars["String"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  transaction: Transaction;
  triggerPrice?: Maybe<Scalars["BigInt"]["output"]>;
  twapGroupId?: Maybe<Scalars["String"]["output"]>;
  uiFeeReceiver: Scalars["String"]["output"];
};

export type TradeActionEdge = {
  __typename?: "TradeActionEdge";
  cursor: Scalars["String"]["output"];
  node: TradeAction;
};

export enum TradeActionOrderByInput {
  AcceptablePriceAsc = "acceptablePrice_ASC",
  AcceptablePriceAscNullsFirst = "acceptablePrice_ASC_NULLS_FIRST",
  AcceptablePriceAscNullsLast = "acceptablePrice_ASC_NULLS_LAST",
  AcceptablePriceDesc = "acceptablePrice_DESC",
  AcceptablePriceDescNullsFirst = "acceptablePrice_DESC_NULLS_FIRST",
  AcceptablePriceDescNullsLast = "acceptablePrice_DESC_NULLS_LAST",
  AccountAsc = "account_ASC",
  AccountAscNullsFirst = "account_ASC_NULLS_FIRST",
  AccountAscNullsLast = "account_ASC_NULLS_LAST",
  AccountDesc = "account_DESC",
  AccountDescNullsFirst = "account_DESC_NULLS_FIRST",
  AccountDescNullsLast = "account_DESC_NULLS_LAST",
  BasePnlUsdAsc = "basePnlUsd_ASC",
  BasePnlUsdAscNullsFirst = "basePnlUsd_ASC_NULLS_FIRST",
  BasePnlUsdAscNullsLast = "basePnlUsd_ASC_NULLS_LAST",
  BasePnlUsdDesc = "basePnlUsd_DESC",
  BasePnlUsdDescNullsFirst = "basePnlUsd_DESC_NULLS_FIRST",
  BasePnlUsdDescNullsLast = "basePnlUsd_DESC_NULLS_LAST",
  BorrowingFeeAmountAsc = "borrowingFeeAmount_ASC",
  BorrowingFeeAmountAscNullsFirst = "borrowingFeeAmount_ASC_NULLS_FIRST",
  BorrowingFeeAmountAscNullsLast = "borrowingFeeAmount_ASC_NULLS_LAST",
  BorrowingFeeAmountDesc = "borrowingFeeAmount_DESC",
  BorrowingFeeAmountDescNullsFirst = "borrowingFeeAmount_DESC_NULLS_FIRST",
  BorrowingFeeAmountDescNullsLast = "borrowingFeeAmount_DESC_NULLS_LAST",
  CollateralTokenPriceMaxAsc = "collateralTokenPriceMax_ASC",
  CollateralTokenPriceMaxAscNullsFirst = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  CollateralTokenPriceMaxAscNullsLast = "collateralTokenPriceMax_ASC_NULLS_LAST",
  CollateralTokenPriceMaxDesc = "collateralTokenPriceMax_DESC",
  CollateralTokenPriceMaxDescNullsFirst = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  CollateralTokenPriceMaxDescNullsLast = "collateralTokenPriceMax_DESC_NULLS_LAST",
  CollateralTokenPriceMinAsc = "collateralTokenPriceMin_ASC",
  CollateralTokenPriceMinAscNullsFirst = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  CollateralTokenPriceMinAscNullsLast = "collateralTokenPriceMin_ASC_NULLS_LAST",
  CollateralTokenPriceMinDesc = "collateralTokenPriceMin_DESC",
  CollateralTokenPriceMinDescNullsFirst = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  CollateralTokenPriceMinDescNullsLast = "collateralTokenPriceMin_DESC_NULLS_LAST",
  ContractTriggerPriceAsc = "contractTriggerPrice_ASC",
  ContractTriggerPriceAscNullsFirst = "contractTriggerPrice_ASC_NULLS_FIRST",
  ContractTriggerPriceAscNullsLast = "contractTriggerPrice_ASC_NULLS_LAST",
  ContractTriggerPriceDesc = "contractTriggerPrice_DESC",
  ContractTriggerPriceDescNullsFirst = "contractTriggerPrice_DESC_NULLS_FIRST",
  ContractTriggerPriceDescNullsLast = "contractTriggerPrice_DESC_NULLS_LAST",
  EventNameAsc = "eventName_ASC",
  EventNameAscNullsFirst = "eventName_ASC_NULLS_FIRST",
  EventNameAscNullsLast = "eventName_ASC_NULLS_LAST",
  EventNameDesc = "eventName_DESC",
  EventNameDescNullsFirst = "eventName_DESC_NULLS_FIRST",
  EventNameDescNullsLast = "eventName_DESC_NULLS_LAST",
  ExecutionAmountOutAsc = "executionAmountOut_ASC",
  ExecutionAmountOutAscNullsFirst = "executionAmountOut_ASC_NULLS_FIRST",
  ExecutionAmountOutAscNullsLast = "executionAmountOut_ASC_NULLS_LAST",
  ExecutionAmountOutDesc = "executionAmountOut_DESC",
  ExecutionAmountOutDescNullsFirst = "executionAmountOut_DESC_NULLS_FIRST",
  ExecutionAmountOutDescNullsLast = "executionAmountOut_DESC_NULLS_LAST",
  ExecutionPriceAsc = "executionPrice_ASC",
  ExecutionPriceAscNullsFirst = "executionPrice_ASC_NULLS_FIRST",
  ExecutionPriceAscNullsLast = "executionPrice_ASC_NULLS_LAST",
  ExecutionPriceDesc = "executionPrice_DESC",
  ExecutionPriceDescNullsFirst = "executionPrice_DESC_NULLS_FIRST",
  ExecutionPriceDescNullsLast = "executionPrice_DESC_NULLS_LAST",
  FundingFeeAmountAsc = "fundingFeeAmount_ASC",
  FundingFeeAmountAscNullsFirst = "fundingFeeAmount_ASC_NULLS_FIRST",
  FundingFeeAmountAscNullsLast = "fundingFeeAmount_ASC_NULLS_LAST",
  FundingFeeAmountDesc = "fundingFeeAmount_DESC",
  FundingFeeAmountDescNullsFirst = "fundingFeeAmount_DESC_NULLS_FIRST",
  FundingFeeAmountDescNullsLast = "fundingFeeAmount_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  IndexTokenPriceMaxAsc = "indexTokenPriceMax_ASC",
  IndexTokenPriceMaxAscNullsFirst = "indexTokenPriceMax_ASC_NULLS_FIRST",
  IndexTokenPriceMaxAscNullsLast = "indexTokenPriceMax_ASC_NULLS_LAST",
  IndexTokenPriceMaxDesc = "indexTokenPriceMax_DESC",
  IndexTokenPriceMaxDescNullsFirst = "indexTokenPriceMax_DESC_NULLS_FIRST",
  IndexTokenPriceMaxDescNullsLast = "indexTokenPriceMax_DESC_NULLS_LAST",
  IndexTokenPriceMinAsc = "indexTokenPriceMin_ASC",
  IndexTokenPriceMinAscNullsFirst = "indexTokenPriceMin_ASC_NULLS_FIRST",
  IndexTokenPriceMinAscNullsLast = "indexTokenPriceMin_ASC_NULLS_LAST",
  IndexTokenPriceMinDesc = "indexTokenPriceMin_DESC",
  IndexTokenPriceMinDescNullsFirst = "indexTokenPriceMin_DESC_NULLS_FIRST",
  IndexTokenPriceMinDescNullsLast = "indexTokenPriceMin_DESC_NULLS_LAST",
  InitialCollateralDeltaAmountAsc = "initialCollateralDeltaAmount_ASC",
  InitialCollateralDeltaAmountAscNullsFirst = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  InitialCollateralDeltaAmountAscNullsLast = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  InitialCollateralDeltaAmountDesc = "initialCollateralDeltaAmount_DESC",
  InitialCollateralDeltaAmountDescNullsFirst = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  InitialCollateralDeltaAmountDescNullsLast = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  InitialCollateralTokenAddressAsc = "initialCollateralTokenAddress_ASC",
  InitialCollateralTokenAddressAscNullsFirst = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  InitialCollateralTokenAddressAscNullsLast = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  InitialCollateralTokenAddressDesc = "initialCollateralTokenAddress_DESC",
  InitialCollateralTokenAddressDescNullsFirst = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  InitialCollateralTokenAddressDescNullsLast = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  IsLongAsc = "isLong_ASC",
  IsLongAscNullsFirst = "isLong_ASC_NULLS_FIRST",
  IsLongAscNullsLast = "isLong_ASC_NULLS_LAST",
  IsLongDesc = "isLong_DESC",
  IsLongDescNullsFirst = "isLong_DESC_NULLS_FIRST",
  IsLongDescNullsLast = "isLong_DESC_NULLS_LAST",
  LiquidationFeeAmountAsc = "liquidationFeeAmount_ASC",
  LiquidationFeeAmountAscNullsFirst = "liquidationFeeAmount_ASC_NULLS_FIRST",
  LiquidationFeeAmountAscNullsLast = "liquidationFeeAmount_ASC_NULLS_LAST",
  LiquidationFeeAmountDesc = "liquidationFeeAmount_DESC",
  LiquidationFeeAmountDescNullsFirst = "liquidationFeeAmount_DESC_NULLS_FIRST",
  LiquidationFeeAmountDescNullsLast = "liquidationFeeAmount_DESC_NULLS_LAST",
  MarketAddressAsc = "marketAddress_ASC",
  MarketAddressAscNullsFirst = "marketAddress_ASC_NULLS_FIRST",
  MarketAddressAscNullsLast = "marketAddress_ASC_NULLS_LAST",
  MarketAddressDesc = "marketAddress_DESC",
  MarketAddressDescNullsFirst = "marketAddress_DESC_NULLS_FIRST",
  MarketAddressDescNullsLast = "marketAddress_DESC_NULLS_LAST",
  MinOutputAmountAsc = "minOutputAmount_ASC",
  MinOutputAmountAscNullsFirst = "minOutputAmount_ASC_NULLS_FIRST",
  MinOutputAmountAscNullsLast = "minOutputAmount_ASC_NULLS_LAST",
  MinOutputAmountDesc = "minOutputAmount_DESC",
  MinOutputAmountDescNullsFirst = "minOutputAmount_DESC_NULLS_FIRST",
  MinOutputAmountDescNullsLast = "minOutputAmount_DESC_NULLS_LAST",
  NumberOfPartsAsc = "numberOfParts_ASC",
  NumberOfPartsAscNullsFirst = "numberOfParts_ASC_NULLS_FIRST",
  NumberOfPartsAscNullsLast = "numberOfParts_ASC_NULLS_LAST",
  NumberOfPartsDesc = "numberOfParts_DESC",
  NumberOfPartsDescNullsFirst = "numberOfParts_DESC_NULLS_FIRST",
  NumberOfPartsDescNullsLast = "numberOfParts_DESC_NULLS_LAST",
  OrderKeyAsc = "orderKey_ASC",
  OrderKeyAscNullsFirst = "orderKey_ASC_NULLS_FIRST",
  OrderKeyAscNullsLast = "orderKey_ASC_NULLS_LAST",
  OrderKeyDesc = "orderKey_DESC",
  OrderKeyDescNullsFirst = "orderKey_DESC_NULLS_FIRST",
  OrderKeyDescNullsLast = "orderKey_DESC_NULLS_LAST",
  OrderTypeAsc = "orderType_ASC",
  OrderTypeAscNullsFirst = "orderType_ASC_NULLS_FIRST",
  OrderTypeAscNullsLast = "orderType_ASC_NULLS_LAST",
  OrderTypeDesc = "orderType_DESC",
  OrderTypeDescNullsFirst = "orderType_DESC_NULLS_FIRST",
  OrderTypeDescNullsLast = "orderType_DESC_NULLS_LAST",
  PnlUsdAsc = "pnlUsd_ASC",
  PnlUsdAscNullsFirst = "pnlUsd_ASC_NULLS_FIRST",
  PnlUsdAscNullsLast = "pnlUsd_ASC_NULLS_LAST",
  PnlUsdDesc = "pnlUsd_DESC",
  PnlUsdDescNullsFirst = "pnlUsd_DESC_NULLS_FIRST",
  PnlUsdDescNullsLast = "pnlUsd_DESC_NULLS_LAST",
  PositionFeeAmountAsc = "positionFeeAmount_ASC",
  PositionFeeAmountAscNullsFirst = "positionFeeAmount_ASC_NULLS_FIRST",
  PositionFeeAmountAscNullsLast = "positionFeeAmount_ASC_NULLS_LAST",
  PositionFeeAmountDesc = "positionFeeAmount_DESC",
  PositionFeeAmountDescNullsFirst = "positionFeeAmount_DESC_NULLS_FIRST",
  PositionFeeAmountDescNullsLast = "positionFeeAmount_DESC_NULLS_LAST",
  PriceImpactAmountAsc = "priceImpactAmount_ASC",
  PriceImpactAmountAscNullsFirst = "priceImpactAmount_ASC_NULLS_FIRST",
  PriceImpactAmountAscNullsLast = "priceImpactAmount_ASC_NULLS_LAST",
  PriceImpactAmountDesc = "priceImpactAmount_DESC",
  PriceImpactAmountDescNullsFirst = "priceImpactAmount_DESC_NULLS_FIRST",
  PriceImpactAmountDescNullsLast = "priceImpactAmount_DESC_NULLS_LAST",
  PriceImpactDiffUsdAsc = "priceImpactDiffUsd_ASC",
  PriceImpactDiffUsdAscNullsFirst = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  PriceImpactDiffUsdAscNullsLast = "priceImpactDiffUsd_ASC_NULLS_LAST",
  PriceImpactDiffUsdDesc = "priceImpactDiffUsd_DESC",
  PriceImpactDiffUsdDescNullsFirst = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  PriceImpactDiffUsdDescNullsLast = "priceImpactDiffUsd_DESC_NULLS_LAST",
  PriceImpactUsdAsc = "priceImpactUsd_ASC",
  PriceImpactUsdAscNullsFirst = "priceImpactUsd_ASC_NULLS_FIRST",
  PriceImpactUsdAscNullsLast = "priceImpactUsd_ASC_NULLS_LAST",
  PriceImpactUsdDesc = "priceImpactUsd_DESC",
  PriceImpactUsdDescNullsFirst = "priceImpactUsd_DESC_NULLS_FIRST",
  PriceImpactUsdDescNullsLast = "priceImpactUsd_DESC_NULLS_LAST",
  ReasonBytesAsc = "reasonBytes_ASC",
  ReasonBytesAscNullsFirst = "reasonBytes_ASC_NULLS_FIRST",
  ReasonBytesAscNullsLast = "reasonBytes_ASC_NULLS_LAST",
  ReasonBytesDesc = "reasonBytes_DESC",
  ReasonBytesDescNullsFirst = "reasonBytes_DESC_NULLS_FIRST",
  ReasonBytesDescNullsLast = "reasonBytes_DESC_NULLS_LAST",
  ReasonAsc = "reason_ASC",
  ReasonAscNullsFirst = "reason_ASC_NULLS_FIRST",
  ReasonAscNullsLast = "reason_ASC_NULLS_LAST",
  ReasonDesc = "reason_DESC",
  ReasonDescNullsFirst = "reason_DESC_NULLS_FIRST",
  ReasonDescNullsLast = "reason_DESC_NULLS_LAST",
  ShouldUnwrapNativeTokenAsc = "shouldUnwrapNativeToken_ASC",
  ShouldUnwrapNativeTokenAscNullsFirst = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  ShouldUnwrapNativeTokenAscNullsLast = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  ShouldUnwrapNativeTokenDesc = "shouldUnwrapNativeToken_DESC",
  ShouldUnwrapNativeTokenDescNullsFirst = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  ShouldUnwrapNativeTokenDescNullsLast = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  SizeDeltaUsdAsc = "sizeDeltaUsd_ASC",
  SizeDeltaUsdAscNullsFirst = "sizeDeltaUsd_ASC_NULLS_FIRST",
  SizeDeltaUsdAscNullsLast = "sizeDeltaUsd_ASC_NULLS_LAST",
  SizeDeltaUsdDesc = "sizeDeltaUsd_DESC",
  SizeDeltaUsdDescNullsFirst = "sizeDeltaUsd_DESC_NULLS_FIRST",
  SizeDeltaUsdDescNullsLast = "sizeDeltaUsd_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  TransactionBlockNumberAsc = "transaction_blockNumber_ASC",
  TransactionBlockNumberAscNullsFirst = "transaction_blockNumber_ASC_NULLS_FIRST",
  TransactionBlockNumberAscNullsLast = "transaction_blockNumber_ASC_NULLS_LAST",
  TransactionBlockNumberDesc = "transaction_blockNumber_DESC",
  TransactionBlockNumberDescNullsFirst = "transaction_blockNumber_DESC_NULLS_FIRST",
  TransactionBlockNumberDescNullsLast = "transaction_blockNumber_DESC_NULLS_LAST",
  TransactionFromAsc = "transaction_from_ASC",
  TransactionFromAscNullsFirst = "transaction_from_ASC_NULLS_FIRST",
  TransactionFromAscNullsLast = "transaction_from_ASC_NULLS_LAST",
  TransactionFromDesc = "transaction_from_DESC",
  TransactionFromDescNullsFirst = "transaction_from_DESC_NULLS_FIRST",
  TransactionFromDescNullsLast = "transaction_from_DESC_NULLS_LAST",
  TransactionHashAsc = "transaction_hash_ASC",
  TransactionHashAscNullsFirst = "transaction_hash_ASC_NULLS_FIRST",
  TransactionHashAscNullsLast = "transaction_hash_ASC_NULLS_LAST",
  TransactionHashDesc = "transaction_hash_DESC",
  TransactionHashDescNullsFirst = "transaction_hash_DESC_NULLS_FIRST",
  TransactionHashDescNullsLast = "transaction_hash_DESC_NULLS_LAST",
  TransactionIdAsc = "transaction_id_ASC",
  TransactionIdAscNullsFirst = "transaction_id_ASC_NULLS_FIRST",
  TransactionIdAscNullsLast = "transaction_id_ASC_NULLS_LAST",
  TransactionIdDesc = "transaction_id_DESC",
  TransactionIdDescNullsFirst = "transaction_id_DESC_NULLS_FIRST",
  TransactionIdDescNullsLast = "transaction_id_DESC_NULLS_LAST",
  TransactionTimestampAsc = "transaction_timestamp_ASC",
  TransactionTimestampAscNullsFirst = "transaction_timestamp_ASC_NULLS_FIRST",
  TransactionTimestampAscNullsLast = "transaction_timestamp_ASC_NULLS_LAST",
  TransactionTimestampDesc = "transaction_timestamp_DESC",
  TransactionTimestampDescNullsFirst = "transaction_timestamp_DESC_NULLS_FIRST",
  TransactionTimestampDescNullsLast = "transaction_timestamp_DESC_NULLS_LAST",
  TransactionToAsc = "transaction_to_ASC",
  TransactionToAscNullsFirst = "transaction_to_ASC_NULLS_FIRST",
  TransactionToAscNullsLast = "transaction_to_ASC_NULLS_LAST",
  TransactionToDesc = "transaction_to_DESC",
  TransactionToDescNullsFirst = "transaction_to_DESC_NULLS_FIRST",
  TransactionToDescNullsLast = "transaction_to_DESC_NULLS_LAST",
  TransactionTransactionIndexAsc = "transaction_transactionIndex_ASC",
  TransactionTransactionIndexAscNullsFirst = "transaction_transactionIndex_ASC_NULLS_FIRST",
  TransactionTransactionIndexAscNullsLast = "transaction_transactionIndex_ASC_NULLS_LAST",
  TransactionTransactionIndexDesc = "transaction_transactionIndex_DESC",
  TransactionTransactionIndexDescNullsFirst = "transaction_transactionIndex_DESC_NULLS_FIRST",
  TransactionTransactionIndexDescNullsLast = "transaction_transactionIndex_DESC_NULLS_LAST",
  TriggerPriceAsc = "triggerPrice_ASC",
  TriggerPriceAscNullsFirst = "triggerPrice_ASC_NULLS_FIRST",
  TriggerPriceAscNullsLast = "triggerPrice_ASC_NULLS_LAST",
  TriggerPriceDesc = "triggerPrice_DESC",
  TriggerPriceDescNullsFirst = "triggerPrice_DESC_NULLS_FIRST",
  TriggerPriceDescNullsLast = "triggerPrice_DESC_NULLS_LAST",
  TwapGroupIdAsc = "twapGroupId_ASC",
  TwapGroupIdAscNullsFirst = "twapGroupId_ASC_NULLS_FIRST",
  TwapGroupIdAscNullsLast = "twapGroupId_ASC_NULLS_LAST",
  TwapGroupIdDesc = "twapGroupId_DESC",
  TwapGroupIdDescNullsFirst = "twapGroupId_DESC_NULLS_FIRST",
  TwapGroupIdDescNullsLast = "twapGroupId_DESC_NULLS_LAST",
  UiFeeReceiverAsc = "uiFeeReceiver_ASC",
  UiFeeReceiverAscNullsFirst = "uiFeeReceiver_ASC_NULLS_FIRST",
  UiFeeReceiverAscNullsLast = "uiFeeReceiver_ASC_NULLS_LAST",
  UiFeeReceiverDesc = "uiFeeReceiver_DESC",
  UiFeeReceiverDescNullsFirst = "uiFeeReceiver_DESC_NULLS_FIRST",
  UiFeeReceiverDescNullsLast = "uiFeeReceiver_DESC_NULLS_LAST",
}

export type TradeActionWhereInput = {
  AND?: InputMaybe<Array<TradeActionWhereInput>>;
  OR?: InputMaybe<Array<TradeActionWhereInput>>;
  acceptablePrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  acceptablePrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  acceptablePrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  acceptablePrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  account_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_gt?: InputMaybe<Scalars["String"]["input"]>;
  account_gte?: InputMaybe<Scalars["String"]["input"]>;
  account_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  account_lt?: InputMaybe<Scalars["String"]["input"]>;
  account_lte?: InputMaybe<Scalars["String"]["input"]>;
  account_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  account_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  account_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  account_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  account_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  basePnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  basePnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  basePnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  basePnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  borrowingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  borrowingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  borrowingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  collateralTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  collateralTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  collateralTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  contractTriggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  contractTriggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  contractTriggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  contractTriggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  eventName_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_gte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  eventName_lt?: InputMaybe<Scalars["String"]["input"]>;
  eventName_lte?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  eventName_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  eventName_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  eventName_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  executionAmountOut_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionAmountOut_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionAmountOut_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionAmountOut_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  executionPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  executionPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  executionPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  fundingFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  fundingFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  fundingFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  indexTokenPriceMax_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMax_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenPriceMax_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMax_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMin_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  indexTokenPriceMin_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  indexTokenPriceMin_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  indexTokenPriceMin_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralDeltaAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralDeltaAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  initialCollateralDeltaAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  initialCollateralTokenAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  initialCollateralTokenAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  initialCollateralTokenAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  initialCollateralTokenAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  isLong_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isLong_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  liquidationFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  liquidationFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  liquidationFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  marketAddress_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_gte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  marketAddress_lt?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_lte?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  marketAddress_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  marketAddress_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  minOutputAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  minOutputAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  minOutputAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  minOutputAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  numberOfParts_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_gte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  numberOfParts_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  numberOfParts_lt?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_lte?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  numberOfParts_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderKey_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_gte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderKey_lt?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_lte?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  orderKey_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderKey_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  orderType_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_gte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  orderType_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  orderType_lt?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_lte?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  orderType_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  pnlUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  pnlUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  pnlUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  pnlUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  positionFeeAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  positionFeeAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  positionFeeAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactAmount_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactAmount_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactAmount_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactDiffUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactDiffUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactDiffUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  priceImpactUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  priceImpactUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  priceImpactUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  reasonBytes_contains?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_eq?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_gt?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_gte?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reasonBytes_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reasonBytes_lt?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_lte?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reasonBytes_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reasonBytes_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_contains?: InputMaybe<Scalars["String"]["input"]>;
  reason_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reason_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_eq?: InputMaybe<Scalars["String"]["input"]>;
  reason_gt?: InputMaybe<Scalars["String"]["input"]>;
  reason_gte?: InputMaybe<Scalars["String"]["input"]>;
  reason_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reason_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  reason_lt?: InputMaybe<Scalars["String"]["input"]>;
  reason_lte?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  reason_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  reason_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  reason_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  shouldUnwrapNativeToken_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  shouldUnwrapNativeToken_not_eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  sizeDeltaUsd_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  sizeDeltaUsd_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  sizeDeltaUsd_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  swapPath_containsAll?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsAny?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_containsNone?: InputMaybe<Array<Scalars["String"]["input"]>>;
  swapPath_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  transaction?: InputMaybe<TransactionWhereInput>;
  transaction_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_gte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  triggerPrice_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  triggerPrice_lt?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_lte?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_eq?: InputMaybe<Scalars["BigInt"]["input"]>;
  triggerPrice_not_in?: InputMaybe<Array<Scalars["BigInt"]["input"]>>;
  twapGroupId_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_gte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  twapGroupId_lt?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_lte?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  twapGroupId_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  twapGroupId_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_gte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  uiFeeReceiver_lt?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_lte?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  uiFeeReceiver_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  uiFeeReceiver_startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type TradeActionsConnection = {
  __typename?: "TradeActionsConnection";
  edges: Array<TradeActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type Transaction = {
  __typename?: "Transaction";
  blockNumber: Scalars["Int"]["output"];
  from: Scalars["String"]["output"];
  hash: Scalars["String"]["output"];
  id: Scalars["String"]["output"];
  timestamp: Scalars["Int"]["output"];
  to: Scalars["String"]["output"];
  transactionIndex: Scalars["Int"]["output"];
};

export type TransactionEdge = {
  __typename?: "TransactionEdge";
  cursor: Scalars["String"]["output"];
  node: Transaction;
};

export enum TransactionOrderByInput {
  BlockNumberAsc = "blockNumber_ASC",
  BlockNumberAscNullsFirst = "blockNumber_ASC_NULLS_FIRST",
  BlockNumberAscNullsLast = "blockNumber_ASC_NULLS_LAST",
  BlockNumberDesc = "blockNumber_DESC",
  BlockNumberDescNullsFirst = "blockNumber_DESC_NULLS_FIRST",
  BlockNumberDescNullsLast = "blockNumber_DESC_NULLS_LAST",
  FromAsc = "from_ASC",
  FromAscNullsFirst = "from_ASC_NULLS_FIRST",
  FromAscNullsLast = "from_ASC_NULLS_LAST",
  FromDesc = "from_DESC",
  FromDescNullsFirst = "from_DESC_NULLS_FIRST",
  FromDescNullsLast = "from_DESC_NULLS_LAST",
  HashAsc = "hash_ASC",
  HashAscNullsFirst = "hash_ASC_NULLS_FIRST",
  HashAscNullsLast = "hash_ASC_NULLS_LAST",
  HashDesc = "hash_DESC",
  HashDescNullsFirst = "hash_DESC_NULLS_FIRST",
  HashDescNullsLast = "hash_DESC_NULLS_LAST",
  IdAsc = "id_ASC",
  IdAscNullsFirst = "id_ASC_NULLS_FIRST",
  IdAscNullsLast = "id_ASC_NULLS_LAST",
  IdDesc = "id_DESC",
  IdDescNullsFirst = "id_DESC_NULLS_FIRST",
  IdDescNullsLast = "id_DESC_NULLS_LAST",
  TimestampAsc = "timestamp_ASC",
  TimestampAscNullsFirst = "timestamp_ASC_NULLS_FIRST",
  TimestampAscNullsLast = "timestamp_ASC_NULLS_LAST",
  TimestampDesc = "timestamp_DESC",
  TimestampDescNullsFirst = "timestamp_DESC_NULLS_FIRST",
  TimestampDescNullsLast = "timestamp_DESC_NULLS_LAST",
  ToAsc = "to_ASC",
  ToAscNullsFirst = "to_ASC_NULLS_FIRST",
  ToAscNullsLast = "to_ASC_NULLS_LAST",
  ToDesc = "to_DESC",
  ToDescNullsFirst = "to_DESC_NULLS_FIRST",
  ToDescNullsLast = "to_DESC_NULLS_LAST",
  TransactionIndexAsc = "transactionIndex_ASC",
  TransactionIndexAscNullsFirst = "transactionIndex_ASC_NULLS_FIRST",
  TransactionIndexAscNullsLast = "transactionIndex_ASC_NULLS_LAST",
  TransactionIndexDesc = "transactionIndex_DESC",
  TransactionIndexDescNullsFirst = "transactionIndex_DESC_NULLS_FIRST",
  TransactionIndexDescNullsLast = "transactionIndex_DESC_NULLS_LAST",
}

export type TransactionWhereInput = {
  AND?: InputMaybe<Array<TransactionWhereInput>>;
  OR?: InputMaybe<Array<TransactionWhereInput>>;
  blockNumber_eq?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_gt?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_gte?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  blockNumber_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  blockNumber_lt?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_lte?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  blockNumber_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  from_contains?: InputMaybe<Scalars["String"]["input"]>;
  from_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  from_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_eq?: InputMaybe<Scalars["String"]["input"]>;
  from_gt?: InputMaybe<Scalars["String"]["input"]>;
  from_gte?: InputMaybe<Scalars["String"]["input"]>;
  from_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  from_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  from_lt?: InputMaybe<Scalars["String"]["input"]>;
  from_lte?: InputMaybe<Scalars["String"]["input"]>;
  from_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  from_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  from_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  from_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  from_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  from_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_contains?: InputMaybe<Scalars["String"]["input"]>;
  hash_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  hash_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_eq?: InputMaybe<Scalars["String"]["input"]>;
  hash_gt?: InputMaybe<Scalars["String"]["input"]>;
  hash_gte?: InputMaybe<Scalars["String"]["input"]>;
  hash_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  hash_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  hash_lt?: InputMaybe<Scalars["String"]["input"]>;
  hash_lte?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  hash_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  hash_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  hash_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_gt?: InputMaybe<Scalars["String"]["input"]>;
  id_gte?: InputMaybe<Scalars["String"]["input"]>;
  id_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  id_lt?: InputMaybe<Scalars["String"]["input"]>;
  id_lte?: InputMaybe<Scalars["String"]["input"]>;
  id_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  id_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  id_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  id_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  id_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  timestamp_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_gte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  timestamp_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  timestamp_lt?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_lte?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  timestamp_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  to_contains?: InputMaybe<Scalars["String"]["input"]>;
  to_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  to_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_eq?: InputMaybe<Scalars["String"]["input"]>;
  to_gt?: InputMaybe<Scalars["String"]["input"]>;
  to_gte?: InputMaybe<Scalars["String"]["input"]>;
  to_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  to_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  to_lt?: InputMaybe<Scalars["String"]["input"]>;
  to_lte?: InputMaybe<Scalars["String"]["input"]>;
  to_not_contains?: InputMaybe<Scalars["String"]["input"]>;
  to_not_containsInsensitive?: InputMaybe<Scalars["String"]["input"]>;
  to_not_endsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_not_eq?: InputMaybe<Scalars["String"]["input"]>;
  to_not_in?: InputMaybe<Array<Scalars["String"]["input"]>>;
  to_not_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  to_startsWith?: InputMaybe<Scalars["String"]["input"]>;
  transactionIndex_eq?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_gt?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_gte?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  transactionIndex_isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  transactionIndex_lt?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_lte?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_not_eq?: InputMaybe<Scalars["Int"]["input"]>;
  transactionIndex_not_in?: InputMaybe<Array<Scalars["Int"]["input"]>>;
};

export type TransactionsConnection = {
  __typename?: "TransactionsConnection";
  edges: Array<TransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
};

export type WhereInput = {
  from?: InputMaybe<Scalars["Int"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  maxCapital_gte?: InputMaybe<Scalars["String"]["input"]>;
  to?: InputMaybe<Scalars["Int"]["input"]>;
};
