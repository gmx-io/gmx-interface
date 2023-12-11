import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { BigNumber } from "ethers";
import useSWR from "swr";
import { TokenPricesData } from "./types";
import { useOracleKeeperFetcher } from "./useOracleKeeperFetcher";
import { parseContractPrice } from "./utils";

type TokenPricesDataResult = {
  pricesData?: TokenPricesData;
  updatedAt?: number;
};

export function useTokenRecentPrices(chainId: number): TokenPricesDataResult {
  const oracleKeeperFetcher = useOracleKeeperFetcher(chainId);

  const { data } = useSWR([chainId, oracleKeeperFetcher.oracleKeeperUrl, "useTokenRecentPrices"], {
    fetcher: ([chainId]) =>
      oracleKeeperFetcher.fetchTickers().then((priceItems) => {
        const result: TokenPricesData = {};

        priceItems.forEach((priceItem) => {
          let tokenConfig: any;

          try {
            tokenConfig = getToken(chainId, priceItem.tokenAddress);
          } catch (e) {
            // ignore unknown token errors

            return;
          }

          result[tokenConfig.address] = {
            minPrice: parseContractPrice(BigNumber.from(priceItem.minPrice), tokenConfig.decimals),
            maxPrice: parseContractPrice(BigNumber.from(priceItem.maxPrice), tokenConfig.decimals),
          };
        });

        const wrappedToken = getWrappedToken(chainId);

        if (result[wrappedToken.address] && !result[NATIVE_TOKEN_ADDRESS]) {
          result[NATIVE_TOKEN_ADDRESS] = result[wrappedToken.address];
        }

        return {
          pricesData: result,
          updatedAt: Date.now(),
        };
      }),
    refreshWhenHidden: true,
  });

  return {
    pricesData: data?.pricesData,
    updatedAt: data?.updatedAt,
  };
}
