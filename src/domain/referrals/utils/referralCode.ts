import type { Hash } from "viem";

import { shortenAddress } from "lib/legacy";
import { isReferralCodeHex } from "sdk/utils/referrals";

export const REFERRAL_CODE_REGEX = /^\w+$/;
export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/;

export function isHash(value: string | null | undefined): value is Hash {
  return typeof value === "string" && REGEX_VERIFY_BYTES32.test(value);
}

/**
 * Codes that can't be decoded as text come back from `decodeReferralCode` as raw bytes32 hex;
 * show them shortened, with left zero padding (e.g. of an address) dropped.
 */
export function formatReferralCodeForDisplay(code: string): string {
  if (!isReferralCodeHex(code)) {
    return code;
  }

  const trimmedHex = `0x${code.slice(2).replace(/^(?:00)+/, "")}`;

  return shortenAddress(trimmedHex, 13) ?? code;
}
