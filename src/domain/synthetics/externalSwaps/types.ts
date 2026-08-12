import { ExternalSwapCalculationStrategy, ExternalSwapQuote } from "sdk/utils/trade/types";

export type ExternalSwapRequestKey = {
  structuralKey: string;
  amount: bigint;
  strategy: ExternalSwapCalculationStrategy;
};

export type ExternalSwapRequestResult =
  | { status: "success"; key: ExternalSwapRequestKey; quote: ExternalSwapQuote }
  | { status: "failed"; key: ExternalSwapRequestKey };

export type ExternalSwapBlockReason =
  | "orderTypeNotSupported"
  | "oneClickTrading"
  | "gasTokenConflict"
  | "temporarilyDisabledByFailure"
  | "noRouteFound";

export type ExternalSwapState = {
  requestResult: ExternalSwapRequestResult | undefined;
  shouldFallbackToInternalSwap: boolean;
  shouldForceExternalSwap: boolean;
  setRequestResult: (result: ExternalSwapRequestResult | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
  setShouldForceExternalSwap: (shouldForce: boolean) => void;
};
