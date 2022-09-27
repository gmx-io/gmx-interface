import { ApolloClient, InMemoryCache } from "@apollo/client";

export function createClient(uri: string) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
