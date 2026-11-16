import { describe, expect, it } from "vitest";

import { analyzeSignatureShape, ERC6492_MAGIC_SUFFIX, getSignatureKind } from "./signatureDiagnostics";

describe("getSignatureKind", () => {
  it("returns eoa when the signature is 65 bytes long", () => {
    expect(getSignatureKind(`0x${"11".repeat(65)}`)).toBe("eoa");
  });

  it("returns erc6492 when the signature ends with the ERC-6492 magic suffix", () => {
    expect(getSignatureKind(`0x${"11".repeat(200)}${ERC6492_MAGIC_SUFFIX}`)).toBe("erc6492");
  });

  it("returns erc1271 for any other length, because only a contract account can produce it", () => {
    expect(getSignatureKind(`0x${"11".repeat(200)}`)).toBe("erc1271");
  });

  it("returns eoa when the magic suffix appears at the start instead of the end", () => {
    expect(getSignatureKind(`0x${ERC6492_MAGIC_SUFFIX}${"11".repeat(33)}`)).toBe("eoa");
  });

  it("returns malformed for empty or non-hex input", () => {
    expect(getSignatureKind("0x")).toBe("malformed");
    expect(getSignatureKind("not a signature")).toBe("malformed");
  });
});

describe("analyzeSignatureShape", () => {
  const R = "11".repeat(32);
  const LOW_S = `7f${"11".repeat(31)}`;
  // One above secp256k1n / 2, which is the smallest value the on-chain check rejects.
  const HIGH_S = "7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a1";

  // The on-chain check accepts only v = 27 or v = 28.
  const V_27 = "1b";
  const V_28 = "1c";
  const V_0 = "00";

  it("returns isOnChainRecoverableShape true for a 65-byte signature with v = 27 and a low s", () => {
    expect(analyzeSignatureShape(`0x${R}${LOW_S}${V_27}`)).toMatchObject({
      signatureBytes: 65,
      ecdsaV: 27,
      isHighS: false,
      isOnChainRecoverableShape: true,
    });
  });

  it("returns isOnChainRecoverableShape false when v is 0, which some wallets return instead of 27", () => {
    expect(analyzeSignatureShape(`0x${R}${LOW_S}${V_0}`)).toMatchObject({
      ecdsaV: 0,
      isOnChainRecoverableShape: false,
    });
  });

  it("returns isOnChainRecoverableShape false when s is above half the curve order", () => {
    expect(analyzeSignatureShape(`0x${R}${HIGH_S}${V_28}`)).toMatchObject({
      ecdsaV: 28,
      isHighS: true,
      isOnChainRecoverableShape: false,
    });
  });

  it("returns undefined ECDSA fields when the signature is not 65 bytes", () => {
    expect(analyzeSignatureShape(`0x${"11".repeat(192)}`)).toMatchObject({
      signatureKind: "erc1271",
      signatureBytes: 192,
      ecdsaV: undefined,
      isOnChainRecoverableShape: undefined,
    });
  });

  it("returns a result instead of throwing for non-hex input", () => {
    expect(analyzeSignatureShape("not a signature")).toMatchObject({
      signatureKind: "malformed",
      signatureBytes: undefined,
    });
  });
});
