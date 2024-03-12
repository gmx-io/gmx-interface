import { ApolloClient, InMemoryCache } from "@apollo/client";
import { getSubgraphUrl } from "config/subgraph";

export function createClient(chainId: number, subgraph: string) {
  const url = getSubgraphUrl(chainId, subgraph);
  return new ApolloClient({
    uri: url,
    cache: new InMemoryCache(),
  });
}
