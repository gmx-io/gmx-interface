import arbitrum from "config/source/marketsUi/arbitrum.json";
import avalanche from "config/source/marketsUi/avalanche.json";
import avalancheFuji from "config/source/marketsUi/avalanche_fuji.json";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

/*
  A temporary solution before positions sorting logic is updated
  to not depend on marketInfo sorting.

  When adding new markets, add them to the end of the list
  or update arrays based on marketInfo sorting in runtime
*/
export const SORTED_MARKETS = {
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [AVALANCHE_FUJI]: avalancheFuji,
};
