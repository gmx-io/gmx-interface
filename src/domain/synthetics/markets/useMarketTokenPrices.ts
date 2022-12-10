import Reader from "abis/SyntheticsReader.json";
import { getContract } from "config/contracts";
import { getToken, getWrappedToken } from "config/tokens";
import { BigNumber, ethers } from "ethers";
import { USD_DECIMALS } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { ContractCallConfig } from "lib/multicall/types";
import { expandDecimals } from "lib/numbers";
import { useMemo } from "react";
import { TokenPriceData } from "../tokens/types";
import { useTokenConfigs } from "../tokens/useTokenConfigs";
import { useTokenRecentPrices } from "../tokens/useTokenRecentPrices";
import { getTokenPriceData } from "../tokens/utils";
import { MarketTokenPricesData } from "./types";
import { useMarkets } from "./useMarkets";
import { getMarkets } from "./utils";

export function useMarketTokenPrices(
  chainId: number,
  p: { maximize?: boolean } = { maximize: false }
): MarketTokenPricesData {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const tokenPricesData = useTokenRecentPrices(chainId);
  const tokenConfigsData = useTokenConfigs(chainId);
  const marketsData = useMarkets(chainId);

  const calls = useMemo(() => {
    const tokensData = { ...tokenPricesData, ...tokenConfigsData };
    const markets = getMarkets(marketsData);

    return markets.reduce((acc, market) => {
      const longPrice = formatPriceData(
        chainId,
        market.longTokenAddress,
        getTokenPriceData(tokensData, market.longTokenAddress)
      );
      const shortPrice = formatPriceData(
        chainId,
        market.shortTokenAddress,
        getTokenPriceData(tokensData, market.shortTokenAddress)
      );
      const indexPrice = formatPriceData(
        chainId,
        market.indexTokenAddress,
        getTokenPriceData(tokensData, market.indexTokenAddress)
      );

      if (!longPrice || !shortPrice || !indexPrice) {
        return acc;
      }

      const marketProps = {
        marketToken: market.marketTokenAddress,
        longToken: toWrappedNativeToken(chainId, market.longTokenAddress),
        shortToken: toWrappedNativeToken(chainId, market.shortTokenAddress),
        indexToken: market.indexTokenAddress,
        data: market.data,
      };

      acc[market.marketTokenAddress] = {
        methodName: "getMarketTokenPrice",
        params: [dataStoreAddress, marketProps, longPrice, shortPrice, indexPrice, p.maximize],
      };

      return acc;
    }, {} as { [marketAddress: string]: ContractCallConfig });
  }, [tokenPricesData, tokenConfigsData, marketsData, chainId, dataStoreAddress, p.maximize]);

  const callKeys = Object.keys(calls).join("-");

  const { data: marketTokenPrices } = useMulticall(chainId, "useMarketTokenPrices", {
    key: callKeys.length > 0 ? [p.maximize, callKeys] : null,
    request: {
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: Reader.abi,
        calls,
      },
    },
    parseResponse: (res) => {
      const marketTokenPrices: { [marketAddress: string]: BigNumber } = {};

      Object.keys(res.reader).forEach((marketAddress) => {
        const price = res.reader[marketAddress].returnValues[0];

        marketTokenPrices[marketAddress] = price.gt(0)
          ? price
          : // If pool is empty then market token price === 0
            expandDecimals(1, USD_DECIMALS);
      });

      return marketTokenPrices;
    },
  });

  return useMemo(() => {
    return {
      marketTokenPrices: marketTokenPrices || {},
    };
  }, [marketTokenPrices]);
}

function formatPriceData(chainId: number, address: string, price?: TokenPriceData) {
  if (!price) return undefined;

  const token = getToken(chainId, address);

  return {
    min: price.minPrice.div(expandDecimals(1, token.decimals)),
    max: price.maxPrice.div(expandDecimals(1, token.decimals)),
  };
}

function toWrappedNativeToken(chainId: number, address: string) {
  if (address === ethers.constants.AddressZero) {
    const token = getWrappedToken(chainId);

    return token.address;
  }

  return address;
}
