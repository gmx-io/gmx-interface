import invert from "lodash/invert";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, BOTANIX } from "config/chains";

export const NETWORK_QUERY_PARAM = "network";
export const VERSION_QUERY_PARAM = "v";

export const NETWORK_SLUGS_ID_MAP = {
  arbitrum: ARBITRUM,
  avalanche: AVALANCHE,
  avalanche_fuji: AVALANCHE_FUJI,
  botanix: BOTANIX,
};

export const NETWORK_ID_SLUGS_MAP = invert(NETWORK_SLUGS_ID_MAP);
