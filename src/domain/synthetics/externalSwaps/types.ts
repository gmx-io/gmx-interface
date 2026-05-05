import { ExternalSwapQuote } from "sdk/utils/trade/types";

export type ExternalSwapRequestResult =
  | { status: "success"; key: string; quote: ExternalSwapQuote }
  | { status: "failed"; key: string };

export type ExternalSwapState = {
  requestResult: ExternalSwapRequestResult | undefined;
  shouldFallbackToInternalSwap: boolean;
  shouldForceExternalSwap: boolean;
  setRequestResult: (result: ExternalSwapRequestResult | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
  setShouldForceExternalSwap: (shouldForce: boolean) => void;
};
