import mapValues from "lodash/mapValues";
import { useMemo } from "react";

import { getExplorerUrl } from "config/chains";
import { selectGlvInfo, selectGlvs } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  useTokensBalancesUpdates,
  useUpdatedTokensBalances,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { TokensData, useTokensDataRequest } from "domain/synthetics/tokens";
import { TokenBalanceType } from "domain/tokens";
import { useMulticall } from "lib/multicall";
import { FREQUENT_MULTICALL_REFRESH_INTERVAL } from "lib/timeConstants";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { ProgressiveTokensData } from "sdk/utils/tokens/types";

import { isGlvEnabled } from "./glv";
import { buildMarketTokensDataRequest, parseMarketTokenData } from "./marketTokensDataRequest";
import { GlvInfoData, MarketsData } from "./types";
import { useMarkets } from "./useMarkets";

type MarketTokensDataResult = {
  marketTokensData?: TokensData;
  progressiveMarketTokensData?: ProgressiveTokensData;
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
    enabled?: boolean;
    multichainMarketTokensBalances?: Partial<Record<number, Partial<Record<string, bigint>>>>;
  }
): MarketTokensDataResult {
  const { isDeposit, account, glvData = {}, withGlv = true, enabled = true, multichainMarketTokensBalances } = p;
  const { tokensData } = useTokensDataRequest(chainId, srcChainId, {
    enabled: enabled,
  });
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
    key: isDataLoaded && enabled ? [account, marketsAddresses.join("-")] : undefined,

    refreshInterval: FREQUENT_MULTICALL_REFRESH_INTERVAL,
    clearUnusedKeys: true,
    keepPreviousData: true,

    request: () =>
      buildMarketTokensDataRequest(chainId, {
        marketsAddresses: marketsAddresses!,
        marketsData,
        tokensData: tokensData!,
        isDeposit,
        account,
      }),
    parseResponse: (res) =>
      marketsAddresses!.reduce((marketTokensMap: TokensData, marketAddress: string) => {
        const marketToken = parseMarketTokenData(res, { chainId, srcChainId, account, marketAddress });

        if (!marketToken) {
          return marketTokensMap;
        }

        marketTokensMap[marketAddress] = marketToken;

        resetTokensBalancesUpdates(Object.keys(marketTokensMap), TokenBalanceType.Wallet);
        resetTokensBalancesUpdates(Object.keys(marketTokensMap), TokenBalanceType.GmxAccount);

        return marketTokensMap;
      }, {} as TokensData),
  });

  const gmAndGlvMarketTokensData = useMemo(() => {
    if (!marketTokensData || !glvData || Object.values(glvData).length === 0 || !withGlv) {
      if (!marketTokensData) {
        return undefined;
      }

      if (!multichainMarketTokensBalances || srcChainId === undefined) {
        return marketTokensData;
      }

      return mapValues(marketTokensData, (marketToken) => {
        return {
          ...marketToken,
          sourceChainBalance: multichainMarketTokensBalances[srcChainId]?.[marketToken.address],
        };
      });
    }

    const result = { ...marketTokensData };
    Object.values(glvData).forEach((glvMarket) => {
      result[glvMarket.glvTokenAddress] = glvMarket.glvToken;
    });

    if (multichainMarketTokensBalances && srcChainId !== undefined) {
      return mapValues(result, (marketToken) => {
        return {
          ...marketToken,
          sourceChainBalance: multichainMarketTokensBalances[srcChainId]?.[marketToken.address],
        };
      });
    }

    return result;
  }, [marketTokensData, glvData, withGlv, srcChainId, multichainMarketTokensBalances]);

  const updatedGmAndGlvMarketTokensData = useUpdatedTokensBalances(gmAndGlvMarketTokensData);

  const progressiveMarketTokensData = useMemo(() => {
    if (marketTokensData) {
      return marketTokensData;
    }

    return getProgressiveMarketTokensData(chainId, marketsData);
  }, [chainId, marketsData, marketTokensData]);

  return {
    marketTokensData: updatedGmAndGlvMarketTokensData,
    progressiveMarketTokensData: updatedGmAndGlvMarketTokensData || progressiveMarketTokensData,
  };
}

export function useMarketTokensData(
  chainId: ContractsChainId,
  srcChainId: SourceChainId | undefined,
  p: { isDeposit: boolean; withGlv?: boolean; glvData?: GlvInfoData; enabled?: boolean }
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
    enabled: p.enabled,
  });
}

function getProgressiveMarketTokensData(chainId: ContractsChainId, marketsData: MarketsData | undefined) {
  if (!marketsData) {
    return {};
  }

  const marketsAddresses = Object.keys(marketsData);

  return marketsAddresses.reduce((marketTokensMap: ProgressiveTokensData, marketAddress: string) => {
    const tokenConfig = getTokenBySymbol(chainId, "GM");

    marketTokensMap[marketAddress] = {
      ...tokenConfig,
      address: marketAddress,
      prices: undefined,
      totalSupply: 0n,
      balance: undefined,
      explorerUrl: `${getExplorerUrl(chainId)}/token/${marketAddress}`,
    };

    return marketTokensMap;
  }, {} as ProgressiveTokensData);
}
