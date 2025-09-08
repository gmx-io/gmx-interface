import type { Cache, SWRConfiguration } from "swr";
import { cache } from "swr/_internal";

import { swrGCMiddleware } from "lib/swrMiddlewares";
import { FREQUENT_UPDATE_INTERVAL } from "lib/timeConstants";

export let swrCache: Cache = cache;

export const SWRConfigProp: SWRConfiguration = {
  refreshInterval: FREQUENT_UPDATE_INTERVAL,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  // @ts-ignore
  use: [swrGCMiddleware],
};
