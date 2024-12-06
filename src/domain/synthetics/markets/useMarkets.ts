import { ethers } from "ethers";
import { useMemo } from "react";

import { convertTokenAddress, getToken } from "config/tokens";

import { MarketsData } from "./types";
import { getMarketFullName } from "./utils";

import { MARKETS } from "config/markets";

export type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
  error?: Error | undefined;
};

export function useMarkets(chainId: number): MarketsResult {
  return useMemo(() => {
    const markets = MARKETS[chainId];

    if (!markets) {
      throw new Error(`Static markets data for chain ${chainId} not found`);
    }

    return Object.entries(markets).reduce(
      (acc: MarketsResult, [marketAddress, enabledMarketConfig]) => {
        const market = enabledMarketConfig;

        // if (!isMarketEnabled(chainId, marketAddress)) {
        //   return acc;
        // }

        try {
          const indexToken = getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
          const longToken = getToken(chainId, market.longTokenAddress);
          const shortToken = getToken(chainId, market.shortTokenAddress);

          const isSameCollaterals = market.longTokenAddress === market.shortTokenAddress;
          const isSpotOnly = market.indexTokenAddress === ethers.ZeroAddress;

          const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

          acc.marketsAddresses!.push(marketAddress);
          acc.marketsData![marketAddress] = {
            ...market,
            isSameCollaterals,
            isSpotOnly,
            name,
            data: "",
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("unsupported market", e);
        }

        return acc;
      },
      { marketsData: {}, marketsAddresses: [] }
    );
  }, [chainId]);
}
