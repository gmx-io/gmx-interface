import { BigNumber } from "ethers";
import { TokenData } from "domain/synthetics/tokens";
import { PendingPositionUpdate } from "context/SyntheticsEvents";
import { MarketInfo } from "../markets";

export type Position = {
  key: string;
  contractKey: string;
  account: string;
  marketAddress: string;
  collateralTokenAddress: string;
  sizeInUsd: BigNumber;
  sizeInTokens: BigNumber;
  collateralAmount: BigNumber;
  borrowingFactor: BigNumber;
  pendingBorrowingFeesUsd: BigNumber;
  increasedAtBlock: BigNumber;
  decreasedAtBlock: BigNumber;
  isLong: boolean;
  fundingFeeAmount: BigNumber;
  claimableLongTokenAmount: BigNumber;
  claimableShortTokenAmount: BigNumber;
  longTokenFundingAmountPerSize: BigNumber;
  shortTokenFundingAmountPerSize: BigNumber;
  latestLongTokenFundingAmountPerSize: BigNumber;
  latestShortTokenFundingAmountPerSize: BigNumber;
  hasPendingLongTokenFundingFee: boolean;
  hasPendingShortTokenFundingFee: boolean;
  isOpening: boolean;
  pendingUpdate?: PendingPositionUpdate;
  data: string;
};

export type PositionInfo = Position & {
  market: MarketInfo;
  indexToken: TokenData;
  collateralToken: TokenData;
  pnlToken: TokenData;
  currentValueUsd: BigNumber;
  collateralUsd: BigNumber;
  collateralUsdAfterFees: BigNumber;
  hasLowCollateral: boolean;
  pnl: BigNumber;
  pnlPercentage: BigNumber;
  pnlAfterFees: BigNumber;
  pnlAfterFeesPercentage: BigNumber;
  leverage: BigNumber;
  netValue?: BigNumber;
  entryPrice: BigNumber;
  markPrice: BigNumber;
  liqPrice: BigNumber;
  closingFeeUsd: BigNumber;
  pendingFundingFeesUsd: BigNumber;
};

export type PositionsData = {
  [positionKey: string]: Position;
};

export type PositionsInfoData = {
  [positionKey: string]: PositionInfo;
};
