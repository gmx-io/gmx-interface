import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";

import { getOffHoursMarketInfo, isOffHoursMarket, OFF_HOURS_MARKET_OVERRIDES } from "./offHoursLiquidationRisk";

const GOLD = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const SILVER = "0x448Fa722717df299ee197E2F6d8EB7911EFF6cEc";
const WTIOIL = "0xda81cdd397210C08cFc567f93982E148A3aac8a6";
const BRENTOIL = "0x6F287D071800BfA847B4a7a7104BE33F87Ce9E74";
const NATGAS = "0x2Ce2bc8B0f9d000f359d756a5816C125474Bb39b";
const SPCX = "0x470128853D74dab7423904a20eA5AA230e9e561B";

const OFF_HOURS_ADDRESSES = [GOLD, SILVER, WTIOIL, BRENTOIL, NATGAS];

function marketAt(address: string) {
  return { ...createMockMarketInfo(), marketTokenAddress: address };
}

describe("isOffHoursMarket", () => {
  it("matches the five Arbitrum commodity markets and nothing else", () => {
    for (const address of OFF_HOURS_ADDRESSES) {
      expect(isOffHoursMarket(ARBITRUM, address)).toBe(true);
    }
    expect(isOffHoursMarket(ARBITRUM, SPCX)).toBe(false);
    expect(isOffHoursMarket(AVALANCHE, GOLD)).toBe(false);
    expect(isOffHoursMarket(ARBITRUM, undefined)).toBe(false);
  });
});

describe("getOffHoursMarketInfo", () => {
  it("returns undefined off Arbitrum and for markets with no off-hours override", () => {
    expect(getOffHoursMarketInfo(AVALANCHE, marketAt(GOLD))).toBeUndefined();
    expect(getOffHoursMarketInfo(ARBITRUM, marketAt(SPCX))).toBeUndefined();
  });

  it("returns undefined when the live config is already at the off-hours collateral factor", () => {
    for (const address of OFF_HOURS_ADDRESSES) {
      const override = OFF_HOURS_MARKET_OVERRIDES[address.toLowerCase()];
      const alreadyOffHours = { ...marketAt(address), minCollateralFactor: override.minCollateralFactor };
      expect(getOffHoursMarketInfo(ARBITRUM, alreadyOffHours)).toBeUndefined();
    }
  });

  it("applies the whole override table onto the clone and preserves non-overridden fields", () => {
    for (const address of OFF_HOURS_ADDRESSES) {
      const original = marketAt(address);
      const offHours = getOffHoursMarketInfo(ARBITRUM, original)!;
      const override = OFF_HOURS_MARKET_OVERRIDES[address.toLowerCase()];

      for (const [field, value] of Object.entries(override)) {
        expect((offHours as Record<string, unknown>)[field]).toBe(value);
      }

      expect(offHours.marketTokenAddress).toBe(original.marketTokenAddress);
      expect(offHours.indexToken).toBe(original.indexToken);
      expect(offHours.maxPositionImpactFactorForLiquidations).toBe(original.maxPositionImpactFactorForLiquidations);
    }
  });

  it("scales the per-second borrowing factor by the off-hours base ratio (50/45)", () => {
    const original = {
      ...marketAt(GOLD),
      borrowingFactorPerSecondForLongs: 45n,
      borrowingFactorPerSecondForShorts: 90n,
    };
    const offHours = getOffHoursMarketInfo(ARBITRUM, original)!;

    expect(offHours.borrowingFactorPerSecondForLongs).toBe(50n);
    expect(offHours.borrowingFactorPerSecondForShorts).toBe(100n);
  });

  it("does not mutate the source market", () => {
    const original = marketAt(GOLD);
    const before = structuredClone(original);

    getOffHoursMarketInfo(ARBITRUM, original);

    expect(original).toEqual(before);
  });
});
