import { describe, expect, it } from "vitest";

import type { MarketsInfoData } from "domain/synthetics/markets";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { expandDecimals } from "lib/numbers";
import type { ProgressiveTokensData } from "sdk/utils/tokens/types";

import { sortGmTokensByField } from "./sortGmTokensByField";

const marketTokensData = {
  A: { address: "A" },
  B: { address: "B" },
} as unknown as ProgressiveTokensData;

function percent(n: number) {
  return expandDecimals(n, 28);
}

describe("sortGmTokensByField", () => {
  it("adds the launch boost when sorting by APY", () => {
    const sorted = sortGmTokensByField({
      marketsInfo: {} as MarketsInfoData,
      marketTokensData,
      orderBy: "apy",
      direction: "desc",
      marketsTokensApyData: { A: percent(10), B: percent(6) },
      marketsTokensIncentiveAprData: undefined,
      marketsTokensLidoAprData: undefined,
      marketsTokensLaunchBoostAprData: { B: percent(5) },
      performance: undefined,
      multichainMarketTokensBalances: undefined,
    });

    expect(sorted.map((token) => token.address)).toEqual(["B", "A"]);
  });

  it("sorts a pool with a non-positive pool value like a pool without performance PRO-4569", () => {
    const tokensData = {
      A: { address: "A", decimals: 18 },
      B: { address: "B", decimals: 18 },
      C: { address: "C", decimals: 18 },
    } as unknown as ProgressiveTokensData;

    const sorted = sortGmTokensByField({
      marketsInfo: {
        A: createMockMarketInfo(undefined, { poolValueMin: -expandDecimals(123, 30) }),
      } as MarketsInfoData,
      marketTokensData: tokensData,
      orderBy: "performance",
      direction: "asc",
      marketsTokensApyData: undefined,
      marketsTokensIncentiveAprData: undefined,
      marketsTokensLidoAprData: undefined,
      marketsTokensLaunchBoostAprData: undefined,
      performance: { A: -percent(1260), B: -percent(5), C: percent(5) },
      multichainMarketTokensBalances: undefined,
    });

    expect(sorted.map((token) => token.address)).toEqual(["B", "A", "C"]);
  });
});
