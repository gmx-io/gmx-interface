import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import TokenAbi from "abis/Token.json";
import { getContract } from "config/contracts";
import { getTokenBySymbol } from "config/tokens";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { useMemo } from "react";
import { MarketTokensData } from "./types";
import { useMarketsData } from "./useMarketsData";
import { getContractMarketPrices, getMarket } from "./utils";

type MarketTokensDataResult = {
  marketTokensData: MarketTokensData;
  isLoading: boolean;
};

export function useMarketTokensData(chainId: number): MarketTokensDataResult {
  const { account } = useWeb3React();
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const isDataLoaded = !isTokensLoading && !isMarketsLoading && marketAddresses.length > 0;

  const { data: marketTokensData, isLoading } = useMulticall(chainId, "useMarketTokensData", {
    key: isDataLoaded ? [account, marketAddresses.join("-")] : undefined,
    request: () =>
      marketAddresses.reduce((requests: MulticallRequestConfig<any>, marketAddress: string) => {
        const market = getMarket(marketsData, marketAddress)!;
        const marketPrices = getContractMarketPrices(marketsData, tokensData, marketAddress);

        if (marketPrices) {
          const marketProps = {
            marketToken: market.marketTokenAddress,
            longToken: market.longTokenAddress,
            shortToken: market.shortTokenAddress,
            indexToken: market.indexTokenAddress,
            data: market.data,
          };

          requests[`${marketAddress}-prices`] = {
            contractAddress: getContract(chainId, "SyntheticsReader"),
            abi: SyntheticsReader.abi,
            calls: {
              minPrice: {
                methodName: "getMarketTokenPrice",
                params: [
                  getContract(chainId, "DataStore"),
                  marketProps,
                  marketPrices.longTokenPrice,
                  marketPrices.shortTokenPrice,
                  marketPrices.indexTokenPrice,
                  false,
                ],
              },
              maxPrice: {
                methodName: "getMarketTokenPrice",
                params: [
                  getContract(chainId, "DataStore"),
                  marketProps,
                  marketPrices.longTokenPrice,
                  marketPrices.shortTokenPrice,
                  marketPrices.indexTokenPrice,
                  true,
                ],
              },
            },
          };
        }

        requests[`${marketAddress}-tokenData`] = {
          contractAddress: marketAddress,
          abi: TokenAbi.abi,
          calls: {
            totalSupply: {
              methodName: "totalSupply",
              params: [],
            },
            balance: account
              ? {
                  methodName: "balanceOf",
                  params: [account],
                }
              : undefined,
          },
        };

        return requests;
      }, {}),
    parseResponse: (res) =>
      marketAddresses.reduce((marketTokensMap: MarketTokensData, marketAddress: string) => {
        const pricesData = res[`${marketAddress}-prices`];
        const tokenData = res[`${marketAddress}-tokenData`];
        const tokenConfig = getTokenBySymbol(chainId, "GM");

        const minPrice = pricesData?.minPrice.returnValues[0];
        const maxPrice = pricesData?.maxPrice.returnValues[0];

        marketTokensMap[marketAddress] = {
          ...tokenConfig,
          address: marketAddress,
          prices: {
            minPrice: minPrice?.gt(0) ? minPrice : expandDecimals(1, USD_DECIMALS),
            maxPrice: maxPrice?.gt(0) ? maxPrice : expandDecimals(1, USD_DECIMALS),
          },
          totalSupply: tokenData?.totalSupply.returnValues[0],
          balance: tokenData?.balance?.returnValues[0],
        };

        return marketTokensMap;
      }, {} as MarketTokensData),
  });

  return useMemo(() => {
    return {
      marketTokensData: marketTokensData || {},
      isLoading,
    };
  }, [isLoading, marketTokensData]);
}
