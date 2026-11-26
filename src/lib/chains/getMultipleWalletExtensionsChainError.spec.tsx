import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";

import { getMultipleWalletExtensionsChainError } from "./getMultipleWalletExtensionsChainError";

describe("getMultipleWalletExtensionsChainError", () => {
  const base = { requiredChainId: ARBITRUM, isSuspicious: true, isConnected: true };

  it("blocks EVM transactions when wallet extensions are on different networks", () => {
    expect(getMultipleWalletExtensionsChainError({ ...base, isSolana: false }).buttonErrorMessage).toBeDefined();
  });

  it("does not block Solana transactions signed by the Solana wallet", () => {
    expect(getMultipleWalletExtensionsChainError({ ...base, isSolana: true })).toEqual({});
  });
});
