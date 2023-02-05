import SyntheticsReader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { MarketsData } from "./types";

type MarketsDataResult = {
  marketsData: MarketsData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

export function useMarketsData(chainId: number): MarketsDataResult {
  const startIndex = 0;
  const endIndex = DEFAULT_COUNT;

  const { data, isLoading } = useMulticall(chainId, "useMarketsData", {
    key: [startIndex, endIndex],
    request: () => ({
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "DataStore"), startIndex, endIndex],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const markets = res.reader.markets.returnValues;

      return markets.reduce((acc: MarketsData, market) => {
        const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = market;
        try {
          acc[marketTokenAddress] = {
            marketTokenAddress,
            indexTokenAddress,
            longTokenAddress,
            shortTokenAddress,
            data,
            // TODO: store in configs?
            perp: "USD",
          };
        } catch (e) {
          // ignore parsing errors on unknown tokens
        }

        return acc;
      }, {} as MarketsData);
    },
  });

  return useMemo(() => {
    return {
      marketsData: data || {},
      isLoading,
    };
  }, [data, isLoading]);
}
