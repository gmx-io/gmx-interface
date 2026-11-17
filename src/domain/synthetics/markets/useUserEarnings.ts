import { useMemo } from "react";
import useSWR from "swr";

import { USD_DECIMALS } from "config/factors";
import { getIndexerUrl } from "config/indexers";
import { useGmxSdk } from "context/GmxSdkContext/GmxSdkContext";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GMX_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { bigMath } from "sdk/utils/bigmath";

import { UserEarningsData } from "./types";
import { useGmMarketsApy } from "./useGmMarketsApy";
import { useMarketsInfoRequest } from "./useMarketsInfoRequest";
import { useMarketTokensData } from "./useMarketTokensData";
import { useTokensDataRequest } from "../tokens";

type MarketEarnings = { total: bigint; recent: bigint };

export const useUserEarnings = (chainId: ContractsChainId, srcChainId: SourceChainId | undefined) => {
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: true });
  const sdk = useGmxSdk(chainId);
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const marketAddresses = useMemo(
    () => Object.keys(marketsInfoData || {}).filter((address) => !marketsInfoData![address].isDisabled),
    [marketsInfoData]
  );

  const { account } = useWallet();
  const { marketsTokensApyData, isLoading: isMarketsTokensApyLoading } = useGmMarketsApy(chainId, srcChainId, {
    period: "7d",
  });

  const isSupported = Boolean(sdk) && Boolean(getIndexerUrl(chainId, "syntheticsStats"));
  const key = isSupported && account ? ["gmUserEarnings", chainId, account] : null;

  const { data, error, isLoading } = useSWR<Record<string, MarketEarnings> | null>(key, {
    fetcher: async () => {
      if (!account || !sdk) {
        return null;
      }

      const response = await sdk.fetchGmUserEarnings({ account });
      const byMarketAddress: Record<string, MarketEarnings> = {};

      for (const pool of response.pools) {
        byMarketAddress[pool.marketToken] = {
          total: BigInt(pool.lifetimeFeeUsd),
          recent: BigInt(pool.recent7dFeeUsd),
        };
      }

      return byMarketAddress;
    },
  });

  const areDependenciesLoading = !marketTokensData || !marketsInfoData;
  const isDataLoading = isLoading || areDependenciesLoading;
  const userEarnings = useMemo(() => {
    if (!data) {
      return null;
    }

    const result: UserEarningsData = {
      byMarketAddress: {},
      allMarkets: {
        total: 0n,
        recent: 0n,
        expected365d: 0n,
      },
    };

    for (const [marketAddress, earnings] of Object.entries(data)) {
      result.byMarketAddress[marketAddress] = { ...earnings, expected365d: 0n };
      result.allMarkets.total = result.allMarkets.total + earnings.total;
      result.allMarkets.recent = result.allMarkets.recent + earnings.recent;
    }

    if (!marketsTokensApyData || !marketTokensData) {
      return result;
    }

    marketAddresses.forEach((marketAddress) => {
      const apy = marketsTokensApyData[marketAddress];
      const token = marketTokensData[marketAddress];
      const balance = multichainMarketTokensBalances[marketAddress]?.totalBalance ?? token?.balance;

      if (apy === undefined || balance === undefined || balance === 0n) return;

      const price = token.prices.maxPrice;
      const marketExpected365d = bigMath.mulDiv(apy * balance, price, expandDecimals(1, GMX_DECIMALS + USD_DECIMALS));

      result.allMarkets.expected365d = result.allMarkets.expected365d + marketExpected365d;

      const marketEarnings = result.byMarketAddress[marketAddress];

      if (marketEarnings || marketExpected365d > 0n) {
        result.byMarketAddress[marketAddress] = {
          total: marketEarnings?.total ?? 0n,
          recent: marketEarnings?.recent ?? 0n,
          expected365d: marketExpected365d,
        };
      }
    });

    return result;
  }, [data, marketAddresses, marketsTokensApyData, marketTokensData, multichainMarketTokensBalances]);
  const isUnavailable = Boolean(key && !isDataLoading && (error || data === null));
  const isEstimated365dFeesLoading = Boolean(userEarnings && !marketsTokensApyData && isMarketsTokensApyLoading);
  const isEstimated365dFeesUnavailable = Boolean(userEarnings && !marketsTokensApyData && !isMarketsTokensApyLoading);

  return {
    userEarnings,
    isLoading: isDataLoading,
    isUnavailable,
    isEstimated365dFeesLoading,
    isEstimated365dFeesUnavailable,
  };
};
