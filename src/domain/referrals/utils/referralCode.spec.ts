import { describe, expect, it } from "vitest";

import { decodeReferralCode } from "sdk/utils/referrals";

import { formatReferralCodeForDisplay } from "./referralCode";

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
