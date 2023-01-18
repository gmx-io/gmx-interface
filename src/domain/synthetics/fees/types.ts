import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type PriceImpactConfig = {
  factorPositive: BigNumber;
  factorNegative: BigNumber;
  exponentFactor: BigNumber;
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

export type PriceImpactConfigsData = {
  [marketAddress: string]: PriceImpactConfig;
};

export type PriceImpact = {
  impact: BigNumber;
  basisPoints: BigNumber;
};

export type ExecutionFeeParams = {
  feeUsd?: BigNumber;
  feeTokenAmount?: BigNumber;
  feeToken: Token;
};
