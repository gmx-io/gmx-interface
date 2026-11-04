import { ApolloClient, InMemoryCache } from "@apollo/client";

import { getIndexerUrl } from "config/indexers";

export function createClient(chainId: number, indexer: "stats" | "referrals" | "syntheticsStats" | "subsquid") {
  const url = getIndexerUrl(chainId, indexer);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
