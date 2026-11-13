import { ApolloClient, InMemoryCache } from "@apollo/client";

import { getIndexerUrl, type IndexerKey } from "config/indexers";

export function createClient(chainId: number, indexer: IndexerKey) {
  const url = getIndexerUrl(chainId, indexer);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
