import { ARBITRUM, AVALANCHE, ETH_MAINNET } from "./chains";
import { isDevelopment } from "./env";
import { getSubgraphUrlKey } from "./localStorage";

const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-arbitrum-referrals/api",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
  },

  [AVALANCHE]: {
    stats: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-stats/api",
    referrals: "https://subgraph.satsuma-prod.com/3b2ced13c8d9/gmx/gmx-avalanche-referrals/api",
  },

  [ETH_MAINNET]: {
    chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
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
