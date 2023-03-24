import { BigNumber } from "ethers";
import { TokenData } from "domain/synthetics/tokens";
import { Market } from "domain/synthetics/markets";
import { PendingPositionUpdate } from "context/SyntheticsEvents";

export type PositionFundingFees = {
  fundingFeeAmount: BigNumber;
  claimableLongTokenAmount: BigNumber;
  claimableShortTokenAmount: BigNumber;
  latestLongTokenFundingAmountPerSize: BigNumber;
  latestShortTokenFundingAmountPerSize: BigNumber;
  hasPendingLongTokenFundingFee: boolean;
  hasPendingShortTokenFundingFee: boolean;
};

export type Position = {
  key: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  borrowingFactor: BigNumber;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  increasedAtBlock: BigNumber;
  decreasedAtBlock: BigNumber;
  isLong: boolean;
  data: string;
  pendingBorrowingFees: BigNumber;
  pendingFundingFees: PositionFundingFees;
  isOpening?: boolean;
  pendingUpdate?: PendingPositionUpdate;
};

export type AggregatedPositionData = Position & {
  marketName?: string;
  market?: Market;
  indexToken?: TokenData;
  collateralToken?: TokenData;
  pnlToken?: TokenData;
  currentValueUsd?: BigNumber;
  collateralUsd?: BigNumber;
  markPrice?: BigNumber;
  pnl?: BigNumber;
  pnlPercentage?: BigNumber;
  pnlAfterFees?: BigNumber;
  pnlAfterFeesPercentage?: BigNumber;
  collateralUsdAfterFees?: BigNumber;
  hasLowCollateral?: boolean;
  entryPrice?: BigNumber;
  netValue?: BigNumber;
  liqPrice?: BigNumber;
  leverage?: BigNumber;
  closingFeeUsd?: BigNumber;
  borrowingFeeRateUsdPerDay?: BigNumber;
  fundingFeeRateUsdPerDay?: BigNumber;
  pendingFundingFeesUsd?: BigNumber;
};

export type PositionsData = {
  [positionKey: string]: Position;
};

export type AggregatedPositionsData = {
  [positionKey: string]: AggregatedPositionData;
};
