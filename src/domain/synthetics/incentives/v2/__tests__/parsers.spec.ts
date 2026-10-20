import { describe, expect, it } from "vitest";

import { parseIncentivesConfig, type RawIncentivesConfig } from "../parsers";

const CHECKSUMMED_ACCOUNT = "0xAbC0000000000000000000000000000000000123";
const BIG_VALUE = "9007199254740993000000000000000000000";

function makeRawConfig(): RawIncentivesConfig {
  return {
    epochTimestamp: 1_784_073_600,
    epochStartTimestamp: 1_781_654_400,
    programStartTimestamp: 1_781_654_400,
    epochDuration: 604_800,
    maxMultiplier: "1000",
    multiplierDecimals: "100",
    volumeTierPersistenceEpochs: 4,
    feeShareFactor: "100000000000000000000000000000",
    esGmxShareFactor: "1000000000000000000000000000000",
    gtShareFactor: "200000000000000000000000000000",
    referralRewardShareFactor: "500000000000000000000000000000",
    volumeTiers: [
      { tier: "Tier2", threshold: "10000000000000000000000000000000000000", multiplier: "200" },
      { tier: "Tier1", threshold: BIG_VALUE, multiplier: "100" },
    ],
    stakingTiers: [
      { tier: "Tier2", threshold: "100000000000000000000", multiplier: "200" },
      { tier: "Tier1", threshold: "10000000000000000000", multiplier: "100" },
    ],
    boosts: [
      { boost: "FeaturedMarkets", multiplier: "50" },
      { boost: "ManualAllocation", multiplier: "200" },
    ],
    featuredMarketTokens: [CHECKSUMMED_ACCOUNT],
    downgradingFactors: [{ market: CHECKSUMMED_ACCOUNT, factor: "500000000000000000000000000000" }],
    balancingTradesThreshold: BIG_VALUE,
    lifetimeVolumeThreshold: BIG_VALUE,
    manualAllocationTiers: [
      { minVolume: "10000", maxVolume: "250000", rewardCapUsd: "50" },
      { minVolume: "750000000", maxVolume: null, rewardCapUsd: "25000" },
    ],
  };
}

describe("parseIncentivesConfig", () => {
  it("sorts tiers ascending and preserves the open-ended allocation tier", () => {
    const config = parseIncentivesConfig(makeRawConfig());

    expect(config?.volumeTiers.map((tier) => tier.tier)).toEqual(["Tier1", "Tier2"]);
    expect(config?.stakingTiers.map((tier) => tier.tier)).toEqual(["Tier1", "Tier2"]);
    expect(config?.manualAllocationTiers[1]).toEqual({
      minVolume: 750000000n,
      maxVolume: null,
      rewardCapUsd: 25000n,
    });
  });
});
