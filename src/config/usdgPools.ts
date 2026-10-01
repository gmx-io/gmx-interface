import { getTokenBySymbol } from "sdk/configs/tokens";
import { expandDecimals } from "sdk/utils/numbers";

import { ARBITRUM } from "./chains";
import { getGlvByLabel } from "./markets";

export const ARBITRUM_USDG_GLV_ADDRESS = getGlvByLabel(ARBITRUM, "GLV [USDG-USDG]").glvTokenAddress;

const ARBITRUM_USDG_ADDRESS = getTokenBySymbol(ARBITRUM, "USDG").address;

export function getIsUsdgPool(chainId: number, p: { longTokenAddress: string; shortTokenAddress: string }): boolean {
  return (
    chainId === ARBITRUM &&
    (p.longTokenAddress === ARBITRUM_USDG_ADDRESS || p.shortTokenAddress === ARBITRUM_USDG_ADDRESS)
  );
}

export const USDG_LAUNCH_BOOST_TARGET_GLV_APR = expandDecimals(8, 28);
export const USDG_LAUNCH_BOOST_TARGET_GM_APR = expandDecimals(5, 28);

export const USDG_LAUNCH_BOOST_ROUND_SECONDS = 4 * 60 * 60;
export const USDG_LAUNCH_BOOST_PAUSED_AFTER_SECONDS = 12 * 60 * 60;
