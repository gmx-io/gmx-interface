import { Token } from "types/tokens";

export type ExecutionFee = {
  feeUsd: bigint;
  feeTokenAmount: bigint;
  feeToken: Token;
  warning?: string;
  isFeeHigh: boolean;
  isFeeVeryHigh: boolean;
  gasLimit: bigint;
};

export type FeeItem = {
  deltaUsd: bigint;
  bps: bigint;
};

export type SwapFeeItem = FeeItem & {
  marketAddress: string;
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
