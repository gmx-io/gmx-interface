import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { invert } from "lodash";

export const NETWORK_QUERY_PARAM = "network";
export const VERSION_QUERY_PARAM = "v";

export const NETWORK_SLUGS_ID_MAP = {
  arbitrum: ARBITRUM,
  avalanche: AVALANCHE,
  avalanche_fuji: AVALANCHE_FUJI,
};

export const NETWORK_ID_SLUGS_MAP = invert(NETWORK_SLUGS_ID_MAP);
