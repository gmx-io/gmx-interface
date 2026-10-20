import { padHex, stringToHex, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { decodeReferralCode, encodeReferralCode, MAX_REFERRAL_CODE_LENGTH } from "utils/referrals";

// real codes on Arbitrum
const ADDRESS_CODE = "0x0000000000000000000000006076934cde1fd93bbfada76a555065886a8b159d";
const HASH_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

function rightPadded(text: string) {
  return padHex(stringToHex(text), { size: 32, dir: "right" });
}

describe("utils/referrals", () => {
  it("decode(encode(x)) === x", () => {
    for (const code of ["test", "H4X", "test_12", "2031", "A".repeat(MAX_REFERRAL_CODE_LENGTH)]) {
      expect(decodeReferralCode(encodeReferralCode(code))).toEqual(code);
    }
  });

  it("decodeReferralCode defaults", () => {
    expect(decodeReferralCode()).toEqual("");
    expect(decodeReferralCode(zeroHash)).toEqual("");
    expect(decodeReferralCode("0x74657374")).toEqual("");
    expect(decodeReferralCode(`0x${"zz".repeat(32)}`)).toEqual("");
  });

  it.each([
    // protocol codes are longer than the UI limit
    [rightPadded("EARNED_TRADER_DISCOUNT_5"), "EARNED_TRADER_DISCOUNT_5"],
    [`0x${"61".repeat(32)}`, "a".repeat(32)],
    ...[
      ADDRESS_CODE,
      HASH_CODE,
      // non-printable byte
      "0x7465017400000000000000000000000000000000000000000000000000000000",
      // non-zero byte after the padding
      "0x7465737400000000000000000000000000000000000000000000000000000001",
      // printable text the UI can't encode back to the same bytes
      ...["my-code", "a b", "a&b", "0x6076...159d"].map(rightPadded),
      // UTF-8 "тест"
      "0xd182d0b5d181d182000000000000000000000000000000000000000000000000",
    ].map((hex) => [hex, hex]),
  ] as [`0x${string}`, string][])("decodeReferralCode(%s) is %s PRO-4493", (hex, expected) => {
    expect(decodeReferralCode(hex)).toEqual(expected);
  });

  it("encodeReferralCode keeps bytes32 hex codes, lowercased", () => {
    expect(encodeReferralCode(ADDRESS_CODE)).toEqual(ADDRESS_CODE);
    expect(encodeReferralCode(HASH_CODE)).toEqual(HASH_CODE);
    expect(encodeReferralCode(decodeReferralCode(HASH_CODE))).toEqual(HASH_CODE);
    expect(encodeReferralCode(HASH_CODE.toUpperCase().replace("0X", "0x"))).toEqual(HASH_CODE);
  });

  it("encodeReferralCode defaults", () => {
    expect(encodeReferralCode(new Array(MAX_REFERRAL_CODE_LENGTH + 1).fill("0").join(""))).toEqual(zeroHash);
  });
});
