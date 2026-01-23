import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectTokenPermits = (s: SyntheticsState) => s.tokenPermitsState.tokenPermits;
