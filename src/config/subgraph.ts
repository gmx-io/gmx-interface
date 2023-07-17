import { ARBITRUM, ARBITRUM_GOERLI, AVALANCHE, AVALANCHE_FUJI, ETH_MAINNET } from "./chains";
import { isDevelopment } from "./env";
import { getSubgraphUrlKey } from "./localStorage";

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-stats/api",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/version/synts-stats-230714035205-42d145e/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
    syntheticsStats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-arbitrum-stats/api",
  },

  [ARBITRUM_GOERLI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-goerli-referrals/version/synts-stats-230624022207-71aabd6/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-goerli-stats/version/synts-stats-230714033353-42d145e/api",
  },

  [AVALANCHE]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/version/synts-stats-230714035735-42d145e/api",
    syntheticsStats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-avalanche-stats/api",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-fuji-referrals/version/synts-stats-230717231058-0ce7074/api",
    syntheticsStats:
      "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/synthetics-fuji-stats/version/synts-stats-230714062025-42d145e/api",
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

  return SUBGRAPH_URLS?.[chainId]?.[subgraph];
}
