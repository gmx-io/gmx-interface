import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import { mockMarginCheckMarketInfo, mockTokensData } from "test/mock";
import type { MarketInfo } from "utils/markets/types";
import { PRECISION } from "utils/numbers";
import { getLiquidationPrice } from "utils/positions";

describe("gmsol liquidation price", () => {
  it("solves index collateral funding at the liquidation price without changing EVM math FESOL-57", () => {
    // Rust 8af1e70c: $1,000 size / 10 tokens, $5 floor, $2 borrowing and $0.60 close fee.
    for (const [isLong, collateral, funding, expected] of [
      [true, 10n, 1n, parseUnits("53.03157894736842", 30)],
      [false, 10n, 1n, parseUnits("992.4", 30)],
      [true, 10n, 0n, parseUnits("50.38", 30)],
      [false, 10n, 0n, undefined],
      [false, 11n, 1n, undefined],
      [false, 12n, 1n, undefined],
      [true, 10n, 20n, undefined],
    ] as const) {
      for (const price of [100n, 120n]) {
        const marketInfo: MarketInfo = {
          ...mockMarginCheckMarketInfo(
            mockTokensData({
              BTC: { decimals: 6, prices: { minPrice: price * PRECISION, maxPrice: price * PRECISION } },
            }),
            {
              longInterestUsd: 20_000n * PRECISION,
              shortInterestUsd: 10_000n * PRECISION,
              positionFeeFactorForBalanceWasImproved: 6n * 10n ** 26n,
              positionFeeFactorForBalanceWasNotImproved: 6n * 10n ** 26n,
            }
          ),
          tradeMath: "gmsol",
          minCollateralUsd: 5n * PRECISION,
        };
        const params = {
          marketInfo,
          collateralToken: marketInfo.indexToken,
          collateralAmount: collateral * 1_000_000n,
          collateralUsd: collateral * price * PRECISION,
          sizeInUsd: 1000n * PRECISION,
          sizeInTokens: 10_000_000n,
          pendingFundingFeesUsd: funding * price * PRECISION,
          pendingBorrowingFeesUsd: 2n * PRECISION,
          pendingImpactAmount: 0n,
          minCollateralUsd: PRECISION,
          isLong,
          userReferralInfo: undefined,
        };
        for (const fundingFeeAmount of [undefined, funding * 1_000_000n]) {
          const actual = getLiquidationPrice({ ...params, fundingFeeAmount });
          if (expected === undefined) expect(actual).toBeUndefined();
          else {
            expect(actual).toBeDefined();
            // One Rust unit-price step for a token with six decimals.
            expect(actual! - expected).toBeGreaterThanOrEqual(0n);
            expect(actual! - expected).toBeLessThan(10n ** 16n);
          }
        }
        if (isLong && collateral === 10n && funding === 1n) {
          expect(getLiquidationPrice({ ...params, marketInfo: { ...marketInfo, tradeMath: undefined } })).toBe(
            parseUnits(price === 100n ? "55.38" : "56.38", 30)
          );
        }
      }
    }
  });
});
