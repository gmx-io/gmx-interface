import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE_FUJI } from "configs/chains";
import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import { hydrateMarketInfo } from "utils/markets";
import { expandDecimals } from "utils/numbers";

import { getLiquidationPriceImpactDeltaUsd } from "../utils";

describe("liquidation impact", () => {
  it("caps exit and stored impact in the order used by the chain SEC-49", () => {
    const usd = expandDecimals(1, 30);
    const market = mockMarginCheckMarketInfo(mockTokensData(), {
      maxPositionImpactFactorForLiquidations: usd / 100n,
      maxPositionImpactFactorNegative: usd / 10n,
    });
    const token = { ...market.indexToken, prices: { minPrice: 19n * usd, maxPrice: 20n * usd } };
    const tokensData = {
      [market.longToken.address]: market.longToken,
      [market.shortToken.address]: market.shortToken,
      [token.address]: token,
    };
    const tokenUnit = expandDecimals(1, token.decimals);

    for (const chainId of [ARBITRUM, AVALANCHE_FUJI] as const) {
      const marketInfo = hydrateMarketInfo({ chainId, rawMarketInfo: market, tokensData })!;
      for (const [pendingTokens, useMaxPriceImpact, newRuleUsd, oldRuleUsd] of [
        [-1n, false, -20n, -10n],
        [-6n, false, -100n, -10n],
        [1n, false, 0n, 0n],
        [-1n, true, -30n, -10n],
        [1n, true, 0n, -10n],
      ] as const) {
        const impact = getLiquidationPriceImpactDeltaUsd({
          marketInfo,
          sizeInUsd: 1000n * usd,
          sizeInTokens: 50n * tokenUnit,
          pendingImpactAmount: pendingTokens * tokenUnit,
          isLong: false,
          useMaxPriceImpact,
        });
        expect(impact).toBe((chainId === ARBITRUM ? newRuleUsd : oldRuleUsd) * usd);
      }
    }
  });
});
