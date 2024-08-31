import { useMemo } from "react";

import { selectAllMarketsData } from "context/SyntheticsStateContext/selectors/globalSelectors";
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

  const allMarkets = useSelector(selectAllMarketsData);

  return useMemo(() => {
    if (!glvAddress) {
      return [];
    }

    const glv = allMarkets[glvAddress];

    if (!glv || !isGlv(glv)) {
      return [];
    }

    const sum = glv.markets.reduce((acc, market) => acc + market.gmBalance, 0n);
    const rows = glv.markets
      .map((market) => {
        const gmMarket = allMarkets[market.address];
        const token = marketTokensData?.[gmMarket?.marketTokenAddress];

        if (!token) {
          return null;
        }

        return {
          amount: market.gmBalance,
          gmMarket: market,
          pool: gmMarket,
          token: token,
          tvl: [
            convertToUsd(market.gmBalance, token.decimals, token.prices.maxPrice) ?? 0n,
            getMaxUsdCapUsdInGmGlvMarket(market, glv),
          ] as const,
          comp: sum === 0n ? 0 : (bigintToNumber(market.gmBalance, 1) * 100) / bigintToNumber(sum, 1),
        };
      })
      .filter(Boolean as unknown as FilterOutFalsy);

    return rows.sort((a, b) => {
      return b.comp - a.comp;
    });
  }, [allMarkets, glvAddress, marketTokensData]);
};
