import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import TokenAbi from "abis/Token.json";
import { getContract } from "config/contracts";
import { getCorrectTokenAddress, getTokenBySymbol } from "config/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { useMemo } from "react";
import { getTokenData, TokenData, useWhitelistedTokensData } from "domain/synthetics/tokens";
import { MarketTokensData } from "./types";
import { useMarketsData } from "./useMarketsData";
import { getMarket } from "./utils";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

export function useMarketTokensData(chainId: number): MarketTokensData {
  const { account } = useWeb3React();

  const dataStoreAddress = getContract(chainId, "DataStore");

  const tokensData = useWhitelistedTokensData(chainId);
  const marketsData = useMarketsData(chainId);

  const marketAddresses = Object.keys(marketsData);

  const requests = useMemo(() => {
    return marketAddresses.reduce((requests: MulticallRequestConfig<any>, marketAddress: string) => {
      const market = getMarket(marketsData, marketAddress)!;

      const longToken = getTokenData(tokensData, market.longTokenAddress);
      const shortToken = getTokenData(tokensData, market.shortTokenAddress);
      const indexToken = getTokenData(tokensData, market.indexTokenAddress);

      const longPrice = formatPrices(longToken);
      const shortPrice = formatPrices(shortToken);
      const indexPrice = formatPrices(indexToken);

      const includePrices = Boolean(longPrice && shortPrice && indexPrice);

      if (includePrices) {
        const marketProps = {
          marketToken: market.marketTokenAddress,
          longToken: getCorrectTokenAddress(chainId, market.longTokenAddress, "wrapped"),
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
              params: [dataStoreAddress, marketProps, longPrice, shortPrice, indexPrice, false],
            },
            maxPrice: {
              methodName: "getMarketTokenPrice",
              params: [dataStoreAddress, marketProps, longPrice, shortPrice, indexPrice, true],
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
    }, {});
  }, [account, chainId, dataStoreAddress, marketAddresses, marketsData, tokensData]);

  const reqKeys = Object.keys(requests).join("-");

  const { data: marketTokensData } = useMulticall(chainId, "useMarketTokensData", {
    key: reqKeys.length > 0 ? [account, reqKeys] : null,
    request: requests,
    parseResponse: (res) =>
      marketAddresses.reduce((marketTokensMap: MarketTokensData, marketAddress: string) => {
        const pricesData = res[`${marketAddress}-prices`];
        const tokenData = res[`${marketAddress}-tokenData`];
        const tokenConfig = getTokenBySymbol(chainId, "GM");

        marketTokensMap[marketAddress] = {
          ...tokenConfig,
          address: marketAddress,
          prices: pricesData
            ? {
                minPrice: pricesData.minPrice.returnValues[0] || expandDecimals(1, USD_DECIMALS),
                maxPrice: pricesData.maxPrice.returnValues[0] || expandDecimals(1, USD_DECIMALS),
              }
            : undefined,
          totalSupply: tokenData?.totalSupply.returnValues[0],
          balance: tokenData?.balance?.returnValues[0],
        };

        return marketTokensMap;
      }, {} as MarketTokensData),
  });

  return useMemo(() => {
    return marketTokensData || {};
  }, [marketTokensData]);
}

function formatPrices(token?: TokenData) {
  if (!token?.prices) return undefined;

  return {
    min: token.prices.minPrice.div(expandDecimals(1, token.decimals)),
    max: token.prices.maxPrice.div(expandDecimals(1, token.decimals)),
  };
}
