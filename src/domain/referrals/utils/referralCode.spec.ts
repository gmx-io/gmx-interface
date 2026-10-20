import { stringToHex, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { MAX_REFERRAL_CODE_LENGTH } from "sdk/utils/referrals";

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
  it.each([
    [ADDRESS_CODE, "0x6076...159d"],
    [HASH_CODE, "0x3542...6747"],
    [leftPadded("01"), "0x0000...0001"],
    [leftPadded("07e9"), "0x0000...07e9"],
    // UTF-8 "тест" and "привет"
    [rightPadded("d182d0b5d181d182"), "0xd182...8200"],
    [rightPadded("d0bfd180d0b8d0b2d0b5d182"), "0xd0bf...8200"],
    [rightPadded("01"), "0x0100...0000"],
    // on-chain text that looks like a short hex
    [rightPadded(stringToHex("0x6076...159d").slice(2)), "0x3078...6400"],
    [`0x00${HASH_CODE.slice(4)}`, "0x0042...6747"],
    [leftPadded("ab".repeat(20)), "0xabab...abab"],
    [leftPadded("ab".repeat(21)), "0x0000...abab"],
    [rightPadded("546865474d5842616c616e636572"), "TheGMXBalancer"],
    ["TheGMXBalancer", "TheGMXBalancer"],
    ["0x1234", "0x1234"],
    ["", ""],
  ])("formats %s as %s PRO-4493", (code, expected) => {
    expect(formatReferralCodeForDisplay(code)).toBe(expected);
  });

  it("never renders hex codes as something that could be a text code", () => {
    for (const bytes of ["01", "07e9", "d182d0b5d181d182", "6076934cde1fd93bbfada76a555065886a8b159d"]) {
      const left = formatReferralCodeForDisplay(leftPadded(bytes));
      const right = formatReferralCodeForDisplay(rightPadded(bytes));

      for (const display of [left, right]) {
        expect(display).toContain("...");
        expect(REFERRAL_CODE_REGEX.test(display)).toBe(false);
      }
      expect(left).not.toBe(right);
    }
  });
});

describe("isSameReferralCode", () => {
  it.each([
    [`0x${HASH_CODE.slice(2).toUpperCase()}`, HASH_CODE, true],
    [HASH_CODE, ADDRESS_CODE, false],
    [rightPadded("546865474d5842616c616e636572"), "TheGMXBalancer", true],
    // encoding strips other characters
    ["mycode", "my-code", false],
    ["abc ", "abc", false],
    ["TheGMXBalancer", "TheGMXBalancer", true],
    ["thegmxbalancer", "TheGMXBalancer", false],
    ["", "", true],
    ["", "TheGMXBalancer", false],
    // both too long to encode
    ["A".repeat(MAX_REFERRAL_CODE_LENGTH + 1), "B".repeat(MAX_REFERRAL_CODE_LENGTH + 1), false],
  ])("isSameReferralCode(%s, %s) is %s PRO-4493", (a, b, expected) => {
    expect(isSameReferralCode(a, b)).toBe(expected);
  });
});

describe("isReferralCodeQueryParam", () => {
  it.each([
    ["TheGMXBalancer", true],
    ["A".repeat(MAX_REFERRAL_CODE_LENGTH), true],
    [HASH_CODE, true],
    [`0x${HASH_CODE.slice(2).toUpperCase()}`, true],
    [null, false],
    [undefined, false],
    ["", false],
    ["A".repeat(MAX_REFERRAL_CODE_LENGTH + 1), false],
    [HASH_CODE.slice(0, -2), false],
    [`${HASH_CODE}00`, false],
    [zeroHash, false],
  ])("isReferralCodeQueryParam(%s) is %s PRO-4493", (value, expected) => {
    expect(isReferralCodeQueryParam(value)).toBe(expected);
  });
});
