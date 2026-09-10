import { describe, expect, it } from "vitest";

import { createTokenPricesCache } from "./tokenPricesCache";

const CHAIN_ID = 42161;
const TTL = 30_000;
const BACKSTOP = 20;

const A = "https://a";
const B = "https://b";
const C = "https://c";
const ALL_ENDPOINTS = [A, B, C];

const ETH = "0xeth";
const BTC = "0xbtc";

const price = (value: bigint) => ({ minPrice: value, maxPrice: value });

const createCache = () => createTokenPricesCache({ ttl: TTL, missedResponsesBeforeForget: BACKSTOP });

const respond = (
  cache: ReturnType<typeof createCache>,
  p: { pricesData: Record<string, { minPrice: bigint; maxPrice: bigint }>; endpoint?: string; now: number }
) =>
  cache.reconcile({
    chainId: CHAIN_ID,
    pricesData: p.pricesData,
    servedBy: p.endpoint ?? A,
    allEndpoints: ALL_ENDPOINTS,
    now: p.now,
  });

describe("tokenPricesCache", () => {
  it("returns the received prices when nothing is missing", () => {
    const cache = createCache();

    const { pricesData, missingAddresses } = respond(cache, {
      pricesData: { [ETH]: price(1n), [BTC]: price(2n) },
      now: 1_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(1n), [BTC]: price(2n) });
    expect(missingAddresses).toEqual([]);
  });

  it("restores a recently seen token missing in the response and reports it", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const { pricesData, missingAddresses } = respond(cache, { pricesData: { [ETH]: price(3n) }, now: 2_000 });

    expect(pricesData).toEqual({ [ETH]: price(3n), [BTC]: price(2n) });
    expect(missingAddresses).toEqual([BTC]);
  });

  it("stops serving a cached price older than the TTL, but keeps reporting the token", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const fresh = respond(cache, { pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL - 1 });
    expect(fresh.pricesData[BTC]).toEqual(price(2n));
    expect(fresh.missingAddresses).toEqual([BTC]);

    const stale = respond(cache, { pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL });
    expect(stale.pricesData).toEqual({ [ETH]: price(1n) });
    expect(stale.missingAddresses).toEqual([BTC]);
  });

  it("keeps reporting a token missing since long before the TTL when responses resume", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const afterGap = respond(cache, { pricesData: { [ETH]: price(1n) }, now: 1_000 + 10 * TTL });

    expect(afterGap.missingAddresses).toEqual([BTC]);
  });

  it("keeps reporting while endpoints are left to try, and forgets once all of them omitted the token", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, endpoint: A, now: 1_000 });

    for (let i = 1; i <= 10; i++) {
      const onA = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: A, now: 1_000 + i * 1_000 });
      expect(onA.missingAddresses).toEqual([BTC]);
    }

    const onB = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: B, now: 20_000 });
    expect(onB.missingAddresses).toEqual([BTC]);

    const onC = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: C, now: 21_000 });
    expect(onC.missingAddresses).toEqual([BTC]);

    const afterAllEndpoints = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: A, now: 22_000 });
    expect(afterAllEndpoints.missingAddresses).toEqual([]);
  });

  it("forgets by the backstop when the tracker never rotates", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, endpoint: A, now: 0 });

    for (let i = 1; i <= BACKSTOP; i++) {
      const { missingAddresses } = respond(cache, {
        pricesData: { [ETH]: price(1n) },
        endpoint: A,
        now: i * 60_000,
      });

      expect(missingAddresses).toEqual([BTC]);
    }

    const forgotten = respond(cache, {
      pricesData: { [ETH]: price(1n) },
      endpoint: A,
      now: (BACKSTOP + 1) * 60_000,
    });

    expect(forgotten.missingAddresses).toEqual([]);
  });

  it("starts over once the token is back in the response", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, endpoint: A, now: 1_000 });
    respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: A, now: 2_000 });
    respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: B, now: 3_000 });
    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(5n) }, endpoint: C, now: 4_000 });

    const onA = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: A, now: 5_000 });
    expect(onA.pricesData[BTC]).toEqual(price(5n));
    expect(onA.missingAddresses).toEqual([BTC]);

    const onB = respond(cache, { pricesData: { [ETH]: price(1n) }, endpoint: B, now: 6_000 });
    expect(onB.missingAddresses).toEqual([BTC]);
  });

  it("keeps caches of different chains apart", () => {
    const cache = createCache();

    respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const otherChain = cache.reconcile({
      chainId: 43114,
      pricesData: { [ETH]: price(7n) },
      servedBy: A,
      allEndpoints: ALL_ENDPOINTS,
      now: 2_000,
    });

    expect(otherChain.pricesData).toEqual({ [ETH]: price(7n) });
    expect(otherChain.missingAddresses).toEqual([]);
  });

  describe("restore, used when the tickers request is rejected", () => {
    it("serves the fresh cached prices and reports nothing", () => {
      const cache = createCache();

      respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

      const { pricesData, missingAddresses } = cache.restore(CHAIN_ID, 2_000);

      expect(pricesData).toEqual({ [ETH]: price(1n), [BTC]: price(2n) });
      expect(missingAddresses).toEqual([]);
    });

    it("does not bring a token closer to being forgotten", () => {
      const cache = createCache();

      respond(cache, { pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 0 });

      for (let i = 1; i <= BACKSTOP; i++) {
        const { pricesData } = cache.restore(CHAIN_ID, i * 1_000);
        expect(pricesData[BTC]).toEqual(price(2n));
      }

      // The cache is intact: a later response still finds BTC missing
      const { missingAddresses } = respond(cache, { pricesData: { [ETH]: price(1n) }, now: TTL - 1 });
      expect(missingAddresses).toEqual([BTC]);
    });

    it("does not serve prices older than the TTL", () => {
      const cache = createCache();

      respond(cache, { pricesData: { [ETH]: price(1n) }, now: 1_000 });

      expect(cache.restore(CHAIN_ID, 1_000 + TTL - 1).pricesData).toEqual({ [ETH]: price(1n) });
      expect(cache.restore(CHAIN_ID, 1_000 + TTL).pricesData).toEqual({});
    });
  });
});
