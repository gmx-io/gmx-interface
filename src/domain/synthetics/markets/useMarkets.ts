import { getContract } from "config/contracts";
import MarketStore from "abis/MarketStore.json";
import { useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { ethers } from "ethers";
import { MarketsData, SyntheticsMarket } from "./types";
import { getToken } from "config/tokens";

export function useMarkets(chainId: number): MarketsData {
  const { data: marketsCountResult } = useMulticall(chainId, [], {
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
  });

  const count = Number(marketsCountResult?.marketStore.count.returnValues[0]);

  const { data: marketKeysResult } = useMulticall(chainId, count > 0 ? [count] : null, {
    marketStore: {
      contractAddress: getContract(chainId, "MarketStore"),
      abi: MarketStore.abi,
      calls: {
        marketKeys: {
          methodName: "getMarketKeys",
          params: [0, count],
        },
      },
    },
  });

  const marketKeys = marketKeysResult?.marketStore.marketKeys.returnValues || [];

  const { data: marketsResult } = useMulticall(chainId, marketKeys.length > 0 ? marketKeys : null, {
    marketStore: {
      contractAddress: getContract(chainId, "MarketStore"),
      abi: MarketStore.abi,
      calls: marketKeys.reduce((acc, marketKey) => {
        acc[marketKey] = {
          methodName: "get",
          params: [marketKey],
        };

        return acc;
      }, {}),
    },
  });

  const result = useMemo(() => {
    if (!marketsResult) {
      return {
        markets: {},
      };
    }

    const marketsMap = Object.keys(marketsResult.marketStore).reduce((acc, marketKey) => {
      const marketValues = marketsResult.marketStore[marketKey].returnValues;

      acc[marketKey] = {
        marketTokenAddress: marketValues[0],
        indexTokenAddress: toUnwrappedNativeToken(chainId, marketValues[1]),
        longTokenAddress: toUnwrappedNativeToken(chainId, marketValues[2]),
        shortTokenAddress: toUnwrappedNativeToken(chainId, marketValues[3]),
        data: marketValues[4],
      };

      return acc;
    }, {} as { [marketAddress: string]: SyntheticsMarket });

    return {
      markets: marketsMap,
    };
  }, [marketsResult, chainId]);

  return result;
}

function toUnwrappedNativeToken(chainId: number, address: string) {
  // TODO: invalid token address in Fuji
  try {
    const token = getToken(chainId, address);

    if (token.isWrapped) return ethers.constants.AddressZero;

    return address;
  } catch (e) {
    return ethers.constants.AddressZero;
  }
}
