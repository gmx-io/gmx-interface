import { createSelector as createSelectorCommon } from "lib/selectors";
import { createSelectionContext } from "@taskworld.com/rereselect";
import { SyntheticsTradeState } from "./SyntheticsStateContextProvider";
export { useSyntheticsStateSelector as useSelector } from "./SyntheticsStateContextProvider";

export const createSelector = createSelectorCommon.withTypes<SyntheticsTradeState>();
const context = createSelectionContext<SyntheticsTradeState>();

export const createEnhancedSelector = context.makeSelector;
