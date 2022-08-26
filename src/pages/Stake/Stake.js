import React from "react";

import StakeV1 from "./StakeV1";
import StakeV2 from "./StakeV2";
import { AVALANCHE } from "../../helpers/chains/chainIds";
import { getConstant } from "../../helpers/chains/utils";

export default function Stake(props) {
  const chainId = AVALANCHE;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? <StakeV2 {...props} /> : <StakeV1 {...props} />;
}
