import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getMaxAllowedLeverageByMinCollateralFactor } from "domain/synthetics/markets";
import { calculateDisplayDecimals, formatAmountFree, limitDecimals, parseValue, PRECISION } from "lib/numbers";
import { bigMath } from "sdk/utils/bigmath";
import { getPriceImpactForPosition } from "sdk/utils/fees/priceImpact";
import type { MarketInfo } from "sdk/utils/markets/types";
import { convertToTokenAmount } from "sdk/utils/tokens";

// ── Percentage helpers ──────────────────────────────────────────────

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

// ── Size / leverage calculations ────────────────────────────────────

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
  };
};

/**
 * Computes the maximum size delta in real index tokens so that the resulting
 * position leverage does not exceed the market's max allowed leverage,
 * accounting for position fees and existing position.
 *
 * Formula (solving `(E_s + S) / (E_c + C - S·f/P - B) ≤ L/BP`):
 *   S_max = (L·(E_c + C − B) − E_s·BP) · P / (BP·P + L·f)
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

  const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);
  if (!maxAllowedLeverage || maxAllowedLeverage <= 0) return undefined;

  const leverageBigInt = BigInt(maxAllowedLeverage);

  const existingSizeUsd = existingPosition?.sizeInUsd ?? 0n;
  const existingCollateralUsd = existingPosition?.collateralUsd ?? 0n;
  const pendingFeesUsd =
    (existingPosition?.pendingBorrowingFeesUsd ?? 0n) + (existingPosition?.pendingFundingFeesUsd ?? 0n);

  const totalCollateralUsd = existingCollateralUsd + initialCollateralUsd - pendingFeesUsd;

  const baseNumerator = leverageBigInt * totalCollateralUsd - existingSizeUsd * BASIS_POINTS_DIVISOR_BIGINT;

  if (baseNumerator <= 0n) return undefined;

  // First pass: conservative estimate (higher fee) to determine balanceWasImproved
  const conservativeBound = bigMath.mulDiv(
    baseNumerator,
    PRECISION,
    BASIS_POINTS_DIVISOR_BIGINT * PRECISION + leverageBigInt * marketInfo.positionFeeFactorForBalanceWasNotImproved
  );

  const { balanceWasImproved } = getPriceImpactForPosition(marketInfo, conservativeBound, isLong);
  const positionFeeFactor = balanceWasImproved
    ? marketInfo.positionFeeFactorForBalanceWasImproved
    : marketInfo.positionFeeFactorForBalanceWasNotImproved;

  const leverageBoundUsd = bigMath.mulDiv(
    baseNumerator,
    PRECISION,
    BASIS_POINTS_DIVISOR_BIGINT * PRECISION + leverageBigInt * positionFeeFactor
  );

  // Convert USD bound to real index token amount
  const toIndexTokenAmount = (amountUsd: bigint | undefined): bigint | undefined => {
    if (amountUsd === undefined || amountUsd <= 0n) return undefined;
    const tokenAmount = convertToTokenAmount(amountUsd, toTokenDecimals, markPrice);
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

// ── Margin (collateral) calculations ────────────────────────────────

/**
 * Returns the margin input amount as a percentage (0–100) of the token balance.
 */
export function calcMarginPercentage(inputAmountStr: string, balance: bigint | undefined, decimals: number): number {
  if (balance === undefined || balance === 0n) return 0;
  const inputAmount = parseValue(inputAmountStr || "0", decimals) ?? 0n;
  if (inputAmount === 0n) return 0;
  const percentage = Number(bigMath.divRound(inputAmount * 100n, balance));
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Converts a percentage (0–100) of the balance to a formatted token amount string.
 * At 100 % returns the full-precision amount (no decimal truncation).
 */
export function calcMarginAmountByPercentage(
  percentage: number,
  balance: bigint,
  decimals: number,
  visualMultiplier: number | undefined,
  isStable: boolean | undefined
): string {
  const amount = (balance * BigInt(percentage)) / 100n;

  if (percentage === 100) {
    return formatAmountFree(amount, decimals);
  }

  return limitDecimals(
    formatAmountFree(amount, decimals),
    calculateDisplayDecimals(amount, decimals, visualMultiplier, isStable)
  );
}
