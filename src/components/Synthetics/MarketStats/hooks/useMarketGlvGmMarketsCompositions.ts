import { useMemo } from "react";

import { selectGlvAndGmMarketsData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";

import { useMarketTokensData } from "domain/synthetics/markets";
import { getMaxUsdCapUsdInGmGlvMarket, isGlv } from "domain/synthetics/markets/glv";
import { convertToUsd } from "domain/synthetics/tokens";

import { useChainId } from "lib/chains";
import { bigintToNumber } from "lib/numbers";

export const useGlvGmMarketsWithComposition = (isDeposit: boolean, glvAddress?: string) => {
  const { chainId } = useChainId();
  const { marketTokensData } = useMarketTokensData(chainId, {
    isDeposit,
  });

  const allMarkets = useSelector(selectGlvAndGmMarketsData);

  return useMemo(() => {
    if (!glvAddress) {
      return [];
    }

    const glv = allMarkets[glvAddress];

    if (!glv || !isGlv(glv)) {
      return [];
    }

    const sum = glv.markets.reduce((acc, market) => {
      const token = marketTokensData?.[market.address];
      if (!token) {
        return acc;
      }

      return acc + (convertToUsd(market.gmBalance, token.decimals, token.prices.maxPrice) ?? 0n);
    }, 0n);

    const rows = glv.markets
      .map((glvMarket) => {
        const gmMarket = allMarkets[glvMarket.address];
        const token = marketTokensData?.[gmMarket?.marketTokenAddress];

        if (!token) {
          return null;
        }

        const balanceUsd = convertToUsd(glvMarket.gmBalance, token.decimals, token.prices.maxPrice) ?? 0n;

        return {
          amount: glvMarket.gmBalance,
          glvMarket: glvMarket,
          market: gmMarket,
          token: token,
          tvl: [balanceUsd, getMaxUsdCapUsdInGmGlvMarket(glvMarket, token)] as const,
          comp: sum === 0n ? 0 : (bigintToNumber(balanceUsd, 30) * 100) / bigintToNumber(sum, 30),
        };
      })
      .filter(Boolean as unknown as FilterOutFalsy);

    return rows.sort((a, b) => {
      return b.comp - a.comp;
    });
  }, [allMarkets, glvAddress, marketTokensData]);
};
