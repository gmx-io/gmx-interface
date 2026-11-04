import type { BrowserContext } from "@playwright/test";

import arbitrum from "./markets/arbitrum.json";
import avalanche from "./markets/avalanche.json";

export async function mockTradingMarket(context: BrowserContext, chainId: number) {
  const data = chainId === 42161 ? arbitrum : avalanche;
  const chain = chainId === 42161 ? "arbitrum" : "avalanche";
  await context.route(/\/v1\/markets\/(config|values)(?:\?|$)|\/prices\/tickers(?:\?|$)/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.hostname.startsWith(chain)) return route.fallback();
    const now = Date.now();
    const json = url.pathname.endsWith("/config")
      ? data.config
      : url.pathname.endsWith("/values")
        ? data.values.map((value) => ({ ...value, updatedAt: now }))
        : data.tickers.map((ticker) => ({ ...ticker, timestamp: Math.floor(now / 1000) }));
    await route.fulfill({ json });
  });
}
