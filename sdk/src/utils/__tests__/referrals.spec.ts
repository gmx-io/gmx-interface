import { padHex, stringToHex, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { decodeReferralCode, encodeReferralCode, isReferralCodeHex, MAX_REFERRAL_CODE_LENGTH } from "utils/referrals";

// Codes owned by 0xB48EE0066723BA6a0b1a5a31A770F5f18cB1a21b on Arbitrum (PRO-4493)
const ADDRESS_CODE = "0x0000000000000000000000006076934cde1fd93bbfada76a555065886a8b159d";
const HASH_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

describe("utils/referrals", () => {
  it("decode(encode(x)) === x", () => {
    for (const code of ["test", "H4X", "test_12", "2031", "A".repeat(MAX_REFERRAL_CODE_LENGTH)]) {
      expect(decodeReferralCode(encodeReferralCode(code))).toEqual(code);
    }
  });

  it("decodeReferralCode defaults", () => {
    expect(decodeReferralCode()).toEqual("");
    expect(decodeReferralCode(zeroHash)).toEqual("");
  });

  it("decodeReferralCode returns an empty string for malformed hex", () => {
    expect(decodeReferralCode("0x74657374")).toEqual("");
    expect(decodeReferralCode(`0x${"zz".repeat(32)}`)).toEqual("");
  });

  it("decodeReferralCode decodes letters, digits and _ right-padded with zeros", () => {
    expect(decodeReferralCode("0x546865474d5842616c616e636572000000000000000000000000000000000000")).toEqual(
      "TheGMXBalancer"
    );
    expect(decodeReferralCode("0x6662736e33316e5f474d585f3300000000000000000000000000000000000000")).toEqual(
      "fbsn31n_GMX_3"
    );
    // protocol codes are longer than the UI limit
    expect(decodeReferralCode(padHex(stringToHex("EARNED_TRADER_DISCOUNT_5"), { size: 32, dir: "right" }))).toEqual(
      "EARNED_TRADER_DISCOUNT_5"
    );
    expect(decodeReferralCode(`0x${"61".repeat(32)}`)).toEqual("a".repeat(32));
  });

  it("decodeReferralCode returns the original hex for codes that aren't text PRO-4493", () => {
    expect(decodeReferralCode(ADDRESS_CODE)).toEqual(ADDRESS_CODE);
    expect(decodeReferralCode(HASH_CODE)).toEqual(HASH_CODE);
    // non-printable byte
    expect(decodeReferralCode("0x7465017400000000000000000000000000000000000000000000000000000000")).toEqual(
      "0x7465017400000000000000000000000000000000000000000000000000000000"
    );
    // non-zero byte after the padding
    expect(decodeReferralCode("0x7465737400000000000000000000000000000000000000000000000000000001")).toEqual(
      "0x7465737400000000000000000000000000000000000000000000000000000001"
    );
    // printable text the UI can't encode back to the same bytes
    for (const text of ["my-code", "a b", "0x6076...159d", "a&b"]) {
      const hex = padHex(stringToHex(text), { size: 32, dir: "right" });
      expect(decodeReferralCode(hex)).toEqual(hex);
    }
    // UTF-8 "тест"
    expect(decodeReferralCode("0xd182d0b5d181d182000000000000000000000000000000000000000000000000")).toEqual(
      "0xd182d0b5d181d182000000000000000000000000000000000000000000000000"
    );
  });

  it("encodeReferralCode keeps bytes32 hex codes as is", () => {
    expect(encodeReferralCode(ADDRESS_CODE)).toEqual(ADDRESS_CODE);
    expect(encodeReferralCode(HASH_CODE)).toEqual(HASH_CODE);
    expect(encodeReferralCode(decodeReferralCode(HASH_CODE))).toEqual(HASH_CODE);
  });

  it("encodeReferralCode normalizes bytes32 hex case", () => {
    expect(encodeReferralCode(HASH_CODE.toUpperCase().replace("0X", "0x"))).toEqual(HASH_CODE);
  });

  it("encodeReferralCode defaults", () => {
    expect(encodeReferralCode(new Array(MAX_REFERRAL_CODE_LENGTH + 1).fill("0").join(""))).toEqual(zeroHash);
  });

  it("isReferralCodeHex", () => {
    expect(isReferralCodeHex(ADDRESS_CODE)).toBe(true);
    expect(isReferralCodeHex(HASH_CODE.toUpperCase().replace("0X", "0x"))).toBe(true);
    expect(isReferralCodeHex("test")).toBe(false);
    expect(isReferralCodeHex("0x1234")).toBe(false);
    expect(isReferralCodeHex(undefined)).toBe(false);
    expect(isReferralCodeHex(null)).toBe(false);
  });
});
