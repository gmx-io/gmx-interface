import { ApolloClient, gql } from "@apollo/client";

const PAGE_SIZE = 1000;

const POSITION_CHANGES_QUERY = gql`
  query AccountMarketChanges($where: PositionChangeWhereInput!, $limit: Int!, $offset: Int!) {
    positionChanges(where: $where, orderBy: timestamp_ASC, limit: $limit, offset: $offset) {
      sizeDeltaUsd
    }
  }
`;

export function sumPositionChangeVolume(rows: { sizeDeltaUsd: string }[]): bigint {
  let total = 0n;
  for (const row of rows) {
    const v = BigInt(row.sizeDeltaUsd);
    total += v < 0n ? -v : v;
  }
  return total;
}

export async function fetchAccountMarketVolume(
  client: ApolloClient<unknown>,
  params: { account: string; market: string; fromTimestamp?: number }
): Promise<bigint> {
  const where: Record<string, unknown> = {
    account_eq: params.account,
    market_eq: params.market,
  };
  if (params.fromTimestamp !== undefined) {
    where.timestamp_gte = params.fromTimestamp;
  }

  let total = 0n;
  let offset = 0;
  // Paginate until a short page signals the end.
  for (;;) {
    const res = await client.query<{ positionChanges: { sizeDeltaUsd: string }[] }>({
      query: POSITION_CHANGES_QUERY,
      variables: { where, limit: PAGE_SIZE, offset },
      fetchPolicy: "no-cache",
    });
    const rows = res.data?.positionChanges ?? [];
    total += sumPositionChangeVolume(rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return total;
}

const MARKET_CHANGES_QUERY = gql`
  query MarketChanges($where: PositionChangeWhereInput!, $limit: Int!, $offset: Int!) {
    positionChanges(where: $where, orderBy: timestamp_DESC, limit: $limit, offset: $offset) {
      account
      sizeDeltaUsd
    }
  }
`;

// Safety cap for very active markets; thin markets (the whale use case) are far
// below this, and the busiest market today (~30k changes/30d) is still under it.
// Ordered newest-first so that if the cap is ever hit, the oldest tail is what
// gets dropped, not recent activity.
const MARKET_CHANGES_MAX_PAGES = 50;

export function aggregateTraderVolumes(rows: { account: string; sizeDeltaUsd: string }[]): {
  volumes: Map<string, bigint>;
  total: bigint;
} {
  const volumes = new Map<string, bigint>();
  let total = 0n;
  for (const row of rows) {
    const v = BigInt(row.sizeDeltaUsd);
    const abs = v < 0n ? -v : v;
    volumes.set(row.account, (volumes.get(row.account) ?? 0n) + abs);
    total += abs;
  }
  return { volumes, total };
}

// Traded volume per account for a whole market over the window — the only way to
// surface high-volume / low-position-size whales. One paginated scan per market.
export async function fetchMarketTraderVolumes(
  client: ApolloClient<unknown>,
  params: { market: string; fromTimestamp?: number }
): Promise<{ volumes: Map<string, bigint>; total: bigint }> {
  const where: Record<string, unknown> = { market_eq: params.market };
  if (params.fromTimestamp !== undefined) {
    where.timestamp_gte = params.fromTimestamp;
  }

  const all: { account: string; sizeDeltaUsd: string }[] = [];
  let offset = 0;
  for (let page = 0; page < MARKET_CHANGES_MAX_PAGES; page++) {
    const res = await client.query<{ positionChanges: { account: string; sizeDeltaUsd: string }[] }>({
      query: MARKET_CHANGES_QUERY,
      variables: { where, limit: PAGE_SIZE, offset },
      fetchPolicy: "no-cache",
    });
    const rows = res.data?.positionChanges ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return aggregateTraderVolumes(all);
}
