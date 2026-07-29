import { describe, expect, it } from "vitest";

import { parseIncentiveAccountEpochAuditPage, type RawIncentiveAccountEpochAuditEntry } from "../parsers";

const CHECKSUMMED_ACCOUNT = "0xAbC0000000000000000000000000000000000123";
const BIG_VALUE = "9007199254740993000000000000000000000";

function makeRawAuditEntry(
  overrides: Partial<RawIncentiveAccountEpochAuditEntry> = {}
): RawIncentiveAccountEpochAuditEntry {
  return {
    id: `${CHECKSUMMED_ACCOUNT}-1784073600`,
    account: CHECKSUMMED_ACCOUNT,
    epochTimestamp: 1_784_073_600,
    fees: BIG_VALUE,
    tradingVolume: "2",
    tierVolume: "3",
    referralVolume: "4",
    esGmxRewards: "5",
    referralEsGmxRewards: "6",
    gtRewards: "7",
    referralGtRewards: "8",
    rewardsUsd: "9",
    manualRewardsUsd: "10",
    avgMultiplier: 150,
    maxMultiplier: 250,
    volumeTier: "Tier2",
    stakingTier: "Tier3",
    boostIds: ["FeaturedMarkets", "LifetimeTrading"],
    effectiveRewardsRatio: 0.15,
    ...overrides,
  };
}

describe("Incentives V2 audit parsers", () => {
  it("parses all audit amounts as bigint and preserves address casing and diagnostic fields", () => {
    const page = parseIncentiveAccountEpochAuditPage({ totalCount: 2, items: [makeRawAuditEntry()] }, 1, 0);

    expect(page.entries[0]).toEqual({
      id: `${CHECKSUMMED_ACCOUNT}-1784073600`,
      account: CHECKSUMMED_ACCOUNT,
      epochTimestamp: 1_784_073_600,
      fees: BigInt(BIG_VALUE),
      tradingVolume: 2n,
      tierVolume: 3n,
      referralVolume: 4n,
      esGmxRewards: 5n,
      referralEsGmxRewards: 6n,
      gtRewards: 7n,
      referralGtRewards: 8n,
      rewardsUsd: 9n,
      manualRewardsUsd: 10n,
      avgMultiplier: 150,
      maxMultiplier: 250,
      volumeTier: "Tier2",
      stakingTier: "Tier3",
      boostIds: ["FeaturedMarkets", "LifetimeTrading"],
      effectiveRewardsRatio: 0.15,
    });
    expect(page.hasNextPage).toBe(true);
  });

  it("preserves aggregate-mode fields returned by the backend", () => {
    const page = parseIncentiveAccountEpochAuditPage(
      {
        totalCount: 1,
        items: [
          makeRawAuditEntry({
            id: CHECKSUMMED_ACCOUNT,
            epochTimestamp: 0,
            volumeTier: null,
            stakingTier: null,
            boostIds: [],
          }),
        ],
      },
      20,
      0
    );

    expect(page.entries[0]).toMatchObject({
      account: CHECKSUMMED_ACCOUNT,
      epochTimestamp: 0,
      volumeTier: null,
      stakingTier: null,
      boostIds: [],
    });
    expect(page.hasNextPage).toBe(false);
  });
});
