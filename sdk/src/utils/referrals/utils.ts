export const MAX_REFERRAL_CODE_LENGTH = 20;

import { Hash, padHex, stringToHex, zeroHash } from "viem";
import { hexToBytes } from "viem/utils";

const BYTES32_HEX_REGEX = /^0x[0-9a-fA-F]{64}$/;

export function isReferralCodeHex(value: string | undefined): boolean {
  return value !== undefined && BYTES32_HEX_REGEX.test(value);
}

function isPrintableAscii(byte: number) {
  return byte >= 0x20 && byte <= 0x7e;
}

/**
 * Codes registered through the UI are printable ASCII right-padded with zeros. The contract accepts any bytes32,
 * so anything else (e.g. left-padded addresses, hashes) is returned as the original hex.
 */
export function decodeReferralCode(hexCode?: Hash) {
  if (!hexCode || hexCode === zeroHash || !isReferralCodeHex(hexCode)) {
    return "";
  }

  const bytes = hexToBytes(hexCode);
  const firstZeroIndex = bytes.indexOf(0);
  const textLength = firstZeroIndex === -1 ? bytes.length : firstZeroIndex;
  const textBytes = bytes.subarray(0, textLength);

  if (!textBytes.every(isPrintableAscii) || bytes.subarray(textLength).some((byte) => byte !== 0)) {
    return hexCode;
  }

  return String.fromCharCode(...textBytes);
}

export function encodeReferralCode(code: string) {
  if (isReferralCodeHex(code)) {
    // not an address, so no checksum casing; lowercase matches what chain and subgraph return
    return code.toLowerCase() as Hash;
  }

  let final = code.replace(/[^\w_]/g, ""); // replace everything other than numbers, string  and underscor to ''
  if (final.length > MAX_REFERRAL_CODE_LENGTH) {
    return zeroHash;
  }
  return padHex(stringToHex(final), { size: 32, dir: "right" });
}
