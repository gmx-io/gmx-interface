export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  BigInt: { input: number; output: string };
}

export interface AccountPnlHistoryPointObject {
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
}

export interface AccountPnlSummaryBucketObject {
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
}

export interface AccountStat {
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
}

export interface AccountStatpositionsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
}

export interface AccountStatEdge {
  __typename?: "AccountStatEdge";
  cursor: Scalars["String"]["output"];
  node: AccountStat;
}

export enum AccountStatOrderByInput {
  closedCount_ASC = "closedCount_ASC",
  closedCount_ASC_NULLS_FIRST = "closedCount_ASC_NULLS_FIRST",
  closedCount_ASC_NULLS_LAST = "closedCount_ASC_NULLS_LAST",
  closedCount_DESC = "closedCount_DESC",
  closedCount_DESC_NULLS_FIRST = "closedCount_DESC_NULLS_FIRST",
  closedCount_DESC_NULLS_LAST = "closedCount_DESC_NULLS_LAST",
  cumsumCollateral_ASC = "cumsumCollateral_ASC",
  cumsumCollateral_ASC_NULLS_FIRST = "cumsumCollateral_ASC_NULLS_FIRST",
  cumsumCollateral_ASC_NULLS_LAST = "cumsumCollateral_ASC_NULLS_LAST",
  cumsumCollateral_DESC = "cumsumCollateral_DESC",
  cumsumCollateral_DESC_NULLS_FIRST = "cumsumCollateral_DESC_NULLS_FIRST",
  cumsumCollateral_DESC_NULLS_LAST = "cumsumCollateral_DESC_NULLS_LAST",
  cumsumSize_ASC = "cumsumSize_ASC",
  cumsumSize_ASC_NULLS_FIRST = "cumsumSize_ASC_NULLS_FIRST",
  cumsumSize_ASC_NULLS_LAST = "cumsumSize_ASC_NULLS_LAST",
  cumsumSize_DESC = "cumsumSize_DESC",
  cumsumSize_DESC_NULLS_FIRST = "cumsumSize_DESC_NULLS_FIRST",
  cumsumSize_DESC_NULLS_LAST = "cumsumSize_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  losses_ASC = "losses_ASC",
  losses_ASC_NULLS_FIRST = "losses_ASC_NULLS_FIRST",
  losses_ASC_NULLS_LAST = "losses_ASC_NULLS_LAST",
  losses_DESC = "losses_DESC",
  losses_DESC_NULLS_FIRST = "losses_DESC_NULLS_FIRST",
  losses_DESC_NULLS_LAST = "losses_DESC_NULLS_LAST",
  maxCapital_ASC = "maxCapital_ASC",
  maxCapital_ASC_NULLS_FIRST = "maxCapital_ASC_NULLS_FIRST",
  maxCapital_ASC_NULLS_LAST = "maxCapital_ASC_NULLS_LAST",
  maxCapital_DESC = "maxCapital_DESC",
  maxCapital_DESC_NULLS_FIRST = "maxCapital_DESC_NULLS_FIRST",
  maxCapital_DESC_NULLS_LAST = "maxCapital_DESC_NULLS_LAST",
  netCapital_ASC = "netCapital_ASC",
  netCapital_ASC_NULLS_FIRST = "netCapital_ASC_NULLS_FIRST",
  netCapital_ASC_NULLS_LAST = "netCapital_ASC_NULLS_LAST",
  netCapital_DESC = "netCapital_DESC",
  netCapital_DESC_NULLS_FIRST = "netCapital_DESC_NULLS_FIRST",
  netCapital_DESC_NULLS_LAST = "netCapital_DESC_NULLS_LAST",
  realizedFees_ASC = "realizedFees_ASC",
  realizedFees_ASC_NULLS_FIRST = "realizedFees_ASC_NULLS_FIRST",
  realizedFees_ASC_NULLS_LAST = "realizedFees_ASC_NULLS_LAST",
  realizedFees_DESC = "realizedFees_DESC",
  realizedFees_DESC_NULLS_FIRST = "realizedFees_DESC_NULLS_FIRST",
  realizedFees_DESC_NULLS_LAST = "realizedFees_DESC_NULLS_LAST",
  realizedPnl_ASC = "realizedPnl_ASC",
  realizedPnl_ASC_NULLS_FIRST = "realizedPnl_ASC_NULLS_FIRST",
  realizedPnl_ASC_NULLS_LAST = "realizedPnl_ASC_NULLS_LAST",
  realizedPnl_DESC = "realizedPnl_DESC",
  realizedPnl_DESC_NULLS_FIRST = "realizedPnl_DESC_NULLS_FIRST",
  realizedPnl_DESC_NULLS_LAST = "realizedPnl_DESC_NULLS_LAST",
  realizedPriceImpact_ASC = "realizedPriceImpact_ASC",
  realizedPriceImpact_ASC_NULLS_FIRST = "realizedPriceImpact_ASC_NULLS_FIRST",
  realizedPriceImpact_ASC_NULLS_LAST = "realizedPriceImpact_ASC_NULLS_LAST",
  realizedPriceImpact_DESC = "realizedPriceImpact_DESC",
  realizedPriceImpact_DESC_NULLS_FIRST = "realizedPriceImpact_DESC_NULLS_FIRST",
  realizedPriceImpact_DESC_NULLS_LAST = "realizedPriceImpact_DESC_NULLS_LAST",
  sumMaxSize_ASC = "sumMaxSize_ASC",
  sumMaxSize_ASC_NULLS_FIRST = "sumMaxSize_ASC_NULLS_FIRST",
  sumMaxSize_ASC_NULLS_LAST = "sumMaxSize_ASC_NULLS_LAST",
  sumMaxSize_DESC = "sumMaxSize_DESC",
  sumMaxSize_DESC_NULLS_FIRST = "sumMaxSize_DESC_NULLS_FIRST",
  sumMaxSize_DESC_NULLS_LAST = "sumMaxSize_DESC_NULLS_LAST",
  volume_ASC = "volume_ASC",
  volume_ASC_NULLS_FIRST = "volume_ASC_NULLS_FIRST",
  volume_ASC_NULLS_LAST = "volume_ASC_NULLS_LAST",
  volume_DESC = "volume_DESC",
  volume_DESC_NULLS_FIRST = "volume_DESC_NULLS_FIRST",
  volume_DESC_NULLS_LAST = "volume_DESC_NULLS_LAST",
  wins_ASC = "wins_ASC",
  wins_ASC_NULLS_FIRST = "wins_ASC_NULLS_FIRST",
  wins_ASC_NULLS_LAST = "wins_ASC_NULLS_LAST",
  wins_DESC = "wins_DESC",
  wins_DESC_NULLS_FIRST = "wins_DESC_NULLS_FIRST",
  wins_DESC_NULLS_LAST = "wins_DESC_NULLS_LAST",
}

export interface AccountStatWhereInput {
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
}

export interface AccountStatsConnection {
  __typename?: "AccountStatsConnection";
  edges: Array<AccountStatEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface AprSnapshot {
  __typename?: "AprSnapshot";
  address: Scalars["String"]["output"];
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
}

export interface AprSnapshotEdge {
  __typename?: "AprSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: AprSnapshot;
}

export enum AprSnapshotOrderByInput {
  address_ASC = "address_ASC",
  address_ASC_NULLS_FIRST = "address_ASC_NULLS_FIRST",
  address_ASC_NULLS_LAST = "address_ASC_NULLS_LAST",
  address_DESC = "address_DESC",
  address_DESC_NULLS_FIRST = "address_DESC_NULLS_FIRST",
  address_DESC_NULLS_LAST = "address_DESC_NULLS_LAST",
  aprByBorrowingFee_ASC = "aprByBorrowingFee_ASC",
  aprByBorrowingFee_ASC_NULLS_FIRST = "aprByBorrowingFee_ASC_NULLS_FIRST",
  aprByBorrowingFee_ASC_NULLS_LAST = "aprByBorrowingFee_ASC_NULLS_LAST",
  aprByBorrowingFee_DESC = "aprByBorrowingFee_DESC",
  aprByBorrowingFee_DESC_NULLS_FIRST = "aprByBorrowingFee_DESC_NULLS_FIRST",
  aprByBorrowingFee_DESC_NULLS_LAST = "aprByBorrowingFee_DESC_NULLS_LAST",
  aprByFee_ASC = "aprByFee_ASC",
  aprByFee_ASC_NULLS_FIRST = "aprByFee_ASC_NULLS_FIRST",
  aprByFee_ASC_NULLS_LAST = "aprByFee_ASC_NULLS_LAST",
  aprByFee_DESC = "aprByFee_DESC",
  aprByFee_DESC_NULLS_FIRST = "aprByFee_DESC_NULLS_FIRST",
  aprByFee_DESC_NULLS_LAST = "aprByFee_DESC_NULLS_LAST",
  entityType_ASC = "entityType_ASC",
  entityType_ASC_NULLS_FIRST = "entityType_ASC_NULLS_FIRST",
  entityType_ASC_NULLS_LAST = "entityType_ASC_NULLS_LAST",
  entityType_DESC = "entityType_DESC",
  entityType_DESC_NULLS_FIRST = "entityType_DESC_NULLS_FIRST",
  entityType_DESC_NULLS_LAST = "entityType_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  snapshotTimestamp_ASC = "snapshotTimestamp_ASC",
  snapshotTimestamp_ASC_NULLS_FIRST = "snapshotTimestamp_ASC_NULLS_FIRST",
  snapshotTimestamp_ASC_NULLS_LAST = "snapshotTimestamp_ASC_NULLS_LAST",
  snapshotTimestamp_DESC = "snapshotTimestamp_DESC",
  snapshotTimestamp_DESC_NULLS_FIRST = "snapshotTimestamp_DESC_NULLS_FIRST",
  snapshotTimestamp_DESC_NULLS_LAST = "snapshotTimestamp_DESC_NULLS_LAST",
}

export interface AprSnapshotWhereInput {
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
}

export interface AprSnapshotsConnection {
  __typename?: "AprSnapshotsConnection";
  edges: Array<AprSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface BorrowingRateSnapshot {
  __typename?: "BorrowingRateSnapshot";
  address: Scalars["String"]["output"];
  borrowingFactorPerSecondLong: Scalars["BigInt"]["output"];
  borrowingFactorPerSecondShort: Scalars["BigInt"]["output"];
  borrowingRateForPool: Scalars["BigInt"]["output"];
  entityType: EntityType;
  id: Scalars["String"]["output"];
  snapshotTimestamp: Scalars["Int"]["output"];
}

export interface BorrowingRateSnapshotEdge {
  __typename?: "BorrowingRateSnapshotEdge";
  cursor: Scalars["String"]["output"];
  node: BorrowingRateSnapshot;
}

export enum BorrowingRateSnapshotOrderByInput {
  address_ASC = "address_ASC",
  address_ASC_NULLS_FIRST = "address_ASC_NULLS_FIRST",
  address_ASC_NULLS_LAST = "address_ASC_NULLS_LAST",
  address_DESC = "address_DESC",
  address_DESC_NULLS_FIRST = "address_DESC_NULLS_FIRST",
  address_DESC_NULLS_LAST = "address_DESC_NULLS_LAST",
  borrowingFactorPerSecondLong_ASC = "borrowingFactorPerSecondLong_ASC",
  borrowingFactorPerSecondLong_ASC_NULLS_FIRST = "borrowingFactorPerSecondLong_ASC_NULLS_FIRST",
  borrowingFactorPerSecondLong_ASC_NULLS_LAST = "borrowingFactorPerSecondLong_ASC_NULLS_LAST",
  borrowingFactorPerSecondLong_DESC = "borrowingFactorPerSecondLong_DESC",
  borrowingFactorPerSecondLong_DESC_NULLS_FIRST = "borrowingFactorPerSecondLong_DESC_NULLS_FIRST",
  borrowingFactorPerSecondLong_DESC_NULLS_LAST = "borrowingFactorPerSecondLong_DESC_NULLS_LAST",
  borrowingFactorPerSecondShort_ASC = "borrowingFactorPerSecondShort_ASC",
  borrowingFactorPerSecondShort_ASC_NULLS_FIRST = "borrowingFactorPerSecondShort_ASC_NULLS_FIRST",
  borrowingFactorPerSecondShort_ASC_NULLS_LAST = "borrowingFactorPerSecondShort_ASC_NULLS_LAST",
  borrowingFactorPerSecondShort_DESC = "borrowingFactorPerSecondShort_DESC",
  borrowingFactorPerSecondShort_DESC_NULLS_FIRST = "borrowingFactorPerSecondShort_DESC_NULLS_FIRST",
  borrowingFactorPerSecondShort_DESC_NULLS_LAST = "borrowingFactorPerSecondShort_DESC_NULLS_LAST",
  borrowingRateForPool_ASC = "borrowingRateForPool_ASC",
  borrowingRateForPool_ASC_NULLS_FIRST = "borrowingRateForPool_ASC_NULLS_FIRST",
  borrowingRateForPool_ASC_NULLS_LAST = "borrowingRateForPool_ASC_NULLS_LAST",
  borrowingRateForPool_DESC = "borrowingRateForPool_DESC",
  borrowingRateForPool_DESC_NULLS_FIRST = "borrowingRateForPool_DESC_NULLS_FIRST",
  borrowingRateForPool_DESC_NULLS_LAST = "borrowingRateForPool_DESC_NULLS_LAST",
  entityType_ASC = "entityType_ASC",
  entityType_ASC_NULLS_FIRST = "entityType_ASC_NULLS_FIRST",
  entityType_ASC_NULLS_LAST = "entityType_ASC_NULLS_LAST",
  entityType_DESC = "entityType_DESC",
  entityType_DESC_NULLS_FIRST = "entityType_DESC_NULLS_FIRST",
  entityType_DESC_NULLS_LAST = "entityType_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  snapshotTimestamp_ASC = "snapshotTimestamp_ASC",
  snapshotTimestamp_ASC_NULLS_FIRST = "snapshotTimestamp_ASC_NULLS_FIRST",
  snapshotTimestamp_ASC_NULLS_LAST = "snapshotTimestamp_ASC_NULLS_LAST",
  snapshotTimestamp_DESC = "snapshotTimestamp_DESC",
  snapshotTimestamp_DESC_NULLS_FIRST = "snapshotTimestamp_DESC_NULLS_FIRST",
  snapshotTimestamp_DESC_NULLS_LAST = "snapshotTimestamp_DESC_NULLS_LAST",
}

export interface BorrowingRateSnapshotWhereInput {
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
}

export interface BorrowingRateSnapshotsConnection {
  __typename?: "BorrowingRateSnapshotsConnection";
  edges: Array<BorrowingRateSnapshotEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface ClaimAction {
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
}

export interface ClaimActionEdge {
  __typename?: "ClaimActionEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimAction;
}

export enum ClaimActionOrderByInput {
  account_ASC = "account_ASC",
  account_ASC_NULLS_FIRST = "account_ASC_NULLS_FIRST",
  account_ASC_NULLS_LAST = "account_ASC_NULLS_LAST",
  account_DESC = "account_DESC",
  account_DESC_NULLS_FIRST = "account_DESC_NULLS_FIRST",
  account_DESC_NULLS_LAST = "account_DESC_NULLS_LAST",
  eventName_ASC = "eventName_ASC",
  eventName_ASC_NULLS_FIRST = "eventName_ASC_NULLS_FIRST",
  eventName_ASC_NULLS_LAST = "eventName_ASC_NULLS_LAST",
  eventName_DESC = "eventName_DESC",
  eventName_DESC_NULLS_FIRST = "eventName_DESC_NULLS_FIRST",
  eventName_DESC_NULLS_LAST = "eventName_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  timestamp_ASC = "timestamp_ASC",
  timestamp_ASC_NULLS_FIRST = "timestamp_ASC_NULLS_FIRST",
  timestamp_ASC_NULLS_LAST = "timestamp_ASC_NULLS_LAST",
  timestamp_DESC = "timestamp_DESC",
  timestamp_DESC_NULLS_FIRST = "timestamp_DESC_NULLS_FIRST",
  timestamp_DESC_NULLS_LAST = "timestamp_DESC_NULLS_LAST",
  transaction_blockNumber_ASC = "transaction_blockNumber_ASC",
  transaction_blockNumber_ASC_NULLS_FIRST = "transaction_blockNumber_ASC_NULLS_FIRST",
  transaction_blockNumber_ASC_NULLS_LAST = "transaction_blockNumber_ASC_NULLS_LAST",
  transaction_blockNumber_DESC = "transaction_blockNumber_DESC",
  transaction_blockNumber_DESC_NULLS_FIRST = "transaction_blockNumber_DESC_NULLS_FIRST",
  transaction_blockNumber_DESC_NULLS_LAST = "transaction_blockNumber_DESC_NULLS_LAST",
  transaction_from_ASC = "transaction_from_ASC",
  transaction_from_ASC_NULLS_FIRST = "transaction_from_ASC_NULLS_FIRST",
  transaction_from_ASC_NULLS_LAST = "transaction_from_ASC_NULLS_LAST",
  transaction_from_DESC = "transaction_from_DESC",
  transaction_from_DESC_NULLS_FIRST = "transaction_from_DESC_NULLS_FIRST",
  transaction_from_DESC_NULLS_LAST = "transaction_from_DESC_NULLS_LAST",
  transaction_hash_ASC = "transaction_hash_ASC",
  transaction_hash_ASC_NULLS_FIRST = "transaction_hash_ASC_NULLS_FIRST",
  transaction_hash_ASC_NULLS_LAST = "transaction_hash_ASC_NULLS_LAST",
  transaction_hash_DESC = "transaction_hash_DESC",
  transaction_hash_DESC_NULLS_FIRST = "transaction_hash_DESC_NULLS_FIRST",
  transaction_hash_DESC_NULLS_LAST = "transaction_hash_DESC_NULLS_LAST",
  transaction_id_ASC = "transaction_id_ASC",
  transaction_id_ASC_NULLS_FIRST = "transaction_id_ASC_NULLS_FIRST",
  transaction_id_ASC_NULLS_LAST = "transaction_id_ASC_NULLS_LAST",
  transaction_id_DESC = "transaction_id_DESC",
  transaction_id_DESC_NULLS_FIRST = "transaction_id_DESC_NULLS_FIRST",
  transaction_id_DESC_NULLS_LAST = "transaction_id_DESC_NULLS_LAST",
  transaction_timestamp_ASC = "transaction_timestamp_ASC",
  transaction_timestamp_ASC_NULLS_FIRST = "transaction_timestamp_ASC_NULLS_FIRST",
  transaction_timestamp_ASC_NULLS_LAST = "transaction_timestamp_ASC_NULLS_LAST",
  transaction_timestamp_DESC = "transaction_timestamp_DESC",
  transaction_timestamp_DESC_NULLS_FIRST = "transaction_timestamp_DESC_NULLS_FIRST",
  transaction_timestamp_DESC_NULLS_LAST = "transaction_timestamp_DESC_NULLS_LAST",
  transaction_to_ASC = "transaction_to_ASC",
  transaction_to_ASC_NULLS_FIRST = "transaction_to_ASC_NULLS_FIRST",
  transaction_to_ASC_NULLS_LAST = "transaction_to_ASC_NULLS_LAST",
  transaction_to_DESC = "transaction_to_DESC",
  transaction_to_DESC_NULLS_FIRST = "transaction_to_DESC_NULLS_FIRST",
  transaction_to_DESC_NULLS_LAST = "transaction_to_DESC_NULLS_LAST",
  transaction_transactionIndex_ASC = "transaction_transactionIndex_ASC",
  transaction_transactionIndex_ASC_NULLS_FIRST = "transaction_transactionIndex_ASC_NULLS_FIRST",
  transaction_transactionIndex_ASC_NULLS_LAST = "transaction_transactionIndex_ASC_NULLS_LAST",
  transaction_transactionIndex_DESC = "transaction_transactionIndex_DESC",
  transaction_transactionIndex_DESC_NULLS_FIRST = "transaction_transactionIndex_DESC_NULLS_FIRST",
  transaction_transactionIndex_DESC_NULLS_LAST = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export enum ClaimActionType {
  ClaimFunding = "ClaimFunding",
  ClaimPriceImpact = "ClaimPriceImpact",
  SettleFundingFeeCancelled = "SettleFundingFeeCancelled",
  SettleFundingFeeCreated = "SettleFundingFeeCreated",
  SettleFundingFeeExecuted = "SettleFundingFeeExecuted",
}

export interface ClaimActionWhereInput {
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
}

export interface ClaimActionsConnection {
  __typename?: "ClaimActionsConnection";
  edges: Array<ClaimActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface ClaimRef {
  __typename?: "ClaimRef";
  id: Scalars["String"]["output"];
}

export interface ClaimRefEdge {
  __typename?: "ClaimRefEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimRef;
}

export enum ClaimRefOrderByInput {
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
}

export interface ClaimRefWhereInput {
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
}

export interface ClaimRefsConnection {
  __typename?: "ClaimRefsConnection";
  edges: Array<ClaimRefEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface ClaimableFundingFeeInfo {
  __typename?: "ClaimableFundingFeeInfo";
  amounts: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  marketAddresses: Array<Scalars["String"]["output"]>;
  tokenAddresses: Array<Scalars["String"]["output"]>;
}

export interface ClaimableFundingFeeInfoEdge {
  __typename?: "ClaimableFundingFeeInfoEdge";
  cursor: Scalars["String"]["output"];
  node: ClaimableFundingFeeInfo;
}

export enum ClaimableFundingFeeInfoOrderByInput {
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
}

export interface ClaimableFundingFeeInfoWhereInput {
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
}

export interface ClaimableFundingFeeInfosConnection {
  __typename?: "ClaimableFundingFeeInfosConnection";
  edges: Array<ClaimableFundingFeeInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface CollectedFeesInfo {
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
}

export interface CollectedFeesInfoEdge {
  __typename?: "CollectedFeesInfoEdge";
  cursor: Scalars["String"]["output"];
  node: CollectedFeesInfo;
}

export enum CollectedFeesInfoOrderByInput {
  address_ASC = "address_ASC",
  address_ASC_NULLS_FIRST = "address_ASC_NULLS_FIRST",
  address_ASC_NULLS_LAST = "address_ASC_NULLS_LAST",
  address_DESC = "address_DESC",
  address_DESC_NULLS_FIRST = "address_DESC_NULLS_FIRST",
  address_DESC_NULLS_LAST = "address_DESC_NULLS_LAST",
  borrowingFeeUsdForPool_ASC = "borrowingFeeUsdForPool_ASC",
  borrowingFeeUsdForPool_ASC_NULLS_FIRST = "borrowingFeeUsdForPool_ASC_NULLS_FIRST",
  borrowingFeeUsdForPool_ASC_NULLS_LAST = "borrowingFeeUsdForPool_ASC_NULLS_LAST",
  borrowingFeeUsdForPool_DESC = "borrowingFeeUsdForPool_DESC",
  borrowingFeeUsdForPool_DESC_NULLS_FIRST = "borrowingFeeUsdForPool_DESC_NULLS_FIRST",
  borrowingFeeUsdForPool_DESC_NULLS_LAST = "borrowingFeeUsdForPool_DESC_NULLS_LAST",
  borrowingFeeUsdPerPoolValue_ASC = "borrowingFeeUsdPerPoolValue_ASC",
  borrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST = "borrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  borrowingFeeUsdPerPoolValue_ASC_NULLS_LAST = "borrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  borrowingFeeUsdPerPoolValue_DESC = "borrowingFeeUsdPerPoolValue_DESC",
  borrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST = "borrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  borrowingFeeUsdPerPoolValue_DESC_NULLS_LAST = "borrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  cumulativeBorrowingFeeUsdForPool_ASC = "cumulativeBorrowingFeeUsdForPool_ASC",
  cumulativeBorrowingFeeUsdForPool_ASC_NULLS_FIRST = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_FIRST",
  cumulativeBorrowingFeeUsdForPool_ASC_NULLS_LAST = "cumulativeBorrowingFeeUsdForPool_ASC_NULLS_LAST",
  cumulativeBorrowingFeeUsdForPool_DESC = "cumulativeBorrowingFeeUsdForPool_DESC",
  cumulativeBorrowingFeeUsdForPool_DESC_NULLS_FIRST = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_FIRST",
  cumulativeBorrowingFeeUsdForPool_DESC_NULLS_LAST = "cumulativeBorrowingFeeUsdForPool_DESC_NULLS_LAST",
  cumulativeBorrowingFeeUsdPerPoolValue_ASC = "cumulativeBorrowingFeeUsdPerPoolValue_ASC",
  cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_LAST = "cumulativeBorrowingFeeUsdPerPoolValue_ASC_NULLS_LAST",
  cumulativeBorrowingFeeUsdPerPoolValue_DESC = "cumulativeBorrowingFeeUsdPerPoolValue_DESC",
  cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_LAST = "cumulativeBorrowingFeeUsdPerPoolValue_DESC_NULLS_LAST",
  cumulativeFeeUsdForPool_ASC = "cumulativeFeeUsdForPool_ASC",
  cumulativeFeeUsdForPool_ASC_NULLS_FIRST = "cumulativeFeeUsdForPool_ASC_NULLS_FIRST",
  cumulativeFeeUsdForPool_ASC_NULLS_LAST = "cumulativeFeeUsdForPool_ASC_NULLS_LAST",
  cumulativeFeeUsdForPool_DESC = "cumulativeFeeUsdForPool_DESC",
  cumulativeFeeUsdForPool_DESC_NULLS_FIRST = "cumulativeFeeUsdForPool_DESC_NULLS_FIRST",
  cumulativeFeeUsdForPool_DESC_NULLS_LAST = "cumulativeFeeUsdForPool_DESC_NULLS_LAST",
  cumulativeFeeUsdPerPoolValue_ASC = "cumulativeFeeUsdPerPoolValue_ASC",
  cumulativeFeeUsdPerPoolValue_ASC_NULLS_FIRST = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_FIRST",
  cumulativeFeeUsdPerPoolValue_ASC_NULLS_LAST = "cumulativeFeeUsdPerPoolValue_ASC_NULLS_LAST",
  cumulativeFeeUsdPerPoolValue_DESC = "cumulativeFeeUsdPerPoolValue_DESC",
  cumulativeFeeUsdPerPoolValue_DESC_NULLS_FIRST = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_FIRST",
  cumulativeFeeUsdPerPoolValue_DESC_NULLS_LAST = "cumulativeFeeUsdPerPoolValue_DESC_NULLS_LAST",
  entityType_ASC = "entityType_ASC",
  entityType_ASC_NULLS_FIRST = "entityType_ASC_NULLS_FIRST",
  entityType_ASC_NULLS_LAST = "entityType_ASC_NULLS_LAST",
  entityType_DESC = "entityType_DESC",
  entityType_DESC_NULLS_FIRST = "entityType_DESC_NULLS_FIRST",
  entityType_DESC_NULLS_LAST = "entityType_DESC_NULLS_LAST",
  feeUsdForPool_ASC = "feeUsdForPool_ASC",
  feeUsdForPool_ASC_NULLS_FIRST = "feeUsdForPool_ASC_NULLS_FIRST",
  feeUsdForPool_ASC_NULLS_LAST = "feeUsdForPool_ASC_NULLS_LAST",
  feeUsdForPool_DESC = "feeUsdForPool_DESC",
  feeUsdForPool_DESC_NULLS_FIRST = "feeUsdForPool_DESC_NULLS_FIRST",
  feeUsdForPool_DESC_NULLS_LAST = "feeUsdForPool_DESC_NULLS_LAST",
  feeUsdPerPoolValue_ASC = "feeUsdPerPoolValue_ASC",
  feeUsdPerPoolValue_ASC_NULLS_FIRST = "feeUsdPerPoolValue_ASC_NULLS_FIRST",
  feeUsdPerPoolValue_ASC_NULLS_LAST = "feeUsdPerPoolValue_ASC_NULLS_LAST",
  feeUsdPerPoolValue_DESC = "feeUsdPerPoolValue_DESC",
  feeUsdPerPoolValue_DESC_NULLS_FIRST = "feeUsdPerPoolValue_DESC_NULLS_FIRST",
  feeUsdPerPoolValue_DESC_NULLS_LAST = "feeUsdPerPoolValue_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  period_ASC = "period_ASC",
  period_ASC_NULLS_FIRST = "period_ASC_NULLS_FIRST",
  period_ASC_NULLS_LAST = "period_ASC_NULLS_LAST",
  period_DESC = "period_DESC",
  period_DESC_NULLS_FIRST = "period_DESC_NULLS_FIRST",
  period_DESC_NULLS_LAST = "period_DESC_NULLS_LAST",
  timestampGroup_ASC = "timestampGroup_ASC",
  timestampGroup_ASC_NULLS_FIRST = "timestampGroup_ASC_NULLS_FIRST",
  timestampGroup_ASC_NULLS_LAST = "timestampGroup_ASC_NULLS_LAST",
  timestampGroup_DESC = "timestampGroup_DESC",
  timestampGroup_DESC_NULLS_FIRST = "timestampGroup_DESC_NULLS_FIRST",
  timestampGroup_DESC_NULLS_LAST = "timestampGroup_DESC_NULLS_LAST",
}

export interface CollectedFeesInfoWhereInput {
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
}

export interface CollectedFeesInfosConnection {
  __typename?: "CollectedFeesInfosConnection";
  edges: Array<CollectedFeesInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface CumulativePoolValue {
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
}

export interface CumulativePoolValueEdge {
  __typename?: "CumulativePoolValueEdge";
  cursor: Scalars["String"]["output"];
  node: CumulativePoolValue;
}

export enum CumulativePoolValueOrderByInput {
  address_ASC = "address_ASC",
  address_ASC_NULLS_FIRST = "address_ASC_NULLS_FIRST",
  address_ASC_NULLS_LAST = "address_ASC_NULLS_LAST",
  address_DESC = "address_DESC",
  address_DESC_NULLS_FIRST = "address_DESC_NULLS_FIRST",
  address_DESC_NULLS_LAST = "address_DESC_NULLS_LAST",
  cumulativePoolValueByTime_ASC = "cumulativePoolValueByTime_ASC",
  cumulativePoolValueByTime_ASC_NULLS_FIRST = "cumulativePoolValueByTime_ASC_NULLS_FIRST",
  cumulativePoolValueByTime_ASC_NULLS_LAST = "cumulativePoolValueByTime_ASC_NULLS_LAST",
  cumulativePoolValueByTime_DESC = "cumulativePoolValueByTime_DESC",
  cumulativePoolValueByTime_DESC_NULLS_FIRST = "cumulativePoolValueByTime_DESC_NULLS_FIRST",
  cumulativePoolValueByTime_DESC_NULLS_LAST = "cumulativePoolValueByTime_DESC_NULLS_LAST",
  cumulativeTime_ASC = "cumulativeTime_ASC",
  cumulativeTime_ASC_NULLS_FIRST = "cumulativeTime_ASC_NULLS_FIRST",
  cumulativeTime_ASC_NULLS_LAST = "cumulativeTime_ASC_NULLS_LAST",
  cumulativeTime_DESC = "cumulativeTime_DESC",
  cumulativeTime_DESC_NULLS_FIRST = "cumulativeTime_DESC_NULLS_FIRST",
  cumulativeTime_DESC_NULLS_LAST = "cumulativeTime_DESC_NULLS_LAST",
  entityType_ASC = "entityType_ASC",
  entityType_ASC_NULLS_FIRST = "entityType_ASC_NULLS_FIRST",
  entityType_ASC_NULLS_LAST = "entityType_ASC_NULLS_LAST",
  entityType_DESC = "entityType_DESC",
  entityType_DESC_NULLS_FIRST = "entityType_DESC_NULLS_FIRST",
  entityType_DESC_NULLS_LAST = "entityType_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  isSnapshot_ASC = "isSnapshot_ASC",
  isSnapshot_ASC_NULLS_FIRST = "isSnapshot_ASC_NULLS_FIRST",
  isSnapshot_ASC_NULLS_LAST = "isSnapshot_ASC_NULLS_LAST",
  isSnapshot_DESC = "isSnapshot_DESC",
  isSnapshot_DESC_NULLS_FIRST = "isSnapshot_DESC_NULLS_FIRST",
  isSnapshot_DESC_NULLS_LAST = "isSnapshot_DESC_NULLS_LAST",
  lastPoolValue_ASC = "lastPoolValue_ASC",
  lastPoolValue_ASC_NULLS_FIRST = "lastPoolValue_ASC_NULLS_FIRST",
  lastPoolValue_ASC_NULLS_LAST = "lastPoolValue_ASC_NULLS_LAST",
  lastPoolValue_DESC = "lastPoolValue_DESC",
  lastPoolValue_DESC_NULLS_FIRST = "lastPoolValue_DESC_NULLS_FIRST",
  lastPoolValue_DESC_NULLS_LAST = "lastPoolValue_DESC_NULLS_LAST",
  lastUpdateTimestamp_ASC = "lastUpdateTimestamp_ASC",
  lastUpdateTimestamp_ASC_NULLS_FIRST = "lastUpdateTimestamp_ASC_NULLS_FIRST",
  lastUpdateTimestamp_ASC_NULLS_LAST = "lastUpdateTimestamp_ASC_NULLS_LAST",
  lastUpdateTimestamp_DESC = "lastUpdateTimestamp_DESC",
  lastUpdateTimestamp_DESC_NULLS_FIRST = "lastUpdateTimestamp_DESC_NULLS_FIRST",
  lastUpdateTimestamp_DESC_NULLS_LAST = "lastUpdateTimestamp_DESC_NULLS_LAST",
  snapshotTimestamp_ASC = "snapshotTimestamp_ASC",
  snapshotTimestamp_ASC_NULLS_FIRST = "snapshotTimestamp_ASC_NULLS_FIRST",
  snapshotTimestamp_ASC_NULLS_LAST = "snapshotTimestamp_ASC_NULLS_LAST",
  snapshotTimestamp_DESC = "snapshotTimestamp_DESC",
  snapshotTimestamp_DESC_NULLS_FIRST = "snapshotTimestamp_DESC_NULLS_FIRST",
  snapshotTimestamp_DESC_NULLS_LAST = "snapshotTimestamp_DESC_NULLS_LAST",
}

export interface CumulativePoolValueWhereInput {
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
}

export interface CumulativePoolValuesConnection {
  __typename?: "CumulativePoolValuesConnection";
  edges: Array<CumulativePoolValueEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export enum EntityType {
  Glv = "Glv",
  Market = "Market",
}

export interface Glv {
  __typename?: "Glv";
  glvTokenAddress: Scalars["String"]["output"];
  gmComposition: Array<Scalars["String"]["output"]>;
  id: Scalars["String"]["output"];
  longTokenAddress: Scalars["String"]["output"];
  markets: Array<Scalars["String"]["output"]>;
  poolValue: Scalars["BigInt"]["output"];
  shortTokenAddress: Scalars["String"]["output"];
}

export interface GlvApr {
  __typename?: "GlvApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  glvAddress: Scalars["String"]["output"];
}

export interface GlvAprsWhereInputWhereInput {
  glvAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
}

export interface GlvEdge {
  __typename?: "GlvEdge";
  cursor: Scalars["String"]["output"];
  node: Glv;
}

export enum GlvOrderByInput {
  glvTokenAddress_ASC = "glvTokenAddress_ASC",
  glvTokenAddress_ASC_NULLS_FIRST = "glvTokenAddress_ASC_NULLS_FIRST",
  glvTokenAddress_ASC_NULLS_LAST = "glvTokenAddress_ASC_NULLS_LAST",
  glvTokenAddress_DESC = "glvTokenAddress_DESC",
  glvTokenAddress_DESC_NULLS_FIRST = "glvTokenAddress_DESC_NULLS_FIRST",
  glvTokenAddress_DESC_NULLS_LAST = "glvTokenAddress_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  longTokenAddress_ASC = "longTokenAddress_ASC",
  longTokenAddress_ASC_NULLS_FIRST = "longTokenAddress_ASC_NULLS_FIRST",
  longTokenAddress_ASC_NULLS_LAST = "longTokenAddress_ASC_NULLS_LAST",
  longTokenAddress_DESC = "longTokenAddress_DESC",
  longTokenAddress_DESC_NULLS_FIRST = "longTokenAddress_DESC_NULLS_FIRST",
  longTokenAddress_DESC_NULLS_LAST = "longTokenAddress_DESC_NULLS_LAST",
  poolValue_ASC = "poolValue_ASC",
  poolValue_ASC_NULLS_FIRST = "poolValue_ASC_NULLS_FIRST",
  poolValue_ASC_NULLS_LAST = "poolValue_ASC_NULLS_LAST",
  poolValue_DESC = "poolValue_DESC",
  poolValue_DESC_NULLS_FIRST = "poolValue_DESC_NULLS_FIRST",
  poolValue_DESC_NULLS_LAST = "poolValue_DESC_NULLS_LAST",
  shortTokenAddress_ASC = "shortTokenAddress_ASC",
  shortTokenAddress_ASC_NULLS_FIRST = "shortTokenAddress_ASC_NULLS_FIRST",
  shortTokenAddress_ASC_NULLS_LAST = "shortTokenAddress_ASC_NULLS_LAST",
  shortTokenAddress_DESC = "shortTokenAddress_DESC",
  shortTokenAddress_DESC_NULLS_FIRST = "shortTokenAddress_DESC_NULLS_FIRST",
  shortTokenAddress_DESC_NULLS_LAST = "shortTokenAddress_DESC_NULLS_LAST",
}

export interface GlvWhereInput {
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
}

export interface GlvsConnection {
  __typename?: "GlvsConnection";
  edges: Array<GlvEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface Market {
  __typename?: "Market";
  id: Scalars["String"]["output"];
  indexToken: Scalars["String"]["output"];
  longToken: Scalars["String"]["output"];
  shortToken: Scalars["String"]["output"];
}

export interface MarketApr {
  __typename?: "MarketApr";
  aprByBorrowingFee: Scalars["BigInt"]["output"];
  aprByFee: Scalars["BigInt"]["output"];
  marketAddress: Scalars["String"]["output"];
}

export interface MarketAprsWhereInput {
  marketAddresses?: InputMaybe<Array<Scalars["String"]["input"]>>;
  periodEnd: Scalars["Float"]["input"];
  periodStart: Scalars["Float"]["input"];
}

export interface MarketEdge {
  __typename?: "MarketEdge";
  cursor: Scalars["String"]["output"];
  node: Market;
}

export interface MarketInfo {
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
}

export interface MarketInfoEdge {
  __typename?: "MarketInfoEdge";
  cursor: Scalars["String"]["output"];
  node: MarketInfo;
}

export enum MarketInfoOrderByInput {
  aboveOptimalUsageBorrowingFactorLong_ASC = "aboveOptimalUsageBorrowingFactorLong_ASC",
  aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_FIRST = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_FIRST",
  aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_LAST = "aboveOptimalUsageBorrowingFactorLong_ASC_NULLS_LAST",
  aboveOptimalUsageBorrowingFactorLong_DESC = "aboveOptimalUsageBorrowingFactorLong_DESC",
  aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_FIRST = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_FIRST",
  aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_LAST = "aboveOptimalUsageBorrowingFactorLong_DESC_NULLS_LAST",
  aboveOptimalUsageBorrowingFactorShort_ASC = "aboveOptimalUsageBorrowingFactorShort_ASC",
  aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_FIRST = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_FIRST",
  aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_LAST = "aboveOptimalUsageBorrowingFactorShort_ASC_NULLS_LAST",
  aboveOptimalUsageBorrowingFactorShort_DESC = "aboveOptimalUsageBorrowingFactorShort_DESC",
  aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_FIRST = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_FIRST",
  aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_LAST = "aboveOptimalUsageBorrowingFactorShort_DESC_NULLS_LAST",
  baseBorrowingFactorLong_ASC = "baseBorrowingFactorLong_ASC",
  baseBorrowingFactorLong_ASC_NULLS_FIRST = "baseBorrowingFactorLong_ASC_NULLS_FIRST",
  baseBorrowingFactorLong_ASC_NULLS_LAST = "baseBorrowingFactorLong_ASC_NULLS_LAST",
  baseBorrowingFactorLong_DESC = "baseBorrowingFactorLong_DESC",
  baseBorrowingFactorLong_DESC_NULLS_FIRST = "baseBorrowingFactorLong_DESC_NULLS_FIRST",
  baseBorrowingFactorLong_DESC_NULLS_LAST = "baseBorrowingFactorLong_DESC_NULLS_LAST",
  baseBorrowingFactorShort_ASC = "baseBorrowingFactorShort_ASC",
  baseBorrowingFactorShort_ASC_NULLS_FIRST = "baseBorrowingFactorShort_ASC_NULLS_FIRST",
  baseBorrowingFactorShort_ASC_NULLS_LAST = "baseBorrowingFactorShort_ASC_NULLS_LAST",
  baseBorrowingFactorShort_DESC = "baseBorrowingFactorShort_DESC",
  baseBorrowingFactorShort_DESC_NULLS_FIRST = "baseBorrowingFactorShort_DESC_NULLS_FIRST",
  baseBorrowingFactorShort_DESC_NULLS_LAST = "baseBorrowingFactorShort_DESC_NULLS_LAST",
  borrowingExponentFactorLong_ASC = "borrowingExponentFactorLong_ASC",
  borrowingExponentFactorLong_ASC_NULLS_FIRST = "borrowingExponentFactorLong_ASC_NULLS_FIRST",
  borrowingExponentFactorLong_ASC_NULLS_LAST = "borrowingExponentFactorLong_ASC_NULLS_LAST",
  borrowingExponentFactorLong_DESC = "borrowingExponentFactorLong_DESC",
  borrowingExponentFactorLong_DESC_NULLS_FIRST = "borrowingExponentFactorLong_DESC_NULLS_FIRST",
  borrowingExponentFactorLong_DESC_NULLS_LAST = "borrowingExponentFactorLong_DESC_NULLS_LAST",
  borrowingExponentFactorShort_ASC = "borrowingExponentFactorShort_ASC",
  borrowingExponentFactorShort_ASC_NULLS_FIRST = "borrowingExponentFactorShort_ASC_NULLS_FIRST",
  borrowingExponentFactorShort_ASC_NULLS_LAST = "borrowingExponentFactorShort_ASC_NULLS_LAST",
  borrowingExponentFactorShort_DESC = "borrowingExponentFactorShort_DESC",
  borrowingExponentFactorShort_DESC_NULLS_FIRST = "borrowingExponentFactorShort_DESC_NULLS_FIRST",
  borrowingExponentFactorShort_DESC_NULLS_LAST = "borrowingExponentFactorShort_DESC_NULLS_LAST",
  borrowingFactorLong_ASC = "borrowingFactorLong_ASC",
  borrowingFactorLong_ASC_NULLS_FIRST = "borrowingFactorLong_ASC_NULLS_FIRST",
  borrowingFactorLong_ASC_NULLS_LAST = "borrowingFactorLong_ASC_NULLS_LAST",
  borrowingFactorLong_DESC = "borrowingFactorLong_DESC",
  borrowingFactorLong_DESC_NULLS_FIRST = "borrowingFactorLong_DESC_NULLS_FIRST",
  borrowingFactorLong_DESC_NULLS_LAST = "borrowingFactorLong_DESC_NULLS_LAST",
  borrowingFactorPerSecondForLongs_ASC = "borrowingFactorPerSecondForLongs_ASC",
  borrowingFactorPerSecondForLongs_ASC_NULLS_FIRST = "borrowingFactorPerSecondForLongs_ASC_NULLS_FIRST",
  borrowingFactorPerSecondForLongs_ASC_NULLS_LAST = "borrowingFactorPerSecondForLongs_ASC_NULLS_LAST",
  borrowingFactorPerSecondForLongs_DESC = "borrowingFactorPerSecondForLongs_DESC",
  borrowingFactorPerSecondForLongs_DESC_NULLS_FIRST = "borrowingFactorPerSecondForLongs_DESC_NULLS_FIRST",
  borrowingFactorPerSecondForLongs_DESC_NULLS_LAST = "borrowingFactorPerSecondForLongs_DESC_NULLS_LAST",
  borrowingFactorPerSecondForShorts_ASC = "borrowingFactorPerSecondForShorts_ASC",
  borrowingFactorPerSecondForShorts_ASC_NULLS_FIRST = "borrowingFactorPerSecondForShorts_ASC_NULLS_FIRST",
  borrowingFactorPerSecondForShorts_ASC_NULLS_LAST = "borrowingFactorPerSecondForShorts_ASC_NULLS_LAST",
  borrowingFactorPerSecondForShorts_DESC = "borrowingFactorPerSecondForShorts_DESC",
  borrowingFactorPerSecondForShorts_DESC_NULLS_FIRST = "borrowingFactorPerSecondForShorts_DESC_NULLS_FIRST",
  borrowingFactorPerSecondForShorts_DESC_NULLS_LAST = "borrowingFactorPerSecondForShorts_DESC_NULLS_LAST",
  borrowingFactorShort_ASC = "borrowingFactorShort_ASC",
  borrowingFactorShort_ASC_NULLS_FIRST = "borrowingFactorShort_ASC_NULLS_FIRST",
  borrowingFactorShort_ASC_NULLS_LAST = "borrowingFactorShort_ASC_NULLS_LAST",
  borrowingFactorShort_DESC = "borrowingFactorShort_DESC",
  borrowingFactorShort_DESC_NULLS_FIRST = "borrowingFactorShort_DESC_NULLS_FIRST",
  borrowingFactorShort_DESC_NULLS_LAST = "borrowingFactorShort_DESC_NULLS_LAST",
  fundingDecreaseFactorPerSecond_ASC = "fundingDecreaseFactorPerSecond_ASC",
  fundingDecreaseFactorPerSecond_ASC_NULLS_FIRST = "fundingDecreaseFactorPerSecond_ASC_NULLS_FIRST",
  fundingDecreaseFactorPerSecond_ASC_NULLS_LAST = "fundingDecreaseFactorPerSecond_ASC_NULLS_LAST",
  fundingDecreaseFactorPerSecond_DESC = "fundingDecreaseFactorPerSecond_DESC",
  fundingDecreaseFactorPerSecond_DESC_NULLS_FIRST = "fundingDecreaseFactorPerSecond_DESC_NULLS_FIRST",
  fundingDecreaseFactorPerSecond_DESC_NULLS_LAST = "fundingDecreaseFactorPerSecond_DESC_NULLS_LAST",
  fundingExponentFactor_ASC = "fundingExponentFactor_ASC",
  fundingExponentFactor_ASC_NULLS_FIRST = "fundingExponentFactor_ASC_NULLS_FIRST",
  fundingExponentFactor_ASC_NULLS_LAST = "fundingExponentFactor_ASC_NULLS_LAST",
  fundingExponentFactor_DESC = "fundingExponentFactor_DESC",
  fundingExponentFactor_DESC_NULLS_FIRST = "fundingExponentFactor_DESC_NULLS_FIRST",
  fundingExponentFactor_DESC_NULLS_LAST = "fundingExponentFactor_DESC_NULLS_LAST",
  fundingFactorPerSecond_ASC = "fundingFactorPerSecond_ASC",
  fundingFactorPerSecond_ASC_NULLS_FIRST = "fundingFactorPerSecond_ASC_NULLS_FIRST",
  fundingFactorPerSecond_ASC_NULLS_LAST = "fundingFactorPerSecond_ASC_NULLS_LAST",
  fundingFactorPerSecond_DESC = "fundingFactorPerSecond_DESC",
  fundingFactorPerSecond_DESC_NULLS_FIRST = "fundingFactorPerSecond_DESC_NULLS_FIRST",
  fundingFactorPerSecond_DESC_NULLS_LAST = "fundingFactorPerSecond_DESC_NULLS_LAST",
  fundingFactor_ASC = "fundingFactor_ASC",
  fundingFactor_ASC_NULLS_FIRST = "fundingFactor_ASC_NULLS_FIRST",
  fundingFactor_ASC_NULLS_LAST = "fundingFactor_ASC_NULLS_LAST",
  fundingFactor_DESC = "fundingFactor_DESC",
  fundingFactor_DESC_NULLS_FIRST = "fundingFactor_DESC_NULLS_FIRST",
  fundingFactor_DESC_NULLS_LAST = "fundingFactor_DESC_NULLS_LAST",
  fundingIncreaseFactorPerSecond_ASC = "fundingIncreaseFactorPerSecond_ASC",
  fundingIncreaseFactorPerSecond_ASC_NULLS_FIRST = "fundingIncreaseFactorPerSecond_ASC_NULLS_FIRST",
  fundingIncreaseFactorPerSecond_ASC_NULLS_LAST = "fundingIncreaseFactorPerSecond_ASC_NULLS_LAST",
  fundingIncreaseFactorPerSecond_DESC = "fundingIncreaseFactorPerSecond_DESC",
  fundingIncreaseFactorPerSecond_DESC_NULLS_FIRST = "fundingIncreaseFactorPerSecond_DESC_NULLS_FIRST",
  fundingIncreaseFactorPerSecond_DESC_NULLS_LAST = "fundingIncreaseFactorPerSecond_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  indexTokenAddress_ASC = "indexTokenAddress_ASC",
  indexTokenAddress_ASC_NULLS_FIRST = "indexTokenAddress_ASC_NULLS_FIRST",
  indexTokenAddress_ASC_NULLS_LAST = "indexTokenAddress_ASC_NULLS_LAST",
  indexTokenAddress_DESC = "indexTokenAddress_DESC",
  indexTokenAddress_DESC_NULLS_FIRST = "indexTokenAddress_DESC_NULLS_FIRST",
  indexTokenAddress_DESC_NULLS_LAST = "indexTokenAddress_DESC_NULLS_LAST",
  isDisabled_ASC = "isDisabled_ASC",
  isDisabled_ASC_NULLS_FIRST = "isDisabled_ASC_NULLS_FIRST",
  isDisabled_ASC_NULLS_LAST = "isDisabled_ASC_NULLS_LAST",
  isDisabled_DESC = "isDisabled_DESC",
  isDisabled_DESC_NULLS_FIRST = "isDisabled_DESC_NULLS_FIRST",
  isDisabled_DESC_NULLS_LAST = "isDisabled_DESC_NULLS_LAST",
  longOpenInterestInTokensUsingLongToken_ASC = "longOpenInterestInTokensUsingLongToken_ASC",
  longOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  longOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST = "longOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  longOpenInterestInTokensUsingLongToken_DESC = "longOpenInterestInTokensUsingLongToken_DESC",
  longOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  longOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST = "longOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  longOpenInterestInTokensUsingShortToken_ASC = "longOpenInterestInTokensUsingShortToken_ASC",
  longOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  longOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST = "longOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  longOpenInterestInTokensUsingShortToken_DESC = "longOpenInterestInTokensUsingShortToken_DESC",
  longOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  longOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST = "longOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  longOpenInterestInTokens_ASC = "longOpenInterestInTokens_ASC",
  longOpenInterestInTokens_ASC_NULLS_FIRST = "longOpenInterestInTokens_ASC_NULLS_FIRST",
  longOpenInterestInTokens_ASC_NULLS_LAST = "longOpenInterestInTokens_ASC_NULLS_LAST",
  longOpenInterestInTokens_DESC = "longOpenInterestInTokens_DESC",
  longOpenInterestInTokens_DESC_NULLS_FIRST = "longOpenInterestInTokens_DESC_NULLS_FIRST",
  longOpenInterestInTokens_DESC_NULLS_LAST = "longOpenInterestInTokens_DESC_NULLS_LAST",
  longOpenInterestUsd_ASC = "longOpenInterestUsd_ASC",
  longOpenInterestUsd_ASC_NULLS_FIRST = "longOpenInterestUsd_ASC_NULLS_FIRST",
  longOpenInterestUsd_ASC_NULLS_LAST = "longOpenInterestUsd_ASC_NULLS_LAST",
  longOpenInterestUsd_DESC = "longOpenInterestUsd_DESC",
  longOpenInterestUsd_DESC_NULLS_FIRST = "longOpenInterestUsd_DESC_NULLS_FIRST",
  longOpenInterestUsd_DESC_NULLS_LAST = "longOpenInterestUsd_DESC_NULLS_LAST",
  longOpenInterestUsingLongToken_ASC = "longOpenInterestUsingLongToken_ASC",
  longOpenInterestUsingLongToken_ASC_NULLS_FIRST = "longOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  longOpenInterestUsingLongToken_ASC_NULLS_LAST = "longOpenInterestUsingLongToken_ASC_NULLS_LAST",
  longOpenInterestUsingLongToken_DESC = "longOpenInterestUsingLongToken_DESC",
  longOpenInterestUsingLongToken_DESC_NULLS_FIRST = "longOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  longOpenInterestUsingLongToken_DESC_NULLS_LAST = "longOpenInterestUsingLongToken_DESC_NULLS_LAST",
  longOpenInterestUsingShortToken_ASC = "longOpenInterestUsingShortToken_ASC",
  longOpenInterestUsingShortToken_ASC_NULLS_FIRST = "longOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  longOpenInterestUsingShortToken_ASC_NULLS_LAST = "longOpenInterestUsingShortToken_ASC_NULLS_LAST",
  longOpenInterestUsingShortToken_DESC = "longOpenInterestUsingShortToken_DESC",
  longOpenInterestUsingShortToken_DESC_NULLS_FIRST = "longOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  longOpenInterestUsingShortToken_DESC_NULLS_LAST = "longOpenInterestUsingShortToken_DESC_NULLS_LAST",
  longPoolAmountAdjustment_ASC = "longPoolAmountAdjustment_ASC",
  longPoolAmountAdjustment_ASC_NULLS_FIRST = "longPoolAmountAdjustment_ASC_NULLS_FIRST",
  longPoolAmountAdjustment_ASC_NULLS_LAST = "longPoolAmountAdjustment_ASC_NULLS_LAST",
  longPoolAmountAdjustment_DESC = "longPoolAmountAdjustment_DESC",
  longPoolAmountAdjustment_DESC_NULLS_FIRST = "longPoolAmountAdjustment_DESC_NULLS_FIRST",
  longPoolAmountAdjustment_DESC_NULLS_LAST = "longPoolAmountAdjustment_DESC_NULLS_LAST",
  longPoolAmount_ASC = "longPoolAmount_ASC",
  longPoolAmount_ASC_NULLS_FIRST = "longPoolAmount_ASC_NULLS_FIRST",
  longPoolAmount_ASC_NULLS_LAST = "longPoolAmount_ASC_NULLS_LAST",
  longPoolAmount_DESC = "longPoolAmount_DESC",
  longPoolAmount_DESC_NULLS_FIRST = "longPoolAmount_DESC_NULLS_FIRST",
  longPoolAmount_DESC_NULLS_LAST = "longPoolAmount_DESC_NULLS_LAST",
  longTokenAddress_ASC = "longTokenAddress_ASC",
  longTokenAddress_ASC_NULLS_FIRST = "longTokenAddress_ASC_NULLS_FIRST",
  longTokenAddress_ASC_NULLS_LAST = "longTokenAddress_ASC_NULLS_LAST",
  longTokenAddress_DESC = "longTokenAddress_DESC",
  longTokenAddress_DESC_NULLS_FIRST = "longTokenAddress_DESC_NULLS_FIRST",
  longTokenAddress_DESC_NULLS_LAST = "longTokenAddress_DESC_NULLS_LAST",
  longsPayShorts_ASC = "longsPayShorts_ASC",
  longsPayShorts_ASC_NULLS_FIRST = "longsPayShorts_ASC_NULLS_FIRST",
  longsPayShorts_ASC_NULLS_LAST = "longsPayShorts_ASC_NULLS_LAST",
  longsPayShorts_DESC = "longsPayShorts_DESC",
  longsPayShorts_DESC_NULLS_FIRST = "longsPayShorts_DESC_NULLS_FIRST",
  longsPayShorts_DESC_NULLS_LAST = "longsPayShorts_DESC_NULLS_LAST",
  marketTokenAddress_ASC = "marketTokenAddress_ASC",
  marketTokenAddress_ASC_NULLS_FIRST = "marketTokenAddress_ASC_NULLS_FIRST",
  marketTokenAddress_ASC_NULLS_LAST = "marketTokenAddress_ASC_NULLS_LAST",
  marketTokenAddress_DESC = "marketTokenAddress_DESC",
  marketTokenAddress_DESC_NULLS_FIRST = "marketTokenAddress_DESC_NULLS_FIRST",
  marketTokenAddress_DESC_NULLS_LAST = "marketTokenAddress_DESC_NULLS_LAST",
  marketTokenSupply_ASC = "marketTokenSupply_ASC",
  marketTokenSupply_ASC_NULLS_FIRST = "marketTokenSupply_ASC_NULLS_FIRST",
  marketTokenSupply_ASC_NULLS_LAST = "marketTokenSupply_ASC_NULLS_LAST",
  marketTokenSupply_DESC = "marketTokenSupply_DESC",
  marketTokenSupply_DESC_NULLS_FIRST = "marketTokenSupply_DESC_NULLS_FIRST",
  marketTokenSupply_DESC_NULLS_LAST = "marketTokenSupply_DESC_NULLS_LAST",
  maxFundingFactorPerSecond_ASC = "maxFundingFactorPerSecond_ASC",
  maxFundingFactorPerSecond_ASC_NULLS_FIRST = "maxFundingFactorPerSecond_ASC_NULLS_FIRST",
  maxFundingFactorPerSecond_ASC_NULLS_LAST = "maxFundingFactorPerSecond_ASC_NULLS_LAST",
  maxFundingFactorPerSecond_DESC = "maxFundingFactorPerSecond_DESC",
  maxFundingFactorPerSecond_DESC_NULLS_FIRST = "maxFundingFactorPerSecond_DESC_NULLS_FIRST",
  maxFundingFactorPerSecond_DESC_NULLS_LAST = "maxFundingFactorPerSecond_DESC_NULLS_LAST",
  maxLongPoolAmount_ASC = "maxLongPoolAmount_ASC",
  maxLongPoolAmount_ASC_NULLS_FIRST = "maxLongPoolAmount_ASC_NULLS_FIRST",
  maxLongPoolAmount_ASC_NULLS_LAST = "maxLongPoolAmount_ASC_NULLS_LAST",
  maxLongPoolAmount_DESC = "maxLongPoolAmount_DESC",
  maxLongPoolAmount_DESC_NULLS_FIRST = "maxLongPoolAmount_DESC_NULLS_FIRST",
  maxLongPoolAmount_DESC_NULLS_LAST = "maxLongPoolAmount_DESC_NULLS_LAST",
  maxLongPoolUsdForDeposit_ASC = "maxLongPoolUsdForDeposit_ASC",
  maxLongPoolUsdForDeposit_ASC_NULLS_FIRST = "maxLongPoolUsdForDeposit_ASC_NULLS_FIRST",
  maxLongPoolUsdForDeposit_ASC_NULLS_LAST = "maxLongPoolUsdForDeposit_ASC_NULLS_LAST",
  maxLongPoolUsdForDeposit_DESC = "maxLongPoolUsdForDeposit_DESC",
  maxLongPoolUsdForDeposit_DESC_NULLS_FIRST = "maxLongPoolUsdForDeposit_DESC_NULLS_FIRST",
  maxLongPoolUsdForDeposit_DESC_NULLS_LAST = "maxLongPoolUsdForDeposit_DESC_NULLS_LAST",
  maxOpenInterestLong_ASC = "maxOpenInterestLong_ASC",
  maxOpenInterestLong_ASC_NULLS_FIRST = "maxOpenInterestLong_ASC_NULLS_FIRST",
  maxOpenInterestLong_ASC_NULLS_LAST = "maxOpenInterestLong_ASC_NULLS_LAST",
  maxOpenInterestLong_DESC = "maxOpenInterestLong_DESC",
  maxOpenInterestLong_DESC_NULLS_FIRST = "maxOpenInterestLong_DESC_NULLS_FIRST",
  maxOpenInterestLong_DESC_NULLS_LAST = "maxOpenInterestLong_DESC_NULLS_LAST",
  maxOpenInterestShort_ASC = "maxOpenInterestShort_ASC",
  maxOpenInterestShort_ASC_NULLS_FIRST = "maxOpenInterestShort_ASC_NULLS_FIRST",
  maxOpenInterestShort_ASC_NULLS_LAST = "maxOpenInterestShort_ASC_NULLS_LAST",
  maxOpenInterestShort_DESC = "maxOpenInterestShort_DESC",
  maxOpenInterestShort_DESC_NULLS_FIRST = "maxOpenInterestShort_DESC_NULLS_FIRST",
  maxOpenInterestShort_DESC_NULLS_LAST = "maxOpenInterestShort_DESC_NULLS_LAST",
  maxPnlFactorForTradersLong_ASC = "maxPnlFactorForTradersLong_ASC",
  maxPnlFactorForTradersLong_ASC_NULLS_FIRST = "maxPnlFactorForTradersLong_ASC_NULLS_FIRST",
  maxPnlFactorForTradersLong_ASC_NULLS_LAST = "maxPnlFactorForTradersLong_ASC_NULLS_LAST",
  maxPnlFactorForTradersLong_DESC = "maxPnlFactorForTradersLong_DESC",
  maxPnlFactorForTradersLong_DESC_NULLS_FIRST = "maxPnlFactorForTradersLong_DESC_NULLS_FIRST",
  maxPnlFactorForTradersLong_DESC_NULLS_LAST = "maxPnlFactorForTradersLong_DESC_NULLS_LAST",
  maxPnlFactorForTradersShort_ASC = "maxPnlFactorForTradersShort_ASC",
  maxPnlFactorForTradersShort_ASC_NULLS_FIRST = "maxPnlFactorForTradersShort_ASC_NULLS_FIRST",
  maxPnlFactorForTradersShort_ASC_NULLS_LAST = "maxPnlFactorForTradersShort_ASC_NULLS_LAST",
  maxPnlFactorForTradersShort_DESC = "maxPnlFactorForTradersShort_DESC",
  maxPnlFactorForTradersShort_DESC_NULLS_FIRST = "maxPnlFactorForTradersShort_DESC_NULLS_FIRST",
  maxPnlFactorForTradersShort_DESC_NULLS_LAST = "maxPnlFactorForTradersShort_DESC_NULLS_LAST",
  maxPositionImpactFactorForLiquidations_ASC = "maxPositionImpactFactorForLiquidations_ASC",
  maxPositionImpactFactorForLiquidations_ASC_NULLS_FIRST = "maxPositionImpactFactorForLiquidations_ASC_NULLS_FIRST",
  maxPositionImpactFactorForLiquidations_ASC_NULLS_LAST = "maxPositionImpactFactorForLiquidations_ASC_NULLS_LAST",
  maxPositionImpactFactorForLiquidations_DESC = "maxPositionImpactFactorForLiquidations_DESC",
  maxPositionImpactFactorForLiquidations_DESC_NULLS_FIRST = "maxPositionImpactFactorForLiquidations_DESC_NULLS_FIRST",
  maxPositionImpactFactorForLiquidations_DESC_NULLS_LAST = "maxPositionImpactFactorForLiquidations_DESC_NULLS_LAST",
  maxPositionImpactFactorNegative_ASC = "maxPositionImpactFactorNegative_ASC",
  maxPositionImpactFactorNegative_ASC_NULLS_FIRST = "maxPositionImpactFactorNegative_ASC_NULLS_FIRST",
  maxPositionImpactFactorNegative_ASC_NULLS_LAST = "maxPositionImpactFactorNegative_ASC_NULLS_LAST",
  maxPositionImpactFactorNegative_DESC = "maxPositionImpactFactorNegative_DESC",
  maxPositionImpactFactorNegative_DESC_NULLS_FIRST = "maxPositionImpactFactorNegative_DESC_NULLS_FIRST",
  maxPositionImpactFactorNegative_DESC_NULLS_LAST = "maxPositionImpactFactorNegative_DESC_NULLS_LAST",
  maxPositionImpactFactorPositive_ASC = "maxPositionImpactFactorPositive_ASC",
  maxPositionImpactFactorPositive_ASC_NULLS_FIRST = "maxPositionImpactFactorPositive_ASC_NULLS_FIRST",
  maxPositionImpactFactorPositive_ASC_NULLS_LAST = "maxPositionImpactFactorPositive_ASC_NULLS_LAST",
  maxPositionImpactFactorPositive_DESC = "maxPositionImpactFactorPositive_DESC",
  maxPositionImpactFactorPositive_DESC_NULLS_FIRST = "maxPositionImpactFactorPositive_DESC_NULLS_FIRST",
  maxPositionImpactFactorPositive_DESC_NULLS_LAST = "maxPositionImpactFactorPositive_DESC_NULLS_LAST",
  maxShortPoolAmount_ASC = "maxShortPoolAmount_ASC",
  maxShortPoolAmount_ASC_NULLS_FIRST = "maxShortPoolAmount_ASC_NULLS_FIRST",
  maxShortPoolAmount_ASC_NULLS_LAST = "maxShortPoolAmount_ASC_NULLS_LAST",
  maxShortPoolAmount_DESC = "maxShortPoolAmount_DESC",
  maxShortPoolAmount_DESC_NULLS_FIRST = "maxShortPoolAmount_DESC_NULLS_FIRST",
  maxShortPoolAmount_DESC_NULLS_LAST = "maxShortPoolAmount_DESC_NULLS_LAST",
  maxShortPoolUsdForDeposit_ASC = "maxShortPoolUsdForDeposit_ASC",
  maxShortPoolUsdForDeposit_ASC_NULLS_FIRST = "maxShortPoolUsdForDeposit_ASC_NULLS_FIRST",
  maxShortPoolUsdForDeposit_ASC_NULLS_LAST = "maxShortPoolUsdForDeposit_ASC_NULLS_LAST",
  maxShortPoolUsdForDeposit_DESC = "maxShortPoolUsdForDeposit_DESC",
  maxShortPoolUsdForDeposit_DESC_NULLS_FIRST = "maxShortPoolUsdForDeposit_DESC_NULLS_FIRST",
  maxShortPoolUsdForDeposit_DESC_NULLS_LAST = "maxShortPoolUsdForDeposit_DESC_NULLS_LAST",
  minCollateralFactorForOpenInterestLong_ASC = "minCollateralFactorForOpenInterestLong_ASC",
  minCollateralFactorForOpenInterestLong_ASC_NULLS_FIRST = "minCollateralFactorForOpenInterestLong_ASC_NULLS_FIRST",
  minCollateralFactorForOpenInterestLong_ASC_NULLS_LAST = "minCollateralFactorForOpenInterestLong_ASC_NULLS_LAST",
  minCollateralFactorForOpenInterestLong_DESC = "minCollateralFactorForOpenInterestLong_DESC",
  minCollateralFactorForOpenInterestLong_DESC_NULLS_FIRST = "minCollateralFactorForOpenInterestLong_DESC_NULLS_FIRST",
  minCollateralFactorForOpenInterestLong_DESC_NULLS_LAST = "minCollateralFactorForOpenInterestLong_DESC_NULLS_LAST",
  minCollateralFactorForOpenInterestShort_ASC = "minCollateralFactorForOpenInterestShort_ASC",
  minCollateralFactorForOpenInterestShort_ASC_NULLS_FIRST = "minCollateralFactorForOpenInterestShort_ASC_NULLS_FIRST",
  minCollateralFactorForOpenInterestShort_ASC_NULLS_LAST = "minCollateralFactorForOpenInterestShort_ASC_NULLS_LAST",
  minCollateralFactorForOpenInterestShort_DESC = "minCollateralFactorForOpenInterestShort_DESC",
  minCollateralFactorForOpenInterestShort_DESC_NULLS_FIRST = "minCollateralFactorForOpenInterestShort_DESC_NULLS_FIRST",
  minCollateralFactorForOpenInterestShort_DESC_NULLS_LAST = "minCollateralFactorForOpenInterestShort_DESC_NULLS_LAST",
  minCollateralFactor_ASC = "minCollateralFactor_ASC",
  minCollateralFactor_ASC_NULLS_FIRST = "minCollateralFactor_ASC_NULLS_FIRST",
  minCollateralFactor_ASC_NULLS_LAST = "minCollateralFactor_ASC_NULLS_LAST",
  minCollateralFactor_DESC = "minCollateralFactor_DESC",
  minCollateralFactor_DESC_NULLS_FIRST = "minCollateralFactor_DESC_NULLS_FIRST",
  minCollateralFactor_DESC_NULLS_LAST = "minCollateralFactor_DESC_NULLS_LAST",
  minFundingFactorPerSecond_ASC = "minFundingFactorPerSecond_ASC",
  minFundingFactorPerSecond_ASC_NULLS_FIRST = "minFundingFactorPerSecond_ASC_NULLS_FIRST",
  minFundingFactorPerSecond_ASC_NULLS_LAST = "minFundingFactorPerSecond_ASC_NULLS_LAST",
  minFundingFactorPerSecond_DESC = "minFundingFactorPerSecond_DESC",
  minFundingFactorPerSecond_DESC_NULLS_FIRST = "minFundingFactorPerSecond_DESC_NULLS_FIRST",
  minFundingFactorPerSecond_DESC_NULLS_LAST = "minFundingFactorPerSecond_DESC_NULLS_LAST",
  minPositionImpactPoolAmount_ASC = "minPositionImpactPoolAmount_ASC",
  minPositionImpactPoolAmount_ASC_NULLS_FIRST = "minPositionImpactPoolAmount_ASC_NULLS_FIRST",
  minPositionImpactPoolAmount_ASC_NULLS_LAST = "minPositionImpactPoolAmount_ASC_NULLS_LAST",
  minPositionImpactPoolAmount_DESC = "minPositionImpactPoolAmount_DESC",
  minPositionImpactPoolAmount_DESC_NULLS_FIRST = "minPositionImpactPoolAmount_DESC_NULLS_FIRST",
  minPositionImpactPoolAmount_DESC_NULLS_LAST = "minPositionImpactPoolAmount_DESC_NULLS_LAST",
  openInterestReserveFactorLong_ASC = "openInterestReserveFactorLong_ASC",
  openInterestReserveFactorLong_ASC_NULLS_FIRST = "openInterestReserveFactorLong_ASC_NULLS_FIRST",
  openInterestReserveFactorLong_ASC_NULLS_LAST = "openInterestReserveFactorLong_ASC_NULLS_LAST",
  openInterestReserveFactorLong_DESC = "openInterestReserveFactorLong_DESC",
  openInterestReserveFactorLong_DESC_NULLS_FIRST = "openInterestReserveFactorLong_DESC_NULLS_FIRST",
  openInterestReserveFactorLong_DESC_NULLS_LAST = "openInterestReserveFactorLong_DESC_NULLS_LAST",
  openInterestReserveFactorShort_ASC = "openInterestReserveFactorShort_ASC",
  openInterestReserveFactorShort_ASC_NULLS_FIRST = "openInterestReserveFactorShort_ASC_NULLS_FIRST",
  openInterestReserveFactorShort_ASC_NULLS_LAST = "openInterestReserveFactorShort_ASC_NULLS_LAST",
  openInterestReserveFactorShort_DESC = "openInterestReserveFactorShort_DESC",
  openInterestReserveFactorShort_DESC_NULLS_FIRST = "openInterestReserveFactorShort_DESC_NULLS_FIRST",
  openInterestReserveFactorShort_DESC_NULLS_LAST = "openInterestReserveFactorShort_DESC_NULLS_LAST",
  optimalUsageFactorLong_ASC = "optimalUsageFactorLong_ASC",
  optimalUsageFactorLong_ASC_NULLS_FIRST = "optimalUsageFactorLong_ASC_NULLS_FIRST",
  optimalUsageFactorLong_ASC_NULLS_LAST = "optimalUsageFactorLong_ASC_NULLS_LAST",
  optimalUsageFactorLong_DESC = "optimalUsageFactorLong_DESC",
  optimalUsageFactorLong_DESC_NULLS_FIRST = "optimalUsageFactorLong_DESC_NULLS_FIRST",
  optimalUsageFactorLong_DESC_NULLS_LAST = "optimalUsageFactorLong_DESC_NULLS_LAST",
  optimalUsageFactorShort_ASC = "optimalUsageFactorShort_ASC",
  optimalUsageFactorShort_ASC_NULLS_FIRST = "optimalUsageFactorShort_ASC_NULLS_FIRST",
  optimalUsageFactorShort_ASC_NULLS_LAST = "optimalUsageFactorShort_ASC_NULLS_LAST",
  optimalUsageFactorShort_DESC = "optimalUsageFactorShort_DESC",
  optimalUsageFactorShort_DESC_NULLS_FIRST = "optimalUsageFactorShort_DESC_NULLS_FIRST",
  optimalUsageFactorShort_DESC_NULLS_LAST = "optimalUsageFactorShort_DESC_NULLS_LAST",
  poolValueMax_ASC = "poolValueMax_ASC",
  poolValueMax_ASC_NULLS_FIRST = "poolValueMax_ASC_NULLS_FIRST",
  poolValueMax_ASC_NULLS_LAST = "poolValueMax_ASC_NULLS_LAST",
  poolValueMax_DESC = "poolValueMax_DESC",
  poolValueMax_DESC_NULLS_FIRST = "poolValueMax_DESC_NULLS_FIRST",
  poolValueMax_DESC_NULLS_LAST = "poolValueMax_DESC_NULLS_LAST",
  poolValueMin_ASC = "poolValueMin_ASC",
  poolValueMin_ASC_NULLS_FIRST = "poolValueMin_ASC_NULLS_FIRST",
  poolValueMin_ASC_NULLS_LAST = "poolValueMin_ASC_NULLS_LAST",
  poolValueMin_DESC = "poolValueMin_DESC",
  poolValueMin_DESC_NULLS_FIRST = "poolValueMin_DESC_NULLS_FIRST",
  poolValueMin_DESC_NULLS_LAST = "poolValueMin_DESC_NULLS_LAST",
  poolValue_ASC = "poolValue_ASC",
  poolValue_ASC_NULLS_FIRST = "poolValue_ASC_NULLS_FIRST",
  poolValue_ASC_NULLS_LAST = "poolValue_ASC_NULLS_LAST",
  poolValue_DESC = "poolValue_DESC",
  poolValue_DESC_NULLS_FIRST = "poolValue_DESC_NULLS_FIRST",
  poolValue_DESC_NULLS_LAST = "poolValue_DESC_NULLS_LAST",
  positionFeeFactorForNegativeImpact_ASC = "positionFeeFactorForNegativeImpact_ASC",
  positionFeeFactorForNegativeImpact_ASC_NULLS_FIRST = "positionFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  positionFeeFactorForNegativeImpact_ASC_NULLS_LAST = "positionFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  positionFeeFactorForNegativeImpact_DESC = "positionFeeFactorForNegativeImpact_DESC",
  positionFeeFactorForNegativeImpact_DESC_NULLS_FIRST = "positionFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  positionFeeFactorForNegativeImpact_DESC_NULLS_LAST = "positionFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  positionFeeFactorForPositiveImpact_ASC = "positionFeeFactorForPositiveImpact_ASC",
  positionFeeFactorForPositiveImpact_ASC_NULLS_FIRST = "positionFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  positionFeeFactorForPositiveImpact_ASC_NULLS_LAST = "positionFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  positionFeeFactorForPositiveImpact_DESC = "positionFeeFactorForPositiveImpact_DESC",
  positionFeeFactorForPositiveImpact_DESC_NULLS_FIRST = "positionFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  positionFeeFactorForPositiveImpact_DESC_NULLS_LAST = "positionFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  positionImpactExponentFactor_ASC = "positionImpactExponentFactor_ASC",
  positionImpactExponentFactor_ASC_NULLS_FIRST = "positionImpactExponentFactor_ASC_NULLS_FIRST",
  positionImpactExponentFactor_ASC_NULLS_LAST = "positionImpactExponentFactor_ASC_NULLS_LAST",
  positionImpactExponentFactor_DESC = "positionImpactExponentFactor_DESC",
  positionImpactExponentFactor_DESC_NULLS_FIRST = "positionImpactExponentFactor_DESC_NULLS_FIRST",
  positionImpactExponentFactor_DESC_NULLS_LAST = "positionImpactExponentFactor_DESC_NULLS_LAST",
  positionImpactFactorNegative_ASC = "positionImpactFactorNegative_ASC",
  positionImpactFactorNegative_ASC_NULLS_FIRST = "positionImpactFactorNegative_ASC_NULLS_FIRST",
  positionImpactFactorNegative_ASC_NULLS_LAST = "positionImpactFactorNegative_ASC_NULLS_LAST",
  positionImpactFactorNegative_DESC = "positionImpactFactorNegative_DESC",
  positionImpactFactorNegative_DESC_NULLS_FIRST = "positionImpactFactorNegative_DESC_NULLS_FIRST",
  positionImpactFactorNegative_DESC_NULLS_LAST = "positionImpactFactorNegative_DESC_NULLS_LAST",
  positionImpactFactorPositive_ASC = "positionImpactFactorPositive_ASC",
  positionImpactFactorPositive_ASC_NULLS_FIRST = "positionImpactFactorPositive_ASC_NULLS_FIRST",
  positionImpactFactorPositive_ASC_NULLS_LAST = "positionImpactFactorPositive_ASC_NULLS_LAST",
  positionImpactFactorPositive_DESC = "positionImpactFactorPositive_DESC",
  positionImpactFactorPositive_DESC_NULLS_FIRST = "positionImpactFactorPositive_DESC_NULLS_FIRST",
  positionImpactFactorPositive_DESC_NULLS_LAST = "positionImpactFactorPositive_DESC_NULLS_LAST",
  positionImpactPoolAmount_ASC = "positionImpactPoolAmount_ASC",
  positionImpactPoolAmount_ASC_NULLS_FIRST = "positionImpactPoolAmount_ASC_NULLS_FIRST",
  positionImpactPoolAmount_ASC_NULLS_LAST = "positionImpactPoolAmount_ASC_NULLS_LAST",
  positionImpactPoolAmount_DESC = "positionImpactPoolAmount_DESC",
  positionImpactPoolAmount_DESC_NULLS_FIRST = "positionImpactPoolAmount_DESC_NULLS_FIRST",
  positionImpactPoolAmount_DESC_NULLS_LAST = "positionImpactPoolAmount_DESC_NULLS_LAST",
  positionImpactPoolDistributionRate_ASC = "positionImpactPoolDistributionRate_ASC",
  positionImpactPoolDistributionRate_ASC_NULLS_FIRST = "positionImpactPoolDistributionRate_ASC_NULLS_FIRST",
  positionImpactPoolDistributionRate_ASC_NULLS_LAST = "positionImpactPoolDistributionRate_ASC_NULLS_LAST",
  positionImpactPoolDistributionRate_DESC = "positionImpactPoolDistributionRate_DESC",
  positionImpactPoolDistributionRate_DESC_NULLS_FIRST = "positionImpactPoolDistributionRate_DESC_NULLS_FIRST",
  positionImpactPoolDistributionRate_DESC_NULLS_LAST = "positionImpactPoolDistributionRate_DESC_NULLS_LAST",
  reserveFactorLong_ASC = "reserveFactorLong_ASC",
  reserveFactorLong_ASC_NULLS_FIRST = "reserveFactorLong_ASC_NULLS_FIRST",
  reserveFactorLong_ASC_NULLS_LAST = "reserveFactorLong_ASC_NULLS_LAST",
  reserveFactorLong_DESC = "reserveFactorLong_DESC",
  reserveFactorLong_DESC_NULLS_FIRST = "reserveFactorLong_DESC_NULLS_FIRST",
  reserveFactorLong_DESC_NULLS_LAST = "reserveFactorLong_DESC_NULLS_LAST",
  reserveFactorShort_ASC = "reserveFactorShort_ASC",
  reserveFactorShort_ASC_NULLS_FIRST = "reserveFactorShort_ASC_NULLS_FIRST",
  reserveFactorShort_ASC_NULLS_LAST = "reserveFactorShort_ASC_NULLS_LAST",
  reserveFactorShort_DESC = "reserveFactorShort_DESC",
  reserveFactorShort_DESC_NULLS_FIRST = "reserveFactorShort_DESC_NULLS_FIRST",
  reserveFactorShort_DESC_NULLS_LAST = "reserveFactorShort_DESC_NULLS_LAST",
  shortOpenInterestInTokensUsingLongToken_ASC = "shortOpenInterestInTokensUsingLongToken_ASC",
  shortOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_FIRST",
  shortOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST = "shortOpenInterestInTokensUsingLongToken_ASC_NULLS_LAST",
  shortOpenInterestInTokensUsingLongToken_DESC = "shortOpenInterestInTokensUsingLongToken_DESC",
  shortOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_FIRST",
  shortOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST = "shortOpenInterestInTokensUsingLongToken_DESC_NULLS_LAST",
  shortOpenInterestInTokensUsingShortToken_ASC = "shortOpenInterestInTokensUsingShortToken_ASC",
  shortOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_FIRST",
  shortOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST = "shortOpenInterestInTokensUsingShortToken_ASC_NULLS_LAST",
  shortOpenInterestInTokensUsingShortToken_DESC = "shortOpenInterestInTokensUsingShortToken_DESC",
  shortOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_FIRST",
  shortOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST = "shortOpenInterestInTokensUsingShortToken_DESC_NULLS_LAST",
  shortOpenInterestInTokens_ASC = "shortOpenInterestInTokens_ASC",
  shortOpenInterestInTokens_ASC_NULLS_FIRST = "shortOpenInterestInTokens_ASC_NULLS_FIRST",
  shortOpenInterestInTokens_ASC_NULLS_LAST = "shortOpenInterestInTokens_ASC_NULLS_LAST",
  shortOpenInterestInTokens_DESC = "shortOpenInterestInTokens_DESC",
  shortOpenInterestInTokens_DESC_NULLS_FIRST = "shortOpenInterestInTokens_DESC_NULLS_FIRST",
  shortOpenInterestInTokens_DESC_NULLS_LAST = "shortOpenInterestInTokens_DESC_NULLS_LAST",
  shortOpenInterestUsd_ASC = "shortOpenInterestUsd_ASC",
  shortOpenInterestUsd_ASC_NULLS_FIRST = "shortOpenInterestUsd_ASC_NULLS_FIRST",
  shortOpenInterestUsd_ASC_NULLS_LAST = "shortOpenInterestUsd_ASC_NULLS_LAST",
  shortOpenInterestUsd_DESC = "shortOpenInterestUsd_DESC",
  shortOpenInterestUsd_DESC_NULLS_FIRST = "shortOpenInterestUsd_DESC_NULLS_FIRST",
  shortOpenInterestUsd_DESC_NULLS_LAST = "shortOpenInterestUsd_DESC_NULLS_LAST",
  shortOpenInterestUsingLongToken_ASC = "shortOpenInterestUsingLongToken_ASC",
  shortOpenInterestUsingLongToken_ASC_NULLS_FIRST = "shortOpenInterestUsingLongToken_ASC_NULLS_FIRST",
  shortOpenInterestUsingLongToken_ASC_NULLS_LAST = "shortOpenInterestUsingLongToken_ASC_NULLS_LAST",
  shortOpenInterestUsingLongToken_DESC = "shortOpenInterestUsingLongToken_DESC",
  shortOpenInterestUsingLongToken_DESC_NULLS_FIRST = "shortOpenInterestUsingLongToken_DESC_NULLS_FIRST",
  shortOpenInterestUsingLongToken_DESC_NULLS_LAST = "shortOpenInterestUsingLongToken_DESC_NULLS_LAST",
  shortOpenInterestUsingShortToken_ASC = "shortOpenInterestUsingShortToken_ASC",
  shortOpenInterestUsingShortToken_ASC_NULLS_FIRST = "shortOpenInterestUsingShortToken_ASC_NULLS_FIRST",
  shortOpenInterestUsingShortToken_ASC_NULLS_LAST = "shortOpenInterestUsingShortToken_ASC_NULLS_LAST",
  shortOpenInterestUsingShortToken_DESC = "shortOpenInterestUsingShortToken_DESC",
  shortOpenInterestUsingShortToken_DESC_NULLS_FIRST = "shortOpenInterestUsingShortToken_DESC_NULLS_FIRST",
  shortOpenInterestUsingShortToken_DESC_NULLS_LAST = "shortOpenInterestUsingShortToken_DESC_NULLS_LAST",
  shortPoolAmountAdjustment_ASC = "shortPoolAmountAdjustment_ASC",
  shortPoolAmountAdjustment_ASC_NULLS_FIRST = "shortPoolAmountAdjustment_ASC_NULLS_FIRST",
  shortPoolAmountAdjustment_ASC_NULLS_LAST = "shortPoolAmountAdjustment_ASC_NULLS_LAST",
  shortPoolAmountAdjustment_DESC = "shortPoolAmountAdjustment_DESC",
  shortPoolAmountAdjustment_DESC_NULLS_FIRST = "shortPoolAmountAdjustment_DESC_NULLS_FIRST",
  shortPoolAmountAdjustment_DESC_NULLS_LAST = "shortPoolAmountAdjustment_DESC_NULLS_LAST",
  shortPoolAmount_ASC = "shortPoolAmount_ASC",
  shortPoolAmount_ASC_NULLS_FIRST = "shortPoolAmount_ASC_NULLS_FIRST",
  shortPoolAmount_ASC_NULLS_LAST = "shortPoolAmount_ASC_NULLS_LAST",
  shortPoolAmount_DESC = "shortPoolAmount_DESC",
  shortPoolAmount_DESC_NULLS_FIRST = "shortPoolAmount_DESC_NULLS_FIRST",
  shortPoolAmount_DESC_NULLS_LAST = "shortPoolAmount_DESC_NULLS_LAST",
  shortTokenAddress_ASC = "shortTokenAddress_ASC",
  shortTokenAddress_ASC_NULLS_FIRST = "shortTokenAddress_ASC_NULLS_FIRST",
  shortTokenAddress_ASC_NULLS_LAST = "shortTokenAddress_ASC_NULLS_LAST",
  shortTokenAddress_DESC = "shortTokenAddress_DESC",
  shortTokenAddress_DESC_NULLS_FIRST = "shortTokenAddress_DESC_NULLS_FIRST",
  shortTokenAddress_DESC_NULLS_LAST = "shortTokenAddress_DESC_NULLS_LAST",
  swapFeeFactorForNegativeImpact_ASC = "swapFeeFactorForNegativeImpact_ASC",
  swapFeeFactorForNegativeImpact_ASC_NULLS_FIRST = "swapFeeFactorForNegativeImpact_ASC_NULLS_FIRST",
  swapFeeFactorForNegativeImpact_ASC_NULLS_LAST = "swapFeeFactorForNegativeImpact_ASC_NULLS_LAST",
  swapFeeFactorForNegativeImpact_DESC = "swapFeeFactorForNegativeImpact_DESC",
  swapFeeFactorForNegativeImpact_DESC_NULLS_FIRST = "swapFeeFactorForNegativeImpact_DESC_NULLS_FIRST",
  swapFeeFactorForNegativeImpact_DESC_NULLS_LAST = "swapFeeFactorForNegativeImpact_DESC_NULLS_LAST",
  swapFeeFactorForPositiveImpact_ASC = "swapFeeFactorForPositiveImpact_ASC",
  swapFeeFactorForPositiveImpact_ASC_NULLS_FIRST = "swapFeeFactorForPositiveImpact_ASC_NULLS_FIRST",
  swapFeeFactorForPositiveImpact_ASC_NULLS_LAST = "swapFeeFactorForPositiveImpact_ASC_NULLS_LAST",
  swapFeeFactorForPositiveImpact_DESC = "swapFeeFactorForPositiveImpact_DESC",
  swapFeeFactorForPositiveImpact_DESC_NULLS_FIRST = "swapFeeFactorForPositiveImpact_DESC_NULLS_FIRST",
  swapFeeFactorForPositiveImpact_DESC_NULLS_LAST = "swapFeeFactorForPositiveImpact_DESC_NULLS_LAST",
  swapImpactExponentFactor_ASC = "swapImpactExponentFactor_ASC",
  swapImpactExponentFactor_ASC_NULLS_FIRST = "swapImpactExponentFactor_ASC_NULLS_FIRST",
  swapImpactExponentFactor_ASC_NULLS_LAST = "swapImpactExponentFactor_ASC_NULLS_LAST",
  swapImpactExponentFactor_DESC = "swapImpactExponentFactor_DESC",
  swapImpactExponentFactor_DESC_NULLS_FIRST = "swapImpactExponentFactor_DESC_NULLS_FIRST",
  swapImpactExponentFactor_DESC_NULLS_LAST = "swapImpactExponentFactor_DESC_NULLS_LAST",
  swapImpactFactorNegative_ASC = "swapImpactFactorNegative_ASC",
  swapImpactFactorNegative_ASC_NULLS_FIRST = "swapImpactFactorNegative_ASC_NULLS_FIRST",
  swapImpactFactorNegative_ASC_NULLS_LAST = "swapImpactFactorNegative_ASC_NULLS_LAST",
  swapImpactFactorNegative_DESC = "swapImpactFactorNegative_DESC",
  swapImpactFactorNegative_DESC_NULLS_FIRST = "swapImpactFactorNegative_DESC_NULLS_FIRST",
  swapImpactFactorNegative_DESC_NULLS_LAST = "swapImpactFactorNegative_DESC_NULLS_LAST",
  swapImpactFactorPositive_ASC = "swapImpactFactorPositive_ASC",
  swapImpactFactorPositive_ASC_NULLS_FIRST = "swapImpactFactorPositive_ASC_NULLS_FIRST",
  swapImpactFactorPositive_ASC_NULLS_LAST = "swapImpactFactorPositive_ASC_NULLS_LAST",
  swapImpactFactorPositive_DESC = "swapImpactFactorPositive_DESC",
  swapImpactFactorPositive_DESC_NULLS_FIRST = "swapImpactFactorPositive_DESC_NULLS_FIRST",
  swapImpactFactorPositive_DESC_NULLS_LAST = "swapImpactFactorPositive_DESC_NULLS_LAST",
  swapImpactPoolAmountLong_ASC = "swapImpactPoolAmountLong_ASC",
  swapImpactPoolAmountLong_ASC_NULLS_FIRST = "swapImpactPoolAmountLong_ASC_NULLS_FIRST",
  swapImpactPoolAmountLong_ASC_NULLS_LAST = "swapImpactPoolAmountLong_ASC_NULLS_LAST",
  swapImpactPoolAmountLong_DESC = "swapImpactPoolAmountLong_DESC",
  swapImpactPoolAmountLong_DESC_NULLS_FIRST = "swapImpactPoolAmountLong_DESC_NULLS_FIRST",
  swapImpactPoolAmountLong_DESC_NULLS_LAST = "swapImpactPoolAmountLong_DESC_NULLS_LAST",
  swapImpactPoolAmountShort_ASC = "swapImpactPoolAmountShort_ASC",
  swapImpactPoolAmountShort_ASC_NULLS_FIRST = "swapImpactPoolAmountShort_ASC_NULLS_FIRST",
  swapImpactPoolAmountShort_ASC_NULLS_LAST = "swapImpactPoolAmountShort_ASC_NULLS_LAST",
  swapImpactPoolAmountShort_DESC = "swapImpactPoolAmountShort_DESC",
  swapImpactPoolAmountShort_DESC_NULLS_FIRST = "swapImpactPoolAmountShort_DESC_NULLS_FIRST",
  swapImpactPoolAmountShort_DESC_NULLS_LAST = "swapImpactPoolAmountShort_DESC_NULLS_LAST",
  thresholdForDecreaseFunding_ASC = "thresholdForDecreaseFunding_ASC",
  thresholdForDecreaseFunding_ASC_NULLS_FIRST = "thresholdForDecreaseFunding_ASC_NULLS_FIRST",
  thresholdForDecreaseFunding_ASC_NULLS_LAST = "thresholdForDecreaseFunding_ASC_NULLS_LAST",
  thresholdForDecreaseFunding_DESC = "thresholdForDecreaseFunding_DESC",
  thresholdForDecreaseFunding_DESC_NULLS_FIRST = "thresholdForDecreaseFunding_DESC_NULLS_FIRST",
  thresholdForDecreaseFunding_DESC_NULLS_LAST = "thresholdForDecreaseFunding_DESC_NULLS_LAST",
  thresholdForStableFunding_ASC = "thresholdForStableFunding_ASC",
  thresholdForStableFunding_ASC_NULLS_FIRST = "thresholdForStableFunding_ASC_NULLS_FIRST",
  thresholdForStableFunding_ASC_NULLS_LAST = "thresholdForStableFunding_ASC_NULLS_LAST",
  thresholdForStableFunding_DESC = "thresholdForStableFunding_DESC",
  thresholdForStableFunding_DESC_NULLS_FIRST = "thresholdForStableFunding_DESC_NULLS_FIRST",
  thresholdForStableFunding_DESC_NULLS_LAST = "thresholdForStableFunding_DESC_NULLS_LAST",
  totalBorrowingFees_ASC = "totalBorrowingFees_ASC",
  totalBorrowingFees_ASC_NULLS_FIRST = "totalBorrowingFees_ASC_NULLS_FIRST",
  totalBorrowingFees_ASC_NULLS_LAST = "totalBorrowingFees_ASC_NULLS_LAST",
  totalBorrowingFees_DESC = "totalBorrowingFees_DESC",
  totalBorrowingFees_DESC_NULLS_FIRST = "totalBorrowingFees_DESC_NULLS_FIRST",
  totalBorrowingFees_DESC_NULLS_LAST = "totalBorrowingFees_DESC_NULLS_LAST",
  virtualIndexTokenId_ASC = "virtualIndexTokenId_ASC",
  virtualIndexTokenId_ASC_NULLS_FIRST = "virtualIndexTokenId_ASC_NULLS_FIRST",
  virtualIndexTokenId_ASC_NULLS_LAST = "virtualIndexTokenId_ASC_NULLS_LAST",
  virtualIndexTokenId_DESC = "virtualIndexTokenId_DESC",
  virtualIndexTokenId_DESC_NULLS_FIRST = "virtualIndexTokenId_DESC_NULLS_FIRST",
  virtualIndexTokenId_DESC_NULLS_LAST = "virtualIndexTokenId_DESC_NULLS_LAST",
  virtualInventoryForPositions_ASC = "virtualInventoryForPositions_ASC",
  virtualInventoryForPositions_ASC_NULLS_FIRST = "virtualInventoryForPositions_ASC_NULLS_FIRST",
  virtualInventoryForPositions_ASC_NULLS_LAST = "virtualInventoryForPositions_ASC_NULLS_LAST",
  virtualInventoryForPositions_DESC = "virtualInventoryForPositions_DESC",
  virtualInventoryForPositions_DESC_NULLS_FIRST = "virtualInventoryForPositions_DESC_NULLS_FIRST",
  virtualInventoryForPositions_DESC_NULLS_LAST = "virtualInventoryForPositions_DESC_NULLS_LAST",
  virtualLongTokenId_ASC = "virtualLongTokenId_ASC",
  virtualLongTokenId_ASC_NULLS_FIRST = "virtualLongTokenId_ASC_NULLS_FIRST",
  virtualLongTokenId_ASC_NULLS_LAST = "virtualLongTokenId_ASC_NULLS_LAST",
  virtualLongTokenId_DESC = "virtualLongTokenId_DESC",
  virtualLongTokenId_DESC_NULLS_FIRST = "virtualLongTokenId_DESC_NULLS_FIRST",
  virtualLongTokenId_DESC_NULLS_LAST = "virtualLongTokenId_DESC_NULLS_LAST",
  virtualMarketId_ASC = "virtualMarketId_ASC",
  virtualMarketId_ASC_NULLS_FIRST = "virtualMarketId_ASC_NULLS_FIRST",
  virtualMarketId_ASC_NULLS_LAST = "virtualMarketId_ASC_NULLS_LAST",
  virtualMarketId_DESC = "virtualMarketId_DESC",
  virtualMarketId_DESC_NULLS_FIRST = "virtualMarketId_DESC_NULLS_FIRST",
  virtualMarketId_DESC_NULLS_LAST = "virtualMarketId_DESC_NULLS_LAST",
  virtualPoolAmountForLongToken_ASC = "virtualPoolAmountForLongToken_ASC",
  virtualPoolAmountForLongToken_ASC_NULLS_FIRST = "virtualPoolAmountForLongToken_ASC_NULLS_FIRST",
  virtualPoolAmountForLongToken_ASC_NULLS_LAST = "virtualPoolAmountForLongToken_ASC_NULLS_LAST",
  virtualPoolAmountForLongToken_DESC = "virtualPoolAmountForLongToken_DESC",
  virtualPoolAmountForLongToken_DESC_NULLS_FIRST = "virtualPoolAmountForLongToken_DESC_NULLS_FIRST",
  virtualPoolAmountForLongToken_DESC_NULLS_LAST = "virtualPoolAmountForLongToken_DESC_NULLS_LAST",
  virtualPoolAmountForShortToken_ASC = "virtualPoolAmountForShortToken_ASC",
  virtualPoolAmountForShortToken_ASC_NULLS_FIRST = "virtualPoolAmountForShortToken_ASC_NULLS_FIRST",
  virtualPoolAmountForShortToken_ASC_NULLS_LAST = "virtualPoolAmountForShortToken_ASC_NULLS_LAST",
  virtualPoolAmountForShortToken_DESC = "virtualPoolAmountForShortToken_DESC",
  virtualPoolAmountForShortToken_DESC_NULLS_FIRST = "virtualPoolAmountForShortToken_DESC_NULLS_FIRST",
  virtualPoolAmountForShortToken_DESC_NULLS_LAST = "virtualPoolAmountForShortToken_DESC_NULLS_LAST",
  virtualShortTokenId_ASC = "virtualShortTokenId_ASC",
  virtualShortTokenId_ASC_NULLS_FIRST = "virtualShortTokenId_ASC_NULLS_FIRST",
  virtualShortTokenId_ASC_NULLS_LAST = "virtualShortTokenId_ASC_NULLS_LAST",
  virtualShortTokenId_DESC = "virtualShortTokenId_DESC",
  virtualShortTokenId_DESC_NULLS_FIRST = "virtualShortTokenId_DESC_NULLS_FIRST",
  virtualShortTokenId_DESC_NULLS_LAST = "virtualShortTokenId_DESC_NULLS_LAST",
}

export interface MarketInfoWhereInput {
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
}

export interface MarketInfosConnection {
  __typename?: "MarketInfosConnection";
  edges: Array<MarketInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export enum MarketOrderByInput {
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  indexToken_ASC = "indexToken_ASC",
  indexToken_ASC_NULLS_FIRST = "indexToken_ASC_NULLS_FIRST",
  indexToken_ASC_NULLS_LAST = "indexToken_ASC_NULLS_LAST",
  indexToken_DESC = "indexToken_DESC",
  indexToken_DESC_NULLS_FIRST = "indexToken_DESC_NULLS_FIRST",
  indexToken_DESC_NULLS_LAST = "indexToken_DESC_NULLS_LAST",
  longToken_ASC = "longToken_ASC",
  longToken_ASC_NULLS_FIRST = "longToken_ASC_NULLS_FIRST",
  longToken_ASC_NULLS_LAST = "longToken_ASC_NULLS_LAST",
  longToken_DESC = "longToken_DESC",
  longToken_DESC_NULLS_FIRST = "longToken_DESC_NULLS_FIRST",
  longToken_DESC_NULLS_LAST = "longToken_DESC_NULLS_LAST",
  shortToken_ASC = "shortToken_ASC",
  shortToken_ASC_NULLS_FIRST = "shortToken_ASC_NULLS_FIRST",
  shortToken_ASC_NULLS_LAST = "shortToken_ASC_NULLS_LAST",
  shortToken_DESC = "shortToken_DESC",
  shortToken_DESC_NULLS_FIRST = "shortToken_DESC_NULLS_FIRST",
  shortToken_DESC_NULLS_LAST = "shortToken_DESC_NULLS_LAST",
}

export interface MarketWhereInput {
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
}

export interface MarketsConnection {
  __typename?: "MarketsConnection";
  edges: Array<MarketEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface OnChainSetting {
  __typename?: "OnChainSetting";
  id: Scalars["String"]["output"];
  key: Scalars["String"]["output"];
  type: OnChainSettingType;
  value: Scalars["String"]["output"];
}

export interface OnChainSettingEdge {
  __typename?: "OnChainSettingEdge";
  cursor: Scalars["String"]["output"];
  node: OnChainSetting;
}

export enum OnChainSettingOrderByInput {
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  key_ASC = "key_ASC",
  key_ASC_NULLS_FIRST = "key_ASC_NULLS_FIRST",
  key_ASC_NULLS_LAST = "key_ASC_NULLS_LAST",
  key_DESC = "key_DESC",
  key_DESC_NULLS_FIRST = "key_DESC_NULLS_FIRST",
  key_DESC_NULLS_LAST = "key_DESC_NULLS_LAST",
  type_ASC = "type_ASC",
  type_ASC_NULLS_FIRST = "type_ASC_NULLS_FIRST",
  type_ASC_NULLS_LAST = "type_ASC_NULLS_LAST",
  type_DESC = "type_DESC",
  type_DESC_NULLS_FIRST = "type_DESC_NULLS_FIRST",
  type_DESC_NULLS_LAST = "type_DESC_NULLS_LAST",
  value_ASC = "value_ASC",
  value_ASC_NULLS_FIRST = "value_ASC_NULLS_FIRST",
  value_ASC_NULLS_LAST = "value_ASC_NULLS_LAST",
  value_DESC = "value_DESC",
  value_DESC_NULLS_FIRST = "value_DESC_NULLS_FIRST",
  value_DESC_NULLS_LAST = "value_DESC_NULLS_LAST",
}

export enum OnChainSettingType {
  bool = "bool",
  bytes32 = "bytes32",
  string = "string",
  uint = "uint",
}

export interface OnChainSettingWhereInput {
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
}

export interface OnChainSettingsConnection {
  __typename?: "OnChainSettingsConnection";
  edges: Array<OnChainSettingEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface Order {
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
}

export interface OrderEdge {
  __typename?: "OrderEdge";
  cursor: Scalars["String"]["output"];
  node: Order;
}

export enum OrderOrderByInput {
  acceptablePrice_ASC = "acceptablePrice_ASC",
  acceptablePrice_ASC_NULLS_FIRST = "acceptablePrice_ASC_NULLS_FIRST",
  acceptablePrice_ASC_NULLS_LAST = "acceptablePrice_ASC_NULLS_LAST",
  acceptablePrice_DESC = "acceptablePrice_DESC",
  acceptablePrice_DESC_NULLS_FIRST = "acceptablePrice_DESC_NULLS_FIRST",
  acceptablePrice_DESC_NULLS_LAST = "acceptablePrice_DESC_NULLS_LAST",
  account_ASC = "account_ASC",
  account_ASC_NULLS_FIRST = "account_ASC_NULLS_FIRST",
  account_ASC_NULLS_LAST = "account_ASC_NULLS_LAST",
  account_DESC = "account_DESC",
  account_DESC_NULLS_FIRST = "account_DESC_NULLS_FIRST",
  account_DESC_NULLS_LAST = "account_DESC_NULLS_LAST",
  callbackContract_ASC = "callbackContract_ASC",
  callbackContract_ASC_NULLS_FIRST = "callbackContract_ASC_NULLS_FIRST",
  callbackContract_ASC_NULLS_LAST = "callbackContract_ASC_NULLS_LAST",
  callbackContract_DESC = "callbackContract_DESC",
  callbackContract_DESC_NULLS_FIRST = "callbackContract_DESC_NULLS_FIRST",
  callbackContract_DESC_NULLS_LAST = "callbackContract_DESC_NULLS_LAST",
  callbackGasLimit_ASC = "callbackGasLimit_ASC",
  callbackGasLimit_ASC_NULLS_FIRST = "callbackGasLimit_ASC_NULLS_FIRST",
  callbackGasLimit_ASC_NULLS_LAST = "callbackGasLimit_ASC_NULLS_LAST",
  callbackGasLimit_DESC = "callbackGasLimit_DESC",
  callbackGasLimit_DESC_NULLS_FIRST = "callbackGasLimit_DESC_NULLS_FIRST",
  callbackGasLimit_DESC_NULLS_LAST = "callbackGasLimit_DESC_NULLS_LAST",
  cancelledReasonBytes_ASC = "cancelledReasonBytes_ASC",
  cancelledReasonBytes_ASC_NULLS_FIRST = "cancelledReasonBytes_ASC_NULLS_FIRST",
  cancelledReasonBytes_ASC_NULLS_LAST = "cancelledReasonBytes_ASC_NULLS_LAST",
  cancelledReasonBytes_DESC = "cancelledReasonBytes_DESC",
  cancelledReasonBytes_DESC_NULLS_FIRST = "cancelledReasonBytes_DESC_NULLS_FIRST",
  cancelledReasonBytes_DESC_NULLS_LAST = "cancelledReasonBytes_DESC_NULLS_LAST",
  cancelledReason_ASC = "cancelledReason_ASC",
  cancelledReason_ASC_NULLS_FIRST = "cancelledReason_ASC_NULLS_FIRST",
  cancelledReason_ASC_NULLS_LAST = "cancelledReason_ASC_NULLS_LAST",
  cancelledReason_DESC = "cancelledReason_DESC",
  cancelledReason_DESC_NULLS_FIRST = "cancelledReason_DESC_NULLS_FIRST",
  cancelledReason_DESC_NULLS_LAST = "cancelledReason_DESC_NULLS_LAST",
  cancelledTxn_blockNumber_ASC = "cancelledTxn_blockNumber_ASC",
  cancelledTxn_blockNumber_ASC_NULLS_FIRST = "cancelledTxn_blockNumber_ASC_NULLS_FIRST",
  cancelledTxn_blockNumber_ASC_NULLS_LAST = "cancelledTxn_blockNumber_ASC_NULLS_LAST",
  cancelledTxn_blockNumber_DESC = "cancelledTxn_blockNumber_DESC",
  cancelledTxn_blockNumber_DESC_NULLS_FIRST = "cancelledTxn_blockNumber_DESC_NULLS_FIRST",
  cancelledTxn_blockNumber_DESC_NULLS_LAST = "cancelledTxn_blockNumber_DESC_NULLS_LAST",
  cancelledTxn_from_ASC = "cancelledTxn_from_ASC",
  cancelledTxn_from_ASC_NULLS_FIRST = "cancelledTxn_from_ASC_NULLS_FIRST",
  cancelledTxn_from_ASC_NULLS_LAST = "cancelledTxn_from_ASC_NULLS_LAST",
  cancelledTxn_from_DESC = "cancelledTxn_from_DESC",
  cancelledTxn_from_DESC_NULLS_FIRST = "cancelledTxn_from_DESC_NULLS_FIRST",
  cancelledTxn_from_DESC_NULLS_LAST = "cancelledTxn_from_DESC_NULLS_LAST",
  cancelledTxn_hash_ASC = "cancelledTxn_hash_ASC",
  cancelledTxn_hash_ASC_NULLS_FIRST = "cancelledTxn_hash_ASC_NULLS_FIRST",
  cancelledTxn_hash_ASC_NULLS_LAST = "cancelledTxn_hash_ASC_NULLS_LAST",
  cancelledTxn_hash_DESC = "cancelledTxn_hash_DESC",
  cancelledTxn_hash_DESC_NULLS_FIRST = "cancelledTxn_hash_DESC_NULLS_FIRST",
  cancelledTxn_hash_DESC_NULLS_LAST = "cancelledTxn_hash_DESC_NULLS_LAST",
  cancelledTxn_id_ASC = "cancelledTxn_id_ASC",
  cancelledTxn_id_ASC_NULLS_FIRST = "cancelledTxn_id_ASC_NULLS_FIRST",
  cancelledTxn_id_ASC_NULLS_LAST = "cancelledTxn_id_ASC_NULLS_LAST",
  cancelledTxn_id_DESC = "cancelledTxn_id_DESC",
  cancelledTxn_id_DESC_NULLS_FIRST = "cancelledTxn_id_DESC_NULLS_FIRST",
  cancelledTxn_id_DESC_NULLS_LAST = "cancelledTxn_id_DESC_NULLS_LAST",
  cancelledTxn_timestamp_ASC = "cancelledTxn_timestamp_ASC",
  cancelledTxn_timestamp_ASC_NULLS_FIRST = "cancelledTxn_timestamp_ASC_NULLS_FIRST",
  cancelledTxn_timestamp_ASC_NULLS_LAST = "cancelledTxn_timestamp_ASC_NULLS_LAST",
  cancelledTxn_timestamp_DESC = "cancelledTxn_timestamp_DESC",
  cancelledTxn_timestamp_DESC_NULLS_FIRST = "cancelledTxn_timestamp_DESC_NULLS_FIRST",
  cancelledTxn_timestamp_DESC_NULLS_LAST = "cancelledTxn_timestamp_DESC_NULLS_LAST",
  cancelledTxn_to_ASC = "cancelledTxn_to_ASC",
  cancelledTxn_to_ASC_NULLS_FIRST = "cancelledTxn_to_ASC_NULLS_FIRST",
  cancelledTxn_to_ASC_NULLS_LAST = "cancelledTxn_to_ASC_NULLS_LAST",
  cancelledTxn_to_DESC = "cancelledTxn_to_DESC",
  cancelledTxn_to_DESC_NULLS_FIRST = "cancelledTxn_to_DESC_NULLS_FIRST",
  cancelledTxn_to_DESC_NULLS_LAST = "cancelledTxn_to_DESC_NULLS_LAST",
  cancelledTxn_transactionIndex_ASC = "cancelledTxn_transactionIndex_ASC",
  cancelledTxn_transactionIndex_ASC_NULLS_FIRST = "cancelledTxn_transactionIndex_ASC_NULLS_FIRST",
  cancelledTxn_transactionIndex_ASC_NULLS_LAST = "cancelledTxn_transactionIndex_ASC_NULLS_LAST",
  cancelledTxn_transactionIndex_DESC = "cancelledTxn_transactionIndex_DESC",
  cancelledTxn_transactionIndex_DESC_NULLS_FIRST = "cancelledTxn_transactionIndex_DESC_NULLS_FIRST",
  cancelledTxn_transactionIndex_DESC_NULLS_LAST = "cancelledTxn_transactionIndex_DESC_NULLS_LAST",
  createdTxn_blockNumber_ASC = "createdTxn_blockNumber_ASC",
  createdTxn_blockNumber_ASC_NULLS_FIRST = "createdTxn_blockNumber_ASC_NULLS_FIRST",
  createdTxn_blockNumber_ASC_NULLS_LAST = "createdTxn_blockNumber_ASC_NULLS_LAST",
  createdTxn_blockNumber_DESC = "createdTxn_blockNumber_DESC",
  createdTxn_blockNumber_DESC_NULLS_FIRST = "createdTxn_blockNumber_DESC_NULLS_FIRST",
  createdTxn_blockNumber_DESC_NULLS_LAST = "createdTxn_blockNumber_DESC_NULLS_LAST",
  createdTxn_from_ASC = "createdTxn_from_ASC",
  createdTxn_from_ASC_NULLS_FIRST = "createdTxn_from_ASC_NULLS_FIRST",
  createdTxn_from_ASC_NULLS_LAST = "createdTxn_from_ASC_NULLS_LAST",
  createdTxn_from_DESC = "createdTxn_from_DESC",
  createdTxn_from_DESC_NULLS_FIRST = "createdTxn_from_DESC_NULLS_FIRST",
  createdTxn_from_DESC_NULLS_LAST = "createdTxn_from_DESC_NULLS_LAST",
  createdTxn_hash_ASC = "createdTxn_hash_ASC",
  createdTxn_hash_ASC_NULLS_FIRST = "createdTxn_hash_ASC_NULLS_FIRST",
  createdTxn_hash_ASC_NULLS_LAST = "createdTxn_hash_ASC_NULLS_LAST",
  createdTxn_hash_DESC = "createdTxn_hash_DESC",
  createdTxn_hash_DESC_NULLS_FIRST = "createdTxn_hash_DESC_NULLS_FIRST",
  createdTxn_hash_DESC_NULLS_LAST = "createdTxn_hash_DESC_NULLS_LAST",
  createdTxn_id_ASC = "createdTxn_id_ASC",
  createdTxn_id_ASC_NULLS_FIRST = "createdTxn_id_ASC_NULLS_FIRST",
  createdTxn_id_ASC_NULLS_LAST = "createdTxn_id_ASC_NULLS_LAST",
  createdTxn_id_DESC = "createdTxn_id_DESC",
  createdTxn_id_DESC_NULLS_FIRST = "createdTxn_id_DESC_NULLS_FIRST",
  createdTxn_id_DESC_NULLS_LAST = "createdTxn_id_DESC_NULLS_LAST",
  createdTxn_timestamp_ASC = "createdTxn_timestamp_ASC",
  createdTxn_timestamp_ASC_NULLS_FIRST = "createdTxn_timestamp_ASC_NULLS_FIRST",
  createdTxn_timestamp_ASC_NULLS_LAST = "createdTxn_timestamp_ASC_NULLS_LAST",
  createdTxn_timestamp_DESC = "createdTxn_timestamp_DESC",
  createdTxn_timestamp_DESC_NULLS_FIRST = "createdTxn_timestamp_DESC_NULLS_FIRST",
  createdTxn_timestamp_DESC_NULLS_LAST = "createdTxn_timestamp_DESC_NULLS_LAST",
  createdTxn_to_ASC = "createdTxn_to_ASC",
  createdTxn_to_ASC_NULLS_FIRST = "createdTxn_to_ASC_NULLS_FIRST",
  createdTxn_to_ASC_NULLS_LAST = "createdTxn_to_ASC_NULLS_LAST",
  createdTxn_to_DESC = "createdTxn_to_DESC",
  createdTxn_to_DESC_NULLS_FIRST = "createdTxn_to_DESC_NULLS_FIRST",
  createdTxn_to_DESC_NULLS_LAST = "createdTxn_to_DESC_NULLS_LAST",
  createdTxn_transactionIndex_ASC = "createdTxn_transactionIndex_ASC",
  createdTxn_transactionIndex_ASC_NULLS_FIRST = "createdTxn_transactionIndex_ASC_NULLS_FIRST",
  createdTxn_transactionIndex_ASC_NULLS_LAST = "createdTxn_transactionIndex_ASC_NULLS_LAST",
  createdTxn_transactionIndex_DESC = "createdTxn_transactionIndex_DESC",
  createdTxn_transactionIndex_DESC_NULLS_FIRST = "createdTxn_transactionIndex_DESC_NULLS_FIRST",
  createdTxn_transactionIndex_DESC_NULLS_LAST = "createdTxn_transactionIndex_DESC_NULLS_LAST",
  executedTxn_blockNumber_ASC = "executedTxn_blockNumber_ASC",
  executedTxn_blockNumber_ASC_NULLS_FIRST = "executedTxn_blockNumber_ASC_NULLS_FIRST",
  executedTxn_blockNumber_ASC_NULLS_LAST = "executedTxn_blockNumber_ASC_NULLS_LAST",
  executedTxn_blockNumber_DESC = "executedTxn_blockNumber_DESC",
  executedTxn_blockNumber_DESC_NULLS_FIRST = "executedTxn_blockNumber_DESC_NULLS_FIRST",
  executedTxn_blockNumber_DESC_NULLS_LAST = "executedTxn_blockNumber_DESC_NULLS_LAST",
  executedTxn_from_ASC = "executedTxn_from_ASC",
  executedTxn_from_ASC_NULLS_FIRST = "executedTxn_from_ASC_NULLS_FIRST",
  executedTxn_from_ASC_NULLS_LAST = "executedTxn_from_ASC_NULLS_LAST",
  executedTxn_from_DESC = "executedTxn_from_DESC",
  executedTxn_from_DESC_NULLS_FIRST = "executedTxn_from_DESC_NULLS_FIRST",
  executedTxn_from_DESC_NULLS_LAST = "executedTxn_from_DESC_NULLS_LAST",
  executedTxn_hash_ASC = "executedTxn_hash_ASC",
  executedTxn_hash_ASC_NULLS_FIRST = "executedTxn_hash_ASC_NULLS_FIRST",
  executedTxn_hash_ASC_NULLS_LAST = "executedTxn_hash_ASC_NULLS_LAST",
  executedTxn_hash_DESC = "executedTxn_hash_DESC",
  executedTxn_hash_DESC_NULLS_FIRST = "executedTxn_hash_DESC_NULLS_FIRST",
  executedTxn_hash_DESC_NULLS_LAST = "executedTxn_hash_DESC_NULLS_LAST",
  executedTxn_id_ASC = "executedTxn_id_ASC",
  executedTxn_id_ASC_NULLS_FIRST = "executedTxn_id_ASC_NULLS_FIRST",
  executedTxn_id_ASC_NULLS_LAST = "executedTxn_id_ASC_NULLS_LAST",
  executedTxn_id_DESC = "executedTxn_id_DESC",
  executedTxn_id_DESC_NULLS_FIRST = "executedTxn_id_DESC_NULLS_FIRST",
  executedTxn_id_DESC_NULLS_LAST = "executedTxn_id_DESC_NULLS_LAST",
  executedTxn_timestamp_ASC = "executedTxn_timestamp_ASC",
  executedTxn_timestamp_ASC_NULLS_FIRST = "executedTxn_timestamp_ASC_NULLS_FIRST",
  executedTxn_timestamp_ASC_NULLS_LAST = "executedTxn_timestamp_ASC_NULLS_LAST",
  executedTxn_timestamp_DESC = "executedTxn_timestamp_DESC",
  executedTxn_timestamp_DESC_NULLS_FIRST = "executedTxn_timestamp_DESC_NULLS_FIRST",
  executedTxn_timestamp_DESC_NULLS_LAST = "executedTxn_timestamp_DESC_NULLS_LAST",
  executedTxn_to_ASC = "executedTxn_to_ASC",
  executedTxn_to_ASC_NULLS_FIRST = "executedTxn_to_ASC_NULLS_FIRST",
  executedTxn_to_ASC_NULLS_LAST = "executedTxn_to_ASC_NULLS_LAST",
  executedTxn_to_DESC = "executedTxn_to_DESC",
  executedTxn_to_DESC_NULLS_FIRST = "executedTxn_to_DESC_NULLS_FIRST",
  executedTxn_to_DESC_NULLS_LAST = "executedTxn_to_DESC_NULLS_LAST",
  executedTxn_transactionIndex_ASC = "executedTxn_transactionIndex_ASC",
  executedTxn_transactionIndex_ASC_NULLS_FIRST = "executedTxn_transactionIndex_ASC_NULLS_FIRST",
  executedTxn_transactionIndex_ASC_NULLS_LAST = "executedTxn_transactionIndex_ASC_NULLS_LAST",
  executedTxn_transactionIndex_DESC = "executedTxn_transactionIndex_DESC",
  executedTxn_transactionIndex_DESC_NULLS_FIRST = "executedTxn_transactionIndex_DESC_NULLS_FIRST",
  executedTxn_transactionIndex_DESC_NULLS_LAST = "executedTxn_transactionIndex_DESC_NULLS_LAST",
  executionFee_ASC = "executionFee_ASC",
  executionFee_ASC_NULLS_FIRST = "executionFee_ASC_NULLS_FIRST",
  executionFee_ASC_NULLS_LAST = "executionFee_ASC_NULLS_LAST",
  executionFee_DESC = "executionFee_DESC",
  executionFee_DESC_NULLS_FIRST = "executionFee_DESC_NULLS_FIRST",
  executionFee_DESC_NULLS_LAST = "executionFee_DESC_NULLS_LAST",
  frozenReasonBytes_ASC = "frozenReasonBytes_ASC",
  frozenReasonBytes_ASC_NULLS_FIRST = "frozenReasonBytes_ASC_NULLS_FIRST",
  frozenReasonBytes_ASC_NULLS_LAST = "frozenReasonBytes_ASC_NULLS_LAST",
  frozenReasonBytes_DESC = "frozenReasonBytes_DESC",
  frozenReasonBytes_DESC_NULLS_FIRST = "frozenReasonBytes_DESC_NULLS_FIRST",
  frozenReasonBytes_DESC_NULLS_LAST = "frozenReasonBytes_DESC_NULLS_LAST",
  frozenReason_ASC = "frozenReason_ASC",
  frozenReason_ASC_NULLS_FIRST = "frozenReason_ASC_NULLS_FIRST",
  frozenReason_ASC_NULLS_LAST = "frozenReason_ASC_NULLS_LAST",
  frozenReason_DESC = "frozenReason_DESC",
  frozenReason_DESC_NULLS_FIRST = "frozenReason_DESC_NULLS_FIRST",
  frozenReason_DESC_NULLS_LAST = "frozenReason_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  initialCollateralDeltaAmount_ASC = "initialCollateralDeltaAmount_ASC",
  initialCollateralDeltaAmount_ASC_NULLS_FIRST = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  initialCollateralDeltaAmount_ASC_NULLS_LAST = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  initialCollateralDeltaAmount_DESC = "initialCollateralDeltaAmount_DESC",
  initialCollateralDeltaAmount_DESC_NULLS_FIRST = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  initialCollateralDeltaAmount_DESC_NULLS_LAST = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  initialCollateralTokenAddress_ASC = "initialCollateralTokenAddress_ASC",
  initialCollateralTokenAddress_ASC_NULLS_FIRST = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  initialCollateralTokenAddress_ASC_NULLS_LAST = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  initialCollateralTokenAddress_DESC = "initialCollateralTokenAddress_DESC",
  initialCollateralTokenAddress_DESC_NULLS_FIRST = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  initialCollateralTokenAddress_DESC_NULLS_LAST = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  isLong_ASC = "isLong_ASC",
  isLong_ASC_NULLS_FIRST = "isLong_ASC_NULLS_FIRST",
  isLong_ASC_NULLS_LAST = "isLong_ASC_NULLS_LAST",
  isLong_DESC = "isLong_DESC",
  isLong_DESC_NULLS_FIRST = "isLong_DESC_NULLS_FIRST",
  isLong_DESC_NULLS_LAST = "isLong_DESC_NULLS_LAST",
  marketAddress_ASC = "marketAddress_ASC",
  marketAddress_ASC_NULLS_FIRST = "marketAddress_ASC_NULLS_FIRST",
  marketAddress_ASC_NULLS_LAST = "marketAddress_ASC_NULLS_LAST",
  marketAddress_DESC = "marketAddress_DESC",
  marketAddress_DESC_NULLS_FIRST = "marketAddress_DESC_NULLS_FIRST",
  marketAddress_DESC_NULLS_LAST = "marketAddress_DESC_NULLS_LAST",
  minOutputAmount_ASC = "minOutputAmount_ASC",
  minOutputAmount_ASC_NULLS_FIRST = "minOutputAmount_ASC_NULLS_FIRST",
  minOutputAmount_ASC_NULLS_LAST = "minOutputAmount_ASC_NULLS_LAST",
  minOutputAmount_DESC = "minOutputAmount_DESC",
  minOutputAmount_DESC_NULLS_FIRST = "minOutputAmount_DESC_NULLS_FIRST",
  minOutputAmount_DESC_NULLS_LAST = "minOutputAmount_DESC_NULLS_LAST",
  numberOfParts_ASC = "numberOfParts_ASC",
  numberOfParts_ASC_NULLS_FIRST = "numberOfParts_ASC_NULLS_FIRST",
  numberOfParts_ASC_NULLS_LAST = "numberOfParts_ASC_NULLS_LAST",
  numberOfParts_DESC = "numberOfParts_DESC",
  numberOfParts_DESC_NULLS_FIRST = "numberOfParts_DESC_NULLS_FIRST",
  numberOfParts_DESC_NULLS_LAST = "numberOfParts_DESC_NULLS_LAST",
  orderType_ASC = "orderType_ASC",
  orderType_ASC_NULLS_FIRST = "orderType_ASC_NULLS_FIRST",
  orderType_ASC_NULLS_LAST = "orderType_ASC_NULLS_LAST",
  orderType_DESC = "orderType_DESC",
  orderType_DESC_NULLS_FIRST = "orderType_DESC_NULLS_FIRST",
  orderType_DESC_NULLS_LAST = "orderType_DESC_NULLS_LAST",
  receiver_ASC = "receiver_ASC",
  receiver_ASC_NULLS_FIRST = "receiver_ASC_NULLS_FIRST",
  receiver_ASC_NULLS_LAST = "receiver_ASC_NULLS_LAST",
  receiver_DESC = "receiver_DESC",
  receiver_DESC_NULLS_FIRST = "receiver_DESC_NULLS_FIRST",
  receiver_DESC_NULLS_LAST = "receiver_DESC_NULLS_LAST",
  shouldUnwrapNativeToken_ASC = "shouldUnwrapNativeToken_ASC",
  shouldUnwrapNativeToken_ASC_NULLS_FIRST = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  shouldUnwrapNativeToken_ASC_NULLS_LAST = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  shouldUnwrapNativeToken_DESC = "shouldUnwrapNativeToken_DESC",
  shouldUnwrapNativeToken_DESC_NULLS_FIRST = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  shouldUnwrapNativeToken_DESC_NULLS_LAST = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  sizeDeltaUsd_ASC = "sizeDeltaUsd_ASC",
  sizeDeltaUsd_ASC_NULLS_FIRST = "sizeDeltaUsd_ASC_NULLS_FIRST",
  sizeDeltaUsd_ASC_NULLS_LAST = "sizeDeltaUsd_ASC_NULLS_LAST",
  sizeDeltaUsd_DESC = "sizeDeltaUsd_DESC",
  sizeDeltaUsd_DESC_NULLS_FIRST = "sizeDeltaUsd_DESC_NULLS_FIRST",
  sizeDeltaUsd_DESC_NULLS_LAST = "sizeDeltaUsd_DESC_NULLS_LAST",
  status_ASC = "status_ASC",
  status_ASC_NULLS_FIRST = "status_ASC_NULLS_FIRST",
  status_ASC_NULLS_LAST = "status_ASC_NULLS_LAST",
  status_DESC = "status_DESC",
  status_DESC_NULLS_FIRST = "status_DESC_NULLS_FIRST",
  status_DESC_NULLS_LAST = "status_DESC_NULLS_LAST",
  triggerPrice_ASC = "triggerPrice_ASC",
  triggerPrice_ASC_NULLS_FIRST = "triggerPrice_ASC_NULLS_FIRST",
  triggerPrice_ASC_NULLS_LAST = "triggerPrice_ASC_NULLS_LAST",
  triggerPrice_DESC = "triggerPrice_DESC",
  triggerPrice_DESC_NULLS_FIRST = "triggerPrice_DESC_NULLS_FIRST",
  triggerPrice_DESC_NULLS_LAST = "triggerPrice_DESC_NULLS_LAST",
  twapGroupId_ASC = "twapGroupId_ASC",
  twapGroupId_ASC_NULLS_FIRST = "twapGroupId_ASC_NULLS_FIRST",
  twapGroupId_ASC_NULLS_LAST = "twapGroupId_ASC_NULLS_LAST",
  twapGroupId_DESC = "twapGroupId_DESC",
  twapGroupId_DESC_NULLS_FIRST = "twapGroupId_DESC_NULLS_FIRST",
  twapGroupId_DESC_NULLS_LAST = "twapGroupId_DESC_NULLS_LAST",
  uiFeeReceiver_ASC = "uiFeeReceiver_ASC",
  uiFeeReceiver_ASC_NULLS_FIRST = "uiFeeReceiver_ASC_NULLS_FIRST",
  uiFeeReceiver_ASC_NULLS_LAST = "uiFeeReceiver_ASC_NULLS_LAST",
  uiFeeReceiver_DESC = "uiFeeReceiver_DESC",
  uiFeeReceiver_DESC_NULLS_FIRST = "uiFeeReceiver_DESC_NULLS_FIRST",
  uiFeeReceiver_DESC_NULLS_LAST = "uiFeeReceiver_DESC_NULLS_LAST",
  updatedAtBlock_ASC = "updatedAtBlock_ASC",
  updatedAtBlock_ASC_NULLS_FIRST = "updatedAtBlock_ASC_NULLS_FIRST",
  updatedAtBlock_ASC_NULLS_LAST = "updatedAtBlock_ASC_NULLS_LAST",
  updatedAtBlock_DESC = "updatedAtBlock_DESC",
  updatedAtBlock_DESC_NULLS_FIRST = "updatedAtBlock_DESC_NULLS_FIRST",
  updatedAtBlock_DESC_NULLS_LAST = "updatedAtBlock_DESC_NULLS_LAST",
}

export enum OrderStatus {
  Cancelled = "Cancelled",
  Created = "Created",
  Executed = "Executed",
  Frozen = "Frozen",
}

export interface OrderWhereInput {
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
}

export interface OrdersConnection {
  __typename?: "OrdersConnection";
  edges: Array<OrderEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface PageInfo {
  __typename?: "PageInfo";
  endCursor: Scalars["String"]["output"];
  hasNextPage: Scalars["Boolean"]["output"];
  hasPreviousPage: Scalars["Boolean"]["output"];
  startCursor: Scalars["String"]["output"];
}

export interface PeriodAccountStatObject {
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
}

export interface Position {
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
}

export interface PositionChange {
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
}

export interface PositionChangeEdge {
  __typename?: "PositionChangeEdge";
  cursor: Scalars["String"]["output"];
  node: PositionChange;
}

export enum PositionChangeOrderByInput {
  account_ASC = "account_ASC",
  account_ASC_NULLS_FIRST = "account_ASC_NULLS_FIRST",
  account_ASC_NULLS_LAST = "account_ASC_NULLS_LAST",
  account_DESC = "account_DESC",
  account_DESC_NULLS_FIRST = "account_DESC_NULLS_FIRST",
  account_DESC_NULLS_LAST = "account_DESC_NULLS_LAST",
  basePnlUsd_ASC = "basePnlUsd_ASC",
  basePnlUsd_ASC_NULLS_FIRST = "basePnlUsd_ASC_NULLS_FIRST",
  basePnlUsd_ASC_NULLS_LAST = "basePnlUsd_ASC_NULLS_LAST",
  basePnlUsd_DESC = "basePnlUsd_DESC",
  basePnlUsd_DESC_NULLS_FIRST = "basePnlUsd_DESC_NULLS_FIRST",
  basePnlUsd_DESC_NULLS_LAST = "basePnlUsd_DESC_NULLS_LAST",
  block_ASC = "block_ASC",
  block_ASC_NULLS_FIRST = "block_ASC_NULLS_FIRST",
  block_ASC_NULLS_LAST = "block_ASC_NULLS_LAST",
  block_DESC = "block_DESC",
  block_DESC_NULLS_FIRST = "block_DESC_NULLS_FIRST",
  block_DESC_NULLS_LAST = "block_DESC_NULLS_LAST",
  collateralAmount_ASC = "collateralAmount_ASC",
  collateralAmount_ASC_NULLS_FIRST = "collateralAmount_ASC_NULLS_FIRST",
  collateralAmount_ASC_NULLS_LAST = "collateralAmount_ASC_NULLS_LAST",
  collateralAmount_DESC = "collateralAmount_DESC",
  collateralAmount_DESC_NULLS_FIRST = "collateralAmount_DESC_NULLS_FIRST",
  collateralAmount_DESC_NULLS_LAST = "collateralAmount_DESC_NULLS_LAST",
  collateralDeltaAmount_ASC = "collateralDeltaAmount_ASC",
  collateralDeltaAmount_ASC_NULLS_FIRST = "collateralDeltaAmount_ASC_NULLS_FIRST",
  collateralDeltaAmount_ASC_NULLS_LAST = "collateralDeltaAmount_ASC_NULLS_LAST",
  collateralDeltaAmount_DESC = "collateralDeltaAmount_DESC",
  collateralDeltaAmount_DESC_NULLS_FIRST = "collateralDeltaAmount_DESC_NULLS_FIRST",
  collateralDeltaAmount_DESC_NULLS_LAST = "collateralDeltaAmount_DESC_NULLS_LAST",
  collateralTokenPriceMin_ASC = "collateralTokenPriceMin_ASC",
  collateralTokenPriceMin_ASC_NULLS_FIRST = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  collateralTokenPriceMin_ASC_NULLS_LAST = "collateralTokenPriceMin_ASC_NULLS_LAST",
  collateralTokenPriceMin_DESC = "collateralTokenPriceMin_DESC",
  collateralTokenPriceMin_DESC_NULLS_FIRST = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  collateralTokenPriceMin_DESC_NULLS_LAST = "collateralTokenPriceMin_DESC_NULLS_LAST",
  collateralToken_ASC = "collateralToken_ASC",
  collateralToken_ASC_NULLS_FIRST = "collateralToken_ASC_NULLS_FIRST",
  collateralToken_ASC_NULLS_LAST = "collateralToken_ASC_NULLS_LAST",
  collateralToken_DESC = "collateralToken_DESC",
  collateralToken_DESC_NULLS_FIRST = "collateralToken_DESC_NULLS_FIRST",
  collateralToken_DESC_NULLS_LAST = "collateralToken_DESC_NULLS_LAST",
  executionPrice_ASC = "executionPrice_ASC",
  executionPrice_ASC_NULLS_FIRST = "executionPrice_ASC_NULLS_FIRST",
  executionPrice_ASC_NULLS_LAST = "executionPrice_ASC_NULLS_LAST",
  executionPrice_DESC = "executionPrice_DESC",
  executionPrice_DESC_NULLS_FIRST = "executionPrice_DESC_NULLS_FIRST",
  executionPrice_DESC_NULLS_LAST = "executionPrice_DESC_NULLS_LAST",
  feesAmount_ASC = "feesAmount_ASC",
  feesAmount_ASC_NULLS_FIRST = "feesAmount_ASC_NULLS_FIRST",
  feesAmount_ASC_NULLS_LAST = "feesAmount_ASC_NULLS_LAST",
  feesAmount_DESC = "feesAmount_DESC",
  feesAmount_DESC_NULLS_FIRST = "feesAmount_DESC_NULLS_FIRST",
  feesAmount_DESC_NULLS_LAST = "feesAmount_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  isLong_ASC = "isLong_ASC",
  isLong_ASC_NULLS_FIRST = "isLong_ASC_NULLS_FIRST",
  isLong_ASC_NULLS_LAST = "isLong_ASC_NULLS_LAST",
  isLong_DESC = "isLong_DESC",
  isLong_DESC_NULLS_FIRST = "isLong_DESC_NULLS_FIRST",
  isLong_DESC_NULLS_LAST = "isLong_DESC_NULLS_LAST",
  isWin_ASC = "isWin_ASC",
  isWin_ASC_NULLS_FIRST = "isWin_ASC_NULLS_FIRST",
  isWin_ASC_NULLS_LAST = "isWin_ASC_NULLS_LAST",
  isWin_DESC = "isWin_DESC",
  isWin_DESC_NULLS_FIRST = "isWin_DESC_NULLS_FIRST",
  isWin_DESC_NULLS_LAST = "isWin_DESC_NULLS_LAST",
  market_ASC = "market_ASC",
  market_ASC_NULLS_FIRST = "market_ASC_NULLS_FIRST",
  market_ASC_NULLS_LAST = "market_ASC_NULLS_LAST",
  market_DESC = "market_DESC",
  market_DESC_NULLS_FIRST = "market_DESC_NULLS_FIRST",
  market_DESC_NULLS_LAST = "market_DESC_NULLS_LAST",
  maxSize_ASC = "maxSize_ASC",
  maxSize_ASC_NULLS_FIRST = "maxSize_ASC_NULLS_FIRST",
  maxSize_ASC_NULLS_LAST = "maxSize_ASC_NULLS_LAST",
  maxSize_DESC = "maxSize_DESC",
  maxSize_DESC_NULLS_FIRST = "maxSize_DESC_NULLS_FIRST",
  maxSize_DESC_NULLS_LAST = "maxSize_DESC_NULLS_LAST",
  priceImpactAmount_ASC = "priceImpactAmount_ASC",
  priceImpactAmount_ASC_NULLS_FIRST = "priceImpactAmount_ASC_NULLS_FIRST",
  priceImpactAmount_ASC_NULLS_LAST = "priceImpactAmount_ASC_NULLS_LAST",
  priceImpactAmount_DESC = "priceImpactAmount_DESC",
  priceImpactAmount_DESC_NULLS_FIRST = "priceImpactAmount_DESC_NULLS_FIRST",
  priceImpactAmount_DESC_NULLS_LAST = "priceImpactAmount_DESC_NULLS_LAST",
  priceImpactDiffUsd_ASC = "priceImpactDiffUsd_ASC",
  priceImpactDiffUsd_ASC_NULLS_FIRST = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  priceImpactDiffUsd_ASC_NULLS_LAST = "priceImpactDiffUsd_ASC_NULLS_LAST",
  priceImpactDiffUsd_DESC = "priceImpactDiffUsd_DESC",
  priceImpactDiffUsd_DESC_NULLS_FIRST = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  priceImpactDiffUsd_DESC_NULLS_LAST = "priceImpactDiffUsd_DESC_NULLS_LAST",
  priceImpactUsd_ASC = "priceImpactUsd_ASC",
  priceImpactUsd_ASC_NULLS_FIRST = "priceImpactUsd_ASC_NULLS_FIRST",
  priceImpactUsd_ASC_NULLS_LAST = "priceImpactUsd_ASC_NULLS_LAST",
  priceImpactUsd_DESC = "priceImpactUsd_DESC",
  priceImpactUsd_DESC_NULLS_FIRST = "priceImpactUsd_DESC_NULLS_FIRST",
  priceImpactUsd_DESC_NULLS_LAST = "priceImpactUsd_DESC_NULLS_LAST",
  sizeDeltaUsd_ASC = "sizeDeltaUsd_ASC",
  sizeDeltaUsd_ASC_NULLS_FIRST = "sizeDeltaUsd_ASC_NULLS_FIRST",
  sizeDeltaUsd_ASC_NULLS_LAST = "sizeDeltaUsd_ASC_NULLS_LAST",
  sizeDeltaUsd_DESC = "sizeDeltaUsd_DESC",
  sizeDeltaUsd_DESC_NULLS_FIRST = "sizeDeltaUsd_DESC_NULLS_FIRST",
  sizeDeltaUsd_DESC_NULLS_LAST = "sizeDeltaUsd_DESC_NULLS_LAST",
  sizeInUsd_ASC = "sizeInUsd_ASC",
  sizeInUsd_ASC_NULLS_FIRST = "sizeInUsd_ASC_NULLS_FIRST",
  sizeInUsd_ASC_NULLS_LAST = "sizeInUsd_ASC_NULLS_LAST",
  sizeInUsd_DESC = "sizeInUsd_DESC",
  sizeInUsd_DESC_NULLS_FIRST = "sizeInUsd_DESC_NULLS_FIRST",
  sizeInUsd_DESC_NULLS_LAST = "sizeInUsd_DESC_NULLS_LAST",
  timestamp_ASC = "timestamp_ASC",
  timestamp_ASC_NULLS_FIRST = "timestamp_ASC_NULLS_FIRST",
  timestamp_ASC_NULLS_LAST = "timestamp_ASC_NULLS_LAST",
  timestamp_DESC = "timestamp_DESC",
  timestamp_DESC_NULLS_FIRST = "timestamp_DESC_NULLS_FIRST",
  timestamp_DESC_NULLS_LAST = "timestamp_DESC_NULLS_LAST",
  type_ASC = "type_ASC",
  type_ASC_NULLS_FIRST = "type_ASC_NULLS_FIRST",
  type_ASC_NULLS_LAST = "type_ASC_NULLS_LAST",
  type_DESC = "type_DESC",
  type_DESC_NULLS_FIRST = "type_DESC_NULLS_FIRST",
  type_DESC_NULLS_LAST = "type_DESC_NULLS_LAST",
}

export enum PositionChangeType {
  decrease = "decrease",
  increase = "increase",
}

export interface PositionChangeWhereInput {
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
}

export interface PositionChangesConnection {
  __typename?: "PositionChangesConnection";
  edges: Array<PositionChangeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface PositionEdge {
  __typename?: "PositionEdge";
  cursor: Scalars["String"]["output"];
  node: Position;
}

export interface PositionFeesEntitiesConnection {
  __typename?: "PositionFeesEntitiesConnection";
  edges: Array<PositionFeesEntityEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface PositionFeesEntity {
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
}

export interface PositionFeesEntityEdge {
  __typename?: "PositionFeesEntityEdge";
  cursor: Scalars["String"]["output"];
  node: PositionFeesEntity;
}

export enum PositionFeesEntityOrderByInput {
  affiliateRewardAmount_ASC = "affiliateRewardAmount_ASC",
  affiliateRewardAmount_ASC_NULLS_FIRST = "affiliateRewardAmount_ASC_NULLS_FIRST",
  affiliateRewardAmount_ASC_NULLS_LAST = "affiliateRewardAmount_ASC_NULLS_LAST",
  affiliateRewardAmount_DESC = "affiliateRewardAmount_DESC",
  affiliateRewardAmount_DESC_NULLS_FIRST = "affiliateRewardAmount_DESC_NULLS_FIRST",
  affiliateRewardAmount_DESC_NULLS_LAST = "affiliateRewardAmount_DESC_NULLS_LAST",
  affiliate_ASC = "affiliate_ASC",
  affiliate_ASC_NULLS_FIRST = "affiliate_ASC_NULLS_FIRST",
  affiliate_ASC_NULLS_LAST = "affiliate_ASC_NULLS_LAST",
  affiliate_DESC = "affiliate_DESC",
  affiliate_DESC_NULLS_FIRST = "affiliate_DESC_NULLS_FIRST",
  affiliate_DESC_NULLS_LAST = "affiliate_DESC_NULLS_LAST",
  borrowingFeeAmount_ASC = "borrowingFeeAmount_ASC",
  borrowingFeeAmount_ASC_NULLS_FIRST = "borrowingFeeAmount_ASC_NULLS_FIRST",
  borrowingFeeAmount_ASC_NULLS_LAST = "borrowingFeeAmount_ASC_NULLS_LAST",
  borrowingFeeAmount_DESC = "borrowingFeeAmount_DESC",
  borrowingFeeAmount_DESC_NULLS_FIRST = "borrowingFeeAmount_DESC_NULLS_FIRST",
  borrowingFeeAmount_DESC_NULLS_LAST = "borrowingFeeAmount_DESC_NULLS_LAST",
  collateralTokenAddress_ASC = "collateralTokenAddress_ASC",
  collateralTokenAddress_ASC_NULLS_FIRST = "collateralTokenAddress_ASC_NULLS_FIRST",
  collateralTokenAddress_ASC_NULLS_LAST = "collateralTokenAddress_ASC_NULLS_LAST",
  collateralTokenAddress_DESC = "collateralTokenAddress_DESC",
  collateralTokenAddress_DESC_NULLS_FIRST = "collateralTokenAddress_DESC_NULLS_FIRST",
  collateralTokenAddress_DESC_NULLS_LAST = "collateralTokenAddress_DESC_NULLS_LAST",
  collateralTokenPriceMax_ASC = "collateralTokenPriceMax_ASC",
  collateralTokenPriceMax_ASC_NULLS_FIRST = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  collateralTokenPriceMax_ASC_NULLS_LAST = "collateralTokenPriceMax_ASC_NULLS_LAST",
  collateralTokenPriceMax_DESC = "collateralTokenPriceMax_DESC",
  collateralTokenPriceMax_DESC_NULLS_FIRST = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  collateralTokenPriceMax_DESC_NULLS_LAST = "collateralTokenPriceMax_DESC_NULLS_LAST",
  collateralTokenPriceMin_ASC = "collateralTokenPriceMin_ASC",
  collateralTokenPriceMin_ASC_NULLS_FIRST = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  collateralTokenPriceMin_ASC_NULLS_LAST = "collateralTokenPriceMin_ASC_NULLS_LAST",
  collateralTokenPriceMin_DESC = "collateralTokenPriceMin_DESC",
  collateralTokenPriceMin_DESC_NULLS_FIRST = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  collateralTokenPriceMin_DESC_NULLS_LAST = "collateralTokenPriceMin_DESC_NULLS_LAST",
  eventName_ASC = "eventName_ASC",
  eventName_ASC_NULLS_FIRST = "eventName_ASC_NULLS_FIRST",
  eventName_ASC_NULLS_LAST = "eventName_ASC_NULLS_LAST",
  eventName_DESC = "eventName_DESC",
  eventName_DESC_NULLS_FIRST = "eventName_DESC_NULLS_FIRST",
  eventName_DESC_NULLS_LAST = "eventName_DESC_NULLS_LAST",
  feeUsdForPool_ASC = "feeUsdForPool_ASC",
  feeUsdForPool_ASC_NULLS_FIRST = "feeUsdForPool_ASC_NULLS_FIRST",
  feeUsdForPool_ASC_NULLS_LAST = "feeUsdForPool_ASC_NULLS_LAST",
  feeUsdForPool_DESC = "feeUsdForPool_DESC",
  feeUsdForPool_DESC_NULLS_FIRST = "feeUsdForPool_DESC_NULLS_FIRST",
  feeUsdForPool_DESC_NULLS_LAST = "feeUsdForPool_DESC_NULLS_LAST",
  fundingFeeAmount_ASC = "fundingFeeAmount_ASC",
  fundingFeeAmount_ASC_NULLS_FIRST = "fundingFeeAmount_ASC_NULLS_FIRST",
  fundingFeeAmount_ASC_NULLS_LAST = "fundingFeeAmount_ASC_NULLS_LAST",
  fundingFeeAmount_DESC = "fundingFeeAmount_DESC",
  fundingFeeAmount_DESC_NULLS_FIRST = "fundingFeeAmount_DESC_NULLS_FIRST",
  fundingFeeAmount_DESC_NULLS_LAST = "fundingFeeAmount_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  liquidationFeeAmount_ASC = "liquidationFeeAmount_ASC",
  liquidationFeeAmount_ASC_NULLS_FIRST = "liquidationFeeAmount_ASC_NULLS_FIRST",
  liquidationFeeAmount_ASC_NULLS_LAST = "liquidationFeeAmount_ASC_NULLS_LAST",
  liquidationFeeAmount_DESC = "liquidationFeeAmount_DESC",
  liquidationFeeAmount_DESC_NULLS_FIRST = "liquidationFeeAmount_DESC_NULLS_FIRST",
  liquidationFeeAmount_DESC_NULLS_LAST = "liquidationFeeAmount_DESC_NULLS_LAST",
  marketAddress_ASC = "marketAddress_ASC",
  marketAddress_ASC_NULLS_FIRST = "marketAddress_ASC_NULLS_FIRST",
  marketAddress_ASC_NULLS_LAST = "marketAddress_ASC_NULLS_LAST",
  marketAddress_DESC = "marketAddress_DESC",
  marketAddress_DESC_NULLS_FIRST = "marketAddress_DESC_NULLS_FIRST",
  marketAddress_DESC_NULLS_LAST = "marketAddress_DESC_NULLS_LAST",
  orderKey_ASC = "orderKey_ASC",
  orderKey_ASC_NULLS_FIRST = "orderKey_ASC_NULLS_FIRST",
  orderKey_ASC_NULLS_LAST = "orderKey_ASC_NULLS_LAST",
  orderKey_DESC = "orderKey_DESC",
  orderKey_DESC_NULLS_FIRST = "orderKey_DESC_NULLS_FIRST",
  orderKey_DESC_NULLS_LAST = "orderKey_DESC_NULLS_LAST",
  positionFeeAmount_ASC = "positionFeeAmount_ASC",
  positionFeeAmount_ASC_NULLS_FIRST = "positionFeeAmount_ASC_NULLS_FIRST",
  positionFeeAmount_ASC_NULLS_LAST = "positionFeeAmount_ASC_NULLS_LAST",
  positionFeeAmount_DESC = "positionFeeAmount_DESC",
  positionFeeAmount_DESC_NULLS_FIRST = "positionFeeAmount_DESC_NULLS_FIRST",
  positionFeeAmount_DESC_NULLS_LAST = "positionFeeAmount_DESC_NULLS_LAST",
  totalRebateAmount_ASC = "totalRebateAmount_ASC",
  totalRebateAmount_ASC_NULLS_FIRST = "totalRebateAmount_ASC_NULLS_FIRST",
  totalRebateAmount_ASC_NULLS_LAST = "totalRebateAmount_ASC_NULLS_LAST",
  totalRebateAmount_DESC = "totalRebateAmount_DESC",
  totalRebateAmount_DESC_NULLS_FIRST = "totalRebateAmount_DESC_NULLS_FIRST",
  totalRebateAmount_DESC_NULLS_LAST = "totalRebateAmount_DESC_NULLS_LAST",
  totalRebateFactor_ASC = "totalRebateFactor_ASC",
  totalRebateFactor_ASC_NULLS_FIRST = "totalRebateFactor_ASC_NULLS_FIRST",
  totalRebateFactor_ASC_NULLS_LAST = "totalRebateFactor_ASC_NULLS_LAST",
  totalRebateFactor_DESC = "totalRebateFactor_DESC",
  totalRebateFactor_DESC_NULLS_FIRST = "totalRebateFactor_DESC_NULLS_FIRST",
  totalRebateFactor_DESC_NULLS_LAST = "totalRebateFactor_DESC_NULLS_LAST",
  traderDiscountAmount_ASC = "traderDiscountAmount_ASC",
  traderDiscountAmount_ASC_NULLS_FIRST = "traderDiscountAmount_ASC_NULLS_FIRST",
  traderDiscountAmount_ASC_NULLS_LAST = "traderDiscountAmount_ASC_NULLS_LAST",
  traderDiscountAmount_DESC = "traderDiscountAmount_DESC",
  traderDiscountAmount_DESC_NULLS_FIRST = "traderDiscountAmount_DESC_NULLS_FIRST",
  traderDiscountAmount_DESC_NULLS_LAST = "traderDiscountAmount_DESC_NULLS_LAST",
  trader_ASC = "trader_ASC",
  trader_ASC_NULLS_FIRST = "trader_ASC_NULLS_FIRST",
  trader_ASC_NULLS_LAST = "trader_ASC_NULLS_LAST",
  trader_DESC = "trader_DESC",
  trader_DESC_NULLS_FIRST = "trader_DESC_NULLS_FIRST",
  trader_DESC_NULLS_LAST = "trader_DESC_NULLS_LAST",
  transaction_blockNumber_ASC = "transaction_blockNumber_ASC",
  transaction_blockNumber_ASC_NULLS_FIRST = "transaction_blockNumber_ASC_NULLS_FIRST",
  transaction_blockNumber_ASC_NULLS_LAST = "transaction_blockNumber_ASC_NULLS_LAST",
  transaction_blockNumber_DESC = "transaction_blockNumber_DESC",
  transaction_blockNumber_DESC_NULLS_FIRST = "transaction_blockNumber_DESC_NULLS_FIRST",
  transaction_blockNumber_DESC_NULLS_LAST = "transaction_blockNumber_DESC_NULLS_LAST",
  transaction_from_ASC = "transaction_from_ASC",
  transaction_from_ASC_NULLS_FIRST = "transaction_from_ASC_NULLS_FIRST",
  transaction_from_ASC_NULLS_LAST = "transaction_from_ASC_NULLS_LAST",
  transaction_from_DESC = "transaction_from_DESC",
  transaction_from_DESC_NULLS_FIRST = "transaction_from_DESC_NULLS_FIRST",
  transaction_from_DESC_NULLS_LAST = "transaction_from_DESC_NULLS_LAST",
  transaction_hash_ASC = "transaction_hash_ASC",
  transaction_hash_ASC_NULLS_FIRST = "transaction_hash_ASC_NULLS_FIRST",
  transaction_hash_ASC_NULLS_LAST = "transaction_hash_ASC_NULLS_LAST",
  transaction_hash_DESC = "transaction_hash_DESC",
  transaction_hash_DESC_NULLS_FIRST = "transaction_hash_DESC_NULLS_FIRST",
  transaction_hash_DESC_NULLS_LAST = "transaction_hash_DESC_NULLS_LAST",
  transaction_id_ASC = "transaction_id_ASC",
  transaction_id_ASC_NULLS_FIRST = "transaction_id_ASC_NULLS_FIRST",
  transaction_id_ASC_NULLS_LAST = "transaction_id_ASC_NULLS_LAST",
  transaction_id_DESC = "transaction_id_DESC",
  transaction_id_DESC_NULLS_FIRST = "transaction_id_DESC_NULLS_FIRST",
  transaction_id_DESC_NULLS_LAST = "transaction_id_DESC_NULLS_LAST",
  transaction_timestamp_ASC = "transaction_timestamp_ASC",
  transaction_timestamp_ASC_NULLS_FIRST = "transaction_timestamp_ASC_NULLS_FIRST",
  transaction_timestamp_ASC_NULLS_LAST = "transaction_timestamp_ASC_NULLS_LAST",
  transaction_timestamp_DESC = "transaction_timestamp_DESC",
  transaction_timestamp_DESC_NULLS_FIRST = "transaction_timestamp_DESC_NULLS_FIRST",
  transaction_timestamp_DESC_NULLS_LAST = "transaction_timestamp_DESC_NULLS_LAST",
  transaction_to_ASC = "transaction_to_ASC",
  transaction_to_ASC_NULLS_FIRST = "transaction_to_ASC_NULLS_FIRST",
  transaction_to_ASC_NULLS_LAST = "transaction_to_ASC_NULLS_LAST",
  transaction_to_DESC = "transaction_to_DESC",
  transaction_to_DESC_NULLS_FIRST = "transaction_to_DESC_NULLS_FIRST",
  transaction_to_DESC_NULLS_LAST = "transaction_to_DESC_NULLS_LAST",
  transaction_transactionIndex_ASC = "transaction_transactionIndex_ASC",
  transaction_transactionIndex_ASC_NULLS_FIRST = "transaction_transactionIndex_ASC_NULLS_FIRST",
  transaction_transactionIndex_ASC_NULLS_LAST = "transaction_transactionIndex_ASC_NULLS_LAST",
  transaction_transactionIndex_DESC = "transaction_transactionIndex_DESC",
  transaction_transactionIndex_DESC_NULLS_FIRST = "transaction_transactionIndex_DESC_NULLS_FIRST",
  transaction_transactionIndex_DESC_NULLS_LAST = "transaction_transactionIndex_DESC_NULLS_LAST",
  type_ASC = "type_ASC",
  type_ASC_NULLS_FIRST = "type_ASC_NULLS_FIRST",
  type_ASC_NULLS_LAST = "type_ASC_NULLS_LAST",
  type_DESC = "type_DESC",
  type_DESC_NULLS_FIRST = "type_DESC_NULLS_FIRST",
  type_DESC_NULLS_LAST = "type_DESC_NULLS_LAST",
}

export enum PositionFeesEntityType {
  PositionFeesCollected = "PositionFeesCollected",
  PositionFeesInfo = "PositionFeesInfo",
}

export interface PositionFeesEntityWhereInput {
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
}

export interface PositionMarketVolumeInfo {
  __typename?: "PositionMarketVolumeInfo";
  market: Scalars["String"]["output"];
  volume: Scalars["BigInt"]["output"];
}

export enum PositionOrderByInput {
  accountStat_closedCount_ASC = "accountStat_closedCount_ASC",
  accountStat_closedCount_ASC_NULLS_FIRST = "accountStat_closedCount_ASC_NULLS_FIRST",
  accountStat_closedCount_ASC_NULLS_LAST = "accountStat_closedCount_ASC_NULLS_LAST",
  accountStat_closedCount_DESC = "accountStat_closedCount_DESC",
  accountStat_closedCount_DESC_NULLS_FIRST = "accountStat_closedCount_DESC_NULLS_FIRST",
  accountStat_closedCount_DESC_NULLS_LAST = "accountStat_closedCount_DESC_NULLS_LAST",
  accountStat_cumsumCollateral_ASC = "accountStat_cumsumCollateral_ASC",
  accountStat_cumsumCollateral_ASC_NULLS_FIRST = "accountStat_cumsumCollateral_ASC_NULLS_FIRST",
  accountStat_cumsumCollateral_ASC_NULLS_LAST = "accountStat_cumsumCollateral_ASC_NULLS_LAST",
  accountStat_cumsumCollateral_DESC = "accountStat_cumsumCollateral_DESC",
  accountStat_cumsumCollateral_DESC_NULLS_FIRST = "accountStat_cumsumCollateral_DESC_NULLS_FIRST",
  accountStat_cumsumCollateral_DESC_NULLS_LAST = "accountStat_cumsumCollateral_DESC_NULLS_LAST",
  accountStat_cumsumSize_ASC = "accountStat_cumsumSize_ASC",
  accountStat_cumsumSize_ASC_NULLS_FIRST = "accountStat_cumsumSize_ASC_NULLS_FIRST",
  accountStat_cumsumSize_ASC_NULLS_LAST = "accountStat_cumsumSize_ASC_NULLS_LAST",
  accountStat_cumsumSize_DESC = "accountStat_cumsumSize_DESC",
  accountStat_cumsumSize_DESC_NULLS_FIRST = "accountStat_cumsumSize_DESC_NULLS_FIRST",
  accountStat_cumsumSize_DESC_NULLS_LAST = "accountStat_cumsumSize_DESC_NULLS_LAST",
  accountStat_id_ASC = "accountStat_id_ASC",
  accountStat_id_ASC_NULLS_FIRST = "accountStat_id_ASC_NULLS_FIRST",
  accountStat_id_ASC_NULLS_LAST = "accountStat_id_ASC_NULLS_LAST",
  accountStat_id_DESC = "accountStat_id_DESC",
  accountStat_id_DESC_NULLS_FIRST = "accountStat_id_DESC_NULLS_FIRST",
  accountStat_id_DESC_NULLS_LAST = "accountStat_id_DESC_NULLS_LAST",
  accountStat_losses_ASC = "accountStat_losses_ASC",
  accountStat_losses_ASC_NULLS_FIRST = "accountStat_losses_ASC_NULLS_FIRST",
  accountStat_losses_ASC_NULLS_LAST = "accountStat_losses_ASC_NULLS_LAST",
  accountStat_losses_DESC = "accountStat_losses_DESC",
  accountStat_losses_DESC_NULLS_FIRST = "accountStat_losses_DESC_NULLS_FIRST",
  accountStat_losses_DESC_NULLS_LAST = "accountStat_losses_DESC_NULLS_LAST",
  accountStat_maxCapital_ASC = "accountStat_maxCapital_ASC",
  accountStat_maxCapital_ASC_NULLS_FIRST = "accountStat_maxCapital_ASC_NULLS_FIRST",
  accountStat_maxCapital_ASC_NULLS_LAST = "accountStat_maxCapital_ASC_NULLS_LAST",
  accountStat_maxCapital_DESC = "accountStat_maxCapital_DESC",
  accountStat_maxCapital_DESC_NULLS_FIRST = "accountStat_maxCapital_DESC_NULLS_FIRST",
  accountStat_maxCapital_DESC_NULLS_LAST = "accountStat_maxCapital_DESC_NULLS_LAST",
  accountStat_netCapital_ASC = "accountStat_netCapital_ASC",
  accountStat_netCapital_ASC_NULLS_FIRST = "accountStat_netCapital_ASC_NULLS_FIRST",
  accountStat_netCapital_ASC_NULLS_LAST = "accountStat_netCapital_ASC_NULLS_LAST",
  accountStat_netCapital_DESC = "accountStat_netCapital_DESC",
  accountStat_netCapital_DESC_NULLS_FIRST = "accountStat_netCapital_DESC_NULLS_FIRST",
  accountStat_netCapital_DESC_NULLS_LAST = "accountStat_netCapital_DESC_NULLS_LAST",
  accountStat_realizedFees_ASC = "accountStat_realizedFees_ASC",
  accountStat_realizedFees_ASC_NULLS_FIRST = "accountStat_realizedFees_ASC_NULLS_FIRST",
  accountStat_realizedFees_ASC_NULLS_LAST = "accountStat_realizedFees_ASC_NULLS_LAST",
  accountStat_realizedFees_DESC = "accountStat_realizedFees_DESC",
  accountStat_realizedFees_DESC_NULLS_FIRST = "accountStat_realizedFees_DESC_NULLS_FIRST",
  accountStat_realizedFees_DESC_NULLS_LAST = "accountStat_realizedFees_DESC_NULLS_LAST",
  accountStat_realizedPnl_ASC = "accountStat_realizedPnl_ASC",
  accountStat_realizedPnl_ASC_NULLS_FIRST = "accountStat_realizedPnl_ASC_NULLS_FIRST",
  accountStat_realizedPnl_ASC_NULLS_LAST = "accountStat_realizedPnl_ASC_NULLS_LAST",
  accountStat_realizedPnl_DESC = "accountStat_realizedPnl_DESC",
  accountStat_realizedPnl_DESC_NULLS_FIRST = "accountStat_realizedPnl_DESC_NULLS_FIRST",
  accountStat_realizedPnl_DESC_NULLS_LAST = "accountStat_realizedPnl_DESC_NULLS_LAST",
  accountStat_realizedPriceImpact_ASC = "accountStat_realizedPriceImpact_ASC",
  accountStat_realizedPriceImpact_ASC_NULLS_FIRST = "accountStat_realizedPriceImpact_ASC_NULLS_FIRST",
  accountStat_realizedPriceImpact_ASC_NULLS_LAST = "accountStat_realizedPriceImpact_ASC_NULLS_LAST",
  accountStat_realizedPriceImpact_DESC = "accountStat_realizedPriceImpact_DESC",
  accountStat_realizedPriceImpact_DESC_NULLS_FIRST = "accountStat_realizedPriceImpact_DESC_NULLS_FIRST",
  accountStat_realizedPriceImpact_DESC_NULLS_LAST = "accountStat_realizedPriceImpact_DESC_NULLS_LAST",
  accountStat_sumMaxSize_ASC = "accountStat_sumMaxSize_ASC",
  accountStat_sumMaxSize_ASC_NULLS_FIRST = "accountStat_sumMaxSize_ASC_NULLS_FIRST",
  accountStat_sumMaxSize_ASC_NULLS_LAST = "accountStat_sumMaxSize_ASC_NULLS_LAST",
  accountStat_sumMaxSize_DESC = "accountStat_sumMaxSize_DESC",
  accountStat_sumMaxSize_DESC_NULLS_FIRST = "accountStat_sumMaxSize_DESC_NULLS_FIRST",
  accountStat_sumMaxSize_DESC_NULLS_LAST = "accountStat_sumMaxSize_DESC_NULLS_LAST",
  accountStat_volume_ASC = "accountStat_volume_ASC",
  accountStat_volume_ASC_NULLS_FIRST = "accountStat_volume_ASC_NULLS_FIRST",
  accountStat_volume_ASC_NULLS_LAST = "accountStat_volume_ASC_NULLS_LAST",
  accountStat_volume_DESC = "accountStat_volume_DESC",
  accountStat_volume_DESC_NULLS_FIRST = "accountStat_volume_DESC_NULLS_FIRST",
  accountStat_volume_DESC_NULLS_LAST = "accountStat_volume_DESC_NULLS_LAST",
  accountStat_wins_ASC = "accountStat_wins_ASC",
  accountStat_wins_ASC_NULLS_FIRST = "accountStat_wins_ASC_NULLS_FIRST",
  accountStat_wins_ASC_NULLS_LAST = "accountStat_wins_ASC_NULLS_LAST",
  accountStat_wins_DESC = "accountStat_wins_DESC",
  accountStat_wins_DESC_NULLS_FIRST = "accountStat_wins_DESC_NULLS_FIRST",
  accountStat_wins_DESC_NULLS_LAST = "accountStat_wins_DESC_NULLS_LAST",
  account_ASC = "account_ASC",
  account_ASC_NULLS_FIRST = "account_ASC_NULLS_FIRST",
  account_ASC_NULLS_LAST = "account_ASC_NULLS_LAST",
  account_DESC = "account_DESC",
  account_DESC_NULLS_FIRST = "account_DESC_NULLS_FIRST",
  account_DESC_NULLS_LAST = "account_DESC_NULLS_LAST",
  collateralAmount_ASC = "collateralAmount_ASC",
  collateralAmount_ASC_NULLS_FIRST = "collateralAmount_ASC_NULLS_FIRST",
  collateralAmount_ASC_NULLS_LAST = "collateralAmount_ASC_NULLS_LAST",
  collateralAmount_DESC = "collateralAmount_DESC",
  collateralAmount_DESC_NULLS_FIRST = "collateralAmount_DESC_NULLS_FIRST",
  collateralAmount_DESC_NULLS_LAST = "collateralAmount_DESC_NULLS_LAST",
  collateralToken_ASC = "collateralToken_ASC",
  collateralToken_ASC_NULLS_FIRST = "collateralToken_ASC_NULLS_FIRST",
  collateralToken_ASC_NULLS_LAST = "collateralToken_ASC_NULLS_LAST",
  collateralToken_DESC = "collateralToken_DESC",
  collateralToken_DESC_NULLS_FIRST = "collateralToken_DESC_NULLS_FIRST",
  collateralToken_DESC_NULLS_LAST = "collateralToken_DESC_NULLS_LAST",
  entryPrice_ASC = "entryPrice_ASC",
  entryPrice_ASC_NULLS_FIRST = "entryPrice_ASC_NULLS_FIRST",
  entryPrice_ASC_NULLS_LAST = "entryPrice_ASC_NULLS_LAST",
  entryPrice_DESC = "entryPrice_DESC",
  entryPrice_DESC_NULLS_FIRST = "entryPrice_DESC_NULLS_FIRST",
  entryPrice_DESC_NULLS_LAST = "entryPrice_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  isLong_ASC = "isLong_ASC",
  isLong_ASC_NULLS_FIRST = "isLong_ASC_NULLS_FIRST",
  isLong_ASC_NULLS_LAST = "isLong_ASC_NULLS_LAST",
  isLong_DESC = "isLong_DESC",
  isLong_DESC_NULLS_FIRST = "isLong_DESC_NULLS_FIRST",
  isLong_DESC_NULLS_LAST = "isLong_DESC_NULLS_LAST",
  isSnapshot_ASC = "isSnapshot_ASC",
  isSnapshot_ASC_NULLS_FIRST = "isSnapshot_ASC_NULLS_FIRST",
  isSnapshot_ASC_NULLS_LAST = "isSnapshot_ASC_NULLS_LAST",
  isSnapshot_DESC = "isSnapshot_DESC",
  isSnapshot_DESC_NULLS_FIRST = "isSnapshot_DESC_NULLS_FIRST",
  isSnapshot_DESC_NULLS_LAST = "isSnapshot_DESC_NULLS_LAST",
  market_ASC = "market_ASC",
  market_ASC_NULLS_FIRST = "market_ASC_NULLS_FIRST",
  market_ASC_NULLS_LAST = "market_ASC_NULLS_LAST",
  market_DESC = "market_DESC",
  market_DESC_NULLS_FIRST = "market_DESC_NULLS_FIRST",
  market_DESC_NULLS_LAST = "market_DESC_NULLS_LAST",
  maxSize_ASC = "maxSize_ASC",
  maxSize_ASC_NULLS_FIRST = "maxSize_ASC_NULLS_FIRST",
  maxSize_ASC_NULLS_LAST = "maxSize_ASC_NULLS_LAST",
  maxSize_DESC = "maxSize_DESC",
  maxSize_DESC_NULLS_FIRST = "maxSize_DESC_NULLS_FIRST",
  maxSize_DESC_NULLS_LAST = "maxSize_DESC_NULLS_LAST",
  openedAt_ASC = "openedAt_ASC",
  openedAt_ASC_NULLS_FIRST = "openedAt_ASC_NULLS_FIRST",
  openedAt_ASC_NULLS_LAST = "openedAt_ASC_NULLS_LAST",
  openedAt_DESC = "openedAt_DESC",
  openedAt_DESC_NULLS_FIRST = "openedAt_DESC_NULLS_FIRST",
  openedAt_DESC_NULLS_LAST = "openedAt_DESC_NULLS_LAST",
  positionKey_ASC = "positionKey_ASC",
  positionKey_ASC_NULLS_FIRST = "positionKey_ASC_NULLS_FIRST",
  positionKey_ASC_NULLS_LAST = "positionKey_ASC_NULLS_LAST",
  positionKey_DESC = "positionKey_DESC",
  positionKey_DESC_NULLS_FIRST = "positionKey_DESC_NULLS_FIRST",
  positionKey_DESC_NULLS_LAST = "positionKey_DESC_NULLS_LAST",
  realizedFees_ASC = "realizedFees_ASC",
  realizedFees_ASC_NULLS_FIRST = "realizedFees_ASC_NULLS_FIRST",
  realizedFees_ASC_NULLS_LAST = "realizedFees_ASC_NULLS_LAST",
  realizedFees_DESC = "realizedFees_DESC",
  realizedFees_DESC_NULLS_FIRST = "realizedFees_DESC_NULLS_FIRST",
  realizedFees_DESC_NULLS_LAST = "realizedFees_DESC_NULLS_LAST",
  realizedPnl_ASC = "realizedPnl_ASC",
  realizedPnl_ASC_NULLS_FIRST = "realizedPnl_ASC_NULLS_FIRST",
  realizedPnl_ASC_NULLS_LAST = "realizedPnl_ASC_NULLS_LAST",
  realizedPnl_DESC = "realizedPnl_DESC",
  realizedPnl_DESC_NULLS_FIRST = "realizedPnl_DESC_NULLS_FIRST",
  realizedPnl_DESC_NULLS_LAST = "realizedPnl_DESC_NULLS_LAST",
  realizedPriceImpact_ASC = "realizedPriceImpact_ASC",
  realizedPriceImpact_ASC_NULLS_FIRST = "realizedPriceImpact_ASC_NULLS_FIRST",
  realizedPriceImpact_ASC_NULLS_LAST = "realizedPriceImpact_ASC_NULLS_LAST",
  realizedPriceImpact_DESC = "realizedPriceImpact_DESC",
  realizedPriceImpact_DESC_NULLS_FIRST = "realizedPriceImpact_DESC_NULLS_FIRST",
  realizedPriceImpact_DESC_NULLS_LAST = "realizedPriceImpact_DESC_NULLS_LAST",
  sizeInTokens_ASC = "sizeInTokens_ASC",
  sizeInTokens_ASC_NULLS_FIRST = "sizeInTokens_ASC_NULLS_FIRST",
  sizeInTokens_ASC_NULLS_LAST = "sizeInTokens_ASC_NULLS_LAST",
  sizeInTokens_DESC = "sizeInTokens_DESC",
  sizeInTokens_DESC_NULLS_FIRST = "sizeInTokens_DESC_NULLS_FIRST",
  sizeInTokens_DESC_NULLS_LAST = "sizeInTokens_DESC_NULLS_LAST",
  sizeInUsd_ASC = "sizeInUsd_ASC",
  sizeInUsd_ASC_NULLS_FIRST = "sizeInUsd_ASC_NULLS_FIRST",
  sizeInUsd_ASC_NULLS_LAST = "sizeInUsd_ASC_NULLS_LAST",
  sizeInUsd_DESC = "sizeInUsd_DESC",
  sizeInUsd_DESC_NULLS_FIRST = "sizeInUsd_DESC_NULLS_FIRST",
  sizeInUsd_DESC_NULLS_LAST = "sizeInUsd_DESC_NULLS_LAST",
  snapshotTimestamp_ASC = "snapshotTimestamp_ASC",
  snapshotTimestamp_ASC_NULLS_FIRST = "snapshotTimestamp_ASC_NULLS_FIRST",
  snapshotTimestamp_ASC_NULLS_LAST = "snapshotTimestamp_ASC_NULLS_LAST",
  snapshotTimestamp_DESC = "snapshotTimestamp_DESC",
  snapshotTimestamp_DESC_NULLS_FIRST = "snapshotTimestamp_DESC_NULLS_FIRST",
  snapshotTimestamp_DESC_NULLS_LAST = "snapshotTimestamp_DESC_NULLS_LAST",
  unrealizedFees_ASC = "unrealizedFees_ASC",
  unrealizedFees_ASC_NULLS_FIRST = "unrealizedFees_ASC_NULLS_FIRST",
  unrealizedFees_ASC_NULLS_LAST = "unrealizedFees_ASC_NULLS_LAST",
  unrealizedFees_DESC = "unrealizedFees_DESC",
  unrealizedFees_DESC_NULLS_FIRST = "unrealizedFees_DESC_NULLS_FIRST",
  unrealizedFees_DESC_NULLS_LAST = "unrealizedFees_DESC_NULLS_LAST",
  unrealizedPnl_ASC = "unrealizedPnl_ASC",
  unrealizedPnl_ASC_NULLS_FIRST = "unrealizedPnl_ASC_NULLS_FIRST",
  unrealizedPnl_ASC_NULLS_LAST = "unrealizedPnl_ASC_NULLS_LAST",
  unrealizedPnl_DESC = "unrealizedPnl_DESC",
  unrealizedPnl_DESC_NULLS_FIRST = "unrealizedPnl_DESC_NULLS_FIRST",
  unrealizedPnl_DESC_NULLS_LAST = "unrealizedPnl_DESC_NULLS_LAST",
  unrealizedPriceImpact_ASC = "unrealizedPriceImpact_ASC",
  unrealizedPriceImpact_ASC_NULLS_FIRST = "unrealizedPriceImpact_ASC_NULLS_FIRST",
  unrealizedPriceImpact_ASC_NULLS_LAST = "unrealizedPriceImpact_ASC_NULLS_LAST",
  unrealizedPriceImpact_DESC = "unrealizedPriceImpact_DESC",
  unrealizedPriceImpact_DESC_NULLS_FIRST = "unrealizedPriceImpact_DESC_NULLS_FIRST",
  unrealizedPriceImpact_DESC_NULLS_LAST = "unrealizedPriceImpact_DESC_NULLS_LAST",
}

export interface PositionTotalCollateralAmount {
  __typename?: "PositionTotalCollateralAmount";
  amount: Scalars["BigInt"]["output"];
  token: Scalars["String"]["output"];
}

export interface PositionTotalCollateralAmountWhereInput {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
}

export interface PositionVolumeByAllMarketsWhereInput {
  timestamp: Scalars["Float"]["input"];
}

export interface PositionVolumeWhereInput {
  marketAddress?: InputMaybe<Scalars["String"]["input"]>;
  timestamp: Scalars["Float"]["input"];
}

export interface PositionWhereInput {
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
}

export interface PositionsConnection {
  __typename?: "PositionsConnection";
  edges: Array<PositionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface Price {
  __typename?: "Price";
  id: Scalars["String"]["output"];
  isSnapshot: Scalars["Boolean"]["output"];
  maxPrice: Scalars["BigInt"]["output"];
  minPrice: Scalars["BigInt"]["output"];
  snapshotTimestamp?: Maybe<Scalars["Int"]["output"]>;
  timestamp: Scalars["Int"]["output"];
  token: Scalars["String"]["output"];
  type: PriceType;
}

export interface PriceEdge {
  __typename?: "PriceEdge";
  cursor: Scalars["String"]["output"];
  node: Price;
}

export enum PriceOrderByInput {
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  isSnapshot_ASC = "isSnapshot_ASC",
  isSnapshot_ASC_NULLS_FIRST = "isSnapshot_ASC_NULLS_FIRST",
  isSnapshot_ASC_NULLS_LAST = "isSnapshot_ASC_NULLS_LAST",
  isSnapshot_DESC = "isSnapshot_DESC",
  isSnapshot_DESC_NULLS_FIRST = "isSnapshot_DESC_NULLS_FIRST",
  isSnapshot_DESC_NULLS_LAST = "isSnapshot_DESC_NULLS_LAST",
  maxPrice_ASC = "maxPrice_ASC",
  maxPrice_ASC_NULLS_FIRST = "maxPrice_ASC_NULLS_FIRST",
  maxPrice_ASC_NULLS_LAST = "maxPrice_ASC_NULLS_LAST",
  maxPrice_DESC = "maxPrice_DESC",
  maxPrice_DESC_NULLS_FIRST = "maxPrice_DESC_NULLS_FIRST",
  maxPrice_DESC_NULLS_LAST = "maxPrice_DESC_NULLS_LAST",
  minPrice_ASC = "minPrice_ASC",
  minPrice_ASC_NULLS_FIRST = "minPrice_ASC_NULLS_FIRST",
  minPrice_ASC_NULLS_LAST = "minPrice_ASC_NULLS_LAST",
  minPrice_DESC = "minPrice_DESC",
  minPrice_DESC_NULLS_FIRST = "minPrice_DESC_NULLS_FIRST",
  minPrice_DESC_NULLS_LAST = "minPrice_DESC_NULLS_LAST",
  snapshotTimestamp_ASC = "snapshotTimestamp_ASC",
  snapshotTimestamp_ASC_NULLS_FIRST = "snapshotTimestamp_ASC_NULLS_FIRST",
  snapshotTimestamp_ASC_NULLS_LAST = "snapshotTimestamp_ASC_NULLS_LAST",
  snapshotTimestamp_DESC = "snapshotTimestamp_DESC",
  snapshotTimestamp_DESC_NULLS_FIRST = "snapshotTimestamp_DESC_NULLS_FIRST",
  snapshotTimestamp_DESC_NULLS_LAST = "snapshotTimestamp_DESC_NULLS_LAST",
  timestamp_ASC = "timestamp_ASC",
  timestamp_ASC_NULLS_FIRST = "timestamp_ASC_NULLS_FIRST",
  timestamp_ASC_NULLS_LAST = "timestamp_ASC_NULLS_LAST",
  timestamp_DESC = "timestamp_DESC",
  timestamp_DESC_NULLS_FIRST = "timestamp_DESC_NULLS_FIRST",
  timestamp_DESC_NULLS_LAST = "timestamp_DESC_NULLS_LAST",
  token_ASC = "token_ASC",
  token_ASC_NULLS_FIRST = "token_ASC_NULLS_FIRST",
  token_ASC_NULLS_LAST = "token_ASC_NULLS_LAST",
  token_DESC = "token_DESC",
  token_DESC_NULLS_FIRST = "token_DESC_NULLS_FIRST",
  token_DESC_NULLS_LAST = "token_DESC_NULLS_LAST",
  type_ASC = "type_ASC",
  type_ASC_NULLS_FIRST = "type_ASC_NULLS_FIRST",
  type_ASC_NULLS_LAST = "type_ASC_NULLS_LAST",
  type_DESC = "type_DESC",
  type_DESC_NULLS_FIRST = "type_DESC_NULLS_FIRST",
  type_DESC_NULLS_LAST = "type_DESC_NULLS_LAST",
}

export enum PriceType {
  glv = "glv",
  gm = "gm",
  onchainFeed = "onchainFeed",
  v2 = "v2",
}

export interface PriceWhereInput {
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
}

export interface PricesConnection {
  __typename?: "PricesConnection";
  edges: Array<PriceEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface Query {
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
}

export interface QueryaccountPnlHistoryStatsArgs {
  account: Scalars["String"]["input"];
  from?: InputMaybe<Scalars["Int"]["input"]>;
}

export interface QueryaccountPnlSummaryStatsArgs {
  account: Scalars["String"]["input"];
}

export interface QueryaccountStatByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryaccountStatsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AccountStatOrderByInput>>;
  where?: InputMaybe<AccountStatWhereInput>;
}

export interface QueryaccountStatsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AccountStatOrderByInput>;
  where?: InputMaybe<AccountStatWhereInput>;
}

export interface QueryaprSnapshotByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryaprSnapshotsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<AprSnapshotOrderByInput>>;
  where?: InputMaybe<AprSnapshotWhereInput>;
}

export interface QueryaprSnapshotsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<AprSnapshotOrderByInput>;
  where?: InputMaybe<AprSnapshotWhereInput>;
}

export interface QueryborrowingRateSnapshotByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryborrowingRateSnapshotsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<BorrowingRateSnapshotOrderByInput>>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
}

export interface QueryborrowingRateSnapshotsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<BorrowingRateSnapshotOrderByInput>;
  where?: InputMaybe<BorrowingRateSnapshotWhereInput>;
}

export interface QueryclaimActionByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryclaimActionsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimActionOrderByInput>>;
  where?: InputMaybe<ClaimActionWhereInput>;
}

export interface QueryclaimActionsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimActionOrderByInput>;
  where?: InputMaybe<ClaimActionWhereInput>;
}

export interface QueryclaimRefByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryclaimRefsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimRefOrderByInput>>;
  where?: InputMaybe<ClaimRefWhereInput>;
}

export interface QueryclaimRefsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimRefOrderByInput>;
  where?: InputMaybe<ClaimRefWhereInput>;
}

export interface QueryclaimableFundingFeeInfoByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryclaimableFundingFeeInfosArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<ClaimableFundingFeeInfoOrderByInput>>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
}

export interface QueryclaimableFundingFeeInfosConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<ClaimableFundingFeeInfoOrderByInput>;
  where?: InputMaybe<ClaimableFundingFeeInfoWhereInput>;
}

export interface QuerycollectedFeesInfoByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerycollectedFeesInfosArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CollectedFeesInfoOrderByInput>>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
}

export interface QuerycollectedFeesInfosConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CollectedFeesInfoOrderByInput>;
  where?: InputMaybe<CollectedFeesInfoWhereInput>;
}

export interface QuerycumulativePoolValueByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerycumulativePoolValuesArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<CumulativePoolValueOrderByInput>>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
}

export interface QuerycumulativePoolValuesConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<CumulativePoolValueOrderByInput>;
  where?: InputMaybe<CumulativePoolValueWhereInput>;
}

export interface QueryglvByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryglvsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<GlvOrderByInput>>;
  where?: InputMaybe<GlvWhereInput>;
}

export interface QueryglvsAprByPeriodArgs {
  where?: InputMaybe<GlvAprsWhereInputWhereInput>;
}

export interface QueryglvsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<GlvOrderByInput>;
  where?: InputMaybe<GlvWhereInput>;
}

export interface QuerymarketByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerymarketInfoByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerymarketInfosArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketInfoOrderByInput>>;
  where?: InputMaybe<MarketInfoWhereInput>;
}

export interface QuerymarketInfosConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketInfoOrderByInput>;
  where?: InputMaybe<MarketInfoWhereInput>;
}

export interface QuerymarketsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<MarketOrderByInput>>;
  where?: InputMaybe<MarketWhereInput>;
}

export interface QuerymarketsAprByPeriodArgs {
  where?: InputMaybe<MarketAprsWhereInput>;
}

export interface QuerymarketsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<MarketOrderByInput>;
  where?: InputMaybe<MarketWhereInput>;
}

export interface QueryonChainSettingByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryonChainSettingsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OnChainSettingOrderByInput>>;
  where?: InputMaybe<OnChainSettingWhereInput>;
}

export interface QueryonChainSettingsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OnChainSettingOrderByInput>;
  where?: InputMaybe<OnChainSettingWhereInput>;
}

export interface QueryorderByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryordersArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<OrderOrderByInput>>;
  where?: InputMaybe<OrderWhereInput>;
}

export interface QueryordersConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<OrderOrderByInput>;
  where?: InputMaybe<OrderWhereInput>;
}

export interface QueryperiodAccountStatsArgs {
  limit?: InputMaybe<Scalars["Float"]["input"]>;
  offset?: InputMaybe<Scalars["Float"]["input"]>;
  where?: InputMaybe<WhereInput>;
}

export interface QuerypositionByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerypositionChangeByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerypositionChangesArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionChangeOrderByInput>>;
  where?: InputMaybe<PositionChangeWhereInput>;
}

export interface QuerypositionChangesConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionChangeOrderByInput>;
  where?: InputMaybe<PositionChangeWhereInput>;
}

export interface QuerypositionFeesEntitiesArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionFeesEntityOrderByInput>>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
}

export interface QuerypositionFeesEntitiesConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionFeesEntityOrderByInput>;
  where?: InputMaybe<PositionFeesEntityWhereInput>;
}

export interface QuerypositionFeesEntityByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerypositionTotalCollateralAmountArgs {
  where?: InputMaybe<PositionTotalCollateralAmountWhereInput>;
}

export interface QuerypositionsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PositionOrderByInput>>;
  where?: InputMaybe<PositionWhereInput>;
}

export interface QuerypositionsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PositionOrderByInput>;
  where?: InputMaybe<PositionWhereInput>;
}

export interface QuerypositionsVolumeArgs {
  where?: InputMaybe<PositionVolumeByAllMarketsWhereInput>;
}

export interface QuerypositionsVolume24hByMarketArgs {
  where?: InputMaybe<PositionVolumeWhereInput>;
}

export interface QuerypriceByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerypricesArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<PriceOrderByInput>>;
  where?: InputMaybe<PriceWhereInput>;
}

export interface QuerypricesConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<PriceOrderByInput>;
  where?: InputMaybe<PriceWhereInput>;
}

export interface QueryswapInfoByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QueryswapInfosArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<SwapInfoOrderByInput>>;
  where?: InputMaybe<SwapInfoWhereInput>;
}

export interface QueryswapInfosConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<SwapInfoOrderByInput>;
  where?: InputMaybe<SwapInfoWhereInput>;
}

export interface QuerytradeActionByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerytradeActionsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TradeActionOrderByInput>>;
  where?: InputMaybe<TradeActionWhereInput>;
}

export interface QuerytradeActionsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TradeActionOrderByInput>;
  where?: InputMaybe<TradeActionWhereInput>;
}

export interface QuerytransactionByIdArgs {
  id: Scalars["String"]["input"];
}

export interface QuerytransactionsArgs {
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  offset?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy?: InputMaybe<Array<TransactionOrderByInput>>;
  where?: InputMaybe<TransactionWhereInput>;
}

export interface QuerytransactionsConnectionArgs {
  after?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  orderBy: Array<TransactionOrderByInput>;
  where?: InputMaybe<TransactionWhereInput>;
}

export interface SquidStatus {
  __typename?: "SquidStatus";
  /** The hash of the last processed finalized block */
  finalizedHash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed finalized block */
  finalizedHeight?: Maybe<Scalars["Int"]["output"]>;
  /** The hash of the last processed block */
  hash?: Maybe<Scalars["String"]["output"]>;
  /** The height of the last processed block */
  height?: Maybe<Scalars["Int"]["output"]>;
}

export interface SwapInfo {
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
}

export interface SwapInfoEdge {
  __typename?: "SwapInfoEdge";
  cursor: Scalars["String"]["output"];
  node: SwapInfo;
}

export enum SwapInfoOrderByInput {
  amountInAfterFees_ASC = "amountInAfterFees_ASC",
  amountInAfterFees_ASC_NULLS_FIRST = "amountInAfterFees_ASC_NULLS_FIRST",
  amountInAfterFees_ASC_NULLS_LAST = "amountInAfterFees_ASC_NULLS_LAST",
  amountInAfterFees_DESC = "amountInAfterFees_DESC",
  amountInAfterFees_DESC_NULLS_FIRST = "amountInAfterFees_DESC_NULLS_FIRST",
  amountInAfterFees_DESC_NULLS_LAST = "amountInAfterFees_DESC_NULLS_LAST",
  amountIn_ASC = "amountIn_ASC",
  amountIn_ASC_NULLS_FIRST = "amountIn_ASC_NULLS_FIRST",
  amountIn_ASC_NULLS_LAST = "amountIn_ASC_NULLS_LAST",
  amountIn_DESC = "amountIn_DESC",
  amountIn_DESC_NULLS_FIRST = "amountIn_DESC_NULLS_FIRST",
  amountIn_DESC_NULLS_LAST = "amountIn_DESC_NULLS_LAST",
  amountOut_ASC = "amountOut_ASC",
  amountOut_ASC_NULLS_FIRST = "amountOut_ASC_NULLS_FIRST",
  amountOut_ASC_NULLS_LAST = "amountOut_ASC_NULLS_LAST",
  amountOut_DESC = "amountOut_DESC",
  amountOut_DESC_NULLS_FIRST = "amountOut_DESC_NULLS_FIRST",
  amountOut_DESC_NULLS_LAST = "amountOut_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  marketAddress_ASC = "marketAddress_ASC",
  marketAddress_ASC_NULLS_FIRST = "marketAddress_ASC_NULLS_FIRST",
  marketAddress_ASC_NULLS_LAST = "marketAddress_ASC_NULLS_LAST",
  marketAddress_DESC = "marketAddress_DESC",
  marketAddress_DESC_NULLS_FIRST = "marketAddress_DESC_NULLS_FIRST",
  marketAddress_DESC_NULLS_LAST = "marketAddress_DESC_NULLS_LAST",
  orderKey_ASC = "orderKey_ASC",
  orderKey_ASC_NULLS_FIRST = "orderKey_ASC_NULLS_FIRST",
  orderKey_ASC_NULLS_LAST = "orderKey_ASC_NULLS_LAST",
  orderKey_DESC = "orderKey_DESC",
  orderKey_DESC_NULLS_FIRST = "orderKey_DESC_NULLS_FIRST",
  orderKey_DESC_NULLS_LAST = "orderKey_DESC_NULLS_LAST",
  priceImpactUsd_ASC = "priceImpactUsd_ASC",
  priceImpactUsd_ASC_NULLS_FIRST = "priceImpactUsd_ASC_NULLS_FIRST",
  priceImpactUsd_ASC_NULLS_LAST = "priceImpactUsd_ASC_NULLS_LAST",
  priceImpactUsd_DESC = "priceImpactUsd_DESC",
  priceImpactUsd_DESC_NULLS_FIRST = "priceImpactUsd_DESC_NULLS_FIRST",
  priceImpactUsd_DESC_NULLS_LAST = "priceImpactUsd_DESC_NULLS_LAST",
  receiver_ASC = "receiver_ASC",
  receiver_ASC_NULLS_FIRST = "receiver_ASC_NULLS_FIRST",
  receiver_ASC_NULLS_LAST = "receiver_ASC_NULLS_LAST",
  receiver_DESC = "receiver_DESC",
  receiver_DESC_NULLS_FIRST = "receiver_DESC_NULLS_FIRST",
  receiver_DESC_NULLS_LAST = "receiver_DESC_NULLS_LAST",
  tokenInAddress_ASC = "tokenInAddress_ASC",
  tokenInAddress_ASC_NULLS_FIRST = "tokenInAddress_ASC_NULLS_FIRST",
  tokenInAddress_ASC_NULLS_LAST = "tokenInAddress_ASC_NULLS_LAST",
  tokenInAddress_DESC = "tokenInAddress_DESC",
  tokenInAddress_DESC_NULLS_FIRST = "tokenInAddress_DESC_NULLS_FIRST",
  tokenInAddress_DESC_NULLS_LAST = "tokenInAddress_DESC_NULLS_LAST",
  tokenInPrice_ASC = "tokenInPrice_ASC",
  tokenInPrice_ASC_NULLS_FIRST = "tokenInPrice_ASC_NULLS_FIRST",
  tokenInPrice_ASC_NULLS_LAST = "tokenInPrice_ASC_NULLS_LAST",
  tokenInPrice_DESC = "tokenInPrice_DESC",
  tokenInPrice_DESC_NULLS_FIRST = "tokenInPrice_DESC_NULLS_FIRST",
  tokenInPrice_DESC_NULLS_LAST = "tokenInPrice_DESC_NULLS_LAST",
  tokenOutAddress_ASC = "tokenOutAddress_ASC",
  tokenOutAddress_ASC_NULLS_FIRST = "tokenOutAddress_ASC_NULLS_FIRST",
  tokenOutAddress_ASC_NULLS_LAST = "tokenOutAddress_ASC_NULLS_LAST",
  tokenOutAddress_DESC = "tokenOutAddress_DESC",
  tokenOutAddress_DESC_NULLS_FIRST = "tokenOutAddress_DESC_NULLS_FIRST",
  tokenOutAddress_DESC_NULLS_LAST = "tokenOutAddress_DESC_NULLS_LAST",
  tokenOutPrice_ASC = "tokenOutPrice_ASC",
  tokenOutPrice_ASC_NULLS_FIRST = "tokenOutPrice_ASC_NULLS_FIRST",
  tokenOutPrice_ASC_NULLS_LAST = "tokenOutPrice_ASC_NULLS_LAST",
  tokenOutPrice_DESC = "tokenOutPrice_DESC",
  tokenOutPrice_DESC_NULLS_FIRST = "tokenOutPrice_DESC_NULLS_FIRST",
  tokenOutPrice_DESC_NULLS_LAST = "tokenOutPrice_DESC_NULLS_LAST",
  transaction_blockNumber_ASC = "transaction_blockNumber_ASC",
  transaction_blockNumber_ASC_NULLS_FIRST = "transaction_blockNumber_ASC_NULLS_FIRST",
  transaction_blockNumber_ASC_NULLS_LAST = "transaction_blockNumber_ASC_NULLS_LAST",
  transaction_blockNumber_DESC = "transaction_blockNumber_DESC",
  transaction_blockNumber_DESC_NULLS_FIRST = "transaction_blockNumber_DESC_NULLS_FIRST",
  transaction_blockNumber_DESC_NULLS_LAST = "transaction_blockNumber_DESC_NULLS_LAST",
  transaction_from_ASC = "transaction_from_ASC",
  transaction_from_ASC_NULLS_FIRST = "transaction_from_ASC_NULLS_FIRST",
  transaction_from_ASC_NULLS_LAST = "transaction_from_ASC_NULLS_LAST",
  transaction_from_DESC = "transaction_from_DESC",
  transaction_from_DESC_NULLS_FIRST = "transaction_from_DESC_NULLS_FIRST",
  transaction_from_DESC_NULLS_LAST = "transaction_from_DESC_NULLS_LAST",
  transaction_hash_ASC = "transaction_hash_ASC",
  transaction_hash_ASC_NULLS_FIRST = "transaction_hash_ASC_NULLS_FIRST",
  transaction_hash_ASC_NULLS_LAST = "transaction_hash_ASC_NULLS_LAST",
  transaction_hash_DESC = "transaction_hash_DESC",
  transaction_hash_DESC_NULLS_FIRST = "transaction_hash_DESC_NULLS_FIRST",
  transaction_hash_DESC_NULLS_LAST = "transaction_hash_DESC_NULLS_LAST",
  transaction_id_ASC = "transaction_id_ASC",
  transaction_id_ASC_NULLS_FIRST = "transaction_id_ASC_NULLS_FIRST",
  transaction_id_ASC_NULLS_LAST = "transaction_id_ASC_NULLS_LAST",
  transaction_id_DESC = "transaction_id_DESC",
  transaction_id_DESC_NULLS_FIRST = "transaction_id_DESC_NULLS_FIRST",
  transaction_id_DESC_NULLS_LAST = "transaction_id_DESC_NULLS_LAST",
  transaction_timestamp_ASC = "transaction_timestamp_ASC",
  transaction_timestamp_ASC_NULLS_FIRST = "transaction_timestamp_ASC_NULLS_FIRST",
  transaction_timestamp_ASC_NULLS_LAST = "transaction_timestamp_ASC_NULLS_LAST",
  transaction_timestamp_DESC = "transaction_timestamp_DESC",
  transaction_timestamp_DESC_NULLS_FIRST = "transaction_timestamp_DESC_NULLS_FIRST",
  transaction_timestamp_DESC_NULLS_LAST = "transaction_timestamp_DESC_NULLS_LAST",
  transaction_to_ASC = "transaction_to_ASC",
  transaction_to_ASC_NULLS_FIRST = "transaction_to_ASC_NULLS_FIRST",
  transaction_to_ASC_NULLS_LAST = "transaction_to_ASC_NULLS_LAST",
  transaction_to_DESC = "transaction_to_DESC",
  transaction_to_DESC_NULLS_FIRST = "transaction_to_DESC_NULLS_FIRST",
  transaction_to_DESC_NULLS_LAST = "transaction_to_DESC_NULLS_LAST",
  transaction_transactionIndex_ASC = "transaction_transactionIndex_ASC",
  transaction_transactionIndex_ASC_NULLS_FIRST = "transaction_transactionIndex_ASC_NULLS_FIRST",
  transaction_transactionIndex_ASC_NULLS_LAST = "transaction_transactionIndex_ASC_NULLS_LAST",
  transaction_transactionIndex_DESC = "transaction_transactionIndex_DESC",
  transaction_transactionIndex_DESC_NULLS_FIRST = "transaction_transactionIndex_DESC_NULLS_FIRST",
  transaction_transactionIndex_DESC_NULLS_LAST = "transaction_transactionIndex_DESC_NULLS_LAST",
}

export interface SwapInfoWhereInput {
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
}

export interface SwapInfosConnection {
  __typename?: "SwapInfosConnection";
  edges: Array<SwapInfoEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface TradeAction {
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
}

export interface TradeActionEdge {
  __typename?: "TradeActionEdge";
  cursor: Scalars["String"]["output"];
  node: TradeAction;
}

export enum TradeActionOrderByInput {
  acceptablePrice_ASC = "acceptablePrice_ASC",
  acceptablePrice_ASC_NULLS_FIRST = "acceptablePrice_ASC_NULLS_FIRST",
  acceptablePrice_ASC_NULLS_LAST = "acceptablePrice_ASC_NULLS_LAST",
  acceptablePrice_DESC = "acceptablePrice_DESC",
  acceptablePrice_DESC_NULLS_FIRST = "acceptablePrice_DESC_NULLS_FIRST",
  acceptablePrice_DESC_NULLS_LAST = "acceptablePrice_DESC_NULLS_LAST",
  account_ASC = "account_ASC",
  account_ASC_NULLS_FIRST = "account_ASC_NULLS_FIRST",
  account_ASC_NULLS_LAST = "account_ASC_NULLS_LAST",
  account_DESC = "account_DESC",
  account_DESC_NULLS_FIRST = "account_DESC_NULLS_FIRST",
  account_DESC_NULLS_LAST = "account_DESC_NULLS_LAST",
  basePnlUsd_ASC = "basePnlUsd_ASC",
  basePnlUsd_ASC_NULLS_FIRST = "basePnlUsd_ASC_NULLS_FIRST",
  basePnlUsd_ASC_NULLS_LAST = "basePnlUsd_ASC_NULLS_LAST",
  basePnlUsd_DESC = "basePnlUsd_DESC",
  basePnlUsd_DESC_NULLS_FIRST = "basePnlUsd_DESC_NULLS_FIRST",
  basePnlUsd_DESC_NULLS_LAST = "basePnlUsd_DESC_NULLS_LAST",
  borrowingFeeAmount_ASC = "borrowingFeeAmount_ASC",
  borrowingFeeAmount_ASC_NULLS_FIRST = "borrowingFeeAmount_ASC_NULLS_FIRST",
  borrowingFeeAmount_ASC_NULLS_LAST = "borrowingFeeAmount_ASC_NULLS_LAST",
  borrowingFeeAmount_DESC = "borrowingFeeAmount_DESC",
  borrowingFeeAmount_DESC_NULLS_FIRST = "borrowingFeeAmount_DESC_NULLS_FIRST",
  borrowingFeeAmount_DESC_NULLS_LAST = "borrowingFeeAmount_DESC_NULLS_LAST",
  collateralTokenPriceMax_ASC = "collateralTokenPriceMax_ASC",
  collateralTokenPriceMax_ASC_NULLS_FIRST = "collateralTokenPriceMax_ASC_NULLS_FIRST",
  collateralTokenPriceMax_ASC_NULLS_LAST = "collateralTokenPriceMax_ASC_NULLS_LAST",
  collateralTokenPriceMax_DESC = "collateralTokenPriceMax_DESC",
  collateralTokenPriceMax_DESC_NULLS_FIRST = "collateralTokenPriceMax_DESC_NULLS_FIRST",
  collateralTokenPriceMax_DESC_NULLS_LAST = "collateralTokenPriceMax_DESC_NULLS_LAST",
  collateralTokenPriceMin_ASC = "collateralTokenPriceMin_ASC",
  collateralTokenPriceMin_ASC_NULLS_FIRST = "collateralTokenPriceMin_ASC_NULLS_FIRST",
  collateralTokenPriceMin_ASC_NULLS_LAST = "collateralTokenPriceMin_ASC_NULLS_LAST",
  collateralTokenPriceMin_DESC = "collateralTokenPriceMin_DESC",
  collateralTokenPriceMin_DESC_NULLS_FIRST = "collateralTokenPriceMin_DESC_NULLS_FIRST",
  collateralTokenPriceMin_DESC_NULLS_LAST = "collateralTokenPriceMin_DESC_NULLS_LAST",
  contractTriggerPrice_ASC = "contractTriggerPrice_ASC",
  contractTriggerPrice_ASC_NULLS_FIRST = "contractTriggerPrice_ASC_NULLS_FIRST",
  contractTriggerPrice_ASC_NULLS_LAST = "contractTriggerPrice_ASC_NULLS_LAST",
  contractTriggerPrice_DESC = "contractTriggerPrice_DESC",
  contractTriggerPrice_DESC_NULLS_FIRST = "contractTriggerPrice_DESC_NULLS_FIRST",
  contractTriggerPrice_DESC_NULLS_LAST = "contractTriggerPrice_DESC_NULLS_LAST",
  eventName_ASC = "eventName_ASC",
  eventName_ASC_NULLS_FIRST = "eventName_ASC_NULLS_FIRST",
  eventName_ASC_NULLS_LAST = "eventName_ASC_NULLS_LAST",
  eventName_DESC = "eventName_DESC",
  eventName_DESC_NULLS_FIRST = "eventName_DESC_NULLS_FIRST",
  eventName_DESC_NULLS_LAST = "eventName_DESC_NULLS_LAST",
  executionAmountOut_ASC = "executionAmountOut_ASC",
  executionAmountOut_ASC_NULLS_FIRST = "executionAmountOut_ASC_NULLS_FIRST",
  executionAmountOut_ASC_NULLS_LAST = "executionAmountOut_ASC_NULLS_LAST",
  executionAmountOut_DESC = "executionAmountOut_DESC",
  executionAmountOut_DESC_NULLS_FIRST = "executionAmountOut_DESC_NULLS_FIRST",
  executionAmountOut_DESC_NULLS_LAST = "executionAmountOut_DESC_NULLS_LAST",
  executionPrice_ASC = "executionPrice_ASC",
  executionPrice_ASC_NULLS_FIRST = "executionPrice_ASC_NULLS_FIRST",
  executionPrice_ASC_NULLS_LAST = "executionPrice_ASC_NULLS_LAST",
  executionPrice_DESC = "executionPrice_DESC",
  executionPrice_DESC_NULLS_FIRST = "executionPrice_DESC_NULLS_FIRST",
  executionPrice_DESC_NULLS_LAST = "executionPrice_DESC_NULLS_LAST",
  fundingFeeAmount_ASC = "fundingFeeAmount_ASC",
  fundingFeeAmount_ASC_NULLS_FIRST = "fundingFeeAmount_ASC_NULLS_FIRST",
  fundingFeeAmount_ASC_NULLS_LAST = "fundingFeeAmount_ASC_NULLS_LAST",
  fundingFeeAmount_DESC = "fundingFeeAmount_DESC",
  fundingFeeAmount_DESC_NULLS_FIRST = "fundingFeeAmount_DESC_NULLS_FIRST",
  fundingFeeAmount_DESC_NULLS_LAST = "fundingFeeAmount_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  indexTokenPriceMax_ASC = "indexTokenPriceMax_ASC",
  indexTokenPriceMax_ASC_NULLS_FIRST = "indexTokenPriceMax_ASC_NULLS_FIRST",
  indexTokenPriceMax_ASC_NULLS_LAST = "indexTokenPriceMax_ASC_NULLS_LAST",
  indexTokenPriceMax_DESC = "indexTokenPriceMax_DESC",
  indexTokenPriceMax_DESC_NULLS_FIRST = "indexTokenPriceMax_DESC_NULLS_FIRST",
  indexTokenPriceMax_DESC_NULLS_LAST = "indexTokenPriceMax_DESC_NULLS_LAST",
  indexTokenPriceMin_ASC = "indexTokenPriceMin_ASC",
  indexTokenPriceMin_ASC_NULLS_FIRST = "indexTokenPriceMin_ASC_NULLS_FIRST",
  indexTokenPriceMin_ASC_NULLS_LAST = "indexTokenPriceMin_ASC_NULLS_LAST",
  indexTokenPriceMin_DESC = "indexTokenPriceMin_DESC",
  indexTokenPriceMin_DESC_NULLS_FIRST = "indexTokenPriceMin_DESC_NULLS_FIRST",
  indexTokenPriceMin_DESC_NULLS_LAST = "indexTokenPriceMin_DESC_NULLS_LAST",
  initialCollateralDeltaAmount_ASC = "initialCollateralDeltaAmount_ASC",
  initialCollateralDeltaAmount_ASC_NULLS_FIRST = "initialCollateralDeltaAmount_ASC_NULLS_FIRST",
  initialCollateralDeltaAmount_ASC_NULLS_LAST = "initialCollateralDeltaAmount_ASC_NULLS_LAST",
  initialCollateralDeltaAmount_DESC = "initialCollateralDeltaAmount_DESC",
  initialCollateralDeltaAmount_DESC_NULLS_FIRST = "initialCollateralDeltaAmount_DESC_NULLS_FIRST",
  initialCollateralDeltaAmount_DESC_NULLS_LAST = "initialCollateralDeltaAmount_DESC_NULLS_LAST",
  initialCollateralTokenAddress_ASC = "initialCollateralTokenAddress_ASC",
  initialCollateralTokenAddress_ASC_NULLS_FIRST = "initialCollateralTokenAddress_ASC_NULLS_FIRST",
  initialCollateralTokenAddress_ASC_NULLS_LAST = "initialCollateralTokenAddress_ASC_NULLS_LAST",
  initialCollateralTokenAddress_DESC = "initialCollateralTokenAddress_DESC",
  initialCollateralTokenAddress_DESC_NULLS_FIRST = "initialCollateralTokenAddress_DESC_NULLS_FIRST",
  initialCollateralTokenAddress_DESC_NULLS_LAST = "initialCollateralTokenAddress_DESC_NULLS_LAST",
  isLong_ASC = "isLong_ASC",
  isLong_ASC_NULLS_FIRST = "isLong_ASC_NULLS_FIRST",
  isLong_ASC_NULLS_LAST = "isLong_ASC_NULLS_LAST",
  isLong_DESC = "isLong_DESC",
  isLong_DESC_NULLS_FIRST = "isLong_DESC_NULLS_FIRST",
  isLong_DESC_NULLS_LAST = "isLong_DESC_NULLS_LAST",
  liquidationFeeAmount_ASC = "liquidationFeeAmount_ASC",
  liquidationFeeAmount_ASC_NULLS_FIRST = "liquidationFeeAmount_ASC_NULLS_FIRST",
  liquidationFeeAmount_ASC_NULLS_LAST = "liquidationFeeAmount_ASC_NULLS_LAST",
  liquidationFeeAmount_DESC = "liquidationFeeAmount_DESC",
  liquidationFeeAmount_DESC_NULLS_FIRST = "liquidationFeeAmount_DESC_NULLS_FIRST",
  liquidationFeeAmount_DESC_NULLS_LAST = "liquidationFeeAmount_DESC_NULLS_LAST",
  marketAddress_ASC = "marketAddress_ASC",
  marketAddress_ASC_NULLS_FIRST = "marketAddress_ASC_NULLS_FIRST",
  marketAddress_ASC_NULLS_LAST = "marketAddress_ASC_NULLS_LAST",
  marketAddress_DESC = "marketAddress_DESC",
  marketAddress_DESC_NULLS_FIRST = "marketAddress_DESC_NULLS_FIRST",
  marketAddress_DESC_NULLS_LAST = "marketAddress_DESC_NULLS_LAST",
  minOutputAmount_ASC = "minOutputAmount_ASC",
  minOutputAmount_ASC_NULLS_FIRST = "minOutputAmount_ASC_NULLS_FIRST",
  minOutputAmount_ASC_NULLS_LAST = "minOutputAmount_ASC_NULLS_LAST",
  minOutputAmount_DESC = "minOutputAmount_DESC",
  minOutputAmount_DESC_NULLS_FIRST = "minOutputAmount_DESC_NULLS_FIRST",
  minOutputAmount_DESC_NULLS_LAST = "minOutputAmount_DESC_NULLS_LAST",
  numberOfParts_ASC = "numberOfParts_ASC",
  numberOfParts_ASC_NULLS_FIRST = "numberOfParts_ASC_NULLS_FIRST",
  numberOfParts_ASC_NULLS_LAST = "numberOfParts_ASC_NULLS_LAST",
  numberOfParts_DESC = "numberOfParts_DESC",
  numberOfParts_DESC_NULLS_FIRST = "numberOfParts_DESC_NULLS_FIRST",
  numberOfParts_DESC_NULLS_LAST = "numberOfParts_DESC_NULLS_LAST",
  orderKey_ASC = "orderKey_ASC",
  orderKey_ASC_NULLS_FIRST = "orderKey_ASC_NULLS_FIRST",
  orderKey_ASC_NULLS_LAST = "orderKey_ASC_NULLS_LAST",
  orderKey_DESC = "orderKey_DESC",
  orderKey_DESC_NULLS_FIRST = "orderKey_DESC_NULLS_FIRST",
  orderKey_DESC_NULLS_LAST = "orderKey_DESC_NULLS_LAST",
  orderType_ASC = "orderType_ASC",
  orderType_ASC_NULLS_FIRST = "orderType_ASC_NULLS_FIRST",
  orderType_ASC_NULLS_LAST = "orderType_ASC_NULLS_LAST",
  orderType_DESC = "orderType_DESC",
  orderType_DESC_NULLS_FIRST = "orderType_DESC_NULLS_FIRST",
  orderType_DESC_NULLS_LAST = "orderType_DESC_NULLS_LAST",
  pnlUsd_ASC = "pnlUsd_ASC",
  pnlUsd_ASC_NULLS_FIRST = "pnlUsd_ASC_NULLS_FIRST",
  pnlUsd_ASC_NULLS_LAST = "pnlUsd_ASC_NULLS_LAST",
  pnlUsd_DESC = "pnlUsd_DESC",
  pnlUsd_DESC_NULLS_FIRST = "pnlUsd_DESC_NULLS_FIRST",
  pnlUsd_DESC_NULLS_LAST = "pnlUsd_DESC_NULLS_LAST",
  positionFeeAmount_ASC = "positionFeeAmount_ASC",
  positionFeeAmount_ASC_NULLS_FIRST = "positionFeeAmount_ASC_NULLS_FIRST",
  positionFeeAmount_ASC_NULLS_LAST = "positionFeeAmount_ASC_NULLS_LAST",
  positionFeeAmount_DESC = "positionFeeAmount_DESC",
  positionFeeAmount_DESC_NULLS_FIRST = "positionFeeAmount_DESC_NULLS_FIRST",
  positionFeeAmount_DESC_NULLS_LAST = "positionFeeAmount_DESC_NULLS_LAST",
  priceImpactAmount_ASC = "priceImpactAmount_ASC",
  priceImpactAmount_ASC_NULLS_FIRST = "priceImpactAmount_ASC_NULLS_FIRST",
  priceImpactAmount_ASC_NULLS_LAST = "priceImpactAmount_ASC_NULLS_LAST",
  priceImpactAmount_DESC = "priceImpactAmount_DESC",
  priceImpactAmount_DESC_NULLS_FIRST = "priceImpactAmount_DESC_NULLS_FIRST",
  priceImpactAmount_DESC_NULLS_LAST = "priceImpactAmount_DESC_NULLS_LAST",
  priceImpactDiffUsd_ASC = "priceImpactDiffUsd_ASC",
  priceImpactDiffUsd_ASC_NULLS_FIRST = "priceImpactDiffUsd_ASC_NULLS_FIRST",
  priceImpactDiffUsd_ASC_NULLS_LAST = "priceImpactDiffUsd_ASC_NULLS_LAST",
  priceImpactDiffUsd_DESC = "priceImpactDiffUsd_DESC",
  priceImpactDiffUsd_DESC_NULLS_FIRST = "priceImpactDiffUsd_DESC_NULLS_FIRST",
  priceImpactDiffUsd_DESC_NULLS_LAST = "priceImpactDiffUsd_DESC_NULLS_LAST",
  priceImpactUsd_ASC = "priceImpactUsd_ASC",
  priceImpactUsd_ASC_NULLS_FIRST = "priceImpactUsd_ASC_NULLS_FIRST",
  priceImpactUsd_ASC_NULLS_LAST = "priceImpactUsd_ASC_NULLS_LAST",
  priceImpactUsd_DESC = "priceImpactUsd_DESC",
  priceImpactUsd_DESC_NULLS_FIRST = "priceImpactUsd_DESC_NULLS_FIRST",
  priceImpactUsd_DESC_NULLS_LAST = "priceImpactUsd_DESC_NULLS_LAST",
  reasonBytes_ASC = "reasonBytes_ASC",
  reasonBytes_ASC_NULLS_FIRST = "reasonBytes_ASC_NULLS_FIRST",
  reasonBytes_ASC_NULLS_LAST = "reasonBytes_ASC_NULLS_LAST",
  reasonBytes_DESC = "reasonBytes_DESC",
  reasonBytes_DESC_NULLS_FIRST = "reasonBytes_DESC_NULLS_FIRST",
  reasonBytes_DESC_NULLS_LAST = "reasonBytes_DESC_NULLS_LAST",
  reason_ASC = "reason_ASC",
  reason_ASC_NULLS_FIRST = "reason_ASC_NULLS_FIRST",
  reason_ASC_NULLS_LAST = "reason_ASC_NULLS_LAST",
  reason_DESC = "reason_DESC",
  reason_DESC_NULLS_FIRST = "reason_DESC_NULLS_FIRST",
  reason_DESC_NULLS_LAST = "reason_DESC_NULLS_LAST",
  shouldUnwrapNativeToken_ASC = "shouldUnwrapNativeToken_ASC",
  shouldUnwrapNativeToken_ASC_NULLS_FIRST = "shouldUnwrapNativeToken_ASC_NULLS_FIRST",
  shouldUnwrapNativeToken_ASC_NULLS_LAST = "shouldUnwrapNativeToken_ASC_NULLS_LAST",
  shouldUnwrapNativeToken_DESC = "shouldUnwrapNativeToken_DESC",
  shouldUnwrapNativeToken_DESC_NULLS_FIRST = "shouldUnwrapNativeToken_DESC_NULLS_FIRST",
  shouldUnwrapNativeToken_DESC_NULLS_LAST = "shouldUnwrapNativeToken_DESC_NULLS_LAST",
  sizeDeltaUsd_ASC = "sizeDeltaUsd_ASC",
  sizeDeltaUsd_ASC_NULLS_FIRST = "sizeDeltaUsd_ASC_NULLS_FIRST",
  sizeDeltaUsd_ASC_NULLS_LAST = "sizeDeltaUsd_ASC_NULLS_LAST",
  sizeDeltaUsd_DESC = "sizeDeltaUsd_DESC",
  sizeDeltaUsd_DESC_NULLS_FIRST = "sizeDeltaUsd_DESC_NULLS_FIRST",
  sizeDeltaUsd_DESC_NULLS_LAST = "sizeDeltaUsd_DESC_NULLS_LAST",
  timestamp_ASC = "timestamp_ASC",
  timestamp_ASC_NULLS_FIRST = "timestamp_ASC_NULLS_FIRST",
  timestamp_ASC_NULLS_LAST = "timestamp_ASC_NULLS_LAST",
  timestamp_DESC = "timestamp_DESC",
  timestamp_DESC_NULLS_FIRST = "timestamp_DESC_NULLS_FIRST",
  timestamp_DESC_NULLS_LAST = "timestamp_DESC_NULLS_LAST",
  transaction_blockNumber_ASC = "transaction_blockNumber_ASC",
  transaction_blockNumber_ASC_NULLS_FIRST = "transaction_blockNumber_ASC_NULLS_FIRST",
  transaction_blockNumber_ASC_NULLS_LAST = "transaction_blockNumber_ASC_NULLS_LAST",
  transaction_blockNumber_DESC = "transaction_blockNumber_DESC",
  transaction_blockNumber_DESC_NULLS_FIRST = "transaction_blockNumber_DESC_NULLS_FIRST",
  transaction_blockNumber_DESC_NULLS_LAST = "transaction_blockNumber_DESC_NULLS_LAST",
  transaction_from_ASC = "transaction_from_ASC",
  transaction_from_ASC_NULLS_FIRST = "transaction_from_ASC_NULLS_FIRST",
  transaction_from_ASC_NULLS_LAST = "transaction_from_ASC_NULLS_LAST",
  transaction_from_DESC = "transaction_from_DESC",
  transaction_from_DESC_NULLS_FIRST = "transaction_from_DESC_NULLS_FIRST",
  transaction_from_DESC_NULLS_LAST = "transaction_from_DESC_NULLS_LAST",
  transaction_hash_ASC = "transaction_hash_ASC",
  transaction_hash_ASC_NULLS_FIRST = "transaction_hash_ASC_NULLS_FIRST",
  transaction_hash_ASC_NULLS_LAST = "transaction_hash_ASC_NULLS_LAST",
  transaction_hash_DESC = "transaction_hash_DESC",
  transaction_hash_DESC_NULLS_FIRST = "transaction_hash_DESC_NULLS_FIRST",
  transaction_hash_DESC_NULLS_LAST = "transaction_hash_DESC_NULLS_LAST",
  transaction_id_ASC = "transaction_id_ASC",
  transaction_id_ASC_NULLS_FIRST = "transaction_id_ASC_NULLS_FIRST",
  transaction_id_ASC_NULLS_LAST = "transaction_id_ASC_NULLS_LAST",
  transaction_id_DESC = "transaction_id_DESC",
  transaction_id_DESC_NULLS_FIRST = "transaction_id_DESC_NULLS_FIRST",
  transaction_id_DESC_NULLS_LAST = "transaction_id_DESC_NULLS_LAST",
  transaction_timestamp_ASC = "transaction_timestamp_ASC",
  transaction_timestamp_ASC_NULLS_FIRST = "transaction_timestamp_ASC_NULLS_FIRST",
  transaction_timestamp_ASC_NULLS_LAST = "transaction_timestamp_ASC_NULLS_LAST",
  transaction_timestamp_DESC = "transaction_timestamp_DESC",
  transaction_timestamp_DESC_NULLS_FIRST = "transaction_timestamp_DESC_NULLS_FIRST",
  transaction_timestamp_DESC_NULLS_LAST = "transaction_timestamp_DESC_NULLS_LAST",
  transaction_to_ASC = "transaction_to_ASC",
  transaction_to_ASC_NULLS_FIRST = "transaction_to_ASC_NULLS_FIRST",
  transaction_to_ASC_NULLS_LAST = "transaction_to_ASC_NULLS_LAST",
  transaction_to_DESC = "transaction_to_DESC",
  transaction_to_DESC_NULLS_FIRST = "transaction_to_DESC_NULLS_FIRST",
  transaction_to_DESC_NULLS_LAST = "transaction_to_DESC_NULLS_LAST",
  transaction_transactionIndex_ASC = "transaction_transactionIndex_ASC",
  transaction_transactionIndex_ASC_NULLS_FIRST = "transaction_transactionIndex_ASC_NULLS_FIRST",
  transaction_transactionIndex_ASC_NULLS_LAST = "transaction_transactionIndex_ASC_NULLS_LAST",
  transaction_transactionIndex_DESC = "transaction_transactionIndex_DESC",
  transaction_transactionIndex_DESC_NULLS_FIRST = "transaction_transactionIndex_DESC_NULLS_FIRST",
  transaction_transactionIndex_DESC_NULLS_LAST = "transaction_transactionIndex_DESC_NULLS_LAST",
  triggerPrice_ASC = "triggerPrice_ASC",
  triggerPrice_ASC_NULLS_FIRST = "triggerPrice_ASC_NULLS_FIRST",
  triggerPrice_ASC_NULLS_LAST = "triggerPrice_ASC_NULLS_LAST",
  triggerPrice_DESC = "triggerPrice_DESC",
  triggerPrice_DESC_NULLS_FIRST = "triggerPrice_DESC_NULLS_FIRST",
  triggerPrice_DESC_NULLS_LAST = "triggerPrice_DESC_NULLS_LAST",
  twapGroupId_ASC = "twapGroupId_ASC",
  twapGroupId_ASC_NULLS_FIRST = "twapGroupId_ASC_NULLS_FIRST",
  twapGroupId_ASC_NULLS_LAST = "twapGroupId_ASC_NULLS_LAST",
  twapGroupId_DESC = "twapGroupId_DESC",
  twapGroupId_DESC_NULLS_FIRST = "twapGroupId_DESC_NULLS_FIRST",
  twapGroupId_DESC_NULLS_LAST = "twapGroupId_DESC_NULLS_LAST",
  uiFeeReceiver_ASC = "uiFeeReceiver_ASC",
  uiFeeReceiver_ASC_NULLS_FIRST = "uiFeeReceiver_ASC_NULLS_FIRST",
  uiFeeReceiver_ASC_NULLS_LAST = "uiFeeReceiver_ASC_NULLS_LAST",
  uiFeeReceiver_DESC = "uiFeeReceiver_DESC",
  uiFeeReceiver_DESC_NULLS_FIRST = "uiFeeReceiver_DESC_NULLS_FIRST",
  uiFeeReceiver_DESC_NULLS_LAST = "uiFeeReceiver_DESC_NULLS_LAST",
}

export interface TradeActionWhereInput {
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
}

export interface TradeActionsConnection {
  __typename?: "TradeActionsConnection";
  edges: Array<TradeActionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface Transaction {
  __typename?: "Transaction";
  blockNumber: Scalars["Int"]["output"];
  from: Scalars["String"]["output"];
  hash: Scalars["String"]["output"];
  id: Scalars["String"]["output"];
  timestamp: Scalars["Int"]["output"];
  to: Scalars["String"]["output"];
  transactionIndex: Scalars["Int"]["output"];
}

export interface TransactionEdge {
  __typename?: "TransactionEdge";
  cursor: Scalars["String"]["output"];
  node: Transaction;
}

export enum TransactionOrderByInput {
  blockNumber_ASC = "blockNumber_ASC",
  blockNumber_ASC_NULLS_FIRST = "blockNumber_ASC_NULLS_FIRST",
  blockNumber_ASC_NULLS_LAST = "blockNumber_ASC_NULLS_LAST",
  blockNumber_DESC = "blockNumber_DESC",
  blockNumber_DESC_NULLS_FIRST = "blockNumber_DESC_NULLS_FIRST",
  blockNumber_DESC_NULLS_LAST = "blockNumber_DESC_NULLS_LAST",
  from_ASC = "from_ASC",
  from_ASC_NULLS_FIRST = "from_ASC_NULLS_FIRST",
  from_ASC_NULLS_LAST = "from_ASC_NULLS_LAST",
  from_DESC = "from_DESC",
  from_DESC_NULLS_FIRST = "from_DESC_NULLS_FIRST",
  from_DESC_NULLS_LAST = "from_DESC_NULLS_LAST",
  hash_ASC = "hash_ASC",
  hash_ASC_NULLS_FIRST = "hash_ASC_NULLS_FIRST",
  hash_ASC_NULLS_LAST = "hash_ASC_NULLS_LAST",
  hash_DESC = "hash_DESC",
  hash_DESC_NULLS_FIRST = "hash_DESC_NULLS_FIRST",
  hash_DESC_NULLS_LAST = "hash_DESC_NULLS_LAST",
  id_ASC = "id_ASC",
  id_ASC_NULLS_FIRST = "id_ASC_NULLS_FIRST",
  id_ASC_NULLS_LAST = "id_ASC_NULLS_LAST",
  id_DESC = "id_DESC",
  id_DESC_NULLS_FIRST = "id_DESC_NULLS_FIRST",
  id_DESC_NULLS_LAST = "id_DESC_NULLS_LAST",
  timestamp_ASC = "timestamp_ASC",
  timestamp_ASC_NULLS_FIRST = "timestamp_ASC_NULLS_FIRST",
  timestamp_ASC_NULLS_LAST = "timestamp_ASC_NULLS_LAST",
  timestamp_DESC = "timestamp_DESC",
  timestamp_DESC_NULLS_FIRST = "timestamp_DESC_NULLS_FIRST",
  timestamp_DESC_NULLS_LAST = "timestamp_DESC_NULLS_LAST",
  to_ASC = "to_ASC",
  to_ASC_NULLS_FIRST = "to_ASC_NULLS_FIRST",
  to_ASC_NULLS_LAST = "to_ASC_NULLS_LAST",
  to_DESC = "to_DESC",
  to_DESC_NULLS_FIRST = "to_DESC_NULLS_FIRST",
  to_DESC_NULLS_LAST = "to_DESC_NULLS_LAST",
  transactionIndex_ASC = "transactionIndex_ASC",
  transactionIndex_ASC_NULLS_FIRST = "transactionIndex_ASC_NULLS_FIRST",
  transactionIndex_ASC_NULLS_LAST = "transactionIndex_ASC_NULLS_LAST",
  transactionIndex_DESC = "transactionIndex_DESC",
  transactionIndex_DESC_NULLS_FIRST = "transactionIndex_DESC_NULLS_FIRST",
  transactionIndex_DESC_NULLS_LAST = "transactionIndex_DESC_NULLS_LAST",
}

export interface TransactionWhereInput {
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
}

export interface TransactionsConnection {
  __typename?: "TransactionsConnection";
  edges: Array<TransactionEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars["Int"]["output"];
}

export interface WhereInput {
  from?: InputMaybe<Scalars["Int"]["input"]>;
  id_eq?: InputMaybe<Scalars["String"]["input"]>;
  maxCapital_gte?: InputMaybe<Scalars["String"]["input"]>;
  to?: InputMaybe<Scalars["Int"]["input"]>;
}
