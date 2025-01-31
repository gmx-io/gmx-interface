import { Token } from "domain/tokens";
import { ExternalSwapAggregator } from "../externalSwaps/useExternalSwapsQuote";

export type ExecutionFee = {
  feeUsd: bigint;
  feeTokenAmount: bigint;
  feeToken: Token;
  warning?: string;
  gasLimit: bigint;
};

export type FeeItem = {
  deltaUsd: bigint;
  bps: bigint;
  precisePercentage: bigint;
};

export type SwapFeeItem = FeeItem & {
  marketAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
};

export type ExternalSwapFeeItem = FeeItem & {
  aggregator: ExternalSwapAggregator;
  tokenInAddress: string;
  tokenOutAddress: string;
};

export type GasLimitsConfig = {
  depositToken: bigint;
  withdrawalMultiToken: bigint;
  shift: bigint;
  singleSwap: bigint;
  swapOrder: bigint;
  increaseOrder: bigint;
  decreaseOrder: bigint;
  estimatedGasFeeBaseAmount: bigint;
  estimatedGasFeePerOraclePrice: bigint;
  estimatedFeeMultiplierFactor: bigint;
  glvDepositGasLimit: bigint;
  glvWithdrawalGasLimit: bigint;
  glvPerMarketGasLimit: bigint;
};
