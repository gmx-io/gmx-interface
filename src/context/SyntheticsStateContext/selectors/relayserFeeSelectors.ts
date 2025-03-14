import { SyntheticsState } from "../SyntheticsStateContextProvider";

export const selectRelayerFeeState = (s: SyntheticsState) => s.relayerFeeState;
export const selectSetRelayerFeeState = (s: SyntheticsState) => s.setRelayerFeeState;
