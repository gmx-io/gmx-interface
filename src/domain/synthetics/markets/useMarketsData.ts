import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import SyntheticsReader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";
import { getWrappedToken } from "config/tokens";
import { useEffect, useMemo, useState } from "react";
import { MarketsData } from "./types";

type MarketsDataResult = {
  marketsData: MarketsData;
  isLoading: boolean;
};

const DEFAULT_COUNT = 100;

// TODO: remove this, only for dev chain
export const WHITELISTED_MARKETS = [
  "0x97d68AA108D1Bd6a55Ba1e5ed78D9C90DD3E36fd",
  "0xF8DB7a1a02fB865e7C87b252c19dE51Bd3F14D4D",
  "0xFCD251959FB63BEC22Af8565A99280Da7a8d1F30",
];

export function useMarketsData(chainId: number): MarketsDataResult {
  const [marketsData, setMarketsData] = useState<MarketsData>({});
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(DEFAULT_COUNT);

  const { data, isLoading } = useMulticall(chainId, "useMarketsData", {
    key: [startIndex, endIndex],
    request: () => ({
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
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
        calls: {
          markets: {
            methodName: "getMarkets",
            params: [getContract(chainId, "MarketStore"), startIndex, endIndex],
          },
        },
      },
    }),
    parseResponse: (res) => {
      const count = Number(res.marketStore.count.returnValues[0]);
      const markets = res.reader.markets.returnValues;
      const wrappedToken = getWrappedToken(chainId);

      return {
        count,
        marketsData: markets.reduce((acc: MarketsData, market) => {
          // if (!WHITELISTED_MARKETS.includes(market[0])) return acc;

          const [marketTokenAddress, indexTokenAddress, longTokenAddress, shortTokenAddress, data] = market;
          try {
            acc[marketTokenAddress] = {
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
