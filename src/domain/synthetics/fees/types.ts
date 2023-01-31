import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { TokenData } from "../tokens";

export type ExecutionFeeParams = {
  feeUsd?: BigNumber;
  feeTokenAmount?: BigNumber;
  feeToken: Token;
};

export type ExecutionFee = {
  feeUsd: BigNumber;
  feeAmount: BigNumber;
  feeToken: TokenData;
};

export type SwapStepFees = {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  swapFeeAmount: BigNumber;
  swapFeeUsd: BigNumber;
  priceImpactDeltaUsd: BigNumber;
  totalFeeUsd: BigNumber;
  amountInAfterFees: BigNumber;
  amountOut: BigNumber;
  usdOut: BigNumber;
};

export type FeeItem = {
  deltaUsd: BigNumber;
  bps: BigNumber;
};

export type SwapFeeItem = FeeItem & {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
};

export type TotalSwapFees = {
  swapSteps: SwapStepFees[];
  swapFees: SwapFeeItem[];
  totalPriceImpact: FeeItem;
  totalSwapFee: FeeItem;
  totalFee: FeeItem;
  tokenInAddress: string;
  tokenOutAddress: string;
  usdOut: BigNumber;
};

export type GasLimitsConfig = {
  depositSingleToken: BigNumber;
  depositMultiToken: BigNumber;
  withdrawalSingleToken: BigNumber;
  withdrawalMultiToken: BigNumber;
  singleSwap: BigNumber;
  swapOrder: BigNumber;
  increaseOrder: BigNumber;
  decreaseOrder: BigNumber;
  estimatedFeeBaseGasLimit: BigNumber;
  estimatedFeeMultiplierFactor: BigNumber;
};

export type MarketFeesConfig = {
  positionFeeFactor: BigNumber;
  positionImpactFactorPositive: BigNumber;
  positionImpactFactorNegative: BigNumber;
  maxPositionImpactFactorPositive: BigNumber;
  maxPositionImpactFactorNegative: BigNumber;
  positionImpactExponentFactor: BigNumber;

  swapFeeFactor: BigNumber;
  swapImpactFactorPositive: BigNumber;
  swapImpactFactorNegative: BigNumber;
  swapImpactExponentFactor: BigNumber;

  // MarketInfo
  borrowingFactorPerSecondForLongs: BigNumber;
  borrowingFactorPerSecondForShorts: BigNumber;

  fundingPerSecond: BigNumber;
  longsPayShorts: boolean;
  fundingAmountPerSize_LongCollateral_LongPosition: BigNumber;
  fundingAmountPerSize_LongCollateral_ShortPosition: BigNumber;
  fundingAmountPerSize_ShortCollateral_LongPosition: BigNumber;
  fundingAmountPerSize_ShortCollateral_ShortPosition: BigNumber;
};

export type MarketsFeesConfigsData = {
  [marketAddress: string]: MarketFeesConfig;
};
