// Tester for the DES-96 design review: finds a trader with open TradFi positions in public market data. Never merged.
import { gql } from "@apollo/client";

import { getSubsquidGraphClient } from "lib/indexers/clients";

type Result = { positions: { account: string; market: string }[] };

export async function findSampleTrader(chainId: number, tradFiMarkets: string[]): Promise<string | undefined> {
  const client = getSubsquidGraphClient(chainId);
  if (!client || tradFiMarkets.length === 0) return undefined;

  const { data } = await client.query<Result>({
    query: gql`
      query ClosedMarketsTesterPositions($markets: [String!]) {
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
    variables: { markets: tradFiMarkets },
    fetchPolicy: "no-cache",
  });

  // the trader with open positions in the most TradFi markets shows the most closed-market rows
  const marketsByAccount = new Map<string, Set<string>>();
  for (const position of data?.positions ?? []) {
    const markets = marketsByAccount.get(position.account) ?? new Set<string>();
    markets.add(position.market);
    marketsByAccount.set(position.account, markets);
  }
  return [...marketsByAccount.entries()].sort((a, b) => b[1].size - a[1].size)[0]?.[0];
}
