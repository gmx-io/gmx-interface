import type { Market, MarketInfo } from "utils/markets/types";
import type { ApiOrderInfo } from "utils/orders/types";
import type { TokenData } from "utils/tokens/types";

export type Position = {
  key: string;
  contractKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: bigint;
  sizeInTokens: bigint;
  collateralAmount: bigint;
  pendingBorrowingFeesUsd: bigint;
  increasedAtTime: bigint;
  decreasedAtTime: bigint;
  isLong: boolean;
  fundingFeeAmount: bigint;
  claimableLongTokenAmount: bigint;
  claimableShortTokenAmount: bigint;
  isOpening?: boolean;
  pnl: bigint;
  positionFeeAmount: bigint;
  traderDiscountAmount: bigint;
  uiFeeAmount: bigint;
  pendingImpactAmount: bigint;
  data: string;
};

export type PositionInfo = Position & {
  marketInfo: MarketInfo | undefined;
  market: Market;
  indexToken: TokenData;
  longToken: TokenData;
  shortToken: TokenData;
  indexName: string;
  poolName: string;
  collateralToken: TokenData;
  pnlToken: TokenData;
  markPrice: bigint;
  entryPrice: bigint | undefined;
  liquidationPrice: bigint | undefined;
  collateralUsd: bigint;
  remainingCollateralUsd: bigint;
  remainingCollateralAmount: bigint;
  hasLowCollateral: boolean;
  pnl: bigint;
  pnlPercentage: bigint;
  pnlAfterFees: bigint;
  pnlAfterFeesPercentage: bigint;
  netPriceImapctDeltaUsd: bigint;
  priceImpactDiffUsd: bigint;
  pendingImpactUsd: bigint;
  closePriceImpactDeltaUsd: bigint;
  leverage: bigint | undefined;
  leverageWithPnl: bigint | undefined;
  leverageWithoutPnl: bigint | undefined;
  netValue: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
  pendingFundingFeesUsd: bigint;
  pendingClaimableFundingFeesUsd: bigint;
};

export type PositionInfoLoaded = PositionInfo & { marketInfo: MarketInfo };

export type RawPositionInfo = Omit<
  PositionInfo,
  "marketInfo" | "market" | "indexToken" | "longToken" | "shortToken" | "collateralToken" | "pnlToken"
>;

export type PositionsData = {
  [positionKey: string]: Position;
};

export type PositionsInfoData = {
  [positionKey: string]: PositionInfo;
};

export type ApiPositionInfo = RawPositionInfo & {
  relatedOrders?: ApiOrderInfo[];
};
