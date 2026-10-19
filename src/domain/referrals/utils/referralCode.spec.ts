import { describe, expect, it } from "vitest";

import { decodeReferralCode, MAX_REFERRAL_CODE_LENGTH } from "sdk/utils/referrals";

import { formatReferralCodeForDisplay, isReferralCodeQueryParam } from "./referralCode";

describe("formatReferralCodeForDisplay", () => {
  it("shortens codes that can't be decoded as text PRO-4493", () => {
    const addressCode = decodeReferralCode("0x0000000000000000000000006076934cde1fd93bbfada76a555065886a8b159d");
    const hashCode = decodeReferralCode("0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747");

    expect(formatReferralCodeForDisplay(addressCode)).toBe("0x6076...159d");
    expect(formatReferralCodeForDisplay(hashCode)).toBe("0x3542...6747");
    expect(formatReferralCodeForDisplay(`0x${"00".repeat(31)}01`)).toBe("0x01");
  });

  it("keeps text codes as is", () => {
    expect(formatReferralCodeForDisplay("TheGMXBalancer")).toBe("TheGMXBalancer");
    expect(formatReferralCodeForDisplay("0x1234")).toBe("0x1234");
    expect(formatReferralCodeForDisplay("")).toBe("");
  });
});

describe("isReferralCodeQueryParam", () => {
  const hexCode = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

  it("accepts text codes and full bytes32 hex PRO-4493", () => {
    expect(isReferralCodeQueryParam("TheGMXBalancer")).toBe(true);
    expect(isReferralCodeQueryParam("A".repeat(MAX_REFERRAL_CODE_LENGTH))).toBe(true);
    expect(isReferralCodeQueryParam(hexCode)).toBe(true);
    expect(isReferralCodeQueryParam(`0x${hexCode.slice(2).toUpperCase()}`)).toBe(true);
  });

  it("rejects empty, too long and partial hex values", () => {
    expect(isReferralCodeQueryParam(null)).toBe(false);
    expect(isReferralCodeQueryParam(undefined)).toBe(false);
    expect(isReferralCodeQueryParam("")).toBe(false);
    expect(isReferralCodeQueryParam("A".repeat(MAX_REFERRAL_CODE_LENGTH + 1))).toBe(false);
    expect(isReferralCodeQueryParam(hexCode.slice(0, -2))).toBe(false);
    expect(isReferralCodeQueryParam(`${hexCode}00`)).toBe(false);
  });
});
