import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { TokenPricesData } from "sdk/utils/tokens/types";

type ChainPricesCache = {
  prices: TokenPricesData;
  updatedAt: { [address: string]: number };
};

export type ReconcileTokenPricesParams = {
  chainId: number;
  /** Prices parsed from the tickers response */
  pricesData: TokenPricesData;
  /** Tokens allowed to disappear from tickers, e.g. tokens of delisting markets */
  expectedMissingAddresses?: Set<string>;
  now?: number;
};

export type ReconcileTokenPricesResult = {
  /** Received prices plus cached prices of recently seen tokens missing in the response */
  pricesData: TokenPricesData;
  /** Recently seen tokens missing in the response which were not expected to disappear */
  unexpectedMissingAddresses: string[];
};

export function createTokenPricesCache(ttl = PRICES_CACHE_TTL) {
  const caches: { [chainId: number]: ChainPricesCache } = {};

  function getChainCache(chainId: number): ChainPricesCache {
    if (!caches[chainId]) {
      caches[chainId] = { prices: {}, updatedAt: {} };
    }

    return caches[chainId];
  }

  /**
   * Stores the received prices and restores prices of tokens missing in the response
   * while their cached value is fresh. A token missing for longer than the TTL is forgotten,
   * otherwise a delisted token would keep every following response "partial" for the rest of the session.
   */
  function reconcile(p: ReconcileTokenPricesParams): ReconcileTokenPricesResult {
    const { chainId, pricesData, expectedMissingAddresses, now = Date.now() } = p;
    const cache = getChainCache(chainId);
    const result: TokenPricesData = { ...pricesData };
    const unexpectedMissingAddresses: string[] = [];

    for (const address of Object.keys(pricesData)) {
      cache.prices[address] = pricesData[address];
      cache.updatedAt[address] = now;
    }

    for (const address of Object.keys(cache.updatedAt)) {
      if (pricesData[address]) {
        continue;
      }

      const isFresh = now - cache.updatedAt[address] < ttl;

      if (!isFresh) {
        delete cache.prices[address];
        delete cache.updatedAt[address];
        continue;
      }

      result[address] = cache.prices[address];

      if (!expectedMissingAddresses?.has(address)) {
        unexpectedMissingAddresses.push(address);
      }
    }

    return { pricesData: result, unexpectedMissingAddresses };
  }

  return { reconcile };
}

export const tokenPricesCache = createTokenPricesCache();
