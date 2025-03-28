import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectTokenPermitsState = (s: SyntheticsState) => s.tokenPermitsState;
export const selectTokenPermits = (s: SyntheticsState) => s.tokenPermitsState.tokenPermits;
export const selectAddTokenPermit = (s: SyntheticsState) => s.tokenPermitsState.addTokenPermit;
export const selectResetTokenPermits = (s: SyntheticsState) => s.tokenPermitsState.resetTokenPermits;
