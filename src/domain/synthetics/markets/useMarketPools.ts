import { useMarkets } from "./useMarkets";
import { useMemo } from "react";
import { MarketPoolsData, MarketPoolType, SyntheticsMarket } from "./types";
import { getContract } from "config/contracts";
import { ContractCallsConfig } from "lib/multicall/types";
import { getMarket } from "./utils";
import Reader from "abis/SyntheticsReader.json";
import { useMulticall } from "lib/multicall";

export function useMarketPools(chainId: number): MarketPoolsData {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const marketsData = useMarkets(chainId);

  const calls = useMemo(() => {
    return Object.keys(marketsData.markets).reduce((acc, marketAddress) => {
      const market = getMarket(marketsData, marketAddress)!;

      acc[formatPoolKey(market, MarketPoolType.Long)] = {
        methodName: "getPoolAmount",
        params: [dataStoreAddress, market.marketTokenAddress, market.longTokenAddress],
      };

      acc[formatPoolKey(market, MarketPoolType.Short)] = {
        methodName: "getPoolAmount",
        params: [dataStoreAddress, market.marketTokenAddress, market.shortTokenAddress],
      };

      return acc;
    }, {} as ContractCallsConfig["calls"]);
  }, [dataStoreAddress, marketsData]);

  const marketKeys = Object.keys(marketsData.markets).join("-");

  const { data } = useMulticall(chainId, ["useMarketPools", marketKeys], {
    reader: {
      contractAddress: getContract(chainId, "SyntheticsReader"),
      abi: Reader.abi,
      calls,
    },
  });

  const result: MarketPoolsData = useMemo(() => {
    if (!data?.reader) {
      return {
        marketPools: {},
      };
    }

    const marketPools = Object.keys(data.reader).reduce((acc, key) => {
      const { marketAddress, tokenAddress } = parsePoolKey(key);

      acc[marketAddress] = acc[marketAddress] || {};

      acc[marketAddress][tokenAddress] = data.reader[key].returnValues[0];

      return acc;
    }, {});

    return {
      marketPools,
    };
  }, [data]);

  return result;
}

export function formatPoolKey(market: SyntheticsMarket, poolType: MarketPoolType) {
  const poolTokenAddress = poolType === MarketPoolType.Long ? market.longTokenAddress : market.shortTokenAddress;

  return `${market.marketTokenAddress}-${poolType}-${poolTokenAddress}`;
}

export function parsePoolKey(key: string) {
  const [marketAddress, poolType, tokenAddress] = key.split("-");

  return { marketAddress, poolType, tokenAddress };
}
