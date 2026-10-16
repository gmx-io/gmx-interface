import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  AVALANCHE_FUJI,
  MEGAETH,
  SOURCE_ETHEREUM_MAINNET,
  type ContractsChainId,
} from "./chains";
import { isDevelopment } from "./env";
import { getIndexerUrlKey } from "./localStorage";

type IndexerKey = "stats" | "referrals" | "syntheticsStats" | "subsquid" | "chainLink";
type IndexerUrlMap = Partial<Record<IndexerKey, string>>;

const INDEXER_URLS: Partial<Record<ContractsChainId, IndexerUrlMap>> = {
  [ARBITRUM]: {
    stats: "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-arbitrum-stats/prod/gn",
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-arbitrum-referrals/prod/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-arbitrum-stats/prod/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql",
  },

  [AVALANCHE]: {
    stats: "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-avalanche-stats/prod/gn",
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-avalanche-referrals/prod/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-avalanche-stats/prod/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-avalanche:prod/api/graphql",
  },

  [AVALANCHE_FUJI]: {
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-fuji-referrals/prod/gn",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-fuji-stats/prod/gn",
    subsquid: "https://gmx.squids.live/gmx-synthetics-fuji:prod/api/graphql",
  },

  [ARBITRUM_SEPOLIA]: {
    subsquid: "https://gmx.squids.live/gmx-synthetics-arb-sepolia:prod/api/graphql",
  },

  [MEGAETH]: {
    subsquid: "https://gmx.squids.live/gmx-synthetics-megaeth:prod/api/graphql",
    syntheticsStats:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/synthetics-megaeth-stats/prod/gn",
    referrals:
      "https://api.goldsky.com/api/public/project_cmgptuc4qhclc01rh9s4q554a/subgraphs/gmx-megaeth-referrals/prod/gn",
  },
};

const COMMON_INDEXER_URLS: Partial<Record<number, IndexerUrlMap>> = {
  [SOURCE_ETHEREUM_MAINNET]: {
    chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
  },
};

export function getIndexerUrl(chainId: number, indexer: IndexerKey): string | undefined {
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
    return COMMON_INDEXER_URLS[chainId]?.[indexer];
  }

  return INDEXER_URLS[chainId as ContractsChainId]?.[indexer];
}
