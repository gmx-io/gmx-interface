import { ApolloClient, gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { useMarketVolumes } from "./marketVolumes";
import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps, rankByVolumeDesc } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

export type WhaleRow = { account: string; volume: bigint; shareBps: bigint; peakSize: bigint };

const TOP_POSITIONS_QUERY = gql`
  query MarketTopPositions($market: String!, $limit: Int!) {
    positions(where: { market_eq: $market, isSnapshot_eq: false }, orderBy: maxSize_DESC, limit: $limit) {
      account
      maxSize
    }
  }
`;

export function dedupeTopCandidates(
  rows: { account: string; maxSize: string }[],
  limit: number
): { account: string; peakSize: bigint }[] {
  const byAccount = new Map<string, bigint>();
  for (const row of rows) {
    const size = BigInt(row.maxSize);
    const prev = byAccount.get(row.account);
    if (prev === undefined || size > prev) byAccount.set(row.account, size);
  }
  return [...byAccount.entries()]
    .map(([account, peakSize]) => ({ account, peakSize }))
    .sort((a, b) => (a.peakSize < b.peakSize ? 1 : a.peakSize > b.peakSize ? -1 : 0))
    .slice(0, limit);
}

export async function fetchMarketTopCandidates(
  client: ApolloClient<unknown>,
  params: { market: string; fetchRows: number; limit: number }
): Promise<{ account: string; peakSize: bigint }[]> {
  const res = await client.query<{ positions: { account: string; maxSize: string }[] }>({
    query: TOP_POSITIONS_QUERY,
    variables: { market: params.market, limit: params.fetchRows },
    fetchPolicy: "no-cache",
  });
  return dedupeTopCandidates(res.data?.positions ?? [], params.limit);
}

export function useMarketWhales(
  chainId: number,
  market: string | undefined,
  window: WhaleWindow,
  displayCount: number
): { rows: WhaleRow[]; totalVolume: bigint | undefined; isLoading: boolean } {
  const { data: marketVolumes } = useMarketVolumes(chainId, window);
  const totalVolume = market ? marketVolumes?.[market] : undefined;

  const { data, isLoading } = useSWR<WhaleRow[]>(
    market ? ["whaleMarketWhales", chainId, market, window, displayCount] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !market) return [];
      // Wide candidate pool by peak size, then re-rank the displayed rows by exact volume.
      const candidates = await fetchMarketTopCandidates(client, {
        market,
        fetchRows: 100,
        limit: 50,
      });
      const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
      const withVolume = await Promise.all(
        candidates.map(async (c) => ({
          account: c.account,
          peakSize: c.peakSize,
          volume: await fetchAccountMarketVolume(client, { account: c.account, market, fromTimestamp }),
        }))
      );
      const total = market ? marketVolumes?.[market] ?? 0n : 0n;
      return rankByVolumeDesc(withVolume)
        .slice(0, displayCount)
        .map((r) => ({ ...r, shareBps: computeShareBps(r.volume, total) }));
    },
    {
      refreshInterval: 60_000,
    }
  );

  return { rows: data ?? [], totalVolume, isLoading };
}
