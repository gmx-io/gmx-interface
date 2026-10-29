import { zeroHash } from "viem";

import { shortenAddress } from "lib/legacy";
import {
  decodeReferralCode,
  encodeReferralCode,
  isReferralCodeHex,
  MAX_REFERRAL_CODE_LENGTH,
} from "sdk/utils/referrals";

export const REFERRAL_CODE_REGEX = /^\w+$/;

// 6 bytes is the shortest hex that `shortenAddress(_, 13)` still ellipsizes
const MIN_DISPLAY_HEX_LENGTH = 12;
const ADDRESS_HEX_LENGTH = 40;

export function isReferralCodeQueryParam(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  return value.length <= MAX_REFERRAL_CODE_LENGTH || (isReferralCodeHex(value) && value !== zeroHash);
}

function isEncodedLosslessly(code: string) {
  return (code.length <= MAX_REFERRAL_CODE_LENGTH && REFERRAL_CODE_REGEX.test(code)) || isReferralCodeHex(code);
}

/**
 * Text codes are case-sensitive; bytes32 hex codes can come in any letter case or stand for a text code.
 */
export function isSameReferralCode(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  // encoding strips other characters, so "my-code" would match "mycode"
  if (!isEncodedLosslessly(a) || !isEncodedLosslessly(b)) {
    return false;
  }

  return encodeReferralCode(a) === encodeReferralCode(b);
}

// hex codes always keep the ellipsis, so they can't be mistaken for a text code like `0x01`
export function formatReferralCodeForDisplay(code: string): string {
  if (!isReferralCodeHex(code)) {
    return code;
  }

  const decoded = decodeReferralCode(code);
  if (decoded !== "" && !isReferralCodeHex(decoded)) {
    return decoded;
  }

  const hex = code.slice(2);
  let displayHex = hex;

  if (hex.startsWith("00")) {
    const trimmedHex = hex.replace(/^(?:00)+/, "");

    // left-padded, e.g. an address; longer values (a hash starting with 00) are shown as is
    if (trimmedHex.length <= ADDRESS_HEX_LENGTH) {
      displayHex = trimmedHex.padStart(MIN_DISPLAY_HEX_LENGTH, "0");
    }
  } else if (hex.endsWith("00")) {
    // right-padded bytes keep one zero byte, so they never look like a left-padded value with the same bytes
    displayHex = `${hex.replace(/(?:00)+$/, "")}00`.padEnd(MIN_DISPLAY_HEX_LENGTH, "0");
  }

  return shortenAddress(`0x${displayHex}`, 13) ?? code;
}
