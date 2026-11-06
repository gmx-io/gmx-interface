import { padHex, stringToHex, zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { MAX_REFERRAL_CODE_LENGTH } from "sdk/utils/referrals";

import {
  formatReferralCodeForDisplay,
  getReferralCodeLinkParam,
  isReferralCodeQueryParam,
  isSameReferralCode,
} from "./referralCode";

const ADDRESS_CODE = "0x0000000000000000000000006076934cde1fd93bbfada76a555065886a8b159d";
const HASH_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

function leftPadded(hex: string) {
  return `0x${hex.padStart(64, "0")}`;
}

function rightPadded(text: string) {
  return padHex(stringToHex(text), { size: 32, dir: "right" });
}

describe("referralCode", () => {
  it.each([
    [ADDRESS_CODE, "0x6076...159d"],
    [HASH_CODE, "0x3542...6747"],
    [`0x${HASH_CODE.slice(2).toUpperCase()}`, "0x3542...6747"],
    [leftPadded("01"), "0x0000...0001"],
    [`0x${"01".padEnd(64, "0")}`, "0x0100...0000"],
    // UTF-8 "тест"
    [`0x${"d182d0b5d181d182".padEnd(64, "0")}`, "0xd182...8200"],
    // on-chain text that looks like a short hex
    [rightPadded("0x6076...159d"), "0x3078...6400"],
    [`0x00${HASH_CODE.slice(4)}`, "0x0042...6747"],
    [leftPadded("ab".repeat(20)), "0xabab...abab"],
    [leftPadded("ab".repeat(21)), "0x0000...abab"],
    [rightPadded("TheGMXBalancer"), "TheGMXBalancer"],
    ["0x1234", "0x1234"],
  ])("formatReferralCodeForDisplay(%s) is %s PRO-4493", (code, expected) => {
    expect(formatReferralCodeForDisplay(code)).toBe(expected);
  });

  it.each([
    ["TheGMXBalancer", true],
    ["A".repeat(MAX_REFERRAL_CODE_LENGTH), true],
    [HASH_CODE, true],
    [`0x${HASH_CODE.slice(2).toUpperCase()}`, true],
    ["", false],
    ["A".repeat(MAX_REFERRAL_CODE_LENGTH + 1), false],
    [HASH_CODE.slice(0, -2), false],
    [zeroHash, false],
    [rightPadded("EARNED_TRADER_DISCOUNT_10"), false],
  ])("isReferralCodeQueryParam(%s) is %s PRO-4493", (value, expected) => {
    expect(isReferralCodeQueryParam(value)).toBe(expected);
  });

  it("links and matches text codes past the UI limit by their bytes32 PRO-4493", () => {
    const longCode = "chesicklonghoferen747";
    const longCodeHex = rightPadded(longCode);

    expect(getReferralCodeLinkParam("TheGMXBalancer")).toBe("TheGMXBalancer");
    expect(getReferralCodeLinkParam(longCode)).toBe(longCodeHex);
    expect(isReferralCodeQueryParam(getReferralCodeLinkParam(longCode))).toBe(true);

    expect(isSameReferralCode(`0x${longCodeHex.slice(2).toUpperCase()}`, longCode)).toBe(true);
    expect(isSameReferralCode("thegmxbalancer", "TheGMXBalancer")).toBe(false);
    // encoding strips other characters
    expect(isSameReferralCode("mycode", "my-code")).toBe(false);
  });
});
