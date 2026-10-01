import { getTokenBySymbol } from "sdk/configs/tokens";

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
