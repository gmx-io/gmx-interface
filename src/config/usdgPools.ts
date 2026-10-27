import { getTokenBySymbol } from "sdk/configs/tokens";
import { expandDecimals } from "sdk/utils/numbers";

import { ARBITRUM } from "./chains";
import { getGlvByLabel } from "./markets";

export const ARBITRUM_USDG_GLV_ADDRESS = getGlvByLabel(ARBITRUM, "GLV [USDG-USDG]").glvTokenAddress;

const ARBITRUM_USDG_ADDRESS = getTokenBySymbol(ARBITRUM, "USDG").address;
const ARBITRUM_USDC_ADDRESS = getTokenBySymbol(ARBITRUM, "USDC").address;

export function getIsUsdgPool(chainId: number, p: { longTokenAddress: string; shortTokenAddress: string }): boolean {
  return (
    chainId === ARBITRUM &&
    (p.longTokenAddress === ARBITRUM_USDG_ADDRESS || p.shortTokenAddress === ARBITRUM_USDG_ADDRESS)
  );
}

// most traders hold USDC, so USDG collateral converts from and to it
export function getUsdgConversionTokenAddress(chainId: number, collateralTokenAddress: string | undefined) {
  return chainId === ARBITRUM && collateralTokenAddress === ARBITRUM_USDG_ADDRESS ? ARBITRUM_USDC_ADDRESS : undefined;
}

export function getIsUsdgToken(chainId: number, tokenAddress: string | undefined): boolean {
  return chainId === ARBITRUM && tokenAddress === ARBITRUM_USDG_ADDRESS;
}

export const USDG_LAUNCH_BOOST_TARGET_GLV_APR = expandDecimals(8, 28);
export const USDG_LAUNCH_BOOST_TARGET_GM_APR = expandDecimals(5, 28);

export const USDG_LAUNCH_BOOST_PERIOD_1_START = Date.UTC(2026, 9, 6) / 1000;
export const USDG_LAUNCH_BOOST_PERIOD_1_END = Date.UTC(2026, 10, 30) / 1000;
