import { MutableRefObject } from "react";

import { ExternalSwapQuote } from "sdk/utils/trade/types";

export type BuildExternalSwapCalldataFn = () => Promise<{ to: string; data: string } | undefined>;

export type ExternalSwapState = {
  baseOutput: ExternalSwapQuote | undefined;
  shouldFallbackToInternalSwap: boolean;
  buildCalldataRef: MutableRefObject<BuildExternalSwapCalldataFn | undefined>;
  setBaseOutput: (output: ExternalSwapQuote | undefined) => void;
  setShouldFallbackToInternalSwap: (shouldFallback: boolean) => void;
};
