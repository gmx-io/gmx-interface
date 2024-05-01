import { Token } from "domain/tokens";

export type ExecutionFee = {
  feeUsd: bigint;
  feeTokenAmount: bigint;
  feeToken: Token;
  warning?: string;
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
  depositSingleToken: bigint;
  depositMultiToken: bigint;
  withdrawalMultiToken: bigint;
  singleSwap: bigint;
  swapOrder: bigint;
  increaseOrder: bigint;
  decreaseOrder: bigint;
  estimatedFeeBaseGasLimit: bigint;
  estimatedFeeMultiplierFactor: bigint;
};
