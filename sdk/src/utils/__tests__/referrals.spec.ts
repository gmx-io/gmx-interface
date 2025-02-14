import { describe, expect, it } from "vitest";

import { decodeReferralCode, encodeReferralCode, MAX_REFERRAL_CODE_LENGTH } from "../referrals";
import { zeroHash } from "viem";

describe("utils/referrals", () => {
  it("decode(encode(x)) === x", () => {
    const code = "test";
    const encoded = encodeReferralCode(code);
    const decoded = decodeReferralCode(encoded);
    expect(decoded).toEqual(code);
  });

  it("decodeReferralCode defaults", () => {
    expect(decodeReferralCode()).toEqual("");
    expect(decodeReferralCode(zeroHash)).toEqual("");
  });

  it("encodeReferralCode defaults", () => {
    expect(encodeReferralCode(new Array(MAX_REFERRAL_CODE_LENGTH + 1).fill("0").join(""))).toEqual(zeroHash);
  });
});
