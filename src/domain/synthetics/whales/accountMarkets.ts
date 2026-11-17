import { gql } from "@apollo/client";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers/clients";

import { fetchMarketConcentration } from "./marketConcentration";
import { useMarketVolumes } from "./marketVolumes";
import { windowToFromTimestamp, type WhaleWindow } from "./period";
import { computeShareBps } from "./shares";
import { fetchAccountMarketVolume } from "./whaleVolume";

export type AccountMarketRow = {
  market: string;
  totalVolume: bigint;
  whaleVolume: bigint;
  shareBps: bigint; // volume whale share = whaleVolume / market total volume
  whaleOi: bigint;
  totalOi: bigint;
  oiShareBps: bigint; // whaleOi / market total open interest
};

const ACCOUNT_MARKETS_QUERY = gql`
  query AccountMarkets($account: String!) {
    positions(where: { account_eq: $account }, orderBy: maxSize_DESC, limit: 500) {
      market
      sizeInUsd
      isSnapshot
    }
  }
`;

type RawMarket = { market: string; whaleVolume: bigint; whaleOi: bigint; totalOi: bigint };

export function useAccountMarketBreakdown(
  chainId: number,
  account: string | undefined,
  window: WhaleWindow
): { rows: AccountMarketRow[]; isLoading: boolean } {
  const { data: marketVolumes } = useMarketVolumes(chainId, window);

  const { data, isLoading } = useSWR<RawMarket[]>(
    account ? ["whaleAccountMarkets", chainId, account, window] : null,
    async () => {
      const client = getSubsquidGraphClient(chainId);
      if (!client || !account) return [];
      const res = await client.query<{ positions: { market: string; sizeInUsd: string; isSnapshot: boolean }[] }>({
        query: ACCOUNT_MARKETS_QUERY,
        variables: { account },
        fetchPolicy: "no-cache",
      });

      // Current open size (open interest) the account holds per market, from live positions.
      const whaleOiByMarket = new Map<string, bigint>();
      const markets = new Set<string>();
      for (const p of res.data?.positions ?? []) {
        markets.add(p.market);
        if (!p.isSnapshot) {
          whaleOiByMarket.set(p.market, (whaleOiByMarket.get(p.market) ?? 0n) + BigInt(p.sizeInUsd));
        }
      }

      const fromTimestamp = windowToFromTimestamp(window, Math.floor(Date.now() / 1000));
      return Promise.all(
        [...markets].map(async (market) => {
          const [whaleVolume, concentration] = await Promise.all([
            fetchAccountMarketVolume(client, { account, market, fromTimestamp }),
            fetchMarketConcentration(client, market),
          ]);
          return { market, whaleVolume, whaleOi: whaleOiByMarket.get(market) ?? 0n, totalOi: concentration.totalOi };
        })
      );
    },
    { refreshInterval: 60_000 }
  );

  const rows: AccountMarketRow[] = (data ?? [])
    .map((r) => {
      const totalVolume = marketVolumes?.[r.market] ?? 0n;
      return {
        market: r.market,
        totalVolume,
        whaleVolume: r.whaleVolume,
        shareBps: computeShareBps(r.whaleVolume, totalVolume),
        whaleOi: r.whaleOi,
        totalOi: r.totalOi,
        oiShareBps: computeShareBps(r.whaleOi, r.totalOi),
      };
    })
    .sort((a, b) => (a.whaleVolume < b.whaleVolume ? 1 : a.whaleVolume > b.whaleVolume ? -1 : 0));

  return { rows, isLoading };
}
