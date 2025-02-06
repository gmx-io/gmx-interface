export const MAX_REFERRAL_CODE_LENGTH = 20;

import { Hash, padHex, stringToHex, zeroHash } from "viem";
import { bytesToString, hexToBytes } from "viem/utils";

export function decodeReferralCode(hexCode?: Hash) {
  if (!hexCode || hexCode === zeroHash) {
    return "";
  }

  try {
    const bytes = hexToBytes(hexCode);
    if (bytes.length !== 32) throw new Error();
    return bytesToString(bytes).replace(/\0+$/, "");
  } catch (ex) {
    let code = "";
    const cleaned = hexCode.substring(2);
    for (let i = 0; i < 32; i++) {
      code += String.fromCharCode(parseInt(cleaned.substring(i * 2, i * 2 + 2), 16));
    }
    return code.trim();
  }
}

export function encodeReferralCode(code: string) {
  let final = code.replace(/[^\w_]/g, ""); // replace everything other than numbers, string  and underscor to ''
  if (final.length > MAX_REFERRAL_CODE_LENGTH) {
    return zeroHash;
  }
  return padHex(stringToHex(final), { size: 32, dir: "right" });
}
