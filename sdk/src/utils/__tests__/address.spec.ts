import { isAddressEqual } from "viem";
import { describe, expect, it } from "vitest";

import { getAddressKey, isEvmAddress, isSameAddress, normalizeAddress } from "utils/address";

const EVM_CHECKSUMMED = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const EVM_LOWERCASE = EVM_CHECKSUMMED.toLowerCase();
const EVM_WRONG_CHECKSUM = "0x82AF49447D8a07e3bd95BD0d56f35241523fBab1";
const SOLANA_ADDRESS = "So11111111111111111111111111111111111111112";
const SOLANA_ADDRESS_CASE_CHANGED = "so11111111111111111111111111111111111111112";
const KEY_32 = `0x${"ab".repeat(32)}`;
const KEY_32_UPPER = `0x${"AB".repeat(32)}`;

describe("isEvmAddress", () => {
  it("tells EVM hex from base58", () => {
    expect(isEvmAddress(EVM_LOWERCASE)).toBe(true);
    expect(isEvmAddress(SOLANA_ADDRESS)).toBe(false);
  });
});

describe("normalizeAddress", () => {
  it("checksums EVM addresses and keeps base58 as it is", () => {
    expect(normalizeAddress(EVM_LOWERCASE)).toBe(EVM_CHECKSUMMED);
    expect(normalizeAddress(SOLANA_ADDRESS)).toBe(SOLANA_ADDRESS);
  });
});

describe("isSameAddress", () => {
  it.each([
    [EVM_CHECKSUMMED, EVM_LOWERCASE, true],
    [EVM_CHECKSUMMED, EVM_WRONG_CHECKSUM, true],
    [EVM_LOWERCASE, SOLANA_ADDRESS, false],
    ["", "", false],
    ["", EVM_LOWERCASE, false],
    [undefined, undefined, false],
    [KEY_32, KEY_32_UPPER, true],
    [SOLANA_ADDRESS, SOLANA_ADDRESS, true],
    [SOLANA_ADDRESS, SOLANA_ADDRESS_CASE_CHANGED, false],
  ] as const)("isSameAddress(%s, %s) is %s", (a, b, expected) => {
    expect(isSameAddress(a, b)).toBe(expected);
  });

  it("matches viem for a valid checksum and its lowercase form", () => {
    expect(isSameAddress(EVM_CHECKSUMMED, EVM_LOWERCASE)).toBe(isAddressEqual(EVM_CHECKSUMMED, EVM_LOWERCASE));
  });
});

describe("getAddressKey", () => {
  it("lowercases EVM hex, including a 32-byte key, and keeps base58 case", () => {
    expect(getAddressKey(EVM_CHECKSUMMED)).toBe(EVM_LOWERCASE);
    expect(getAddressKey("0xABCDEF")).toBe("0xabcdef");
    expect(getAddressKey(KEY_32_UPPER)).toBe(KEY_32);
    expect(getAddressKey(SOLANA_ADDRESS)).toBe(SOLANA_ADDRESS);
  });
});
