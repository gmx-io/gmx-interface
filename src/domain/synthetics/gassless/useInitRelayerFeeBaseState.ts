import { RelayerFeeBaseState } from "./types";

export function useInitRelayerFeeBaseState(): RelayerFeeBaseState {
  return {
    internalSwapStats: undefined,
    externalSwapOutput: undefined,
  };
}
