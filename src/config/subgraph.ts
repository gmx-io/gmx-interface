import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

export const SUBGRAPH_URLS = {
  [ARBITRUM]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-stats",
    referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-arbitrum-referrals",
    nissohVault: "https://api.thegraph.com/subgraphs/name/nissoh/gmx-vault",
  },

  [AVALANCHE]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals",
  },

  [AVALANCHE_FUJI]: {
    stats: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-stats",
    referrals: "https://api.thegraph.com/subgraphs/name/gmx-io/gmx-avalanche-referrals",
    syntheticsStats: "https://api.thegraph.com/subgraphs/name/divhead/synts",
  },

  common: {
    chainLink: "https://api.thegraph.com/subgraphs/name/deividask/chainlink",
  },
};
