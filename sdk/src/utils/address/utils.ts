import { getAddress } from "viem";

const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const HEX_REGEX = /^0x[0-9a-fA-F]*$/;

/**
 * Addresses in shared code are EVM hex or Solana base58. Base58 has no `0` in its alphabet, so it never matches.
 * Base58 is case-sensitive, so it must never be checksummed, lowercased or compared through viem.
 */
export function isEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address);
}

/** Checksums an EVM address and keeps any other address as it is. */
export function normalizeAddress(address: string): string {
  return isEvmAddress(address) ? getAddress(address) : address;
}

/** Compares EVM hex case-insensitively and any other address exactly. Empty input does not match. */
export function isSameAddress(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  return getAddressKey(a) === getAddressKey(b);
}

/** A map or set key: lowercased for EVM hex (addresses and hashes), unchanged for base58. */
export function getAddressKey(address: string): string {
  return HEX_REGEX.test(address) ? address.toLowerCase() : address;
}
