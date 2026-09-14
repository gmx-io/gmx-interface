import { describe, expect, it } from "vitest";

import { createTokenPricesCache } from "./tokenPricesCache";

const CHAIN_ID = 42161;
const TTL = 30_000;
const MISSES = 6;

const ETH = "0xeth";
const BTC = "0xbtc";

const price = (value: bigint) => ({ minPrice: value, maxPrice: value });

const createCache = () => createTokenPricesCache({ ttl: TTL, missedResponsesBeforeForget: MISSES });

describe("tokenPricesCache", () => {
  it("returns the received prices when nothing is missing", () => {
    const cache = createCache();

    const { pricesData, missingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n), [BTC]: price(2n) },
      now: 1_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(1n), [BTC]: price(2n) });
    expect(missingAddresses).toEqual([]);
  });

  it("restores a recently seen token missing in the response and reports it", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const { pricesData, missingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(3n) },
      now: 2_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(3n), [BTC]: price(2n) });
    expect(missingAddresses).toEqual([BTC]);
  });

  it("stops serving a cached price older than the TTL, but keeps reporting the token", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const fresh = cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL - 1 });
    expect(fresh.pricesData[BTC]).toEqual(price(2n));
    expect(fresh.missingAddresses).toEqual([BTC]);

    const stale = cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL });
    expect(stale.pricesData).toEqual({ [ETH]: price(1n) });
    expect(stale.missingAddresses).toEqual([BTC]);
  });

  it("keeps reporting a token missing since long before the TTL when responses resume", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    // A polling gap longer than the TTL: a hidden tab, a sleeping laptop, the leaderboard 60s interval
    const afterGap = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n) },
      now: 1_000 + 10 * TTL,
    });

    expect(afterGap.missingAddresses).toEqual([BTC]);
  });

  it("forgets a token after several responses in a row without it", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    for (let i = 1; i <= MISSES; i++) {
      const { missingAddresses } = cache.reconcile({
        chainId: CHAIN_ID,
        pricesData: { [ETH]: price(1n) },
        now: 1_000 + i * 1_000,
      });

      expect(missingAddresses).toEqual([BTC]);
    }

    const forgotten = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n) },
      now: 1_000 + (MISSES + 1) * 1_000,
    });

    expect(forgotten.pricesData).toEqual({ [ETH]: price(1n) });
    expect(forgotten.missingAddresses).toEqual([]);
  });

  it("counts only consecutive misses", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    for (let i = 1; i < MISSES; i++) {
      cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + i * 1_000 });
    }

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(5n) }, now: 10_000 });

    const { pricesData, missingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n) },
      now: 11_000,
    });

    expect(pricesData[BTC]).toEqual(price(5n));
    expect(missingAddresses).toEqual([BTC]);
  });

  it("keeps caches of different chains apart", () => {
    const cache = createCache();

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const otherChain = cache.reconcile({ chainId: 43114, pricesData: { [ETH]: price(7n) }, now: 2_000 });

    expect(otherChain.pricesData).toEqual({ [ETH]: price(7n) });
    expect(otherChain.missingAddresses).toEqual([]);
  });
});
