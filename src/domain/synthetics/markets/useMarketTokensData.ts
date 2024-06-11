import SyntheticsReader from "abis/SyntheticsReader.json";
import TokenAbi from "abis/Token.json";
import { getExplorerUrl } from "config/chains";
import { getContract } from "config/contracts";
import { MAX_PNL_FACTOR_FOR_DEPOSITS_KEY, MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY } from "config/dataStore";
import { getTokenBySymbol } from "config/tokens";
// Warning: do not import through reexport, it will break jest
import { useSyntheticsStateSelector as useSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
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
  const account = useSelector((s) => s.globals.account);
  const { tokensData, pricesUpdatedAt } = useTokensDataRequest(chainId);
  const { marketsData, marketsAddresses } = useMarkets(chainId);

  const isDataLoaded = tokensData && marketsAddresses?.length;

  const { data } = useMulticall(chainId, "useMarketTokensData", {
    key: isDataLoaded ? [account, marketsAddresses.join("-"), pricesUpdatedAt] : undefined,

    // Refresh on every prices update
    refreshInterval: null,
    clearUnusedKeys: true,
    keepPreviousData: true,

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
        const pricesErrors = res.errors[`${marketAddress}-prices`];
        const tokenDataErrors = res.errors[`${marketAddress}-tokenData`];

        const pricesData = res.data[`${marketAddress}-prices`];
        const tokenData = res.data[`${marketAddress}-tokenData`];

        if (pricesErrors || tokenDataErrors || !pricesData || !tokenData) {
          return marketTokensMap;
        }

        const tokenConfig = getTokenBySymbol(chainId, "GM");

        const minPrice = BigInt(pricesData?.minPrice.returnValues[0]);
        const maxPrice = BigInt(pricesData?.maxPrice.returnValues[0]);

        marketTokensMap[marketAddress] = {
          ...tokenConfig,
          address: marketAddress,
          prices: {
            minPrice: minPrice !== undefined && minPrice > 0 ? minPrice : expandDecimals(1, USD_DECIMALS),
            maxPrice: maxPrice !== undefined && maxPrice > 0 ? maxPrice : expandDecimals(1, USD_DECIMALS),
          },
          totalSupply: BigInt(tokenData?.totalSupply.returnValues[0]),
          balance: account && tokenData.balance?.returnValues ? BigInt(tokenData?.balance?.returnValues[0]) : undefined,
          explorerUrl: `${getExplorerUrl(chainId)}/token/${marketAddress}`,
        };

        return marketTokensMap;
      }, {} as TokensData),
  });

  return {
    marketTokensData: data,
  };
}
