import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { createTradeFlags } from "sdk/utils/trade";

// Base selectors that don't depend on other selectors
export const selectTradeboxFromTokenAddress = (s: SyntheticsState) => s.tradebox.fromTokenAddress;
export const selectTradeboxToTokenAddress = (s: SyntheticsState) => s.tradebox.toTokenAddress;
export const selectTradeboxTradeFlags = (s: SyntheticsState) =>
  createTradeFlags(s.tradebox.tradeType, s.tradebox.tradeMode);
export const selectTradeboxIsWrapOrUnwrap = (s: SyntheticsState) => s.tradebox.isWrapOrUnwrap;
