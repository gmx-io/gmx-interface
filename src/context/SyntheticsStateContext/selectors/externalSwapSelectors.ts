import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectExternalSwapQuote = (s: SyntheticsState) => s.externalSwap.quote;
export const selectSetExternalSwapQuote = (s: SyntheticsState) => s.externalSwap.setQuote;

export const selectExternalSwapFails = (s: SyntheticsState) => s.externalSwap.fails;
export const selectSetExternalSwapFails = (s: SyntheticsState) => s.externalSwap.setFails;
