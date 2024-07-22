import { swrGCMiddleware } from "lib/swrMiddlewares";

import type { Cache, SWRConfiguration } from "swr";

export const swrCache: Cache = new Map();

export const SWRConfigProp: SWRConfiguration = {
  refreshInterval: 5000,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  // @ts-ignore
  use: [swrGCMiddleware],
  provider: () => swrCache,
};
