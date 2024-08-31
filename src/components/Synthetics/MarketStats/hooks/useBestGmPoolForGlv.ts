import { MarketInfo } from "domain/synthetics/markets";
import { getMaxUsdBuyableAmountInMarketWithGm, isGlv } from "domain/synthetics/markets/glv";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";
import { useGlvGmMarketsWithComposition } from "./useMarketGlvGmMarketsCompositions";
import { useMemo } from "react";

export const useBestGmPoolAddressForGlv = (
  isDeposit: boolean,
  glvMarket?: MarketInfo | GlvMarketInfo,
  selectedGmPoolAddress?: string
) => {
  const poolsWithComposition = useGlvGmMarketsWithComposition(isDeposit, glvMarket?.indexTokenAddress);

  return useMemo(() => {
    if (!glvMarket || !isGlv(glvMarket) || poolsWithComposition.length === 0) {
      return undefined;
    }

    if (selectedGmPoolAddress) {
      return selectedGmPoolAddress;
    }

    for (const market of poolsWithComposition.sort((a, b) => {
      return b.comp - a.comp;
    })) {
      const vailableBuyableGmUsd = getMaxUsdBuyableAmountInMarketWithGm(
        market.gmMarket,
        glvMarket,
        market.pool,
        market.token
      );

      if (vailableBuyableGmUsd > 0) {
        return market.pool.marketTokenAddress;
      }
    }

    return poolsWithComposition[0].pool.marketTokenAddress;
  }, [glvMarket, poolsWithComposition, selectedGmPoolAddress]);
};
