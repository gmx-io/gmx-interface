import { ApolloClient, gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps } from "./shares";
import { fetchMarketTraderVolumes } from "./whaleVolume";

export type MarketHolder = { account: string; size: bigint };

export type MarketConcentration = {
  topHolder: string | undefined;
  topShareBps: bigint;
  top3ShareBps: bigint;
};

// High enough to capture (essentially) all open positions, so the open-interest
// denominator — and therefore the share — is identical on the overview and the
// market detail page.
const HOLDERS_LIMIT = 1000;

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

export async function fetchMarketConcentration(
  client: ApolloClient<unknown>,
  market: string
): Promise<MarketConcentration> {
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
}

// Concentration for many markets at once (one query per market, run
// concurrently) so the overview can rank markets by concentration.
export function useMarketsConcentration(
  chainId: number,
  markets: string[]
): { data: Record<string, MarketConcentration> | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<Record<string, MarketConcentration>>(
    markets.length ? ["whaleMarketsConcentration", chainId, markets.join(",")] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client) return {};
      const entries = await Promise.all(
        markets.map(async (market) => {
          try {
            return [market, await fetchMarketConcentration(client, market)] as const;
          } catch {
            return [market, undefined] as const;
          }
        })
      );
      return Object.fromEntries(entries.filter((e): e is readonly [string, MarketConcentration] => e[1] !== undefined));
    },
    { refreshInterval: 300_000 }
  );

  return { data, isLoading };
}

export type MarketHolderRow = { account: string; size: bigint; oiShareBps: bigint; volume: bigint };

// Market detail: holders ranked by current open size (same metric as the
// overview's concentration), annotated with each holder's traded volume for the
// selected window.
export function useMarketHolders(
  chainId: number,
  market: string | undefined,
  window: WhaleWindow,
  displayCount: number
): { rows: MarketHolderRow[]; totalOi: bigint | undefined; totalVolume: bigint | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<{ rows: MarketHolderRow[]; totalOi: bigint; totalVolume: bigint }>(
    market ? ["whaleMarketHolders", chainId, market, window, displayCount] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !market) return { rows: [], totalOi: 0n, totalVolume: 0n };
      const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));

      const [sizeRes, traderVolumes] = await Promise.all([
        client.query<{ positions: { account: string; sizeInUsd: string }[] }>({
          query: TOP_HOLDERS_BY_SIZE,
          variables: { market, limit: HOLDERS_LIMIT },
          fetchPolicy: "no-cache",
        }),
        fetchMarketTraderVolumes(client, { market, fromTimestamp }),
      ]);

      const holders = aggregateHoldersBySize(sizeRes.data?.positions ?? []);
      const totalOi = holders.reduce((acc, h) => acc + h.size, 0n);
      const sizeMap = new Map(holders.map((h) => [h.account, h.size]));

      // Candidates: top by traded volume (surfaces high-churn whales the open-size
      // ranking misses) unioned with the top current open-interest holders.
      const topByVolume = [...traderVolumes.volumes.entries()]
        .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
        .slice(0, displayCount)
        .map(([account]) => account);
      const topBySize = holders.slice(0, displayCount).map((h) => h.account);
      const candidates = [...new Set([...topByVolume, ...topBySize])];

      const rows = candidates.map((account) => {
        const size = sizeMap.get(account) ?? 0n;
        return {
          account,
          size,
          oiShareBps: computeShareBps(size, totalOi),
          volume: traderVolumes.volumes.get(account) ?? 0n,
        };
      });

      return { rows, totalOi, totalVolume: traderVolumes.total };
    },
    { refreshInterval: 60_000 }
  );

  return { rows: data?.rows ?? [], totalOi: data?.totalOi, totalVolume: data?.totalVolume, isLoading };
}
