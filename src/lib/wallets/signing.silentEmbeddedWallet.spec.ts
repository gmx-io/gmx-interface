import { UserRejectedRequestError } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CONFIRM_ORDER_SIGNATURES_KEY } from "config/localStorage";
import { ARBITRUM } from "sdk/configs/chainIds";

import { signTypedData } from "./signing";
import { silentEmbeddedWalletSigner } from "./silentEmbeddedWalletSigner";

const wagmi = vi.hoisted(() => ({ connectorId: "" }));

vi.mock("@wagmi/core", () => ({
  getAccount: () => ({ address: ACCOUNT, connector: { id: wagmi.connectorId } }),
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
const EMBEDDED_CONNECTOR_ID = `io.privy.wallet.${ACCOUNT}`;
const SIGNATURE_WITH_CONFIRMATION = `0x${"11".repeat(64)}1b`;
const SILENT_SIGNATURE = `0x${"22".repeat(64)}1b`;

const domain = {
  name: "GmxBaseGelatoRelayRouter",
  version: "1",
  chainId: ARBITRUM,
  verifyingContract: "0xABFC734f7CFc9352AED7a97b1F6a236eae831e8A",
};

describe("signTypedData with a silent embedded wallet signer", () => {
  afterEach(() => localStorage.clear());

  it.each([
    { case: "signs silently when allowed", canSkip: true, silentSigner: ACCOUNT, expected: SILENT_SIGNATURE },
    { case: "asks for confirmation when not allowed", canSkip: false, silentSigner: ACCOUNT },
    { case: "asks for confirmation without a silent signer", canSkip: true, silentSigner: undefined },
    { case: "asks for confirmation when another account registered", canSkip: true, silentSigner: OTHER_ACCOUNT },
    {
      case: "asks for confirmation when silent signing fails",
      canSkip: true,
      silentSigner: ACCOUNT,
      silentError: "Privy unavailable",
    },
    {
      case: "asks for confirmation when an external wallet with the same address is connected",
      canSkip: true,
      silentSigner: ACCOUNT,
      activeConnectorId: "io.metamask",
    },
    {
      case: "asks for confirmation after another tab turned confirmations on",
      canSkip: true,
      silentSigner: ACCOUNT,
      storedConfirmOrderSignatures: true,
    },
    {
      case: "rejects without asking again when the user cancels Privy MFA",
      canSkip: true,
      silentSigner: ACCOUNT,
      silentError: "MFA canceled",
      expected: "rejected",
    },
  ])(
    "$case",
    async ({
      canSkip,
      silentSigner,
      silentError,
      activeConnectorId = EMBEDDED_CONNECTOR_ID,
      storedConfirmOrderSignatures,
      expected = SIGNATURE_WITH_CONFIRMATION,
    }) => {
      wagmi.connectorId = activeConnectorId;

      if (storedConfirmOrderSignatures) {
        localStorage.setItem(JSON.stringify(CONFIRM_ORDER_SIGNATURES_KEY), "true");
      }

      const wallet = {
        getAddress: async () => ACCOUNT,
        provider: { send: async () => SIGNATURE_WITH_CONFIRMATION },
      } as any;

      const unregister = silentSigner
        ? silentEmbeddedWalletSigner.register({
            address: silentSigner,
            connectorId: EMBEDDED_CONNECTOR_ID,
            signTypedData: async () => (silentError ? Promise.reject(new Error(silentError)) : SILENT_SIGNATURE),
          })
        : undefined;

      try {
        const signature = signTypedData({
          signer: wallet,
          domain,
          types: { Test: [{ name: "value", type: "uint256" }] },
          typedData: { value: 1n },
          verificationChainId: ARBITRUM,
          canSkipEmbeddedWalletConfirmation: canSkip,
        });

        if (expected === "rejected") {
          await expect(signature).rejects.toBeInstanceOf(UserRejectedRequestError);
        } else {
          await expect(signature).resolves.toBe(expected);
        }
      } finally {
        unregister?.();
      }
    }
  );
});
