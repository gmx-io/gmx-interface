import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import type { WhaleWindow } from "./period";

const MARKET_VOLUMES_QUERY = gql`
  query MarketVolumes($period: String!) {
    positionsVolume(where: { period: $period }) {
      market
      volume
    }
  }
`;

export function parseMarketVolumes(rows: { market: string; volume: string }[]): Record<string, bigint> {
  const out: Record<string, bigint> = {};
  for (const row of rows) {
    out[row.market] = BigInt(row.volume);
  }
  return out;
}

export function useMarketVolumes(
  chainId: number,
  window: WhaleWindow
): { data: Record<string, bigint> | undefined; isLoading: boolean } {
  const { data, isLoading } = useSWR<Record<string, bigint>>(
    ["whaleMarketVolumes", chainId, window],
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client) return {};
      const res = await client.query<{ positionsVolume: { market: string; volume: string }[] }>({
        query: MARKET_VOLUMES_QUERY,
        variables: { period: window },
        fetchPolicy: "no-cache",
      });
      return parseMarketVolumes(res.data?.positionsVolume ?? []);
    },
    {
      refreshInterval: 60_000,
    }
  );

  return { data, isLoading };
}
