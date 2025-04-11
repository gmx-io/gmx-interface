import { getRelayerFeeSwapParams } from "domain/synthetics/gassless/txns/expressOrderUtils";

import { SyntheticsState } from "../SyntheticsStateContextProvider";
import { createSelector } from "../utils";
import { selectAccount } from "./globalSelectors";
export const selectRelayerFeeState = (s: SyntheticsState) => s.relayerFeeState;
export const selectSetRelayerFeeState = (s: SyntheticsState) => s.setRelayerFeeState;

export const selectRelayerFeeSwapParams = createSelector((q) => {
  const relayerFeeState = q(selectRelayerFeeState);
  const account = q(selectAccount);

  if (!relayerFeeState || !account) {
    return undefined;
  }

  return getRelayerFeeSwapParams(account, relayerFeeState);
});
