import React from "react";

import { AVALANCHE, getConstant } from "config/chains";

import StakeV1 from "./StakeV1";
import StakeV2 from "./StakeV2";
import { StakeV2ContextProvider } from "./StakeV2ContextProvider";

export default function Stake(props) {
  const chainId = AVALANCHE;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? (
    <StakeV2ContextProvider>
      <StakeV2 {...props} />
    </StakeV2ContextProvider>
  ) : (
    <StakeV1 {...props} />
  );
}
