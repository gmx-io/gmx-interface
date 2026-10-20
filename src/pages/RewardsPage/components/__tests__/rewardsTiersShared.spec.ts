import { describe, expect, it } from "vitest";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";

import { formatRewardsTokenAmount, isRewardsTokenAmountShown } from "../rewardsTiersShared";

const GMX_UNIT = 10n ** BigInt(ES_GMX_DECIMALS);
const GT_UNIT = 10n ** BigInt(GT_DECIMALS);

describe("formatRewardsTokenAmount", () => {
  it.each([
    { amount: 0n, decimals: ES_GMX_DECIMALS, text: "0", shown: false },
    { amount: 1n, decimals: ES_GMX_DECIMALS, text: "< 0.01", shown: false },
    { amount: GMX_UNIT / 100n - 1n, decimals: ES_GMX_DECIMALS, text: "< 0.01", shown: false },
    { amount: GMX_UNIT / 100n, decimals: ES_GMX_DECIMALS, text: "0.01", shown: true },
    { amount: 1234n * GMX_UNIT + GMX_UNIT / 2n, decimals: ES_GMX_DECIMALS, text: "1,234.5", shown: true },
    { amount: GT_UNIT / 100n - 1n, decimals: GT_DECIMALS, text: "< 0.01", shown: false },
    { amount: 150n * GT_UNIT, decimals: GT_DECIMALS, text: "150", shown: true },
  ])("formats $amount with $decimals decimals as $text", ({ amount, decimals, text, shown }) => {
    expect(formatRewardsTokenAmount(amount, decimals)).toBe(text);
    expect(isRewardsTokenAmountShown(amount, decimals)).toBe(shown);
  });
});
