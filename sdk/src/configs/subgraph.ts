import { ApolloClient, InMemoryCache } from "@apollo/client";
import fetch from "cross-fetch";
import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI } from "./chains";

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
    syntheticsStats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api",
    subsquid: "https://gmx.squids.live/gmx-synthetics-arbitrum/graphql",
  },

  [ARBITRUM_GOERLI]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-goerli-referrals/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-goerli-stats/version/earnings-2-231121085556-d8ceec8/api",
  },

  [AVALANCHE]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/api",
    syntheticsStats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-avalanche-stats/api",
    subsquid: "https://gmx.squids.live/gmx-synthetics-avalanche/graphql",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/version/debug-240418111033-19cbf3f/api",
    subsquid: "https://gmx.squids.live/gmx-synthetics-fuji/graphql",
  },
};

type SubgraphConfig = typeof SUBGRAPH_URLS;
type Subgraph =
  | keyof SubgraphConfig[typeof ARBITRUM]
  | keyof SubgraphConfig[typeof ARBITRUM_GOERLI]
  | keyof SubgraphConfig[typeof AVALANCHE]
  | keyof SubgraphConfig[typeof AVALANCHE_FUJI];

export function getSubgraphUrl(chainId: number, subgraph: Subgraph): string | undefined {
  return SUBGRAPH_URLS?.[chainId]?.[subgraph];
}
