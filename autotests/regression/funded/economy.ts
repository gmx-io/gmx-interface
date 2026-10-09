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
  targetNativeBps: 5_000n,
  rebalanceDustUsd: 2n * USD,
  rebalanceToleranceBps: 500n,
  rebalanceLimitUsd: 10n * USD,
  slippageBps: 30,
} as const;

export type FeeProfile = "economy" | "glv";
export type FeePolicy = Pick<typeof economy, "runFeeLimitUsd" | "cleanupReserveUsd" | "actionFeeLimitUsd">;

export function feePolicy(profile: FeeProfile): FeePolicy {
  if (profile === "economy") return economy;
  if (profile === "glv") return { runFeeLimitUsd: 8n * USD, cleanupReserveUsd: 4n * USD, actionFeeLimitUsd: 4n * USD };
  throw new Error("Unknown funded fee profile");
}

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

export function startingReserves({
  stableUsd,
  nativeUsd,
  collateralUsd,
  profile,
}: {
  stableUsd: bigint;
  nativeUsd: bigint;
  collateralUsd: bigint;
  profile: FeeProfile;
}) {
  const policy = feePolicy(profile);
  const requiredUsd = {
    USDC:
      economy.stableReserveUsd +
      (profile === "glv" ? USD + policy.cleanupReserveUsd : collateralUsd + policy.runFeeLimitUsd),
    ETH: economy.nativeReserveUsd + (profile === "glv" ? policy.runFeeLimitUsd : 0n),
  };
  const shortfallUsd = {
    USDC: stableUsd < requiredUsd.USDC ? requiredUsd.USDC - stableUsd : 0n,
    ETH: nativeUsd < requiredUsd.ETH ? requiredUsd.ETH - nativeUsd : 0n,
  };
  return { sufficient: shortfallUsd.USDC === 0n && shortfallUsd.ETH === 0n, requiredUsd, shortfallUsd };
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

export function checkFeeBudget(chargedUsd: bigint, quoteUsd: bigint, cleanup: boolean, policy: FeePolicy = economy) {
  if (chargedUsd < 0n || quoteUsd <= 0n) throw new Error("Invalid fee accounting");
  if (quoteUsd > policy.actionFeeLimitUsd) throw new Error(`Action fee exceeds $${dollars(policy.actionFeeLimitUsd)}`);
  const ceiling = policy.runFeeLimitUsd - (cleanup ? 0n : policy.cleanupReserveUsd);
  if (chargedUsd + quoteUsd > ceiling) {
    throw new Error(cleanup ? "Run fee budget exhausted" : "Cleanup fee reserve must remain available");
  }
}

type RebalanceInput = {
  initialNativeUsd: bigint;
  initialStableUsd: bigint;
  nativeUsd: bigint;
  stableUsd: bigint;
  targetNativeBps?: bigint;
};

export function rebalanceTarget({
  initialNativeUsd,
  initialStableUsd,
  nativeUsd,
  stableUsd,
  targetNativeBps,
}: RebalanceInput) {
  if ([initialNativeUsd, initialStableUsd, nativeUsd, stableUsd].some((v) => v < 0n)) {
    throw new Error("Invalid balance snapshot");
  }
  const initialTotal = initialNativeUsd + initialStableUsd;
  const total = nativeUsd + stableUsd;
  if (initialTotal <= 0n || total <= 0n) throw new Error("Cannot rebalance an empty wallet");
  if (targetNativeBps !== undefined && (targetNativeBps < 0n || targetNativeBps > 10_000n))
    throw new Error("Invalid target ETH ratio");
  // Journals created before explicit targets keep their original allocation.
  const targetNative =
    targetNativeBps === undefined ? (total * initialNativeUsd) / initialTotal : (total * targetNativeBps) / 10_000n;
  const delta = targetNative - nativeUsd;
  const amountUsd = delta < 0n ? -delta : delta;
  const driftBps = (amountUsd * 10_000n) / total;
  const targetUsd = { ETH: targetNative, USDC: total - targetNative };
  if (amountUsd < economy.rebalanceDustUsd || driftBps <= economy.rebalanceToleranceBps) {
    return { direction: "none" as const, amountUsd, driftBps, targetUsd };
  }
  return { direction: delta > 0n ? ("buy-native" as const) : ("sell-native" as const), amountUsd, driftBps, targetUsd };
}

export function rebalancePlan(input: RebalanceInput) {
  const plan = rebalanceTarget(input);
  if (plan.direction === "none") return plan;
  const { amountUsd } = plan;
  if (amountUsd > economy.rebalanceLimitUsd) throw new Error("Balance drift exceeds the $10 rebalance limit");
  if (plan.direction === "sell-native" && input.nativeUsd - amountUsd < economy.nativeReserveUsd) {
    throw new Error("Rebalance would consume the native gas reserve");
  }
  if (
    plan.direction === "buy-native" &&
    input.stableUsd - amountUsd < economy.stableReserveUsd + economy.cleanupReserveUsd
  ) {
    throw new Error("Rebalance would consume the stablecoin and cleanup reserves");
  }
  return plan;
}
