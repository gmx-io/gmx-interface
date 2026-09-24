import { BN } from '@coral-xyz/anchor';
import { Token } from '../token/types';

export type TradeFeesType = 'swap' | 'increase' | 'decrease' | 'edit';

export type ExecutionFee = {
  feeUsd: BN;
  feeTokenAmount: BN;
  feeToken: Token;
  warning?: string;
};

export type FeeItem = {
  deltaUsd: BN;
  bps: number;
};

export type SwapFeeItem = FeeItem & {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
};

export type TradeFees = {
  totalFees?: FeeItem;
  payTotalFees?: FeeItem;
  swapFees?: SwapFeeItem[];
  positionFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  positionPriceImpact?: FeeItem;
  priceImpactDiff?: FeeItem;
  positionCollateralPriceImpact?: FeeItem;
  collateralPriceImpactDiff?: FeeItem;
  positionFeeFactor?: BN;
  borrowFee?: FeeItem;
  fundingFee?: FeeItem;
  swapProfitFee?: FeeItem;
  feeDiscount?: FeeItem;
  gtRewards?: FeeItem;
};

export type GmSwapFees = {
  totalFees?: FeeItem;
  swapFee?: FeeItem;
  swapPriceImpact?: FeeItem;
  shiftFee?: FeeItem;
};

export type GasLimitsConfig = {
  depositSingleToken: BN;
  depositMultiToken: BN;
  withdrawalMultiToken: BN;
  shift: BN;
  singleSwap: BN;
  swapOrder: BN;
  increaseOrder: BN;
  decreaseOrder: BN;
  estimatedGasFeeBaseAmount: BN;
  estimatedGasFeePerOraclePrice: BN;
  estimatedFeeMultiplierFactor: BN;
  glvDepositGasLimit: BN;
  glvWithdrawalGasLimit: BN;
  glvPerMarketGasLimit: BN;
};
