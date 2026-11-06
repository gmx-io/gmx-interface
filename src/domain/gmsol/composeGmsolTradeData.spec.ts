import { expect, it } from "vitest";

import { GMSOL_MARKETS } from "config/gmsol/markets";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { composeGmsolMarkets, hasGmsolListedMarketPrices } from "./markets/composeGmsolMarkets";
import { resolveGmsolTokensData } from "./tokens/resolveGmsolTokensData";

const market = GMSOL_MARKETS[0];

function token(address: string) {
  return { address, decimals: 1, symbol: address, name: address, prices: { minPrice: 1n, maxPrice: 1n } };
}

function tokens(includeIndex: boolean): TokensData {
  return {
    ...(includeIndex ? { [market.indexTokenAddress]: token(market.indexTokenAddress) } : {}),
    [market.longTokenAddress]: token(market.longTokenAddress),
    [market.shortTokenAddress]: token(market.shortTokenAddress),
  } as TokensData;
}

const raw = {
  [market.marketTokenAddress]: {
    marketTokenAddress: market.marketTokenAddress,
    indexTokenAddress: market.indexTokenAddress,
    longTokenAddress: market.longTokenAddress,
    shortTokenAddress: market.shortTokenAddress,
    isDisabled: false,
  },
} as unknown as RawMarketsInfoData;

it("keeps a missing ticker's last price only within the cache TTL", () => {
  const complete = resolveGmsolTokensData({
    tokensData: tokens(true),
    receivedAt: 0,
    rawMarketsInfoData: raw,
    lastComplete: undefined,
  });
  const withinTtl = resolveGmsolTokensData({
    tokensData: tokens(false),
    receivedAt: PRICES_CACHE_TTL - 1,
    rawMarketsInfoData: raw,
    lastComplete: complete.lastComplete,
  });
  const pastTtl = resolveGmsolTokensData({
    tokensData: tokens(false),
    receivedAt: PRICES_CACHE_TTL,
    rawMarketsInfoData: raw,
    lastComplete: complete.lastComplete,
  });

  expect(withinTtl.tokensData?.[market.indexTokenAddress]).toBe(complete.tokensData?.[market.indexTokenAddress]);
  expect(withinTtl.pricesUpdatedAt).toBe(0);
  expect(pastTtl.tokensData?.[market.indexTokenAddress]).toBeUndefined();
  expect(composeGmsolMarkets(raw, pastTtl.tokensData!).marketsAddresses).not.toContain(market.marketTokenAddress);
  expect(composeGmsolMarkets(raw, complete.tokensData!).marketsAddresses).toContain(market.marketTokenAddress);
});

it("keeps a disabled market so its positions stay listed", () => {
  const disabled = {
    [market.marketTokenAddress]: { ...raw[market.marketTokenAddress], isDisabled: true },
  } as unknown as RawMarketsInfoData;

  expect(composeGmsolMarkets(disabled, tokens(true)).marketsAddresses).toContain(market.marketTokenAddress);
  expect(hasGmsolListedMarketPrices(disabled, tokens(false))).toBe(true);
});
