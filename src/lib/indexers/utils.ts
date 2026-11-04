import { ApolloClient, InMemoryCache } from "@apollo/client";

import { getConfiguredIndexerUrl } from "config/indexers";

export function createClient(chainId: number, indexer: "stats" | "referrals" | "syntheticsStats" | "subsquid") {
  const url = getConfiguredIndexerUrl(chainId, indexer);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
