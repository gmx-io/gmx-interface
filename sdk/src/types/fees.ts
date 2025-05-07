import { Token } from "types/tokens";

import { ExternalSwapAggregator } from "./trade";

export type ExecutionFee = {
  feeUsd: bigint;
  feeTokenAmount: bigint;
  feeToken: Token;
  gasLimit: bigint;
  isFeeHigh: boolean;
  isFeeVeryHigh: boolean;
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
  gelatoRelayFeeMultiplierFactor: bigint;
  glvDepositGasLimit: bigint;
  glvWithdrawalGasLimit: bigint;
  glvPerMarketGasLimit: bigint;
  createOrderGasLimit: bigint;
  updateOrderGasLimit: bigint;
  cancelOrderGasLimit: bigint;
};

export type L1ExpressOrderGasReference = {
  gasLimit: bigint;
  sizeOfData: bigint;
};
