import { SyntheticsTradeState } from "../SyntheticsStateContextProvider";

export const selectPositionSeller = (state: SyntheticsTradeState) => state.positionSeller;
