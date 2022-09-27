import { ApolloClient, InMemoryCache } from "@apollo/client";

export function createClient(uri) {
  return new ApolloClient({
    uri,
    cache: new InMemoryCache(),
  });
}
