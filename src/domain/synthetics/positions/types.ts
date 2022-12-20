import { BigNumber } from "ethers";

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
};

export type PositionInfo = Position & {
  pendingBorrowingFees: BigNumber;
  pendingFundingFees: PositionFundingFees;
};

export type PositionsData = {
  [positionKey: string]: PositionInfo;
};
