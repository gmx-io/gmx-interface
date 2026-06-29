import { MEGAETH } from "config/chains";
import { useChainId } from "lib/chains";

import { useUiFlagsRequest } from "../uiFlags/useUiFlagsRequest";

export const MEGAETH_POINTS_FLAG_ID = "showMegaethPoints";

export function useMegaethPointsActive(): boolean {
  const { chainId } = useChainId();
  const { uiFlags } = useUiFlagsRequest();

  if (chainId !== MEGAETH) return false;
  return uiFlags?.[MEGAETH_POINTS_FLAG_ID] === true;
}
