import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

export type ExecutionFee = {
  feeUsd: BigNumber;
  feeTokenAmount: BigNumber;
  feeToken: Token;
  warning?: string;
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

export type VirtualInventoryForSwapsData = {
  [marketAddress: string]: {
    [tokenAddress: string]: BigNumber;
  };
};

export type VirtualInventoryForPositionsData = {
  [tokenAddress: string]: BigNumber;
};
