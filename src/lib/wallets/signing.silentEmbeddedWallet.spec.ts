import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "sdk/configs/chainIds";

import { signTypedData } from "./signing";
import { silentEmbeddedWalletSigner } from "./silentEmbeddedWalletSigner";

vi.mock("@wagmi/core", () => ({
  getAccount: () => ({ address: ACCOUNT, connector: { id: "io.privy.wallet" } }),
  getChainId: () => ARBITRUM,
}));

vi.mock("lib/metrics", () => ({
  metrics: { pushError: vi.fn(), pushEvent: vi.fn() },
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

const ACCOUNT = "0xF5B94d808d97AEB44dE46d8997Fdc6D215fC6d60";
const OTHER_ACCOUNT = "0xf849c11d8808C4fE6F902F2269e4e88e525Cc38f";
const SIGNATURE_WITH_CONFIRMATION = `0x${"11".repeat(64)}1b`;
const SILENT_SIGNATURE = `0x${"22".repeat(64)}1b`;

const domain = {
  name: "GmxBaseGelatoRelayRouter",
  version: "1",
  chainId: ARBITRUM,
  verifyingContract: "0xABFC734f7CFc9352AED7a97b1F6a236eae831e8A",
};

describe("signTypedData with a silent embedded wallet signer", () => {
  it.each([
    { case: "signs silently when allowed", canSkip: true, silentSigner: ACCOUNT, expected: SILENT_SIGNATURE },
    { case: "asks for confirmation when not allowed", canSkip: false, silentSigner: ACCOUNT },
    { case: "asks for confirmation without a silent signer", canSkip: true, silentSigner: undefined },
    { case: "asks for confirmation when another account registered", canSkip: true, silentSigner: OTHER_ACCOUNT },
    { case: "asks for confirmation when silent signing fails", canSkip: true, silentSigner: ACCOUNT, fails: true },
  ])("$case", async ({ canSkip, silentSigner, fails, expected = SIGNATURE_WITH_CONFIRMATION }) => {
    const wallet = {
      getAddress: async () => ACCOUNT,
      provider: { send: async () => SIGNATURE_WITH_CONFIRMATION },
    } as any;

    const unregister = silentSigner
      ? silentEmbeddedWalletSigner.register({
          address: silentSigner,
          signTypedData: async () => (fails ? Promise.reject(new Error("Privy unavailable")) : SILENT_SIGNATURE),
        })
      : undefined;

    try {
      await expect(
        signTypedData({
          signer: wallet,
          domain,
          types: { Test: [{ name: "value", type: "uint256" }] },
          typedData: { value: 1n },
          verificationChainId: ARBITRUM,
          canSkipEmbeddedWalletConfirmation: canSkip,
        })
      ).resolves.toBe(expected);
    } finally {
      unregister?.();
    }
  });
});
