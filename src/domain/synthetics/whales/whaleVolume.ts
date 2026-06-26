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
