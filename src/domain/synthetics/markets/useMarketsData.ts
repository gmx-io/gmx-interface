import { getContract } from "config/contracts";
import DataStore from "abis/DataStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { useEffect, useMemo, useState } from "react";
import { MarketsData } from "./types";
import { MARKET_LIST_KEY } from "config/dataStore";

type MarketsDataResult = {
  marketsData: MarketsData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

export function useMarketsData(chainId: number): MarketsDataResult {
  const [marketsData, setMarketsData] = useState<MarketsData>({});
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(DEFAULT_COUNT);

  const { data, isLoading } = useMulticall(chainId, "useMarketsData", {
    key: [startIndex, endIndex],
    request: () => ({
      marketStore: {
        contractAddress: getContract(chainId, "DataStore"),
        abi: DataStore.abi,
        calls: {
          count: {
            methodName: "getAddressCount",
            params: [MARKET_LIST_KEY],
          },
        },
      },
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
      const count = Number(res.marketStore.count.returnValues[0]);
      const markets = res.reader.markets.returnValues;

      return {
        count,
        marketsData: markets.reduce((acc: MarketsData, market) => {
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
        }, {} as MarketsData),
      };
    },
  });

  useEffect(() => {
    if (data?.count && data.count > endIndex) {
      setStartIndex(endIndex);
      setEndIndex(data.count);
    }

    if (data?.marketsData) {
      setMarketsData((old) => ({
        ...old,
        ...data.marketsData,
      }));
    }
  }, [data?.count, data?.marketsData, endIndex]);

  return useMemo(() => {
    return {
      marketsData,
      isLoading,
    };
  }, [isLoading, marketsData]);
}
