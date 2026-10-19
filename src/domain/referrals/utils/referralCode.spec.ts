import { stringToHex, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { decodeReferralCode, encodeReferralCode, MAX_REFERRAL_CODE_LENGTH } from "sdk/utils/referrals";

import {
  formatReferralCodeForDisplay,
  isReferralCodeQueryParam,
  isSameReferralCode,
  REFERRAL_CODE_REGEX,
} from "./referralCode";

const ADDRESS_CODE = "0x0000000000000000000000006076934cde1fd93bbfada76a555065886a8b159d";
const HASH_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

function leftPadded(hex: string) {
  return `0x${hex.padStart(64, "0")}`;
}

function rightPadded(hex: string) {
  return `0x${hex.padEnd(64, "0")}`;
}

describe("formatReferralCodeForDisplay", () => {
  it("shortens codes that can't be decoded as text PRO-4493", () => {
    expect(formatReferralCodeForDisplay(decodeReferralCode(ADDRESS_CODE))).toBe("0x6076...159d");
    expect(formatReferralCodeForDisplay(decodeReferralCode(HASH_CODE))).toBe("0x3542...6747");
  });

  it("never renders hex codes as something that could be a text code", () => {
    const values = [leftPadded("01"), leftPadded("07e9"), rightPadded("01"), rightPadded("d182"), ADDRESS_CODE];

    for (const value of values) {
      const display = formatReferralCodeForDisplay(value);

      expect(display).toContain("...");
      expect(REFERRAL_CODE_REGEX.test(display)).toBe(false);
    }

    expect(formatReferralCodeForDisplay(leftPadded("01"))).toBe("0x0000...0001");
    expect(formatReferralCodeForDisplay(leftPadded("07e9"))).toBe("0x0000...07e9");
  });

  it("shows distinguishing bytes of right-padded codes", () => {
    // UTF-8 "тест" and "привет"
    const test = rightPadded("d182d0b5d181d182");
    const hello = rightPadded("d0bfd180d0b8d0b2d0b5d182");

    expect(formatReferralCodeForDisplay(test)).toBe("0xd182...8200");
    expect(formatReferralCodeForDisplay(hello)).toBe("0xd0bf...8200");
    expect(formatReferralCodeForDisplay(rightPadded("01"))).toBe("0x0100...0000");
  });

  it("keeps left- and right-padded codes with the same bytes apart", () => {
    for (const bytes of ["01", "d182d0b5d181d182", "6076934cde1fd93bbfada76a555065886a8b159d"]) {
      expect(formatReferralCodeForDisplay(leftPadded(bytes))).not.toBe(
        formatReferralCodeForDisplay(rightPadded(bytes))
      );
    }
  });

  it("doesn't drop leading zero bytes of values longer than an address", () => {
    expect(formatReferralCodeForDisplay(`0x00${HASH_CODE.slice(4)}`)).toBe("0x0042...6747");
    expect(formatReferralCodeForDisplay(leftPadded("ab".repeat(20)))).toBe("0xabab...abab");
    expect(formatReferralCodeForDisplay(leftPadded("ab".repeat(21)))).toBe("0x0000...abab");
  });

  it("doesn't show on-chain text that looks like a short hex as text", () => {
    const lookalike = rightPadded(stringToHex("0x6076...159d").slice(2));

    expect(formatReferralCodeForDisplay(decodeReferralCode(lookalike))).toBe("0x3078...6400");
  });

  it("shows pasted hex the same way once encoded", () => {
    expect(formatReferralCodeForDisplay(encodeReferralCode(`0x${HASH_CODE.slice(2).toUpperCase()}`))).toBe(
      "0x3542...6747"
    );
    expect(formatReferralCodeForDisplay(encodeReferralCode("TheGMXBalancer"))).toBe("TheGMXBalancer");
  });

  it("shows the hex of a text code as the text", () => {
    expect(formatReferralCodeForDisplay(rightPadded("546865474d5842616c616e636572"))).toBe("TheGMXBalancer");
  });

  it("keeps text codes as is", () => {
    expect(formatReferralCodeForDisplay("TheGMXBalancer")).toBe("TheGMXBalancer");
    expect(formatReferralCodeForDisplay("0x1234")).toBe("0x1234");
    expect(formatReferralCodeForDisplay("")).toBe("");
  });
});

describe("isSameReferralCode", () => {
  it("matches bytes32 hex codes in any letter case PRO-4493", () => {
    expect(isSameReferralCode(`0x${HASH_CODE.slice(2).toUpperCase()}`, HASH_CODE)).toBe(true);
    expect(isSameReferralCode(HASH_CODE, ADDRESS_CODE)).toBe(false);
  });

  it("matches a text code and its bytes32 hex", () => {
    expect(isSameReferralCode(rightPadded("546865474d5842616c616e636572"), "TheGMXBalancer")).toBe(true);
  });

  it("doesn't match text that only encodes to the same bytes once stripped", () => {
    expect(isSameReferralCode("mycode", "my-code")).toBe(false);
    expect(isSameReferralCode("abc ", "abc")).toBe(false);
  });

  it("keeps text codes case-sensitive", () => {
    expect(isSameReferralCode("TheGMXBalancer", "TheGMXBalancer")).toBe(true);
    expect(isSameReferralCode("thegmxbalancer", "TheGMXBalancer")).toBe(false);
    expect(isSameReferralCode("", "")).toBe(true);
    expect(isSameReferralCode("", "TheGMXBalancer")).toBe(false);
  });

  it("doesn't match different codes that are both too long to encode", () => {
    expect(isSameReferralCode("A".repeat(MAX_REFERRAL_CODE_LENGTH + 1), "B".repeat(MAX_REFERRAL_CODE_LENGTH + 1))).toBe(
      false
    );
  });
});

describe("isReferralCodeQueryParam", () => {
  const hexCode = HASH_CODE;

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
    expect(isReferralCodeQueryParam(zeroHash)).toBe(false);
  });
});
