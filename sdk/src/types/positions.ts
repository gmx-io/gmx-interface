import { Market, MarketInfo } from "./markets";
import { TokenData } from "./tokens";

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
  /** @deprecated Only available when multicall ab flag is enabled */
  pendingImpactAmount?: bigint;
  /** @deprecated Only available when multicall ab flag is enabled */
  pendingImpactUsd?: bigint;
  /** @deprecated Only available when multicall ab flag is enabled */
  borrowingFactor?: bigint;
  /** @deprecated Only available when multicall ab flag is enabled */
  fundingFeeAmountPerSize?: bigint;
  /** @deprecated Only available when multicall ab flag is enabled */
  longTokenClaimableFundingAmountPerSize?: bigint;
  /** @deprecated Only available when multicall ab flag is enabled */
  shortTokenClaimableFundingAmountPerSize?: bigint;
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
  leverage: bigint | undefined;
  leverageWithPnl: bigint | undefined;
  netValue: bigint;
  closingFeeUsd: bigint;
  uiFeeUsd: bigint;
  pendingFundingFeesUsd: bigint;
  pendingClaimableFundingFeesUsd: bigint;
};

export type PositionsData = {
  [positionKey: string]: Position;
};

export type PositionsInfoData = {
  [positionKey: string]: PositionInfo;
};
