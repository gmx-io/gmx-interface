import { useMemo } from "react";
import useSWR from "swr";

import { USD_DECIMALS } from "config/factors";
import { getIndexerUrl } from "config/indexers";
import { GMX_DECIMALS } from "lib/legacy";
import { expandDecimals } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId, SourceChainId } from "sdk/configs/chains";
import { bigMath } from "sdk/utils/bigmath";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

import { useGmMarketsApy } from "./useGmMarketsApy";
import { useMarketTokensData } from "./useMarketTokensData";

type RawGlvUserEarning = {
  glvAddress: string;
  lifetimeFeeUsd: string;
  recent7dFeeUsd: string;
};

export type GlvUserEarningsData = {
  byGlvAddress: Record<string, { total: bigint; recent: bigint; expected365d: bigint }>;
  allGlvs: { total: bigint; recent: bigint; expected365d: bigint };
};

const GLV_USER_EARNINGS_QUERY = `query ($account: String!) {
  glvUserEarnings(account: $account) {
    glvAddress
    lifetimeFeeUsd
    recent7dFeeUsd
  }
}`;

export function useGlvUserEarnings(chainId: ContractsChainId, srcChainId: SourceChainId | undefined) {
  const { account } = useWallet();
  const subsquidUrl = getIndexerUrl(chainId, "subsquid");

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });
  const { glvApyInfoData, isLoading: isGlvApyLoading } = useGmMarketsApy(chainId, srcChainId, { period: "7d" });

  const key = subsquidUrl && account ? ["glvUserEarnings", chainId, account] : null;

  const { data, error, isLoading } = useSWR<Record<string, { total: bigint; recent: bigint }> | null>(key, {
    fetcher: async () => {
      if (!account || !subsquidUrl) {
        return null;
      }

      const response = await graphqlFetcher<{ glvUserEarnings: RawGlvUserEarning[] }>(
        subsquidUrl,
        GLV_USER_EARNINGS_QUERY,
        { account }
      );

      if (!response) {
        throw new Error("GLV user earnings response is empty");
      }

      const byGlvAddress: Record<string, { total: bigint; recent: bigint }> = {};

      for (const earning of response.glvUserEarnings) {
        byGlvAddress[earning.glvAddress] = {
          total: BigInt(earning.lifetimeFeeUsd),
          recent: BigInt(earning.recent7dFeeUsd),
        };
      }

      return byGlvAddress;
    },
  });

  const glvUserEarnings: GlvUserEarningsData | null = useMemo(() => {
    if (!data) {
      return null;
    }

    const result: GlvUserEarningsData = {
      byGlvAddress: {},
      allGlvs: { total: 0n, recent: 0n, expected365d: 0n },
    };

    for (const [glvAddress, earning] of Object.entries(data)) {
      result.byGlvAddress[glvAddress] = { ...earning, expected365d: 0n };
      result.allGlvs.total += earning.total;
      result.allGlvs.recent += earning.recent;
    }

    if (!glvApyInfoData || !marketTokensData) {
      return result;
    }

    for (const [glvAddress, apy] of Object.entries(glvApyInfoData)) {
      const token = marketTokensData[glvAddress];
      const balance = token?.balance;

      if (apy === undefined || balance === undefined || balance === 0n) continue;

      const price = token.prices.maxPrice;
      const glvExpected365d = bigMath.mulDiv(apy * balance, price, expandDecimals(1, GMX_DECIMALS + USD_DECIMALS));

      result.allGlvs.expected365d += glvExpected365d;

      const glvEarnings = result.byGlvAddress[glvAddress];

      if (glvEarnings || glvExpected365d > 0n) {
        result.byGlvAddress[glvAddress] = {
          total: glvEarnings?.total ?? 0n,
          recent: glvEarnings?.recent ?? 0n,
          expected365d: glvExpected365d,
        };
      }
    }

    return result;
  }, [data, glvApyInfoData, marketTokensData]);

  const isDataLoading = isLoading || !marketTokensData;
  const isUnavailable = Boolean(key && !isDataLoading && (error || data === null));
  const isEstimated365dFeesLoading = Boolean(glvUserEarnings && !glvApyInfoData && isGlvApyLoading);
  const isEstimated365dFeesUnavailable = Boolean(glvUserEarnings && !glvApyInfoData && !isGlvApyLoading);

  return {
    glvUserEarnings,
    isLoading: isDataLoading,
    isUnavailable,
    isEstimated365dFeesLoading,
    isEstimated365dFeesUnavailable,
  };
}
