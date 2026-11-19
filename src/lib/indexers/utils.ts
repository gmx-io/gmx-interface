import { ApolloClient, InMemoryCache } from "@apollo/client";

import { getConfiguredIndexerUrl, type IndexerKey } from "config/indexers";

export function createClient(chainId: number, indexer: IndexerKey) {
  const url = getConfiguredIndexerUrl(chainId, indexer);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
