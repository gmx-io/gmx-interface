import { ExternalSwapOutput, SwapPathStats } from "../trade";

export type RelayerFeeBaseState = {
  internalSwapStats: SwapPathStats | undefined;
  externalSwapOutput: ExternalSwapOutput | undefined;
};

export type RelayerFeeState = {
  gasPaymentTokenAddress: string;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  executionFeeAmount: bigint;
  totalNetworkFeeAmount: bigint;
  gasPaymentTokenAmount: bigint;
  internalSwapStats: SwapPathStats | undefined;
  externalSwapOutput: ExternalSwapOutput | undefined;
};
