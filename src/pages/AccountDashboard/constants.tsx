import invert from "lodash/invert";

import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, type ContractsChainId } from "config/chains";

export const NETWORK_QUERY_PARAM = "network";
export const VERSION_QUERY_PARAM = "v";

export const NETWORK_SLUGS_ID_MAP = {
  arbitrum: ARBITRUM,
  avalanche: AVALANCHE,
  avalanche_fuji: AVALANCHE_FUJI,
  arbitrum_sepolia: ARBITRUM_SEPOLIA,
} satisfies Record<string, ContractsChainId>;

export const NETWORK_ID_SLUGS_MAP = invert(NETWORK_SLUGS_ID_MAP);
