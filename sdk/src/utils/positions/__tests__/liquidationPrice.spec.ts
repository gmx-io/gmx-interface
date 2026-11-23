import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import { mockMarginCheckMarketInfo, mockMarketsInfoData, mockTokensData } from "test/mock";
import { bigMath } from "utils/bigmath";
import type { MarketInfo } from "utils/markets/types";
import { applyFactor, expandDecimals, PRECISION } from "utils/numbers";
import { getLiquidationPrice } from "utils/positions";
import { convertToUsd, getTokenData } from "utils/tokens";

const usd = (value: string) => parseUnits(value, 30);
const eth = (value: string) => parseUnits(value, 18);

describe("gmsol liquidation price", () => {
  it("solves index collateral funding at the liquidation price FESOL-57", () => {
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
            usd("1007.6") / 19n
          );
        }
      }
    }
  });
});

describe("EVM liquidation price", () => {
  it("values the funding owed in index-equivalent collateral at the liquidation price", () => {
    const btcPrices = { minPrice: usd("100000"), maxPrice: usd("100000") };
    const tokensData = mockTokensData({
      ETH: { prices: { minPrice: usd("2238.122929246671"), maxPrice: usd("2238.122929246671") } },
      BTC: { isSynthetic: true, prices: btcPrices },
      WBTC: { address: "WBTC", name: "Wrapped Bitcoin", symbol: "BTC", decimals: 18, prices: btcPrices },
    });
    const liquidationFactor = usd("0.005");
    const minCollateralUsd = usd("1");
    const weth = { market: "ETH-ETH-USDC", collateral: "ETH", feeFactor: usd("0.0007"), impactFactor: usd("0.01") };

    const cases: {
      name: string;
      market: string;
      collateral: string;
      isLong: boolean;
      sizeInUsd: bigint;
      sizeInTokens: bigint;
      collateralAmount: bigint;
      fundingFeeAmount: bigint;
      borrowingUsd: bigint;
      feeFactor: bigint;
      impactFactor: bigint;
      onChainPrice?: bigint;
      hasPrice?: false;
    }[] = [
      {
        // Reader.isPositionLiquidatable flips at onChainPrice for this position at Arbitrum block 521637011
        name: "recorded WETH short",
        ...weth,
        isLong: false,
        sizeInUsd: usd("2740036.31980427626177387123979331729"),
        sizeInTokens: 799909837986426323532n,
        collateralAmount: 587819787400706175153n,
        fundingFeeAmount: 44129191041547970203n,
        borrowingUsd: usd("101994.985119321664697627456589705987"),
        feeFactor: usd("0.0006"),
        impactFactor: 0n,
        onChainPrice: usd("10236.1443"),
      },
      {
        name: "WETH long",
        ...weth,
        isLong: true,
        sizeInUsd: usd("12000"),
        sizeInTokens: eth("5"),
        collateralAmount: eth("1"),
        fundingFeeAmount: eth("0.05"),
        borrowingUsd: usd("30"),
      },
      {
        name: "WETH short",
        ...weth,
        isLong: false,
        sizeInUsd: usd("10000"),
        sizeInTokens: eth("4"),
        collateralAmount: eth("1.5"),
        fundingFeeAmount: eth("0.1"),
        borrowingUsd: usd("20"),
      },
      {
        name: "short profit covers funding exceeding collateral",
        ...weth,
        isLong: false,
        sizeInUsd: usd("10000"),
        sizeInTokens: eth("2"),
        collateralAmount: eth("1"),
        fundingFeeAmount: eth("3"),
        borrowingUsd: usd("20"),
      },
      {
        name: "no funding or fees",
        ...weth,
        isLong: true,
        sizeInUsd: usd("12000"),
        sizeInTokens: eth("5"),
        collateralAmount: eth("1"),
        fundingFeeAmount: 0n,
        borrowingUsd: 0n,
        feeFactor: 0n,
        impactFactor: 0n,
      },
      {
        name: "18-decimal collateral for an 8-decimal index",
        market: "BTC-WBTC-USDC",
        collateral: "WBTC",
        isLong: true,
        sizeInUsd: usd("50000"),
        sizeInTokens: 50_000_000n,
        collateralAmount: eth("0.1"),
        fundingFeeAmount: eth("0.002"),
        borrowingUsd: usd("25"),
        feeFactor: usd("0.0007"),
        impactFactor: usd("0.01"),
      },
      {
        name: "short size equal to the collateral net of funding",
        ...weth,
        isLong: false,
        sizeInUsd: usd("4800"),
        sizeInTokens: eth("2"),
        collateralAmount: eth("2.1"),
        fundingFeeAmount: eth("0.1"),
        borrowingUsd: 0n,
        hasPrice: false,
      },
    ];

    for (const c of cases) {
      const marketInfo = mockMarketsInfoData(tokensData, [c.market], {
        [c.market]: {
          minCollateralFactorForLiquidation: liquidationFactor,
          positionFeeFactorForBalanceWasNotImproved: c.feeFactor,
          maxPositionImpactFactorForLiquidations: c.impactFactor,
        },
      })[c.market];
      const collateralToken = getTokenData(tokensData, c.collateral)!;
      const toCollateralUsd = (amount: bigint) =>
        convertToUsd(amount, collateralToken.decimals, collateralToken.prices.minPrice)!;

      const getRemainingCollateralUsd = (price: bigint) => {
        const toUsd = (amount: bigint, decimals: number) => (amount * price) / expandDecimals(1, decimals);
        const positionValueUsd = toUsd(c.sizeInTokens, marketInfo.indexToken.decimals);
        return (
          toUsd(c.collateralAmount - c.fundingFeeAmount, collateralToken.decimals) +
          (c.isLong ? positionValueUsd - c.sizeInUsd : c.sizeInUsd - positionValueUsd) -
          applyFactor(c.sizeInUsd, c.impactFactor) -
          c.borrowingUsd -
          applyFactor(c.sizeInUsd, c.feeFactor)
        );
      };
      const thresholdUsd = bigMath.max(applyFactor(c.sizeInUsd, liquidationFactor), minCollateralUsd);
      const [safeSide, liquidatableSide] = c.isLong ? [1_000_001n, 999_999n] : [999_999n, 1_000_001n];

      // getPositionInfo passes the exact funding amount, other callers only its USD value
      for (const fundingFeeAmount of [c.fundingFeeAmount, undefined]) {
        const params = {
          marketInfo,
          collateralToken,
          sizeInUsd: c.sizeInUsd,
          sizeInTokens: c.sizeInTokens,
          collateralAmount: c.collateralAmount,
          collateralUsd: toCollateralUsd(c.collateralAmount),
          pendingFundingFeesUsd: toCollateralUsd(c.fundingFeeAmount),
          fundingFeeAmount,
          pendingBorrowingFeesUsd: c.borrowingUsd,
          pendingImpactAmount: 0n,
          minCollateralUsd,
          isLong: c.isLong,
          useMaxPriceImpact: true,
          userReferralInfo: undefined,
        };
        const liquidationPrice = getLiquidationPrice(params);
        expect(
          getLiquidationPrice({
            ...params,
            collateralToken: { ...collateralToken, prices: { minPrice: 0n, maxPrice: 0n } },
          }),
          c.name
        ).toBe(fundingFeeAmount === undefined && params.pendingFundingFeesUsd !== 0n ? undefined : liquidationPrice);

        if (c.hasPrice === false) {
          expect(liquidationPrice, c.name).toBeUndefined();
          continue;
        }

        expect(liquidationPrice, c.name).toBeDefined();
        if (c.onChainPrice !== undefined) {
          expect(bigMath.abs(liquidationPrice! - c.onChainPrice) * 1_000_000n < c.onChainPrice, c.name).toBe(true);
        }
        const safeUsd = getRemainingCollateralUsd((liquidationPrice! * safeSide) / 1_000_000n);
        const liquidatableUsd = getRemainingCollateralUsd((liquidationPrice! * liquidatableSide) / 1_000_000n);
        expect(safeUsd > thresholdUsd, c.name).toBe(true);
        expect(liquidatableUsd < thresholdUsd, c.name).toBe(true);
      }
    }
  });
});
