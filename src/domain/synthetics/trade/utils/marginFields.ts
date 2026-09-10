import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getMaxAllowedLeverage } from "domain/synthetics/markets";
import { getIsPositionLiquidatableAtPrice } from "domain/synthetics/trade/utils/warnings";
import { calculateDisplayDecimals, formatAmountFree, limitDecimals, parseValue, PRECISION } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getPositionFee } from "sdk/utils/fees";
import { getCappedPositionImpactUsd, getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";
import { applyFactor } from "sdk/utils/numbers";
import { getLiquidationPrice } from "sdk/utils/positions";
import type { UserReferralInfo } from "sdk/utils/referrals/types";
import { convertToTokenAmount, convertToUsd, getIsEquivalentTokens } from "sdk/utils/tokens";
import type { TokenData } from "sdk/utils/tokens/types";
import { convertToTokenAmountForIncrease } from "sdk/utils/tokens/utils";
import { getIncreaseResultingPositionMarginState } from "sdk/utils/trade/increaseMarginCheck";

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export type CalcMaxSizeDeltaParams = {
  marketInfo: MarketInfo;
  initialCollateralUsd: bigint;
  markPrice: bigint;
  toTokenDecimals: number;
  isLong: boolean;
  longLiquidity: bigint | undefined;
  shortLiquidity: bigint | undefined;
  existingPosition?: {
    sizeInUsd: bigint;
    collateralUsd: bigint;
    pendingBorrowingFeesUsd: bigint;
    pendingFundingFeesUsd: bigint;
    sizeInTokens?: bigint;
    collateralAmount?: bigint;
    pendingImpactAmount?: bigint;
  };
  collateralToken?: TokenData;
  minCollateralUsd?: bigint;
  userReferralInfo?: UserReferralInfo;
  proDiscountFactor?: bigint;
  indexPriceForEvaluation?: bigint;
  uiFeeFactor?: bigint;
  baseCollateralUsd?: bigint;
};

const RESULTING_POSITION_BISECTION_STEPS = 24;

function getBaseCollateralUsd(params: CalcMaxSizeDeltaParams): bigint {
  if (params.baseCollateralUsd !== undefined) {
    return params.baseCollateralUsd;
  }

  const pendingFeesUsd =
    (params.existingPosition?.pendingBorrowingFeesUsd ?? 0n) + (params.existingPosition?.pendingFundingFeesUsd ?? 0n);

  return params.initialCollateralUsd - pendingFeesUsd;
}

function capSizeDeltaByResultingPositionMargin({
  sizeDeltaUsdBound,
  baseCollateralUsd,
  conversionPrice,
  params,
}: {
  sizeDeltaUsdBound: bigint;
  baseCollateralUsd: bigint;
  conversionPrice: bigint;
  params: CalcMaxSizeDeltaParams;
}): bigint {
  const { marketInfo, markPrice, isLong, existingPosition, collateralToken, minCollateralUsd } = params;

  if (!collateralToken || minCollateralUsd === undefined || sizeDeltaUsdBound <= 0n) {
    return sizeDeltaUsdBound;
  }

  let resultingExistingPosition:
    | { sizeInUsd: bigint; sizeInTokens: bigint; collateralAmount: bigint; pendingImpactAmount: bigint }
    | undefined;

  if (existingPosition) {
    const { sizeInUsd, sizeInTokens, collateralAmount, pendingImpactAmount } = existingPosition;

    if (sizeInTokens === undefined || collateralAmount === undefined || pendingImpactAmount === undefined) {
      return sizeDeltaUsdBound;
    }

    resultingExistingPosition = { sizeInUsd, sizeInTokens, collateralAmount, pendingImpactAmount };
  }

  const isSizeDeltaValid = (sizeDeltaUsd: bigint): boolean => {
    if (sizeDeltaUsd <= 0n) return true;

    const sizeDeltaInTokens = convertToTokenAmountForIncrease(
      sizeDeltaUsd,
      marketInfo.indexToken.decimals,
      conversionPrice,
      isLong
    );

    if (sizeDeltaInTokens === undefined || sizeDeltaInTokens <= 0n) return true;

    const { balanceWasImproved } = getCappedPositionImpactUsd(marketInfo, sizeDeltaUsd, isLong, true, {
      shouldCapNegativeImpact: false,
      sizeDeltaInTokens,
    });

    const { positionFeeUsd } = getPositionFee(
      marketInfo,
      sizeDeltaUsd,
      balanceWasImproved,
      params.userReferralInfo,
      undefined,
      params.proDiscountFactor
    );
    const uiFeeUsd = applyFactor(sizeDeltaUsd, params.uiFeeFactor ?? 0n);

    const collateralDeltaUsd = baseCollateralUsd - positionFeeUsd - uiFeeUsd;
    const collateralPrice =
      params.indexPriceForEvaluation !== undefined && getIsEquivalentTokens(collateralToken, marketInfo.indexToken)
        ? params.indexPriceForEvaluation
        : collateralToken.prices.minPrice;
    const collateralDeltaAmount = convertToTokenAmount(collateralDeltaUsd, collateralToken.decimals, collateralPrice) ?? 0n;

    const marginState = getIncreaseResultingPositionMarginState({
      marketInfo,
      collateralToken,
      isLong,
      existingPosition: resultingExistingPosition,
      sizeDeltaUsd,
      sizeDeltaInTokens,
      collateralDeltaAmount,
      minCollateralUsd,
      userReferralInfo: params.userReferralInfo,
      proDiscountFactor: params.proDiscountFactor,
      indexPriceForEvaluation: params.indexPriceForEvaluation,
    });

    if (marginState?.isLiquidatable) {
      return false;
    }

    if (params.indexPriceForEvaluation === undefined && resultingExistingPosition !== undefined) {
      const nextCollateralAmount = resultingExistingPosition.collateralAmount + collateralDeltaAmount;
      const nextLiqPrice = getLiquidationPrice({
        marketInfo,
        collateralToken,
        sizeInUsd: resultingExistingPosition.sizeInUsd + sizeDeltaUsd,
        sizeInTokens: resultingExistingPosition.sizeInTokens + sizeDeltaInTokens,
        collateralAmount: nextCollateralAmount,
        collateralUsd:
          convertToUsd(nextCollateralAmount, collateralToken.decimals, collateralToken.prices.minPrice) ?? 0n,
        minCollateralUsd: minCollateralUsd!,
        pendingBorrowingFeesUsd: 0n,
        pendingFundingFeesUsd: 0n,
        pendingImpactAmount: resultingExistingPosition.pendingImpactAmount,
        isLong,
        userReferralInfo: params.userReferralInfo,
      });

      if (getIsPositionLiquidatableAtPrice({ liqPrice: nextLiqPrice, price: markPrice, isLong })) {
        return false;
      }
    }

    return true;
  };

  if (isSizeDeltaValid(sizeDeltaUsdBound)) {
    return sizeDeltaUsdBound;
  }

  let low = 0n;
  let high = sizeDeltaUsdBound;

  for (let i = 0; i < RESULTING_POSITION_BISECTION_STEPS && low < high; i++) {
    const mid = (low + high) / 2n;

    if (mid === low) break;

    if (isSizeDeltaValid(mid)) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }

  return low;
}

/**
 * Computes the maximum size delta in real index tokens so that the resulting
 * position leverage does not exceed the market's max allowed leverage,
 * accounting for position fees and existing position.
 *
 * Formula (solving `(E_s + S) / (E_c + C - S·f/P) ≤ L/BP`), where C is the base collateral
 * and f the position fee factor plus the ui fee factor:
 *   S_max = (L·(E_c + C) − E_s·BP) · P / (BP·P + L·f)
 *
 * The result is further capped by the available liquidity.
 */
export function calcMaxSizeDeltaInUsdByLeverage(params: CalcMaxSizeDeltaParams): bigint | undefined {
  const {
    marketInfo,
    initialCollateralUsd,
    markPrice,
    toTokenDecimals,
    isLong,
    longLiquidity,
    shortLiquidity,
    existingPosition,
  } = params;

  if (initialCollateralUsd <= 0n) return undefined;

  const maxAllowedLeverage = getMaxAllowedLeverage({
    marketAddress: marketInfo.marketTokenAddress,
    minCollateralFactor: marketInfo.minCollateralFactor,
    minCollateralFactorForLiquidation: marketInfo.minCollateralFactorForLiquidation,
    positionFeeFactorForBalanceWasNotImproved: marketInfo.positionFeeFactorForBalanceWasNotImproved,
  });
  if (!maxAllowedLeverage || maxAllowedLeverage <= 0) return undefined;

  const leverageBigInt = BigInt(maxAllowedLeverage);

  const existingSizeUsd = existingPosition?.sizeInUsd ?? 0n;
  const existingCollateralUsd = existingPosition?.collateralUsd ?? 0n;
  const uiFeeFactor = params.uiFeeFactor ?? 0n;
  const baseCollateralUsd = getBaseCollateralUsd(params);
  const conversionPrice = params.indexPriceForEvaluation ?? markPrice;

  const totalCollateralUsd = existingCollateralUsd + baseCollateralUsd;

  const baseNumerator = leverageBigInt * totalCollateralUsd - existingSizeUsd * BASIS_POINTS_DIVISOR_BIGINT;

  if (baseNumerator <= 0n) return undefined;

  const conservativeBound = bigMath.mulDiv(
    baseNumerator,
    PRECISION,
    BASIS_POINTS_DIVISOR_BIGINT * PRECISION +
      leverageBigInt * (marketInfo.positionFeeFactorForBalanceWasNotImproved + uiFeeFactor)
  );

  const conservativeBoundInTokens = convertToTokenAmountForIncrease(
    conservativeBound,
    toTokenDecimals,
    conversionPrice,
    isLong
  );
  const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, conservativeBound, isLong, {
    sizeDeltaInTokens: conservativeBoundInTokens,
  });
  const positionFeeFactor = balanceWasImproved
    ? marketInfo.positionFeeFactorForBalanceWasImproved
    : marketInfo.positionFeeFactorForBalanceWasNotImproved;

  const structuralBoundUsd = bigMath.mulDiv(
    baseNumerator,
    PRECISION,
    BASIS_POINTS_DIVISOR_BIGINT * PRECISION + leverageBigInt * (positionFeeFactor + uiFeeFactor)
  );

  const leverageBoundUsd = capSizeDeltaByResultingPositionMargin({
    sizeDeltaUsdBound: structuralBoundUsd,
    baseCollateralUsd,
    conversionPrice,
    params,
  });

  if (leverageBoundUsd <= 0n) return undefined;

  const toIndexTokenAmount = (amountUsd: bigint | undefined): bigint | undefined => {
    if (amountUsd === undefined || amountUsd <= 0n) return undefined;
    const tokenAmount = convertToTokenAmount(amountUsd, toTokenDecimals, conversionPrice);
    if (tokenAmount === undefined || tokenAmount <= 0n) return undefined;
    return tokenAmount;
  };

  const leverageBound = toIndexTokenAmount(leverageBoundUsd);
  const liquidityBound = toIndexTokenAmount(isLong ? longLiquidity : shortLiquidity);

  if (leverageBound === undefined) return liquidityBound;
  if (liquidityBound === undefined) return leverageBound;

  return leverageBound < liquidityBound ? leverageBound : liquidityBound;
}

/**
 * Computes the current size as a percentage (0–100) of the max allowed size.
 */
export function calcSizePercentage(currentSizeInTokens: bigint, maxSizeInTokens: bigint | undefined): number {
  if (maxSizeInTokens === undefined || maxSizeInTokens <= 0n) return 0;
  const raw = Number(bigMath.mulDiv(currentSizeInTokens, BASIS_POINTS_DIVISOR_BIGINT, maxSizeInTokens));
  return clampPercentage(raw / 100);
}

/**
 * Converts a percentage (0–100) to an index token amount.
 * At 100 % returns `maxSizeInTokens` exactly (no rounding loss).
 */
export function calcSizeAmountByPercentage(
  percentage: number,
  maxSizeInTokens: bigint | undefined
): bigint | undefined {
  if (maxSizeInTokens === undefined || maxSizeInTokens <= 0n) return undefined;
  const normalizedPercentage = Math.round(clampPercentage(percentage));
  if (normalizedPercentage === 100) return maxSizeInTokens;
  return bigMath.mulDiv(maxSizeInTokens, BigInt(normalizedPercentage), 100n);
}

/**
 * Returns the margin input amount as a percentage (0–100) of the token balance.
 */
export function calcMarginPercentage(
  inputAmountStr: string,
  balance: bigint | undefined,
  decimals: number | undefined
): number {
  if (balance === undefined || balance === 0n || decimals === undefined) return 0;
  const inputAmount = parseValue(inputAmountStr || "0", decimals) ?? 0n;
  if (inputAmount === 0n) return 0;
  const percentage = Number(bigMath.divRound(inputAmount * 100n, balance));
  return clampPercentage(percentage);
}

/**
 * Converts a percentage (0–100) of the balance to a formatted token amount string.
 * At 100 % returns the full-precision amount (no decimal truncation).
 */
export function calcMarginAmountByPercentage(
  percentage: number,
  maxAvailableAmount: bigint,
  decimals: number,
  visualMultiplier: number | undefined,
  isStable: boolean | undefined
): string {
  const normalizedPercentage = Math.round(clampPercentage(percentage));
  const amount = (maxAvailableAmount * BigInt(normalizedPercentage)) / 100n;

  if (normalizedPercentage === 100) {
    return formatAmountFree(amount, decimals);
  }

  return limitDecimals(
    formatAmountFree(amount, decimals),
    calculateDisplayDecimals(amount, decimals, visualMultiplier, isStable)
  );
}
