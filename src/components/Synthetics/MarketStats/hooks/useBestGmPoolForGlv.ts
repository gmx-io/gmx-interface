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
  const marketsWithComposition = useGlvGmMarketsWithComposition(isDeposit, glvMarket?.indexTokenAddress);

  return useMemo(() => {
    if (!glvMarket || !isGlv(glvMarket) || marketsWithComposition.length === 0) {
      return undefined;
    }

    if (selectedGmPoolAddress) {
      return selectedGmPoolAddress;
    }

    const sortedMarketsWithComposition = marketsWithComposition.sort((a, b) => {
      return b.comp - a.comp;
    });

    for (const marketConfig of sortedMarketsWithComposition) {
      const availableBuyableGmUsd = getMaxUsdBuyableAmountInMarketWithGm(
        marketConfig.glvMarket,
        glvMarket,
        marketConfig.market,
        marketConfig.token
      );

      if (availableBuyableGmUsd > 0) {
        return marketConfig.market.marketTokenAddress;
      }
    }

    return marketsWithComposition[0].market.marketTokenAddress;
  }, [glvMarket, marketsWithComposition, selectedGmPoolAddress]);
};
