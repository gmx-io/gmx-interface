import { type Hash, padHex, stringToHex, zeroHash } from "viem";

import { shortenAddress } from "lib/legacy";
import {
  decodeReferralCode,
  encodeReferralCode,
  isReferralCodeHex,
  MAX_REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_REGEX,
} from "sdk/utils/referrals";

export type ProtocolReferralCodeType = "organic" | "graduated";

const PROTOCOL_REFERRAL_CODES: Record<string, ProtocolReferralCodeType> = {
  EARNED_TRADER_DISCOUNT_5: "organic",
  EARNED_TRADER_DISCOUNT_10: "organic",
  DIRECT_GMX_DISCOUNT_5: "graduated",
  DIRECT_GMX_DISCOUNT_10: "graduated",
};

const BYTES32_LENGTH = 32;
// 6 bytes is the shortest hex that `shortenAddress(_, 13)` still ellipsizes
const MIN_DISPLAY_HEX_LENGTH = 12;
const ADDRESS_HEX_LENGTH = 40;

export function getProtocolReferralCodeType(codeString: string | undefined): ProtocolReferralCodeType | undefined {
  if (!codeString) {
    return undefined;
  }

  return PROTOCOL_REFERRAL_CODES[codeString];
}

// GMX assigns protocol codes, so traders can't pick one by pasting or linking its hex
export function isProtocolReferralCode(code: string): boolean {
  return getProtocolReferralCodeType(decodeReferralCode(encodeReferralCode(code))) !== undefined;
}

export function isReferralCodeQueryParam(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  if (!isReferralCodeHex(value)) {
    return value.length <= MAX_REFERRAL_CODE_LENGTH;
  }

  return value !== zeroHash && !isProtocolReferralCode(value);
}

/**
 * Unlike `encodeReferralCode`, keeps text codes past the UI limit (any registered code decodes to at most 32 chars)
 * and returns `undefined` instead of stripping characters, so "my-code" can't turn into "mycode".
 */
function encodeReferralCodeLosslessly(code: string): Hash | undefined {
  if (isReferralCodeHex(code)) {
    return encodeReferralCode(code);
  }

  if (code.length > BYTES32_LENGTH || !REFERRAL_CODE_REGEX.test(code)) {
    return undefined;
  }

  return padHex(stringToHex(code), { size: BYTES32_LENGTH, dir: "right" });
}

/**
 * Text codes are case-sensitive; bytes32 hex codes can come in any letter case or stand for a text code.
 */
export function isSameReferralCode(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }

  const encoded = encodeReferralCodeLosslessly(a);

  return encoded !== undefined && encoded === encodeReferralCodeLosslessly(b);
}

// `?ref=` drops text past the UI limit, so those codes link by their bytes32 hex
export function getReferralCodeLinkParam(code: string): string {
  if (code.length <= MAX_REFERRAL_CODE_LENGTH) {
    return code;
  }

  return encodeReferralCodeLosslessly(code) ?? code;
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

  // pasted hex can come in any letter case
  const hex = code.slice(2).toLowerCase();
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
