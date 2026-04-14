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
  volumeDowngradingCoefficients: [],
  featuredMarketTokens: [],
};

describe("incentivesText", () => {
  it("formats boost descriptions from config thresholds", () => {
    expect(getBoostDescription("BalancingTrades", mockConfig)).toContain("$250,000+");
    expect(getBoostDescription("LifetimeTrading", mockConfig)).toContain("$42,000,000+");
  });

  it("uses config values for multiplier and epoch windows", () => {
    expect(getMaxMultiplierLabel(mockConfig)).toBe("5.5x");
    expect(getPointsExpirationEpochs(mockConfig)).toBe(9);
    expect(getVolumeTierPersistenceEpochs(mockConfig)).toBe(6);
  });
});
