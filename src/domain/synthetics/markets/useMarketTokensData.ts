import { useWeb3React } from "@web3-react/core";
import SyntheticsReader from "abis/SyntheticsReader.json";
import TokenAbi from "abis/Token.json";
import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_DEPOSITS_KEY, MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { getTokenBySymbol } from "config/tokens";
import { TokensData, useAvailableTokensData } from "domain/synthetics/tokens";
import { USD_DECIMALS } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";

type MarketTokensDataResult = {
  marketTokensData?: TokensData;
};

export function useMarketTokensData(chainId: number, p: { isDeposit: boolean }): MarketTokensDataResult {
  const { isDeposit } = p;
  const { account } = useWeb3React();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const isDataLoaded = tokensData && marketsAddresses?.length;

  const { data } = useMulticall(chainId, "useMarketTokensData", {
    key: isDataLoaded ? [account, marketsAddresses.join("-")] : undefined,
    request: () =>
      marketsAddresses!.reduce((requests, marketAddress) => {
        const market = getByKey(marketsData, marketAddress)!;
        const marketPrices = getContractMarketPrices(tokensData!, market);

        if (marketPrices) {
          const marketProps = {
            marketToken: market.marketTokenAddress,
            longToken: market.longTokenAddress,
            shortToken: market.shortTokenAddress,
            indexToken: market.indexTokenAddress,
          };

          const pnlFactorType = isDeposit ? MAX_PNL_FACTOR_FOR_DEPOSITS_KEY : MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY;

          requests[`${marketAddress}-prices`] = {
            contractAddress: getContract(chainId, "SyntheticsReader"),
            abi: SyntheticsReader.abi,
            calls: {
              minPrice: {
                methodName: "getMarketTokenPrice",
                params: [
                  getContract(chainId, "DataStore"),
                  marketProps,
                  marketPrices.indexTokenPrice,
                  marketPrices.longTokenPrice,
                  marketPrices.shortTokenPrice,
                  pnlFactorType,
                  false,
                ],
              },
              maxPrice: {
                methodName: "getMarketTokenPrice",
                params: [
                  getContract(chainId, "DataStore"),
                  marketProps,
                  marketPrices.indexTokenPrice,
                  marketPrices.longTokenPrice,
                  marketPrices.shortTokenPrice,
                  pnlFactorType,
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
      marketsAddresses!.reduce((marketTokensMap: TokensData, marketAddress: string) => {
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
      }, {} as TokensData),
  });

  return {
    marketTokensData: data,
  };
}
