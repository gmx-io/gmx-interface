import { AVALANCHE, getConstant } from "config/chains";

import EarnV1 from "./EarnV1";
import EarnV2 from "./EarnV2";

export default function Earn(props) {
  const chainId = AVALANCHE;
  const isV2 = getConstant(chainId, "v2");
  return isV2 ? <EarnV2 {...props} /> : <EarnV1 {...props} />;
}
