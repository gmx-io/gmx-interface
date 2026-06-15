import { ExternalSwapQuote } from "sdk/utils/trade/types";

export type ExternalSwapRequestKey = {
  structuralKey: string;
  amount: bigint;
};

export type ExternalSwapRequestResult =
  | { status: "success"; key: ExternalSwapRequestKey; quote: ExternalSwapQuote }
  | { status: "failed"; key: ExternalSwapRequestKey };

export type ExternalSwapState = {
  requestResult: ExternalSwapRequestResult | undefined;
  shouldFallbackToInternalSwap: boolean;
  shouldForceExternalSwap: boolean;
  setRequestResult: (result: ExternalSwapRequestResult | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
  setShouldForceExternalSwap: (shouldForce: boolean) => void;
};
