import { useMemo } from "react";
import { ethers } from "ethers";

import { isMarketEnabled } from "config/markets";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";

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

    return Object.values(markets).reduce(
      (acc: MarketsResult, enabledMarketConfig) => {
        const market = enabledMarketConfig;

        if (!isMarketEnabled(chainId, market.marketTokenAddress)) {
          return acc;
        }

        try {
          const indexToken = getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
          const longToken = getToken(chainId, market.longTokenAddress);
          const shortToken = getToken(chainId, market.shortTokenAddress);

          const isSameCollaterals = market.longTokenAddress === market.shortTokenAddress;
          const isSpotOnly = market.indexTokenAddress === ethers.ZeroAddress;

          const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

          acc.marketsAddresses!.push(market.marketTokenAddress);
          acc.marketsData![market.marketTokenAddress] = {
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
