import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { useMarketVolumes } from "./marketVolumes";
import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

export type AccountMarketRow = {
  market: string;
  totalVolume: bigint;
  whaleVolume: bigint;
  shareBps: bigint;
};

const ACCOUNT_MARKETS_QUERY = gql`
  query AccountMarkets($account: String!) {
    positions(where: { account_eq: $account }, orderBy: maxSize_DESC, limit: 500) {
      market
    }
  }
`;

type RawMarketVolume = { market: string; whaleVolume: bigint };

export function useAccountMarketBreakdown(
  chainId: number,
  account: string | undefined,
  window: WhaleWindow
): { rows: AccountMarketRow[]; isLoading: boolean } {
  const { data: marketVolumes } = useMarketVolumes(chainId, window);

  const { data, isLoading } = useSWR<RawMarketVolume[]>(
    account ? ["whaleAccountMarkets", chainId, account, window] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !account) return [];
      const res = await client.query<{ positions: { market: string }[] }>({
        query: ACCOUNT_MARKETS_QUERY,
        variables: { account },
        fetchPolicy: "no-cache",
      });
      const markets = [...new Set((res.data?.positions ?? []).map((p) => p.market))];
      const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
      return Promise.all(
        markets.map(async (market) => {
          const whaleVolume = await fetchAccountMarketVolume(client, { account, market, fromTimestamp });
          return { market, whaleVolume };
        })
      );
    },
    {
      refreshInterval: 60_000,
    }
  );

  const rows: AccountMarketRow[] = (data ?? [])
    .map((r) => {
      const totalVolume = marketVolumes?.[r.market] ?? 0n;
      return {
        market: r.market,
        totalVolume,
        whaleVolume: r.whaleVolume,
        shareBps: computeShareBps(r.whaleVolume, totalVolume),
      };
    })
    .sort((a, b) => (a.whaleVolume < b.whaleVolume ? 1 : a.whaleVolume > b.whaleVolume ? -1 : 0));

  return { rows, isLoading };
}
