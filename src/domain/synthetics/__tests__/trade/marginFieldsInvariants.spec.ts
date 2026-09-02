import { describe, expect, it } from "vitest";

import { expandDecimals, USD_DECIMALS } from "lib/numbers";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { getPositionFee } from "sdk/utils/fees";
import type { MarketInfo } from "sdk/utils/markets/types";
import { applyFactor } from "sdk/utils/numbers";
import { convertToTokenAmount, convertToUsd } from "sdk/utils/tokens";
import { convertToTokenAmountForIncrease } from "sdk/utils/tokens/utils";
import { getIncreaseResultingPositionMarginState } from "sdk/utils/trade/increaseMarginCheck";

import { calcMaxSizeDeltaInUsdByLeverage } from "../../trade/utils/marginFields";
import type { CalcMaxSizeDeltaParams } from "../../trade/utils/marginFields";

/**
 * Deterministic PRNG — fast-check is not a dependency, and a fixed seed keeps a failing
 * case reproducible from the run alone.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260820;

const tokensData = mockTokensData();
const usdc = tokensData.USDC;
const ETH_PRICE = expandDecimals(1200, USD_DECIMALS);
const INDEX_DECIMALS = 18;

// minCollateralFactor = 5e27 (0.5%) with equal liqMCF → maxAllowedLeverage = 100x
const MCF_100X = expandDecimals(5, 27);

const FEE_FACTORS = [expandDecimals(5, 26), expandDecimals(7, 26), expandDecimals(1, 27)];
const UI_FEE_FACTORS = [0n, expandDecimals(5, 26), expandDecimals(1, 27)];
const PRO_DISCOUNT_FACTORS = [undefined, expandDecimals(2, 29), expandDecimals(5, 29)];
// scaled by the resulting open interest, the last two overtake the market minCollateralFactor
const OI_MULTIPLIERS = [0n, expandDecimals(5, 22), expandDecimals(1, 23)];

function makeMarketInfo(feeFactor: bigint, oiMultiplier: bigint): MarketInfo {
  return mockMarketsInfoData(tokensData, ["ETH-ETH-USDC"], {
    "ETH-ETH-USDC": {
      minCollateralFactor: MCF_100X,
      minCollateralFactorForLiquidation: MCF_100X,
      positionFeeFactorForBalanceWasImproved: feeFactor,
      positionFeeFactorForBalanceWasNotImproved: feeFactor,
      minCollateralFactorForOpenInterestLong: oiMultiplier,
      minCollateralFactorForOpenInterestShort: oiMultiplier,
    },
  })["ETH-ETH-USDC"];
}

/**
 * Re-implements what the tradebox does with the size the cap hands it: value it at the price
 * the order will be sized at, deduct the same size-dependent fees, and run the blocking check.
 */
function isSizeDeltaAccepted(sizeDeltaUsd: bigint, params: CalcMaxSizeDeltaParams): boolean {
  const conversionPrice = params.indexPriceForEvaluation ?? params.markPrice;
  const sizeDeltaInTokens = convertToTokenAmountForIncrease(
    sizeDeltaUsd,
    INDEX_DECIMALS,
    conversionPrice,
    params.isLong
  )!;

  const { positionFeeUsd } = getPositionFee(
    params.marketInfo,
    sizeDeltaUsd,
    false,
    params.userReferralInfo,
    undefined,
    params.proDiscountFactor
  );
  const uiFeeUsd = applyFactor(sizeDeltaUsd, params.uiFeeFactor ?? 0n);

  const pendingFeesUsd =
    params.baseCollateralUsd !== undefined
      ? 0n
      : (params.existingPosition?.pendingBorrowingFeesUsd ?? 0n) +
        (params.existingPosition?.pendingFundingFeesUsd ?? 0n);

  const collateralDeltaUsd =
    (params.baseCollateralUsd ?? params.initialCollateralUsd) - pendingFeesUsd - positionFeeUsd - uiFeeUsd;
  const collateralDeltaAmount = convertToTokenAmount(collateralDeltaUsd, usdc.decimals, usdc.prices.minPrice)!;

  const state = getIncreaseResultingPositionMarginState({
    marketInfo: params.marketInfo,
    collateralToken: usdc,
    isLong: params.isLong,
    existingPosition: params.existingPosition && {
      sizeInUsd: params.existingPosition.sizeInUsd,
      sizeInTokens: params.existingPosition.sizeInTokens!,
      collateralAmount: params.existingPosition.collateralAmount!,
      pendingImpactAmount: params.existingPosition.pendingImpactAmount!,
    },
    sizeDeltaUsd,
    sizeDeltaInTokens,
    collateralDeltaAmount,
    minCollateralUsd: params.minCollateralUsd!,
    userReferralInfo: params.userReferralInfo,
    proDiscountFactor: params.proDiscountFactor,
    indexPriceForEvaluation: params.indexPriceForEvaluation,
  });

  return state?.isLiquidatable !== true;
}

function structuralOnlyBound(params: CalcMaxSizeDeltaParams) {
  return calcMaxSizeDeltaInUsdByLeverage({ ...params, collateralToken: undefined, minCollateralUsd: undefined });
}

/** The USD size the tradebox ends up with after the cap's token amount round-trips. */
function capSizeUsd(params: CalcMaxSizeDeltaParams): bigint | undefined {
  const tokenAmount = calcMaxSizeDeltaInUsdByLeverage(params);

  if (tokenAmount === undefined) return undefined;

  return convertToUsd(tokenAmount, INDEX_DECIMALS, params.indexPriceForEvaluation ?? params.markPrice)!;
}

type FuzzCase = { params: CalcMaxSizeDeltaParams; label: string };

function buildCase(random: () => number, index: number): FuzzCase {
  const feeFactor = FEE_FACTORS[index % FEE_FACTORS.length];
  const oiMultiplier = OI_MULTIPLIERS[Math.floor(random() * OI_MULTIPLIERS.length)];
  const marketInfo = makeMarketInfo(feeFactor, oiMultiplier);

  const isLong = random() < 0.5;
  const uiFeeFactor = UI_FEE_FACTORS[Math.floor(random() * UI_FEE_FACTORS.length)];
  const proDiscountFactor = PRO_DISCOUNT_FACTORS[Math.floor(random() * PRO_DISCOUNT_FACTORS.length)];

  const initialCollateralUsd = expandDecimals(100 + Math.floor(random() * 20000), USD_DECIMALS);

  const triggerRoll = random();
  const indexPriceForEvaluation =
    triggerRoll < 0.34 ? undefined : triggerRoll < 0.67 ? (ETH_PRICE * 90n) / 100n : (ETH_PRICE * 110n) / 100n;

  const positionRoll = random();
  let existingPosition: CalcMaxSizeDeltaParams["existingPosition"];

  if (positionRoll > 0.25) {
    const sizeInUsd = expandDecimals(1000 + Math.floor(random() * 50000), USD_DECIMALS);
    // 20x..70x, so the existing position eats most of the room the added margin buys
    const leverageBps = BigInt(20 + Math.floor(random() * 51)) * 10000n;
    const collateralUsd = (sizeInUsd * 10000n) / leverageBps;
    // mostly underwater positions — that is where the margin check binds before the leverage formula
    const isLosing = random() < 0.7;
    const moveBps = BigInt(Math.floor(random() * 2001));
    const valueFactorBps = isLong === isLosing ? 10000n - moveBps : 10000n + moveBps;
    const pendingBorrowingFeesUsd = random() < 0.3 ? expandDecimals(Math.floor(random() * 50), USD_DECIMALS) : 0n;

    existingPosition = {
      sizeInUsd,
      collateralUsd,
      pendingBorrowingFeesUsd,
      pendingFundingFeesUsd: 0n,
      sizeInTokens: convertToTokenAmount((sizeInUsd * valueFactorBps) / 10000n, INDEX_DECIMALS, ETH_PRICE)!,
      collateralAmount: convertToTokenAmount(collateralUsd, usdc.decimals, usdc.prices.minPrice)!,
      pendingImpactAmount: 0n,
    };
  }

  // half the cases hand the cap the post-swap base the slider computes from increaseAmounts
  const baseCollateralUsd =
    random() < 0.5 ? undefined : initialCollateralUsd - expandDecimals(Math.floor(random() * 90), USD_DECIMALS);

  const params: CalcMaxSizeDeltaParams = {
    marketInfo,
    initialCollateralUsd,
    markPrice: ETH_PRICE,
    toTokenDecimals: INDEX_DECIMALS,
    isLong,
    longLiquidity: expandDecimals(1_000_000_000, USD_DECIMALS),
    shortLiquidity: expandDecimals(1_000_000_000, USD_DECIMALS),
    existingPosition,
    collateralToken: usdc,
    minCollateralUsd: expandDecimals(1, USD_DECIMALS),
    userReferralInfo: undefined,
    proDiscountFactor,
    indexPriceForEvaluation,
    uiFeeFactor,
    baseCollateralUsd,
  };

  const label =
    `#${index} ${isLong ? "long" : "short"} fee=${feeFactor} uiFee=${uiFeeFactor} pro=${proDiscountFactor} ` +
    `eval=${indexPriceForEvaluation} position=${existingPosition ? "yes" : "no"} base=${baseCollateralUsd}`;

  return { params, label };
}

describe("calcMaxSizeDeltaInUsdByLeverage — the cap never exceeds the blocking validation", () => {
  it("hands out sizes the resulting-position check accepts", () => {
    const random = mulberry32(SEED);

    let defined = 0;
    let marginBound = 0;
    let tightnessChecked = 0;
    /**
     * With a market order on top of an existing position the cap additionally refuses sizes whose
     * next liquidation price is already crossed (`marginFields.ts` liq-price fallback), so it is
     * legitimately stricter than the margin check alone — tightness is asserted only where the two
     * models coincide.
     */
    let conservativeByLiqPriceFallback = 0;

    for (let i = 0; i < 500; i++) {
      const { params, label } = buildCase(random, i);

      const sizeUsd = capSizeUsd(params);

      if (sizeUsd === undefined) continue;

      defined++;

      expect(sizeUsd, label).toBeGreaterThan(0n);
      expect(isSizeDeltaAccepted(sizeUsd, params), `cap must pass validation — ${label}`).toBe(true);

      const structural = structuralOnlyBound(params);
      const structuralUsd =
        structural === undefined
          ? undefined
          : convertToUsd(structural, INDEX_DECIMALS, params.indexPriceForEvaluation ?? params.markPrice)!;

      const isMarginBound = structuralUsd !== undefined && sizeUsd < (structuralUsd * 999n) / 1000n;

      if (!isMarginBound) continue;

      marginBound++;

      if (params.indexPriceForEvaluation === undefined && params.existingPosition !== undefined) {
        conservativeByLiqPriceFallback++;
        continue;
      }

      tightnessChecked++;
      expect(isSizeDeltaAccepted((sizeUsd * 101n) / 100n, params), `cap must be tight — ${label}`).toBe(false);
    }

    // the fuzz must actually reach every regime, otherwise the assertions above are vacuous
    expect(defined).toBeGreaterThan(350);
    expect(marginBound).toBeGreaterThan(200);
    expect(tightnessChecked).toBeGreaterThan(150);
    expect(conservativeByLiqPriceFallback).toBeGreaterThan(20);
  });

  it("prices the cap at the evaluation price, so a resting order is not charged a phantom loss", () => {
    const random = mulberry32(SEED + 2);

    for (let i = 0; i < 60; i++) {
      const marketInfo = makeMarketInfo(FEE_FACTORS[i % FEE_FACTORS.length], 0n);
      const isLong = random() < 0.5;
      const initialCollateralUsd = expandDecimals(500 + Math.floor(random() * 10000), USD_DECIMALS);
      const triggerFactorBps = 9000n + BigInt(Math.floor(random() * 2001));

      const base: CalcMaxSizeDeltaParams = {
        marketInfo,
        initialCollateralUsd,
        markPrice: ETH_PRICE,
        toTokenDecimals: INDEX_DECIMALS,
        isLong,
        longLiquidity: expandDecimals(1_000_000_000, USD_DECIMALS),
        shortLiquidity: expandDecimals(1_000_000_000, USD_DECIMALS),
        existingPosition: undefined,
        collateralToken: usdc,
        minCollateralUsd: expandDecimals(1, USD_DECIMALS),
        userReferralInfo: undefined,
      };

      const asMarket = capSizeUsd(base)!;
      const asResting = capSizeUsd({
        ...base,
        indexPriceForEvaluation: (ETH_PRICE * triggerFactorBps) / 10000n,
      })!;

      const label = `#${i} ${isLong ? "long" : "short"} trigger=${triggerFactorBps}bps`;

      // a fresh position evaluated at its own entry is flat, so the room is the same either way
      expect(asResting, label).toBeGreaterThan((asMarket * 99n) / 100n);
      expect(asResting, label).toBeLessThan((asMarket * 101n) / 100n);
    }
  });
});
