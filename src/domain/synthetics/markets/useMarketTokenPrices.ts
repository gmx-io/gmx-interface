import { useMulticall } from "lib/multicall";
import { useMarkets } from "./useMarkets";
import { getMarkets } from "./utils";
import { useTokenConfigs } from "../tokens/useTokenConfigs";
import Reader from "abis/SyntheticsReader.json";
import { useTokenRecentPrices } from "../tokens/useTokenRecentPrices";
import { getContract } from "config/contracts";
import { ContractCallsConfig } from "lib/multicall/types";
import { getTokenPriceData } from "../tokens/utils";
import { useMemo } from "react";
import { TokenPriceData } from "../tokens/types";
import { ethers } from "ethers";
import { MarketTokenPricesData } from "./types";
import { getWrappedToken } from "config/tokens";
import { expandDecimals } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";

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
      const longPrice = formatPriceData(getTokenPriceData(tokensData, market.longTokenAddress));
      const shortPrice = formatPriceData(getTokenPriceData(tokensData, market.shortTokenAddress));
      const indexPrice = formatPriceData(getTokenPriceData(tokensData, market.indexTokenAddress));

      if (!longPrice || !shortPrice || !indexPrice) {
        return acc;
      }

      // TODO: not format?
      const marketProps = {
        marketToken: market.marketTokenAddress,
        longToken: toWrappedNativeToken(chainId, market.longTokenAddress),
        shortToken: toWrappedNativeToken(chainId, market.shortTokenAddress),
        indexToken: toWrappedNativeToken(chainId, market.indexTokenAddress),
        data: market.data,
      };

      acc[market.marketTokenAddress] = {
        methodName: "getMarketTokenPrice",
        params: [dataStoreAddress, marketProps, longPrice, shortPrice, indexPrice, p.maximize],
      };

      return acc;
    }, {} as ContractCallsConfig["calls"]);
  }, [tokenPricesData, tokenConfigsData, marketsData, chainId, dataStoreAddress, p.maximize]);

  const needToCall = Object.keys(calls).length > 0;

  const { data } = useMulticall(chainId, needToCall ? ["useMarketTokenPrices", p.maximize] : null, {
    reader: {
      contractAddress: getContract(chainId, "SyntheticsReader"),
      abi: Reader.abi,
      calls,
    },
  });

  const result = useMemo(() => {
    if (!data?.reader) {
      return {
        marketTokenPrices: {},
      };
    }

    const marketTokenPrices = Object.keys(data.reader).reduce((acc, marketAddress) => {
      acc[marketAddress] = data.reader[marketAddress].returnValues[0];

      // If poolValue === 0 then marketPrice === 0
      if (acc[marketAddress].eq(0)) {
        acc[marketAddress] = expandDecimals(1, USD_DECIMALS);
      }

      return acc;
    }, {});

    return { marketTokenPrices };
  }, [data]);

  return result;
}

function formatPriceData(price?: TokenPriceData) {
  if (!price) return undefined;

  return {
    min: price.minPrice,
    max: price.maxPrice,
  };
}

function toWrappedNativeToken(chainId: number, address: string) {
  if (address === ethers.constants.AddressZero) {
    const token = getWrappedToken(chainId);

    return token.address;
  }

  return address;
}
