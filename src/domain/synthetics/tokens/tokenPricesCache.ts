import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { TokenPrices, TokenPricesData } from "sdk/utils/tokens/types";

const MISSED_RESPONSES_BEFORE_FORGET = 20;

type CachedTokenPrices = {
  prices: TokenPrices;
  receivedAt: number;
  missedResponses: number;
  missedEndpoints: Set<string>;
};

export type ReconcileTokenPricesParams = {
  chainId: number;
  pricesData: TokenPricesData;
  servedBy: string;
  allEndpoints: string[];
  now?: number;
};

export type TokenPricesCacheResult = {
  pricesData: TokenPricesData;
  missingAddresses: string[];
};

export function createTokenPricesCache(p?: { ttl?: number; missedResponsesBeforeForget?: number }) {
  const ttl = p?.ttl ?? PRICES_CACHE_TTL;
  const missedResponsesBeforeForget = p?.missedResponsesBeforeForget ?? MISSED_RESPONSES_BEFORE_FORGET;
  const caches: { [chainId: number]: { [address: string]: CachedTokenPrices } } = {};

  function getChainCache(chainId: number) {
    if (!caches[chainId]) {
      caches[chainId] = {};
    }

    return caches[chainId];
  }

  function isMissingEverywhere(cached: CachedTokenPrices, allEndpoints: string[]) {
    return allEndpoints.every((endpoint) => cached.missedEndpoints.has(endpoint));
  }

  function reconcile(p: ReconcileTokenPricesParams): TokenPricesCacheResult {
    const { chainId, pricesData, servedBy, allEndpoints, now = Date.now() } = p;
    const cache = getChainCache(chainId);
    const result: TokenPricesData = { ...pricesData };
    const missingAddresses: string[] = [];

    for (const address of Object.keys(pricesData)) {
      cache[address] = {
        prices: pricesData[address],
        receivedAt: now,
        missedResponses: 0,
        missedEndpoints: new Set(),
      };
    }

    for (const address of Object.keys(cache)) {
      if (pricesData[address]) {
        continue;
      }

      const cached = cache[address];
      cached.missedResponses += 1;
      cached.missedEndpoints.add(servedBy);

      if (now - cached.receivedAt < ttl) {
        result[address] = cached.prices;
      }

      missingAddresses.push(address);

      if (isMissingEverywhere(cached, allEndpoints) || cached.missedResponses >= missedResponsesBeforeForget) {
        delete cache[address];
      }
    }

    return { pricesData: result, missingAddresses };
  }

  function restore(chainId: number, now = Date.now()): TokenPricesCacheResult {
    const cache = getChainCache(chainId);
    const pricesData: TokenPricesData = {};

    for (const address of Object.keys(cache)) {
      if (now - cache[address].receivedAt < ttl) {
        pricesData[address] = cache[address].prices;
      }
    }

    return { pricesData, missingAddresses: [] };
  }

  return { reconcile, restore };
}

export const tokenPricesCache = createTokenPricesCache();
