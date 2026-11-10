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

// Each widget retains its loaded history independently of the visible range and position snapshot.
export function createGmsolChartTradesFetcher(api: Pick<IHttp, "postJson"> = new HttpClient(GMSOL_GRAPHQL_URL)) {
  let cache: { key: string; fetchedAt: number; pending: boolean; promise: Promise<ChartTrade[]> } | undefined;
  let history:
    | {
        key: string;
        events: Map<string, TradeEvent>;
        range?: { from: number; to: number };
        latestId?: string;
        fetchedAt: number;
        positionKey?: string;
        pending: Promise<void>;
      }
    | undefined;

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
    if (cache?.key === key && (cache.pending || Date.now() - cache.fetchedAt < CACHE_TTL_MS)) {
      return cache.promise;
    }

    const historyKey = JSON.stringify([account, marketAddresses]);
    if (history?.key !== historyKey) {
      history = { key: historyKey, events: new Map(), fetchedAt: 0, pending: Promise.resolve() };
    }
    const entryHistory = history;
    const promise = fetchTrades();
    const entry = { key, fetchedAt: Date.now(), pending: true, promise };
    cache = entry;
    promise.then(
      () => {
        entry.pending = false;
        entry.fetchedAt = Date.now();
      },
      () => {
        if (cache === entry) cache = undefined;
      }
    );
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

      // Serialize range extensions so overlapping marks requests cannot discard each other's pages.
      const update = entryHistory.pending.then(async () => {
        const range = entryHistory.range;
        const events: TradeEvent[] = [];
        const snapshotKey = JSON.stringify(positionKey);
        const refresh =
          !range ||
          to > range.to ||
          Date.now() - entryHistory.fetchedAt >= CACHE_TTL_MS ||
          entryHistory.positionKey !== snapshotKey;
        if (!range) {
          events.push(...(await fetchEvents(from, to)));
        } else {
          if (refresh) {
            events.push(...(await fetchEvents(range.from, Math.max(to, range.to), entryHistory.latestId)));
          }
          if (from < range.from) {
            events.push(...(await fetchEvents(from, range.from)));
          }
        }

        // Commit only complete reads: a failed page must leave the previous cursor and coverage retryable.
        for (const event of events) {
          entryHistory.events.set(event.id, event);
          if (!entryHistory.latestId || event.id > entryHistory.latestId) entryHistory.latestId = event.id;
        }
        entryHistory.range = { from: Math.min(from, range?.from ?? from), to: Math.max(to, range?.to ?? to) };
        if (refresh) {
          entryHistory.fetchedAt = Date.now();
        }
        entryHistory.positionKey = snapshotKey;
      });
      entryHistory.pending = update.catch(() => undefined);
      await update;

      const trades: ChartTrade[] = [];
      for (const event of entryHistory.events.values()) {
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

      return trades.sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
    }

    async function fetchEvents(from: number, to: number, after?: string): Promise<TradeEvent[]> {
      const events: TradeEvent[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const { tradeEvents } = await query<{ tradeEvents: TradeEvent[] }>(
          api,
          `query ChartTradeEvents(
            $owner: String!, $store: String!, $markets: [String!]!,
            $from: DateTime!, $to: DateTime!, $cursor: String, $after: String
          ) {
            tradeEvents(limit: ${PAGE_SIZE}, orderBy: id_DESC, where: {
              user_eq: $owner, store_eq: $store, marketToken_in: $markets,
              timestamp_gte: $from, timestamp_lte: $to, id_lt: $cursor, id_gt: $after
            }) { ${FIELDS} }
          }`,
          {
            owner: account,
            store: GMSOL_STORE_ADDRESS,
            markets: marketAddresses,
            from: new Date(from * 1000).toISOString(),
            to: new Date(to * 1000).toISOString(),
            cursor,
            after,
          }
        );

        events.push(...tradeEvents);

        hasMore = tradeEvents.length === PAGE_SIZE;
        if (!hasMore) break;
        const nextCursor = tradeEvents[tradeEvents.length - 1].id;
        if (nextCursor === cursor) throw new Error("Solana trade events cursor did not advance");
        cursor = nextCursor;
      }

      return events;
    }
  };
}
