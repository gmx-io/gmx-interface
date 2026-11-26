// Tester for the DES-104 design review: finds a trader with open orders (and positions) in the closed markets,
// from public market data, so no address is written into the code. Local only, never merged.
import { gql } from "@apollo/client";

import { getSubsquidGraphClient } from "lib/indexers/clients";

type Result = {
  orders: { account: string; marketAddress: string }[];
  positions: { account: string; market: string }[];
};

export async function findSampleTrader(chainId: number, closedMarkets: string[]): Promise<string | undefined> {
  const client = getSubsquidGraphClient(chainId);
  if (!client || closedMarkets.length === 0) return undefined;

  const { data } = await client.query<Result>({
    query: gql`
      query ClosedMarketsTesterTraders($markets: [String!]) {
        orders(where: { marketAddress_in: $markets, status_eq: Created }, orderBy: updatedAtBlock_DESC, limit: 500) {
          account
          marketAddress
        }
        positions(
          where: { market_in: $markets, sizeInUsd_gt: "0", isSnapshot_eq: false }
          orderBy: sizeInUsd_DESC
          limit: 300
        ) {
          account
          market
        }
      }
    `,
    variables: { markets: closedMarkets },
    fetchPolicy: "no-cache",
  });

  // the orders table is what DES-104 checks, so open orders count most; positions break ties
  const score = new Map<string, { orders: number; positions: Set<string> }>();
  const entry = (account: string) => {
    const current = score.get(account) ?? { orders: 0, positions: new Set<string>() };
    score.set(account, current);
    return current;
  };
  for (const order of data?.orders ?? []) entry(order.account).orders += 1;
  for (const position of data?.positions ?? []) entry(position.account).positions.add(position.market);

  return [...score.entries()]
    .filter(([, s]) => s.orders > 0 || s.positions.size > 0)
    .sort(
      ([, a], [, b]) => Math.min(b.orders, 6) * 2 + b.positions.size - (Math.min(a.orders, 6) * 2 + a.positions.size)
    )[0]?.[0];
}
