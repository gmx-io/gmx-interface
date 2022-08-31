import React from "react";

import { getConstant } from "../../config/chains";
import { AVALANCHE } from "../../lib/legacy";

import StakeV1 from "./StakeV1";
import StakeV2 from "./StakeV2";

export default function Stake(props) {
  const chainId = AVALANCHE;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? <StakeV2 {...props} /> : <StakeV1 {...props} />;
}
