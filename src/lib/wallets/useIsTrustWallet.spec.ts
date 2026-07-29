import { describe, expect, it } from "vitest";

import { getIsTrustWallet } from "./useIsTrustWallet";

describe("getIsTrustWallet", () => {
  it("detects the Trust Wallet EIP-6963 connector", () => {
    expect(getIsTrustWallet("com.trustwallet.app")).toBe(true);
  });

  it("does not match other connectors", () => {
    expect(getIsTrustWallet("io.metamask")).toBe(false);
    expect(getIsTrustWallet("trust")).toBe(false);
    expect(getIsTrustWallet(undefined)).toBe(false);
  });
});
