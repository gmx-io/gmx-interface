import { describe, expect, it } from "vitest";

import type { MultichainMarketTokensBalances } from "domain/multichain/types";
import type { GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { expandDecimals } from "lib/numbers";
import type { ProgressiveTokensData } from "sdk/utils/tokens/types";

import { sortGmTokensDefault } from "./sortGmTokensDefault";

const SUPPLY_BY_ADDRESS = { A: 300n, B: 100n, C: 200n };

const marketsInfoData = Object.fromEntries(
  Object.keys(SUPPLY_BY_ADDRESS).map((address) => [address, { marketTokenAddress: address, isDisabled: false }])
) as unknown as GlvAndGmMarketsInfoData;

const marketTokensData = Object.fromEntries(
  Object.entries(SUPPLY_BY_ADDRESS).map(([address, supply]) => [
    address,
    { address, decimals: 18, totalSupply: expandDecimals(supply, 18), prices: { minPrice: expandDecimals(1, 30) } },
  ])
) as unknown as ProgressiveTokensData;

const multichainMarketTokensBalances = {
  C: { totalBalanceUsd: expandDecimals(1, 30) },
} as unknown as MultichainMarketTokensBalances;

function getSortedAddresses(pinnedAddresses?: string[]) {
  return sortGmTokensDefault({
    marketsInfoData,
    marketTokensData,
    multichainMarketTokensBalances,
    pinnedAddresses,
  }).map((token) => token.address);
}

describe("sortGmTokensDefault", () => {
  it("sorts by balance, then TVL", () => {
    expect(getSortedAddresses()).toEqual(["C", "A", "B"]);
  });

  it("puts pinned tokens before balance and TVL", () => {
    expect(getSortedAddresses(["B"])).toEqual(["B", "C", "A"]);
  });
});
