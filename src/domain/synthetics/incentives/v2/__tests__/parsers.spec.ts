import { describe, expect, it } from "vitest";

import {
  parseAccountIncentiveStatus,
  parseAccountRewardsHistoryPage,
  parseIncentivesConfig,
  parseIncentivesLeaderboardPage,
  type RawAccountIncentiveStatus,
  type RawIncentivesConfig,
  type RawLeaderboardEntry,
  type RawRewardsHistoryEntry,
} from "../parsers";

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
    featuredMarketIndexTokens: [CHECKSUMMED_ACCOUNT],
    downgradingCoefficients: [{ market: CHECKSUMMED_ACCOUNT, coefficient: "50" }],
    balancingTradesThreshold: BIG_VALUE,
    lifetimeVolumeThreshold: BIG_VALUE,
    manualAllocationTiers: [
      { minVolume: "10000", maxVolume: "250000", rewardCapUsd: "50" },
      { minVolume: "750000000", maxVolume: null, rewardCapUsd: "25000" },
    ],
  };
}

function makeRawStatus(): RawAccountIncentiveStatus {
  return {
    account: CHECKSUMMED_ACCOUNT,
    multiplier: "300",
    volumeTier: "Tier1",
    stakingTier: null,
    projectedVolumeTier: "Tier2",
    projectedStakingTier: "Tier1",
    epochTimestamp: 1_784_073_600,
    tradingVolume: "9007199254740993000000000000000000001",
    tierVolume: BIG_VALUE,
    referralVolume: "1",
    currentStakedBalance: "2",
    boostIds: ["LifetimeTrading", "ManualAllocation"],
    esGmxRewards: "3",
    gtRewards: "4",
    rewardsUsd: "5",
    manualRewardCapUsd: "6",
    manualRewardConsumedUsd: "7",
    manualRewardRemainingUsd: "8",
  };
}

function makeRawHistoryEntry(): RawRewardsHistoryEntry {
  return {
    epoch: 1_784_073_600,
    tradingVolume: BIG_VALUE,
    tierVolume: "1",
    referralVolume: "2",
    esGmxRewards: "3",
    gtRewards: "4",
    rewardsUsd: "5",
    tradingEsGmxRewards: "6",
    tradingGtRewards: "7",
    tradingRewardsUsd: "8",
    referralEsGmxRewards: "9",
    referralGtRewards: "10",
    referralRewardsUsd: "11",
    manualRewardsUsd: "12",
  };
}

function makeRawLeaderboardEntry(multiplier: string | null): RawLeaderboardEntry {
  return {
    rank: 1,
    address: CHECKSUMMED_ACCOUNT,
    tradingVolume: BIG_VALUE,
    referralVolume: "1",
    esGmxRewards: "2",
    gtRewards: "3",
    rewardsUsd: "4",
    multiplier,
  };
}

describe("Incentives V2 parsers", () => {
  it("parses every config BigInt, sorts tiers, and preserves the open-ended allocation tier", () => {
    const config = parseIncentivesConfig(makeRawConfig());

    expect(config).not.toBeNull();
    expect(config?.maxMultiplier).toBe(1000n);
    expect(config?.volumeTiers.map((tier) => tier.tier)).toEqual(["Tier1", "Tier2"]);
    expect(config?.stakingTiers.map((tier) => tier.tier)).toEqual(["Tier1", "Tier2"]);
    expect(config?.manualAllocationTiers[1]).toEqual({
      minVolume: 750000000n,
      maxVolume: null,
      rewardCapUsd: 25000n,
    });
    expect(config?.featuredMarketIndexTokens).toEqual([CHECKSUMMED_ACCOUNT]);
    expect(config?.downgradingCoefficients[0].market).toBe(CHECKSUMMED_ACCOUNT);
  });

  it("preserves an inactive null config", () => {
    expect(parseIncentivesConfig(null)).toBeNull();
  });

  it("parses account status without changing address casing or losing large values", () => {
    const status = parseAccountIncentiveStatus(makeRawStatus());

    expect(status.account).toBe(CHECKSUMMED_ACCOUNT);
    expect(status.tierVolume).toBe(BigInt(BIG_VALUE));
    expect(status.multiplier).toBe(300n);
    expect(status.boostIds).toEqual(["LifetimeTrading", "ManualAllocation"]);
    expect(status.tradingVolume).toBe(BigInt("9007199254740993000000000000000000001"));
    expect(status.esGmxRewards).toBe(3n);
    expect(status.gtRewards).toBe(4n);
    expect(status.manualRewardConsumedUsd).toBe(7n);
  });

  it("parses direct history pagination without synthesizing empty epochs", () => {
    const page = parseAccountRewardsHistoryPage({ totalCount: 3, items: [makeRawHistoryEntry()] }, 1, 0);

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].tradingVolume).toBe(BigInt(BIG_VALUE));
    expect(page.hasNextPage).toBe(true);
  });

  it("preserves the nullable all-time multiplier and global address casing", () => {
    const page = parseIncentivesLeaderboardPage({ totalCount: 1, items: [makeRawLeaderboardEntry(null)] }, 20, 0);

    expect(page.entries[0].address).toBe(CHECKSUMMED_ACCOUNT);
    expect(page.entries[0].multiplier).toBeNull();
    expect(page.hasNextPage).toBe(false);
  });
});
