import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";

// Base selectors that don't depend on other selectors
export const selectTradeboxFromTokenAddress = (s: SyntheticsState) => s.tradebox.fromTokenAddress;
export const selectTradeboxToTokenAddress = (s: SyntheticsState) => s.tradebox.toTokenAddress;
