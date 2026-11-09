import { GMSOL_GRAPHQL_URL } from "config/gmsol/api";
import { GMSOL_STORE_ADDRESS } from "config/gmsol/program";
import { HttpClient } from "sdk/utils/http/http";
import type { IHttp } from "sdk/utils/http/types";
import type { MarketsInfoData } from "sdk/utils/markets/types";
import type { PositionsInfoData } from "sdk/utils/positions/types";

const PAGE_SIZE = 100;
const CACHE_TTL_MS = 15_000;

export type ChartTrade = {
  id: string;
  ts: number;
  marketAddress: string;
  isLong: boolean;
  isIncrease: boolean;
  executionPrice: bigint;
};

type TradeEvent = {
  id: string;
  timestamp: string;
  position: string;
  marketToken: string;
  flags: string;
  executionPrice: string;
  beforeSizeInUsd: string;
  afterSizeInUsd: string;
};

type Params = {
  account: string;
  markets: MarketsInfoData;
  positions: PositionsInfoData | undefined;
  mode: "all" | "current";
  from: number;
  to: number;
};

const FIELDS = `
  id timestamp position marketToken flags executionPrice beforeSizeInUsd afterSizeInUsd
`;

async function query<T>(api: Pick<IHttp, "postJson">, query: string, variables: Record<string, unknown>): Promise<T> {
  const result = await api.postJson<{ data?: T; errors?: { message: string }[] }>("", { query, variables });
  if (result.errors?.length || !result.data) {
    throw new Error(result.errors?.map((error) => error.message).join("; ") || "Missing Solana trade events");
  }
  return result.data;
}

// Each widget owns its cache. Base58 addresses stay case-sensitive, and simultaneous marks requests
// share the same pending fetch. A new position snapshot invalidates the cache immediately.
export function createGmsolChartTradesFetcher(api: Pick<IHttp, "postJson"> = new HttpClient(GMSOL_GRAPHQL_URL)) {
  let cache: { key: string; fetchedAt: number; promise: Promise<ChartTrade[]> } | undefined;

  return (params: Params): Promise<ChartTrade[]> => {
    const { account, markets, positions, mode, from, to } = params;
    const marketAddresses = Object.keys(markets).sort();
    const activePositions = Object.values(positions ?? {}).filter(
      (position) => position.account === account && position.sizeInUsd > 0n && markets[position.marketAddress]
    );
    const positionKey = activePositions
      .map((p) => `${p.contractKey}:${p.sizeInUsd}:${p.collateralAmount}:${p.increasedAtTime}:${p.decreasedAtTime}`)
      .sort();
    const key = JSON.stringify([account, marketAddresses, mode, from, to, positionKey]);
    if (cache?.key === key && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.promise;
    }

    const promise = fetchTrades();
    const entry = { key, fetchedAt: Date.now(), promise };
    cache = entry;
    promise.catch(() => {
      if (cache === entry) cache = undefined;
    });
    return promise;

    async function fetchTrades(): Promise<ChartTrade[]> {
      if (marketAddresses.length === 0 || (mode === "current" && activePositions.length === 0)) return [];

      const genesisByPosition = new Map<string, TradeEvent>();
      if (mode === "current") {
        await Promise.all(
          activePositions.map(async (position) => {
            // Position accounts can be reused after closing. increasedAtTime is the LAST increase,
            // so using it as the opening time would hide earlier fills in the same position.
            const { opening, latest } = await query<{ opening: TradeEvent[]; latest: TradeEvent[] }>(
              api,
              `query ChartPositionOpening($owner: String!, $store: String!, $position: String!) {
                opening: tradeEvents(limit: 1, orderBy: id_DESC, where: {
                  user_eq: $owner, store_eq: $store, position_eq: $position,
                  beforeSizeInUsd_eq: "0", afterSizeInUsd_not_eq: "0"
                }) { ${FIELDS} }
                latest: tradeEvents(limit: 1, orderBy: id_DESC, where: {
                  user_eq: $owner, store_eq: $store, position_eq: $position
                }) { ${FIELDS} }
              }`,
              { owner: account, store: GMSOL_STORE_ADDRESS, position: position.contractKey }
            );
            // Wait until the indexer reaches the current RPC snapshot, including a recent reopen.
            const updatedAt = Number(
              position.increasedAtTime > position.decreasedAtTime ? position.increasedAtTime : position.decreasedAtTime
            );
            if (
              opening[0] &&
              latest[0] &&
              BigInt(latest[0].afterSizeInUsd) > 0n &&
              Date.parse(latest[0].timestamp) / 1000 >= updatedAt
            ) {
              genesisByPosition.set(position.contractKey, opening[0]);
            }
          })
        );
        if (genesisByPosition.size === 0) return [];
      }

      const trades: ChartTrade[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const { tradeEvents } = await query<{ tradeEvents: TradeEvent[] }>(
          api,
          `query ChartTradeEvents(
            $owner: String!, $store: String!, $markets: [String!]!,
            $from: DateTime!, $to: DateTime!, $cursor: String
          ) {
            tradeEvents(limit: ${PAGE_SIZE}, orderBy: id_DESC, where: {
              user_eq: $owner, store_eq: $store, marketToken_in: $markets,
              timestamp_gte: $from, timestamp_lte: $to, id_lt: $cursor
            }) { ${FIELDS} }
          }`,
          {
            owner: account,
            store: GMSOL_STORE_ADDRESS,
            markets: marketAddresses,
            from: new Date(from * 1000).toISOString(),
            to: new Date(to * 1000).toISOString(),
            cursor,
          }
        );

        for (const event of tradeEvents) {
          const market = markets[event.marketToken];
          if (!market || BigInt(event.beforeSizeInUsd) === BigInt(event.afterSizeInUsd)) continue;
          const ts = Date.parse(event.timestamp) / 1000;
          if (!Number.isFinite(ts) || ts < from || ts > to) continue;
          const flags = BigInt(event.flags);
          const isLong = (flags & 1n) !== 0n;
          if (mode === "current") {
            const opening = genesisByPosition.get(event.position);
            const position = activePositions.find((p) => p.contractKey === event.position);
            if (!opening || !position || position.isLong !== isLong || event.id < opening.id) continue;
          }
          trades.push({
            id: event.id,
            ts,
            marketAddress: event.marketToken,
            isLong,
            isIncrease: (flags & 4n) !== 0n,
            // Solana prices are USD ×10^20 per smallest token unit; the chart uses USD ×10^30.
            executionPrice: BigInt(event.executionPrice) * 10n ** BigInt(10 + market.indexToken.decimals),
          });
        }

        hasMore = tradeEvents.length === PAGE_SIZE;
        if (!hasMore) break;
        const nextCursor = tradeEvents[tradeEvents.length - 1].id;
        if (nextCursor === cursor) throw new Error("Solana trade events cursor did not advance");
        cursor = nextCursor;
      }

      return trades.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
    }
  };
}
