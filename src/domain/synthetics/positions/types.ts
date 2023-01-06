import { BigNumber } from "ethers";
import { TokenData } from "../tokens";

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
};

export type AggregatedPositionData = Position & {
  marketName?: string;
  currentValueUsd?: BigNumber;
  collateralUsd?: BigNumber;
  indexToken?: TokenData;
  collateralToken?: TokenData;
  averagePrice?: BigNumber;
  markPrice?: BigNumber;
  pnl?: BigNumber;
  pnlPercentage?: BigNumber;
  collateralUsdAfterFees?: BigNumber;
  entryPrice?: BigNumber;
  netValue?: BigNumber;
  liqPrice?: BigNumber;
  leverage?: BigNumber;
  hasProfit?: boolean;
};

export type PositionsData = {
  [positionKey: string]: Position;
};
