import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, BOTANIX, SOURCE_ETHEREUM_MAINNET } from "./chains";
import { isDevelopment } from "./env";
import { getIndexerUrlKey } from "./localStorage";

const INDEXER_URLS = {
  [ARBITRUM]: {
    stats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-arbitrum-stats/synts-stats-230627214534-0265e1f/gn",
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-arbitrum-referrals/master-240506225935-51167d5/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-arbitrum-stats/master-250410222518-4486206/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-arbitrum@648c88/api/graphql",
  },

  [AVALANCHE]: {
    stats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-avalanche-stats/master-240711235903-da2d1a1/gn",
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-avalanche-referrals/master-240415215829-f6877d6/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-avalanche-stats/master-250410222549-4486206/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-avalanche@648c88/api/graphql",
  },

  [AVALANCHE_FUJI]: {
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-fuji-referrals/synts-stats-230726124533-065cd0d/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-fuji-stats/master-250708141244-939c871/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-fuji@648c88/api/graphql",
  },

  [ARBITRUM_SEPOLIA]: {
    subsquid: "https://gmx.squids.live/gmx-synthetics-arb-sepolia@648c88/api/graphql",
  },

  [BOTANIX]: {
    subsquid: "https://gmx.squids.live/gmx-synthetics-botanix@648c88/api/graphql",
    stats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-botanix-stats/botanix-250617091016-f7b3bb5/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-botanix-stats/botanix-250617091016-f7b3bb5/gn",
  },

  common: {
    [SOURCE_ETHEREUM_MAINNET]: {
      chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
    },
  },
};

export function getIndexerUrl(
  chainId: number,
  indexer: "stats" | "referrals" | "syntheticsStats" | "subsquid" | "chainLink"
): string | undefined {
  if (isDevelopment()) {
    const localStorageKey = getIndexerUrlKey(chainId, indexer);
    const url = localStorage.getItem(localStorageKey);
    if (url) {
      // eslint-disable-next-line no-console
      console.warn("%s indexer on chain %s url is overriden: %s", indexer, chainId, url);
      return url;
    }
  }

  if (chainId === SOURCE_ETHEREUM_MAINNET) {
    return INDEXER_URLS.common[SOURCE_ETHEREUM_MAINNET]?.[indexer];
  }

  return INDEXER_URLS?.[chainId]?.[indexer];
}
