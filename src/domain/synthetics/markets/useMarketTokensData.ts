import { useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { getContract } from "config/contracts";
import {
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
  multichainBalanceKey,
} from "config/dataStore";
// Warning: do not import through reexport, it will break jest
import { USD_DECIMALS } from "config/factors";
import { selectGlvInfo, selectGlvs } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { getBalanceTypeFromSrcChainId, TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
import { ContractCallsConfig, useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { getByKey } from "lib/objects";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { isGlvEnabled } from "./glv";
import { GlvInfoData } from "./types";
import { useMarkets } from "./useMarkets";
import { getContractMarketPrices } from "./utils";

type MarketTokensDataResult = {
  marketTokensData?: TokensData;
};

export function useMarketTokensDataRequest(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  p: {
    isDeposit: boolean;
    account?: string;
    glvData?: GlvInfoData;
    /**
     * @default true
     */
    withGlv?: boolean;
  }
): MarketTokensDataResult {
  const { isDeposit, account, glvData = {}, withGlv = true } = p;
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsData, marketsAddresses } = useMarkets(chainId);
  const { resetTokensBalancesUpdates } = useTokensBalancesUpdates();

  let isGlvTokensLoaded;

  if (withGlv === false) {
    isGlvTokensLoaded = true;
  } else {
    isGlvTokensLoaded = isGlvEnabled(chainId) ? Object.values(glvData).length > 0 : true;
  }

  const isDataLoaded = tokensData && marketsAddresses?.length && isGlvTokensLoaded;

  const { data: marketTokensData } = useMulticall(chainId, "useMarketTokensData", {
    key: isDataLoaded ? [account, marketsAddresses.join("-")] : undefined,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
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
            abiId: "SyntheticsReader",
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
          } satisfies ContractCallsConfig<any>;
        }

        requests[`${marketAddress}-tokenData`] = {
          contractAddress: marketAddress,
          abiId: "Token",
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
        } satisfies ContractCallsConfig<any>;

        if (account) {
          requests[`${marketAddress}-gmxAccountData`] = {
            contractAddress: getContract(chainId, "DataStore"),
            abiId: "DataStore",
            calls: {
              balance: {
                methodName: "getUint",
                params: [multichainBalanceKey(account, marketAddress)],
              },
            },
          } satisfies ContractCallsConfig<any>;
        }

        return requests;
      }, {}),
    parseResponse: (res) =>
      marketsAddresses!.reduce((marketTokensMap: TokensData, marketAddress: string) => {
        const pricesErrors = res.errors[`${marketAddress}-prices`];
        const tokenDataErrors = res.errors[`${marketAddress}-tokenData`];

        const pricesData = res.data[`${marketAddress}-prices`];
        const tokenData = res.data[`${marketAddress}-tokenData`];
        const gmxAccountData = res.data[`${marketAddress}-gmxAccountData`];

        if (pricesErrors || tokenDataErrors || !pricesData || !tokenData) {
          return marketTokensMap;
        }

        const tokenConfig = getTokenBySymbol(chainId, "GM");

        const minPrice = BigInt(pricesData?.minPrice.returnValues[0]);
        const maxPrice = BigInt(pricesData?.maxPrice.returnValues[0]);

        const walletBalance =
          account && tokenData.balance?.returnValues ? BigInt(tokenData?.balance?.returnValues[0]) : undefined;
        const gmxAccountBalance =
          account && gmxAccountData?.balance?.returnValues
            ? BigInt(gmxAccountData?.balance?.returnValues[0])
            : undefined;
        const balance = srcChainId !== undefined ? gmxAccountBalance : walletBalance;

        marketTokensMap[marketAddress] = {
          ...tokenConfig,
          address: marketAddress,
          prices: {
            minPrice: minPrice !== undefined && minPrice > 0 ? minPrice : expandDecimals(1, USD_DECIMALS),
            maxPrice: maxPrice !== undefined && maxPrice > 0 ? maxPrice : expandDecimals(1, USD_DECIMALS),
          },
          totalSupply: BigInt(tokenData?.totalSupply.returnValues[0]),
          walletBalance,
          gmxAccountBalance,
          balanceType: getBalanceTypeFromSrcChainId(srcChainId),
          balance,
          explorerUrl: `${getExplorerUrl(chainId)}/token/${marketAddress}`,
        };

        resetTokensBalancesUpdates(Object.keys(marketTokensMap));

        return marketTokensMap;
      }, {} as TokensData),
  });

  const gmAndGlvMarketTokensData = useMemo(() => {
    if (!marketTokensData || !glvData || Object.values(glvData).length === 0 || !withGlv) {
      return marketTokensData;
    }

    const result = { ...marketTokensData };
    Object.values(glvData).forEach((glvMarket) => {
      result[glvMarket.glvTokenAddress] = glvMarket.glvToken;
    });

    return result;
  }, [marketTokensData, glvData, withGlv]);

  const updatedGmAndGlvMarketTokensData = useUpdatedTokensBalances(gmAndGlvMarketTokensData);

  return {
    marketTokensData: updatedGmAndGlvMarketTokensData,
  };
}

export function useMarketTokensData(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  p: { isDeposit: boolean; withGlv?: boolean; glvData?: GlvInfoData }
): MarketTokensDataResult {
  const { isDeposit } = p;
  const account = useSelector((s) => s.globals.account);
  const storedGlvData = useSelector(selectGlvInfo);
  const glvs = useSelector(selectGlvs);

  const glvData = p.glvData || storedGlvData;

  return useMarketTokensDataRequest(chainId, srcChainId, {
    isDeposit,
    account,
    glvData: glvData,
    withGlv: glvs?.length ? p.withGlv : false,
  });
}
