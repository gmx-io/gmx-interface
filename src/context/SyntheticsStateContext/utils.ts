import { createSelector as createSelectorCommon } from "lib/selectors";
import { SyntheticsState } from "./SyntheticsStateContextProvider";
export { useSyntheticsStateSelector as useSelector } from "./SyntheticsStateContextProvider";

export const createSelector = createSelectorCommon.withTypes<SyntheticsState>();
