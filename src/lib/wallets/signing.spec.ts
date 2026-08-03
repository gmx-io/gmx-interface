import { hashTypedData } from "viem";
import { describe, expect, it } from "vitest";

import { ERC6492_MAGIC_SUFFIX, getSignatureKind, hashSignedTypedData } from "./signing";

const domain = {
  name: "GmxBaseGelatoRelayRouter",
  version: "1",
  chainId: 42161,
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

describe("hashSignedTypedData", () => {
  it("hashes the Minified envelope wrapping the struct digest, not the struct itself", () => {
    const digest = hashTypedData({ domain, types, primaryType: "Batch", message: typedData });

    const expected = hashTypedData({
      domain,
      types: { Minified: [{ name: "digest", type: "bytes32" }] },
      primaryType: "Minified",
      message: { digest },
    });

    expect(hashSignedTypedData({ domain, types, typedData })).toBe(expected);
  });

  it("differs from the raw struct hash — signing one and verifying the other is the bug this guards", () => {
    const structHash = hashTypedData({ domain, types, primaryType: "Batch", message: typedData });

    expect(hashSignedTypedData({ domain, types, typedData })).not.toBe(structHash);
  });

  it("returns the raw struct hash when minification is disabled", () => {
    const structHash = hashTypedData({ domain, types, primaryType: "Batch", message: typedData });

    expect(hashSignedTypedData({ domain, types, typedData, minified: false })).toBe(structHash);
  });

  it("binds the hash to the domain chainId, so a wallet on the wrong chain signs a different payload", () => {
    const onArbitrum = hashSignedTypedData({ domain, types, typedData });
    const onBase = hashSignedTypedData({ domain: { ...domain, chainId: 8453 }, types, typedData });

    expect(onArbitrum).not.toBe(onBase);
  });
});

describe("getSignatureKind", () => {
  it("detects a 65-byte ECDSA signature", () => {
    expect(getSignatureKind(`0x${"11".repeat(65)}`)).toBe("eoa");
  });

  it("detects an ERC-6492 wrapper by its trailing magic", () => {
    expect(getSignatureKind(`0x${"11".repeat(200)}${ERC6492_MAGIC_SUFFIX}`)).toBe("erc6492");
  });

  it("treats other lengths as a contract-account signature", () => {
    expect(getSignatureKind(`0x${"11".repeat(200)}`)).toBe("erc1271");
  });

  it("does not mistake a 65-byte signature that merely contains the magic for a wrapper", () => {
    expect(getSignatureKind(`0x${ERC6492_MAGIC_SUFFIX}${"11".repeat(33)}`)).toBe("eoa");
  });

  it("flags empty and non-hex input", () => {
    expect(getSignatureKind("0x")).toBe("malformed");
    expect(getSignatureKind("not a signature")).toBe("malformed");
  });
});
