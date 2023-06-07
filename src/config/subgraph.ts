import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "./chains";
import { isDevelopment } from "./env";
import { getSubgraphUrlKey } from "./localStorage";

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    // stats: "https://api.thegraph.com/subgraphs/name/gdev8317/gmx-arbitrum-stats
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats",
    // referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals",
    // TODO: Test refferals updates
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/version/synts-stats-230509054500-2deb6a4/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
  },

  [AVALANCHE]: {
    // stats: "https://api.thegraph.com/subgraphs/name/gdev8317/gmx-avalanche-staging", // testing
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    // TODO: Test refferals updates
    // referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/version/synts-stats-230509054250-2deb6a4/api",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/version/synts-stats-230601004554-4a53c5d/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/version/synts-stats-230601004808-4a53c5d/api",
  },

  common: {
    [ETH_MAINNET]: {
      chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
    },
  },
};

export function getSubgraphUrl(chainId: number, subgraph: string) {
  if (isDevelopment()) {
    const localStorageKey = getSubgraphUrlKey(chainId, subgraph);
    const url = localStorage.getItem(localStorageKey);
    if (url) {
      // eslint-disable-next-line no-console
      console.warn("%s subgraph on chain %s url is overriden: %s", subgraph, chainId, url);
      return url;
    }
  }

  return SUBGRAPH_URLS[chainId]?.[subgraph];
}
