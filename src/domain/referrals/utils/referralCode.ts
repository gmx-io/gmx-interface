import type { Hash } from "viem";

export const REFERRAL_CODE_REGEX = /^\w+$/;
export const REGEX_VERIFY_BYTES32 = /^0x[0-9a-f]{64}$/;

export function isHash(value: string | null | undefined): value is Hash {
  return typeof value === "string" && REGEX_VERIFY_BYTES32.test(value);
}
