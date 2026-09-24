import { describe, expect, it } from "vitest";

import { getIncentiveDistributionCsv, getIncentiveDistributionRows } from "../incentiveDistributionCsv";
import type { IncentiveAccountEpochAuditEntry, IncentivesConfig } from "../types";

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const config = {
  epochStartTimestamp: 1_781_654_400,
  multiplierDecimals: 100n,
  volumeTiers: [{ tier: "Tier2", multiplier: 200n }],
  stakingTiers: [{ tier: "Tier1", multiplier: 100n }],
} as IncentivesConfig;
const entry = {
  account: ACCOUNT,
  epochTimestamp: 1_788_307_200,
  avgStakedGmx: 9007199254740993000000000000000001n,
  esGmxRewards: 9007199254740993000000000000000001n,
  referralEsGmxRewards: 1000000000000000001n,
  gtRewards: 123456789012345678n,
  fees: 1234567890123456789012345678901n,
  tradingVolume: 999n,
  tierVolume: 2345678901234567890123456789012n,
  referralVolume: 3456789012345678901234567890123n,
  volumeTier: "Tier2",
  stakingTier: "Tier1",
  avgMultiplier: 375,
  maxMultiplier: 700,
} as IncentiveAccountEpochAuditEntry;

describe("incentive distribution CSV", () => {
  it("exports decimal token amounts without rounding, scientific notation, or duplicate referral rewards", () => {
    const rows = getIncentiveDistributionRows([entry], config);

    expect(getIncentiveDistributionCsv(rows, false)).toBe(
      `wallet,esGMX\r\n${ACCOUNT},9007199254740993.000000000000000001\r\n`
    );
    expect(getIncentiveDistributionRows([{ ...entry, esGmxRewards: 1n }], config)[0].esGMX).toBe(
      "0.000000000000000001"
    );
  });

  it("exports adjusted tier volume, epoch-average multiplier, and precise USD/GT values", () => {
    const rows = getIncentiveDistributionRows([entry], config);

    expect(rows[0]).toMatchObject({
      wallet: ACCOUNT,
      GT: "12345678901.2345678",
      volume_usd: "2.345678901234567890123456789012",
      volume_multiplier: "2",
      staking_gmx: "9007199254740993.000000000000000001",
      staking_multiplier: "1",
      total_multiplier: "3.75",
      eligible_referral_volume_usd: "3.456789012345678901234567890123",
      eligible_fees_usd: "1.234567890123456789012345678901",
    });
    expect(getIncentiveDistributionCsv(rows, true)).toContain(
      "wallet,esGMX,GT,volume_usd,volume_multiplier,staking_gmx,staking_multiplier,total_multiplier,eligible_referral_volume_usd,eligible_fees_usd\r\n"
    );
  });

  it.each([
    [null, ""],
    [0n, "0"],
    [1n, "0.000000000000000001"],
    [1234567890123456789n, "1.234567890123456789"],
  ])("exports average staking without treating missing history as zero: %s", (avgStakedGmx, expected) => {
    const rows = getIncentiveDistributionRows([{ ...entry, avgStakedGmx }], config);

    expect(rows[0].staking_gmx).toBe(expected);
    expect(getIncentiveDistributionCsv(rows, true).split("\r\n")[1].split(",")[5]).toBe(expected);
  });

  it("distinguishes a missing tier from a missing historical configuration", () => {
    expect(getIncentiveDistributionRows([{ ...entry, volumeTier: null, stakingTier: null }], config)[0]).toMatchObject({
      volume_multiplier: "0",
      staking_multiplier: "0",
    });
    expect(
      getIncentiveDistributionRows([{ ...entry, epochTimestamp: config.epochStartTimestamp - 1 }], config)[0]
    ).toMatchObject({
      volume_multiplier: "",
      staking_multiplier: "",
    });
  });
});
