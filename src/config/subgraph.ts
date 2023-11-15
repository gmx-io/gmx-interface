import { ARBITRUM, AVALANCHE, ETH_MAINNET, SEPOLIA_TESTNET } from "./chains";
import { isDevelopment } from "./env";
import { getSubgraphUrlKey } from "./localStorage";

// TODO subgraphs are not ready yet
const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    // stats: "https://api.thegraph.com/subgraphs/name/gdev8317/gmx-arbitrum-stats
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats",
    referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
  },

  [AVALANCHE]: {
    // stats: "https://api.thegraph.com/subgraphs/name/gdev8317/gmx-avalanche-staging", // testing
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals",
  },

  [ETH_MAINNET]: {
    chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
  },

  [SEPOLIA_TESTNET]: {
    stats: "https://api.studio.thegraph.com/query/12759/gmx_vault/version/latest",
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

  return SUBGRAPH_URLS[chainId][subgraph];
}
