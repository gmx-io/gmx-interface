import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals } from "lib/numbers";
import { decodeReferralCode, encodeReferralCode } from "sdk/utils/referrals";

import {
  getCodeError,
  getSharePercentage,
  shouldShowCreateReferralCodeTabLabel,
  shouldShowShareCardDiscounts,
} from "./referralsHelper";

describe("shouldShowShareCardDiscounts", () => {
  it("hides the discounts line when total discounts are unknown", () => {
    expect(shouldShowShareCardDiscounts(undefined)).toBe(false);
  });

  it("hides the discounts line below $100", () => {
    expect(shouldShowShareCardDiscounts(0n)).toBe(false);
    expect(shouldShowShareCardDiscounts(expandDecimals(100, USD_DECIMALS) - 1n)).toBe(false);
  });

  it("shows the discounts line at $100 and above", () => {
    expect(shouldShowShareCardDiscounts(expandDecimals(100, USD_DECIMALS))).toBe(true);
    expect(shouldShowShareCardDiscounts(expandDecimals(12345, USD_DECIMALS))).toBe(true);
  });
});

describe("getSharePercentage", () => {
  it("formats the trader discount and affiliate rebate of a tier", () => {
    expect(getSharePercentage(0n, 5000n, 1000n)).toBe("5");
    expect(getSharePercentage(0n, 5000n, 1000n, true)).toBe("5");
    expect(getSharePercentage(1234n, 5000n, 1000n)).toBe("1.234");
  });

  it("shows a zero discount as 0 instead of 0.000", () => {
    expect(getSharePercentage(0n, 0n, 1000n)).toBe("0");
    expect(getSharePercentage(0n, 5000n, 0n, true)).toBe("0");
  });
});

describe("shouldShowCreateReferralCodeTabLabel", () => {
  it("keeps Affiliate Dashboard on another wallet's page even without a code", () => {
    expect(
      shouldShowCreateReferralCodeTabLabel({
        hasAddressInUrl: true,
        hasAccount: false,
        isReferralsDataLoading: false,
        hasAnyAffiliateCode: false,
      })
    ).toBe(false);
  });

  it("shows Create Referral Code when no wallet is connected", () => {
    expect(
      shouldShowCreateReferralCodeTabLabel({
        hasAddressInUrl: false,
        hasAccount: false,
        isReferralsDataLoading: false,
        hasAnyAffiliateCode: false,
      })
    ).toBe(true);
  });

  it("keeps Affiliate Dashboard while referrals data is loading", () => {
    expect(
      shouldShowCreateReferralCodeTabLabel({
        hasAddressInUrl: false,
        hasAccount: true,
        isReferralsDataLoading: true,
        hasAnyAffiliateCode: false,
      })
    ).toBe(false);
  });

  it("shows Create Referral Code when the connected wallet has no code on the chain", () => {
    expect(
      shouldShowCreateReferralCodeTabLabel({
        hasAddressInUrl: false,
        hasAccount: true,
        isReferralsDataLoading: false,
        hasAnyAffiliateCode: false,
      })
    ).toBe(true);
  });

  it("keeps Affiliate Dashboard when the connected wallet has a code on the chain", () => {
    expect(
      shouldShowCreateReferralCodeTabLabel({
        hasAddressInUrl: false,
        hasAccount: true,
        isReferralsDataLoading: false,
        hasAnyAffiliateCode: true,
      })
    ).toBe(false);
  });
});

describe("getCodeError", () => {
  it("accepts only codes that reach the contract unchanged PRO-4106", () => {
    const inputs = ["tano_1", " tano_1 ", "A".repeat(20), "+++", "tano+++", "ab c", "   ", "тест", "a".repeat(21)];

    for (const input of inputs) {
      const code = input.trim();
      const reachesContractUnchanged = code !== "" && decodeReferralCode(encodeReferralCode(code)) === code;

      expect(getCodeError(input) === "", input).toBe(reachesContractUnchanged);
    }
  });
});
