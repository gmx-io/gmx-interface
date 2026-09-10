import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { TokenPrices, TokenPricesData } from "sdk/utils/tokens/types";

/**
 * Six responses of the fastest polling (1s) outlast the four seconds the fallback tracker needs
 * to ban an endpoint, so a partial endpoint is still rotated away before the token is forgotten.
 */
const MISSED_RESPONSES_BEFORE_FORGET = 6;

type CachedTokenPrices = {
  prices: TokenPrices;
  receivedAt: number;
  missedResponses: number;
};

export type ReconcileTokenPricesParams = {
  chainId: number;
  pricesData: TokenPricesData;
  now?: number;
};

export type ReconcileTokenPricesResult = {
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

  /**
   * Stores the received prices, serves a cached price of a missing token while it is fresh and reports
   * the tokens that went missing. A token missing from several responses in a row is forgotten, so that
   * a delisted one stops making every following response partial. Responses are counted instead of elapsed
   * time: a polling gap — a hidden tab, a sleeping laptop — must not turn the detection off.
   */
  function reconcile(p: ReconcileTokenPricesParams): ReconcileTokenPricesResult {
    const { chainId, pricesData, now = Date.now() } = p;
    const cache = getChainCache(chainId);
    const result: TokenPricesData = { ...pricesData };
    const missingAddresses: string[] = [];

    for (const address of Object.keys(pricesData)) {
      cache[address] = { prices: pricesData[address], receivedAt: now, missedResponses: 0 };
    }

    for (const address of Object.keys(cache)) {
      if (pricesData[address]) {
        continue;
      }

      const cached = cache[address];
      cached.missedResponses += 1;

      if (now - cached.receivedAt < ttl) {
        result[address] = cached.prices;
      }

      missingAddresses.push(address);

      if (cached.missedResponses >= missedResponsesBeforeForget) {
        delete cache[address];
      }
    }

    return { pricesData: result, missingAddresses };
  }

  return { reconcile };
}

export const tokenPricesCache = createTokenPricesCache();
