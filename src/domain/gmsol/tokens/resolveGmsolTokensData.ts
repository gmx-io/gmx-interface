import { PRICES_CACHE_TTL } from "lib/timeConstants";
import type { TokensData } from "sdk/utils/tokens/types";

import { buildGmsolTokensData } from "./buildGmsolTokensData";
import type { GmsolTokenPricesData } from "../gmsolOracleUtils";

export type GmsolTokensSnapshot = {
  scope: string;
  prices: GmsolTokenPricesData;
  tokensData: TokensData | undefined;
  pricesUpdatedAt: number | undefined;
};

// A client clock a few seconds behind the keeper's still reads a just-updated ticker as current.
const MAX_CLOCK_SKEW = 10_000;

function isCurrent(updatedAt: number, now: number) {
  return Number.isFinite(updatedAt) && updatedAt - now <= MAX_CLOCK_SKEW && now - updatedAt < PRICES_CACHE_TTL;
}

export function resolveGmsolTokensData({
  previous,
  scope,
  response,
  now,
}: {
  previous: GmsolTokensSnapshot | undefined;
  scope: string;
  response: GmsolTokenPricesData | undefined;
  now: number;
}): GmsolTokensSnapshot {
  const accepted = previous?.scope === scope ? previous.prices : {};
  const prices: GmsolTokenPricesData = {};

  for (const address of new Set([...Object.keys(accepted), ...Object.keys(response ?? {})])) {
    const kept = accepted[address];
    const received = response?.[address];
    const price =
      received && isCurrent(received.updatedAt, now) && !(kept && kept.updatedAt >= received.updatedAt)
        ? received
        : kept;

    if (price && isCurrent(price.updatedAt, now)) {
      prices[address] = price;
    }
  }

  const addresses = Object.keys(prices);

  if (
    previous?.scope === scope &&
    addresses.length === Object.keys(accepted).length &&
    addresses.every((address) => prices[address] === accepted[address])
  ) {
    return previous;
  }

  return {
    scope,
    prices,
    tokensData: addresses.length > 0 ? buildGmsolTokensData(prices) : undefined,
    pricesUpdatedAt:
      addresses.length > 0 ? Math.min(...addresses.map((address) => prices[address].updatedAt)) : undefined,
  };
}
