import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";

export type TraderTier = "Whale" | "Large" | "Active" | "Retail";

/**
 * Tier thresholds (OR logic - any condition met qualifies for that tier).
 * Checked from highest to lowest tier.
 */
const WHALE_THRESHOLDS = {
  volume30d: expandDecimals(50_000_000, USD_DECIMALS), // > $50M
  volumeLifetime: expandDecimals(500_000_000, USD_DECIMALS), // > $500M
  walletPortfolio: expandDecimals(500_000, USD_DECIMALS), // > $500k
  gmxAccount: expandDecimals(100_000, USD_DECIMALS), // > $100k
};

const LARGE_THRESHOLDS = {
  volume30d: expandDecimals(5_000_000, USD_DECIMALS), // > $5M
  volumeLifetime: expandDecimals(50_000_000, USD_DECIMALS), // > $50M
  walletPortfolio: expandDecimals(50_000, USD_DECIMALS), // > $50k
  gmxAccount: expandDecimals(20_000, USD_DECIMALS), // > $20k
};

const ACTIVE_THRESHOLDS = {
  volume30d: expandDecimals(200_000, USD_DECIMALS), // > $200k
  volumeLifetime: expandDecimals(2_000_000, USD_DECIMALS), // > $2M
  walletPortfolio: expandDecimals(5_000, USD_DECIMALS), // > $5k
  gmxAccount: expandDecimals(2_000, USD_DECIMALS), // > $2k
};

function meetsThreshold(value: bigint | undefined, threshold: bigint): boolean {
  return (value ?? 0n) > threshold;
}

function meetsTierThresholds(
  volume30d: bigint | undefined,
  volumeLifetime: bigint | undefined,
  walletPortfolio: bigint | undefined,
  gmxAccount: bigint | undefined,
  thresholds: typeof WHALE_THRESHOLDS
): boolean {
  return (
    meetsThreshold(volume30d, thresholds.volume30d) ||
    meetsThreshold(volumeLifetime, thresholds.volumeLifetime) ||
    meetsThreshold(walletPortfolio, thresholds.walletPortfolio) ||
    meetsThreshold(gmxAccount, thresholds.gmxAccount)
  );
}

export function getTraderTier({
  volume30d,
  volumeLifetime,
  walletPortfolio,
  gmxAccount,
}: {
  volume30d?: bigint;
  volumeLifetime?: bigint;
  walletPortfolio?: bigint;
  gmxAccount?: bigint;
}): TraderTier {
  if (meetsTierThresholds(volume30d, volumeLifetime, walletPortfolio, gmxAccount, WHALE_THRESHOLDS)) {
    return "Whale";
  }
  if (meetsTierThresholds(volume30d, volumeLifetime, walletPortfolio, gmxAccount, LARGE_THRESHOLDS)) {
    return "Large";
  }
  if (meetsTierThresholds(volume30d, volumeLifetime, walletPortfolio, gmxAccount, ACTIVE_THRESHOLDS)) {
    return "Active";
  }
  return "Retail";
}
