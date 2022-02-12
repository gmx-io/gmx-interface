import { ApolloClient, InMemoryCache } from '@apollo/client'

const CHAINLINK_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/deividask/chainlink";
export const chainlinkClient = new ApolloClient({
  uri: CHAINLINK_GRAPH_API_URL,
  cache: new InMemoryCache()
});

const ARBITRUM_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats"
export const arbitrumGraphClient = new ApolloClient({
  uri: ARBITRUM_GRAPH_API_URL,
  cache: new InMemoryCache()
});

const AVALANCHE_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats"
export const avalancheGraphClient = new ApolloClient({
  uri: AVALANCHE_GRAPH_API_URL,
  cache: new InMemoryCache()
});

const NISSOH_GRAPH_API_URL = "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault"
export const nissohGraphClient = new ApolloClient({
  uri: NISSOH_GRAPH_API_URL,
  cache: new InMemoryCache()
});

