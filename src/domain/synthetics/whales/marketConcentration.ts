import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

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

export type MarketHolderRow = { account: string; size: bigint; oiShareBps: bigint; volume: bigint };

// Market detail: holders ranked by current open size (same metric as the
// overview's concentration), annotated with each holder's traded volume for the
// selected window.
export function useMarketHolders(
  chainId: number,
  market: string | undefined,
  window: WhaleWindow,
  displayCount: number
): { rows: MarketHolderRow[]; totalOi: bigint | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<{ rows: MarketHolderRow[]; totalOi: bigint }>(
    market ? ["whaleMarketHolders", chainId, market, window, displayCount] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !market) return { rows: [], totalOi: 0n };
      const res = await client.query<{ positions: { account: string; sizeInUsd: string }[] }>({
        query: TOP_HOLDERS_BY_SIZE,
        variables: { market, limit: HOLDERS_LIMIT },
        fetchPolicy: "no-cache",
      });
      const holders = aggregateHoldersBySize(res.data?.positions ?? []);
      const totalOi = holders.reduce((acc, h) => acc + h.size, 0n);
      const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
      const rows = await Promise.all(
        holders.slice(0, displayCount).map(async (h) => ({
          account: h.account,
          size: h.size,
          oiShareBps: computeShareBps(h.size, totalOi),
          volume: await fetchAccountMarketVolume(client, { account: h.account, market, fromTimestamp }),
        }))
      );
      return { rows, totalOi };
    },
    { refreshInterval: 60_000 }
  );

  return { rows: data?.rows ?? [], totalOi: data?.totalOi, isLoading };
}
