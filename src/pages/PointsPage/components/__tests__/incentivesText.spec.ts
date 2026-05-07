import { describe, expect, it } from "vitest";

import type { IncentivesConfig } from "domain/synthetics/incentives/types";

import {
  getBoostDescription,
  getMaxMultiplierLabel,
  getPointsExpirationEpochs,
  getVolumeTierPersistenceEpochs,
} from "../incentivesText";

const mockConfig: IncentivesConfig = {
  programStartTimestamp: 1699000000,
  epochTimestamp: 1700000000,
  epochStartTimestamp: 1699900000,
  epochDuration: 604800,
  maxMultiplier: 550,
  multiplierDecimals: 100,
  volumeTierPersistenceEpochs: 6,
  pointsExpirationEpochs: 9,
  basePointsFactor: 1000000000000000000n,
  pointsToGmxFactor: 1000000000000000000n,
  volumeTiers: [],
  stakingTiers: [],
  boosts: [],
  balancingTradesThreshold: 250000n * 10n ** 30n,
  lifetimeVolumeThreshold: 42000000n * 10n ** 30n,
  downgradingCoefficients: {},
  featuredMarketTokens: [],
};

describe("incentivesText", () => {
  it("formats boost descriptions from config thresholds", () => {
    expect(getBoostDescription("BalancingTrades", mockConfig)).toContain("$250,000+");
    expect(getBoostDescription("LifetimeTrading", mockConfig)).toContain("$42,000,000+");
  });

  it("returns the FeaturedMarkets boost description", () => {
    expect(getBoostDescription("FeaturedMarkets", mockConfig)).toBe(
      "Trade featured markets to activate this boost and earn a higher multiplier for those trades."
    );
  });

  it("returns the full BalancingTrades boost description with threshold", () => {
    expect(getBoostDescription("BalancingTrades", mockConfig)).toBe(
      "Place balancing trades ($250,000+) on underutilized sides to earn an additional multiplier on those trades."
    );
  });

  it("returns the full LifetimeTrading boost description with threshold", () => {
    expect(getBoostDescription("LifetimeTrading", mockConfig)).toBe(
      "Reach $42,000,000+ in lifetime trading volume to unlock a permanent 1× multiplier."
    );
  });

  it("falls back to threshold-less BalancingTrades copy when config is missing", () => {
    expect(getBoostDescription("BalancingTrades")).toBe(
      "Place balancing trades on underutilized sides to earn an additional multiplier on those trades."
    );
  });

  it("falls back to threshold-less LifetimeTrading copy when config is missing", () => {
    expect(getBoostDescription("LifetimeTrading")).toBe(
      "Reach a lifetime trading volume milestone to unlock a permanent 1× multiplier."
    );
  });

  it("uses config values for multiplier and epoch windows", () => {
    expect(getMaxMultiplierLabel(mockConfig)).toBe("5.50x");
    expect(getPointsExpirationEpochs(mockConfig)).toBe(9);
    expect(getVolumeTierPersistenceEpochs(mockConfig)).toBe(6);
  });
});
