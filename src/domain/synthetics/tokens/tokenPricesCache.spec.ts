import { describe, expect, it } from "vitest";

import { createTokenPricesCache } from "./tokenPricesCache";

const CHAIN_ID = 42161;
const TTL = 30_000;

const ETH = "0xeth";
const BTC = "0xbtc";
const TON = "0xton";

const price = (value: bigint) => ({ minPrice: value, maxPrice: value });

describe("tokenPricesCache", () => {
  it("returns the received prices when nothing is missing", () => {
    const cache = createTokenPricesCache(TTL);

    const { pricesData, unexpectedMissingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n), [BTC]: price(2n) },
      now: 1_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(1n), [BTC]: price(2n) });
    expect(unexpectedMissingAddresses).toEqual([]);
  });

  it("restores a recently seen token missing in the response and reports it", () => {
    const cache = createTokenPricesCache(TTL);

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const { pricesData, unexpectedMissingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(3n) },
      now: 2_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(3n), [BTC]: price(2n) });
    expect(unexpectedMissingAddresses).toEqual([BTC]);
  });

  it("restores tokens expected to disappear while fresh, but does not report them", () => {
    const cache = createTokenPricesCache(TTL);

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [TON]: price(2n) }, now: 1_000 });

    const { pricesData, unexpectedMissingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n) },
      expectedMissingAddresses: new Set([TON]),
      now: 2_000,
    });

    expect(pricesData).toEqual({ [ETH]: price(1n), [TON]: price(2n) });
    expect(unexpectedMissingAddresses).toEqual([]);
  });

  it("forgets a token missing for longer than the TTL", () => {
    const cache = createTokenPricesCache(TTL);

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [TON]: price(2n) }, now: 1_000 });

    const stillFresh = cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL - 1 });
    expect(stillFresh.pricesData[TON]).toEqual(price(2n));
    expect(stillFresh.unexpectedMissingAddresses).toEqual([TON]);

    const expired = cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL });
    expect(expired.pricesData).toEqual({ [ETH]: price(1n) });
    expect(expired.unexpectedMissingAddresses).toEqual([]);

    // Once forgotten, the token does not make later responses partial
    const later = cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL + 1 });
    expect(later.unexpectedMissingAddresses).toEqual([]);
  });

  it("tracks the token again after it is back in the response", () => {
    const cache = createTokenPricesCache(TTL);

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });
    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n) }, now: 1_000 + TTL });
    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(5n) }, now: 2_000 + TTL });

    const { pricesData, unexpectedMissingAddresses } = cache.reconcile({
      chainId: CHAIN_ID,
      pricesData: { [ETH]: price(1n) },
      now: 3_000 + TTL,
    });

    expect(pricesData[BTC]).toEqual(price(5n));
    expect(unexpectedMissingAddresses).toEqual([BTC]);
  });

  it("keeps caches of different chains apart", () => {
    const cache = createTokenPricesCache(TTL);

    cache.reconcile({ chainId: CHAIN_ID, pricesData: { [ETH]: price(1n), [BTC]: price(2n) }, now: 1_000 });

    const otherChain = cache.reconcile({ chainId: 43114, pricesData: { [ETH]: price(7n) }, now: 2_000 });

    expect(otherChain.pricesData).toEqual({ [ETH]: price(7n) });
    expect(otherChain.unexpectedMissingAddresses).toEqual([]);
  });
});
