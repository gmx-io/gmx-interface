import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { computeShareBps } from "./shares";

export type MarketHolder = { account: string; size: bigint };

export type MarketConcentration = {
  topHolder: string | undefined;
  topShareBps: bigint;
  top3ShareBps: bigint;
};

const HOLDERS_LIMIT = 50;

// Cheap, window-independent concentration snapshot: a single ranked `positions`
// query per market (current open size), no per-account positionChange sums.
const TOP_HOLDERS_BY_SIZE = gql`
  query MarketTopHolders($market: String!, $limit: Int!) {
    positions(where: { market_eq: $market, isSnapshot_eq: false }, orderBy: sizeInUsd_DESC, limit: $limit) {
      account
      sizeInUsd
    }
  }
`;

export function aggregateHoldersBySize(rows: { account: string; sizeInUsd: string }[]): MarketHolder[] {
  const byAccount = new Map<string, bigint>();
  for (const row of rows) {
    const size = BigInt(row.sizeInUsd);
    byAccount.set(row.account, (byAccount.get(row.account) ?? 0n) + size);
  }
  return [...byAccount.entries()]
    .map(([account, size]) => ({ account, size }))
    .sort((a, b) => (a.size < b.size ? 1 : a.size > b.size ? -1 : 0));
}

export function useMarketConcentration(
  chainId: number,
  market: string | undefined
): { data: MarketConcentration | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<MarketConcentration | undefined>(
    market ? ["whaleMarketConcentration", chainId, market] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !market) return undefined;
      const res = await client.query<{ positions: { account: string; sizeInUsd: string }[] }>({
        query: TOP_HOLDERS_BY_SIZE,
        variables: { market, limit: HOLDERS_LIMIT },
        fetchPolicy: "no-cache",
      });
      const holders = aggregateHoldersBySize(res.data?.positions ?? []);
      const total = holders.reduce((acc, h) => acc + h.size, 0n);
      const top3 = holders.slice(0, 3).reduce((acc, h) => acc + h.size, 0n);
      return {
        topHolder: holders[0]?.account,
        topShareBps: computeShareBps(holders[0]?.size ?? 0n, total),
        top3ShareBps: computeShareBps(top3, total),
      };
    },
    { refreshInterval: 300_000 }
  );

  return { data, isLoading };
}
