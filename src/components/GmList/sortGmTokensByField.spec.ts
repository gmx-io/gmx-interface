import { describe, expect, it } from "vitest";

import type { MarketsInfoData } from "domain/synthetics/markets";
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
});
