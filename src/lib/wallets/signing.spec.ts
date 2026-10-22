import { hashTypedData } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";

import { hashSignedTypedData, splitSignature } from "./signing";

const domain = {
  name: "GmxBaseGelatoRelayRouter",
  version: "1",
  chainId: ARBITRUM,
  verifyingContract: "0xABFC734f7CFc9352AED7a97b1F6a236eae831e8A",
};

const types = {
  Batch: [
    { name: "account", type: "address" },
    { name: "relayParams", type: "bytes32" },
  ],
};

const typedData = {
  account: "0xf849c11d8808C4fE6F902F2269e4e88e525Cc38f",
  relayParams: "0x94baebfda9b87680d8e59aa20a3e565126640ee7caeab3cd965e5568b17ee000",
};

function hashPlainStruct() {
  return hashTypedData({ domain, types, primaryType: "Batch", message: typedData });
}

describe("hashSignedTypedData", () => {
  it("hashes a Minified wrapper that contains the struct hash, not the struct itself", () => {
    const expected = hashTypedData({
      domain,
      types: { Minified: [{ name: "digest", type: "bytes32" }] },
      primaryType: "Minified",
      message: { digest: hashPlainStruct() },
    });

    expect(hashSignedTypedData({ domain, types, typedData })).toBe(expected);
  });

  it("returns a different hash than the plain struct hash, so the two must not be mixed up", () => {
    expect(hashSignedTypedData({ domain, types, typedData })).not.toBe(hashPlainStruct());
  });

  it("returns the plain struct hash when minified is false", () => {
    expect(hashSignedTypedData({ domain, types, typedData, minified: false })).toBe(hashPlainStruct());
  });

  it("returns a different hash for every domain chainId, so a wallet on another chain signs another hash", () => {
    const hashForArbitrum = hashSignedTypedData({ domain, types, typedData });
    const hashForBase = hashSignedTypedData({ domain: { ...domain, chainId: SOURCE_BASE_MAINNET }, types, typedData });

    expect(hashForArbitrum).not.toBe(hashForBase);
  });
});

describe("splitSignature", () => {
  const r = "11".repeat(32);
  const s = "22".repeat(32);

  it("splits a 65-byte signature", () => {
    expect(splitSignature(`0x${r}${s}1c`)).toEqual({ r: `0x${r}`, s: `0x${s}`, v: 28 });
  });

  it("normalizes a bare recovery id to 27/28", () => {
    expect(splitSignature(`0x${r}${s}00`).v).toBe(27);
    expect(splitSignature(`0x${r}${s}01`).v).toBe(28);
  });

  it("rejects signatures that are not 65 bytes", () => {
    expect(() => splitSignature(`0x${r}${s}`)).toThrow();
    expect(() => splitSignature(`0x${r}${s}1b${"00".repeat(32)}`)).toThrow();
  });

  it("rejects an unknown v", () => {
    expect(() => splitSignature(`0x${r}${s}25`)).toThrow();
  });
});
