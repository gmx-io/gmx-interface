// import { MAX_REFERRAL_CODE_LENGTH } from "lib/legacy";

import { decodeAbiParameters, Hash } from "viem";
import { hexToBytes } from "viem/utils";

export function decodeReferralCode(hexCode?: Hash) {
  if (!hexCode || hexCode === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return "";
  }
  try {
    const decoded = decodeAbiParameters([{ type: "bytes32" }], hexCode);
    return decoded[0];
  } catch (ex) {
    let code = "";
    const hexBytes = hexToBytes(hexCode);
    for (let i = 0; i < 32; i++) {
      code += String.fromCharCode(hexBytes[i]);
    }
    return code.trim();
  }
}

// export function encodeReferralCode(code) {
//   let final = code.replace(/[^\w_]/g, ""); // replace everything other than numbers, string  and underscor to ''
//   if (final.length > MAX_REFERRAL_CODE_LENGTH) {
//     return ethers.ZeroHash;
//   }
//   return ethers.encodeBytes32String(final);
// }
