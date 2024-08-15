import type { Cache, SWRConfiguration } from "swr";

import { swrGCMiddleware } from "lib/swrMiddlewares";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

export let swrCache: Cache = new Map();

export const SWRConfigProp: SWRConfiguration = {
  refreshInterval: FREQUENT_UPDATE_INTERVAL,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  // @ts-ignore
  use: [swrGCMiddleware],
  provider: () => {
    swrCache = new Map();
    return swrCache;
  },
};
