import { useMemo } from "react";
import useSWR from "swr";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { getIndexerUrl } from "config/indexers";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";
import graphqlFetcher from "sdk/utils/graphqlFetcher";
import { convertToUsd } from "sdk/utils/tokens";

export const GT_DECIMALS = 7;

const GT_AIRDROP_CHAIN_IDS: number[] = [ARBITRUM, AVALANCHE];

const gtAirdropAllocationQuery = /* GraphQL */ `
  query GtAirdropAllocation($account: String!) {
    gtAirdropAllocationById(id: $account) {
      gtAmount
    }
  }
`;

const latestGtPriceQuery = /* GraphQL */ `
  query LatestGtPrice {
    gtPrices(limit: 1, orderBy: timestamp_DESC) {
      priceUsd
    }
  }
`;

export type GtAirdrop = {
  gtAmount: bigint;
  gtAmountUsd: bigint | undefined;
};

export function useGtAirdrop({
  chainId,
  account,
}: {
  chainId: number;
  account: string | undefined;
}): GtAirdrop | undefined {
  const isEnabled = account !== undefined && GT_AIRDROP_CHAIN_IDS.includes(chainId);

  const { data: gtAmount } = useSWR<bigint>(isEnabled ? ["useGtAirdrop", account] : null, {
    // allocations are written once, at the end of the snapshot period
    refreshInterval: 0,
    fetcher: async () => {
      // each chain allocates GT for the GMX staked on it, the airdrop is their sum
      const amounts = await Promise.all(
        GT_AIRDROP_CHAIN_IDS.map(async (airdropChainId) => {
          const url = getIndexerUrl(airdropChainId, "subsquid");
          if (!url) {
            return 0n;
          }

          const res = await graphqlFetcher<{ gtAirdropAllocationById: { gtAmount: string } | null }>(
            url,
            gtAirdropAllocationQuery,
            { account }
          );

          return BigInt(res?.gtAirdropAllocationById?.gtAmount ?? 0);
        })
      );

      return amounts.reduce((acc, amount) => acc + amount, 0n);
    },
  });

  const hasGtAmount = gtAmount !== undefined && gtAmount > 0n;

  const { data: gtPrice } = useSWR<bigint | undefined>(hasGtAmount ? "useGtAirdrop/gtPrice" : null, {
    refreshInterval: CONFIG_UPDATE_INTERVAL,
    fetcher: async () => {
      // only the Arbitrum squid mirrors GT prices from Solana
      const url = getIndexerUrl(ARBITRUM, "subsquid");
      if (!url) {
        return undefined;
      }

      const res = await graphqlFetcher<{ gtPrices: { priceUsd: string }[] }>(url, latestGtPriceQuery);
      const priceUsd = res?.gtPrices[0]?.priceUsd;

      return priceUsd === undefined ? undefined : BigInt(priceUsd);
    },
  });

  return useMemo(
    () => (hasGtAmount ? { gtAmount, gtAmountUsd: convertToUsd(gtAmount, GT_DECIMALS, gtPrice) } : undefined),
    [gtAmount, gtPrice, hasGtAmount]
  );
}
