import { selectChainId, selectUsdgBoostAprResult } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { nowInSeconds } from "sdk/utils/time";

import { UsdgLaunchBoost, getUsdgLaunchBoost } from "./utils";

export function useUsdgLaunchBoost(glvOrMarket: GlvOrMarketInfo | undefined): UsdgLaunchBoost | undefined {
  const chainId = useSelector(selectChainId);
  const usdgBoostAprResult = useSelector(selectUsdgBoostAprResult);

  if (!glvOrMarket) {
    return undefined;
  }

  return getUsdgLaunchBoost({ chainId, glvOrMarket, usdgBoostAprResult, nowSeconds: nowInSeconds() });
}
