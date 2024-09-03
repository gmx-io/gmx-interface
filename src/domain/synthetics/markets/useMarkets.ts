import { useMemo } from "react";
import { ethers } from "ethers";

import { getContract } from "config/contracts";
import { isMarketEnabled } from "config/markets";
import { convertTokenAddress, getToken } from "config/tokens";
import { useMulticall } from "lib/multicall";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import { MarketsData } from "./types";
import { getMarketFullName } from "./utils";

import SyntheticsReader from "abis/SyntheticsReader.json";

import { prebuildMarkets } from "prebuild";

export type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
  error?: Error | undefined;
};

const MARKETS_COUNT = 100;

export function useMarkets(chainId: number): MarketsResult {
  const prebuildData = useMemo(() => {
    const prebuildData = prebuildMarkets[chainId];

    if (!prebuildData) {
      // eslint-disable-next-line no-console
      console.warn(`Prebuild markets for chain ${chainId} not found`);

      return null;
    }

    return Object.values(prebuildData).reduce(
      (acc: MarketsResult, market) => {
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
      { marketsData: {}, marketsAddresses: [], error: undefined }
    );
  }, [chainId]);

  const freshData = useMarketsMulticall(chainId, Boolean(prebuildData));

  return prebuildData ?? freshData;
}

function useMarketsMulticall(chainId: number, enabled = true): MarketsResult {
  const { data, error } = useMulticall(chainId, "useMarketsData", {
    key: enabled ? [] : null,

    refreshInterval: CONFIG_UPDATE_INTERVAL,

    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "DataStore"), 0, MARKETS_COUNT],
          },
        },
      },
    }),
    parseResponse: (res) => {
      return res.data.reader.markets.returnValues.reduce(
        (acc: { marketsData: MarketsData; marketsAddresses: string[] }, marketValues) => {
          if (!isMarketEnabled(chainId, marketValues.marketToken)) {
            return acc;
          }

          try {
            const indexToken = getToken(chainId, convertTokenAddress(chainId, marketValues.indexToken, "native"));
            const longToken = getToken(chainId, marketValues.longToken);
            const shortToken = getToken(chainId, marketValues.shortToken);

            const isSameCollaterals = marketValues.longToken === marketValues.shortToken;
            const isSpotOnly = marketValues.indexToken === ethers.ZeroAddress;

            const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

            acc.marketsData[marketValues.marketToken] = {
              marketTokenAddress: marketValues.marketToken,
              indexTokenAddress: marketValues.indexToken,
              longTokenAddress: marketValues.longToken,
              shortTokenAddress: marketValues.shortToken,
              isSameCollaterals,
              isSpotOnly,
              name,
              data: "",
            };

            acc.marketsAddresses.push(marketValues.marketToken);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("unsupported market", e);
          }

          return acc;
        },
        { marketsData: {}, marketsAddresses: [] }
      );
    },
  });

  return {
    marketsData: data?.marketsData,
    marketsAddresses: data?.marketsAddresses,
    error,
  };
}
