import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { getWrappedToken } from "config/tokens";
import { useMemo } from "react";
import { Market, MarketsData } from "./types";

export function useMarketsData(chainId: number): MarketsData {
  const { data: marketsCount } = useMulticall(chainId, "useMarkets-count", {
    key: [],
    request: {
      marketStore: {
        contractAddress: getContract(chainId, "MarketStore"),
        abi: MarketStore.abi,
        calls: {
          count: {
            methodName: "getMarketCount",
            params: [],
          },
        },
      },
    },
    parseResponse: (res) => res.marketStore.count.returnValues[0] as number,
  });

  const { data: marketsMap } = useMulticall(chainId, "useMarkets-markets", {
    key: Boolean(marketsCount) && [marketsCount],
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "MarketStore"), 0, marketsCount],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const wrappedToken = getWrappedToken(chainId);

      const marketsMap: { [address: string]: Market } = {};

      for (let market of res.reader.markets.returnValues) {
        const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = market;

        try {
          marketsMap[marketTokenAddress] = {
            marketTokenAddress,
            indexTokenAddress,
            longTokenAddress,
            shortTokenAddress,
            isIndexWrapped: indexTokenAddress === wrappedToken.address,
            isLongWrapped: longTokenAddress === wrappedToken.address,
            isShortWrapped: shortTokenAddress === wrappedToken.address,
            data,
            // TODO: store in configs?
            perp: "USD",
          };
        } catch (e) {
          // ignore parsing errors on unknown tokens
        }
      }

      return marketsMap;
    },
  });

  return useMemo(() => {
    return marketsMap || {};
  }, [marketsMap]);
}
