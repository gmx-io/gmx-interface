export const MAX_REFERRAL_CODE_LENGTH = 20;

import { Hash, padHex, stringToHex, zeroHash } from "viem";
import { hexToBytes } from "viem/utils";

const BYTES32_HEX_REGEX = /^0x[0-9a-fA-F]{64}$/;

export function isReferralCodeHex(value: string | null | undefined): value is Hash {
  return typeof value === "string" && BYTES32_HEX_REGEX.test(value);
}

/**
 * Codes registered through the UI are letters, digits and `_` right-padded with zeros. The contract accepts any
 * bytes32, so anything else (e.g. left-padded addresses, hashes, other text) is returned as the original hex.
 */
export function decodeReferralCode(hexCode?: Hash) {
  if (!isReferralCodeHex(hexCode) || hexCode === zeroHash) {
    return "";
  }

  const bytes = hexToBytes(hexCode);
  const firstZeroIndex = bytes.indexOf(0);
  const textLength = firstZeroIndex === -1 ? bytes.length : firstZeroIndex;
  const text = String.fromCharCode(...bytes.subarray(0, textLength));

  // only the characters `encodeReferralCode` keeps, so the text leads back to the same code
  if (!/^\w+$/.test(text) || bytes.subarray(textLength).some((byte) => byte !== 0)) {
    return hexCode;
  }

  return text;
}

export function encodeReferralCode(code: string) {
  // not `isReferralCodeHex`: its type guard would narrow `code` to never below
  if (BYTES32_HEX_REGEX.test(code)) {
    // not an address, so no checksum casing; lowercase matches what chain and subgraph return
    return code.toLowerCase() as Hash;
  }

  let final = code.replace(/[^\w_]/g, ""); // replace everything other than numbers, string  and underscor to ''
  if (final.length > MAX_REFERRAL_CODE_LENGTH) {
    return zeroHash;
  }
  return padHex(stringToHex(final), { size: 32, dir: "right" });
}
