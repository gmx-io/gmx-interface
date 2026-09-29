import { formatUnits, parseUnits } from "viem";

export const USD = 10n ** 30n;
export const economy = {
  runFeeLimitUsd: 5n * USD,
  cleanupReserveUsd: 2n * USD,
  actionFeeLimitUsd: USD,
  collateralLimitUsd: 5n * USD,
  positionLimitUsd: 10n * USD,
  collateralBufferUsd: USD,
  maxLeverageBps: 20_000n,
  stableReserveUsd: 10n * USD,
  nativeReserveUsd: 5n * USD,
  rebalanceDustUsd: 2n * USD,
  rebalanceToleranceBps: 500n,
  rebalanceLimitUsd: 10n * USD,
  slippageBps: 30,
} as const;

export function dollars(value: bigint) {
  return formatUnits(value, 30);
}

export function usd(value: string) {
  return parseUnits(value, 30);
}

export function ceilDiv(value: bigint, divisor: bigint) {
  if (value < 0n || divisor <= 0n) throw new Error("Invalid amount or divisor");
  return (value + divisor - 1n) / divisor;
}

export function affordablePosition({
  minCollateralUsd,
  minPositionSizeUsd,
  openingCostsUsd,
  remainingParts = 1,
}: {
  minCollateralUsd: bigint;
  minPositionSizeUsd: bigint;
  openingCostsUsd: bigint;
  remainingParts?: number;
}) {
  if (minCollateralUsd <= 0n || minPositionSizeUsd <= 0n || openingCostsUsd < 0n) {
    throw new Error("Missing market minimums or invalid fee estimate");
  }
  if (!Number.isSafeInteger(remainingParts) || remainingParts < 1 || remainingParts > 2) {
    throw new Error("Economy mode supports at most two position parts");
  }
  // A partial-close test must leave a valid position after the first decrease.
  const sizeUsd = [minPositionSizeUsd * BigInt(remainingParts), 2n * USD].reduce((a, b) => (a > b ? a : b));
  const leverageFloor = ceilDiv(sizeUsd * 10_000n, economy.maxLeverageBps);
  const required = minCollateralUsd > leverageFloor ? minCollateralUsd : leverageFloor;
  const collateralUsd = required + economy.collateralBufferUsd + openingCostsUsd;
  if (sizeUsd > economy.positionLimitUsd || collateralUsd > economy.collateralLimitUsd) {
    throw new Error("Market minimums and fees exceed the economy position budget");
  }
  return { sizeUsd, collateralUsd };
}

export function checkFeeBudget(chargedUsd: bigint, quoteUsd: bigint, cleanup: boolean) {
  if (chargedUsd < 0n || quoteUsd <= 0n) throw new Error("Invalid fee accounting");
  if (quoteUsd > economy.actionFeeLimitUsd) throw new Error("Action fee exceeds $1");
  const ceiling = economy.runFeeLimitUsd - (cleanup ? 0n : economy.cleanupReserveUsd);
  if (chargedUsd + quoteUsd > ceiling) {
    throw new Error(cleanup ? "Run fee budget exhausted" : "Cleanup fee reserve must remain available");
  }
}

export function rebalancePlan({
  initialNativeUsd,
  initialStableUsd,
  nativeUsd,
  stableUsd,
}: {
  initialNativeUsd: bigint;
  initialStableUsd: bigint;
  nativeUsd: bigint;
  stableUsd: bigint;
}) {
  if ([initialNativeUsd, initialStableUsd, nativeUsd, stableUsd].some((v) => v < 0n)) {
    throw new Error("Invalid balance snapshot");
  }
  const initialTotal = initialNativeUsd + initialStableUsd;
  const total = nativeUsd + stableUsd;
  if (initialTotal <= 0n || total <= 0n) throw new Error("Cannot rebalance an empty wallet");
  const targetNative = (total * initialNativeUsd) / initialTotal;
  const delta = targetNative - nativeUsd;
  const amountUsd = delta < 0n ? -delta : delta;
  const driftBps = (amountUsd * 10_000n) / total;
  if (amountUsd < economy.rebalanceDustUsd || driftBps <= economy.rebalanceToleranceBps) {
    return { direction: "none" as const, amountUsd, driftBps };
  }
  if (amountUsd > economy.rebalanceLimitUsd) throw new Error("Balance drift exceeds the $10 rebalance limit");
  if (delta < 0n && nativeUsd - amountUsd < economy.nativeReserveUsd) {
    throw new Error("Rebalance would consume the native gas reserve");
  }
  if (delta > 0n && stableUsd - amountUsd < economy.stableReserveUsd + economy.cleanupReserveUsd) {
    throw new Error("Rebalance would consume the stablecoin and cleanup reserves");
  }
  return { direction: delta > 0n ? ("buy-native" as const) : ("sell-native" as const), amountUsd, driftBps };
}
