import type { ConnectedWallet, User } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";

import { getWalletAnalyticsProvenance } from "./walletProvenance";

function createUser(linkedAccounts: User["linkedAccounts"]): User {
  return {
    id: "user-id",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    linkedAccounts,
    mfaMethods: [],
    hasAcceptedTerms: false,
    isGuest: false,
  };
}

function createConnectedWallet(wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType">) {
  return wallet as ConnectedWallet;
}

describe("getWalletAnalyticsProvenance", () => {
  it("returns embedded provenance and the latest embedded login method", () => {
    const user = createUser([
      {
        type: "email",
        address: "user@gmx.io",
        firstVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        latestVerifiedAt: new Date("2026-01-03T00:00:00.000Z"),
      },
      {
        type: "passkey",
        credentialId: "credential-id",
        publicKey: "public-key",
        enrolledInMfa: false,
        firstVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
        latestVerifiedAt: new Date("2026-01-04T00:00:00.000Z"),
      },
      {
        type: "wallet",
        address: "0x0000000000000000000000000000000000000001",
        chainType: "ethereum",
        walletClientType: "privy",
        connectorType: "embedded",
        imported: false,
        delegated: false,
        walletIndex: 0,
        firstVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
        latestVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    expect(
      getWalletAnalyticsProvenance({
        account: "0x0000000000000000000000000000000000000001",
        user,
      })
    ).toEqual({
      walletProvenance: "embedded",
      embeddedWalletLoginMethod: "passkey",
    });
  });

  it("returns external provenance for a connected non-Privy wallet", () => {
    const user = createUser([
      {
        type: "wallet",
        address: "0x0000000000000000000000000000000000000002",
        chainType: "ethereum",
        walletClientType: "metamask",
        connectorType: "injected",
        imported: false,
        delegated: false,
        walletIndex: null,
        firstVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
        latestVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    expect(
      getWalletAnalyticsProvenance({
        account: "0x0000000000000000000000000000000000000002",
        user,
      })
    ).toEqual({
      walletProvenance: "external",
      embeddedWalletLoginMethod: undefined,
    });
  });

  it("returns external provenance for an unauthenticated connected external wallet", () => {
    expect(
      getWalletAnalyticsProvenance({
        account: "0x0000000000000000000000000000000000000003",
        connectedWallets: [
          createConnectedWallet({
            address: "0x0000000000000000000000000000000000000003",
            connectorType: "injected",
            walletClientType: "metamask",
          }),
        ],
        user: null,
      })
    ).toEqual({
      walletProvenance: "external",
      embeddedWalletLoginMethod: undefined,
    });
  });

  it("returns no provenance for an unauthenticated account without a connected wallet match", () => {
    expect(
      getWalletAnalyticsProvenance({
        account: "0x0000000000000000000000000000000000000004",
        connectedWallets: [
          createConnectedWallet({
            address: "0x0000000000000000000000000000000000000005",
            connectorType: "injected",
            walletClientType: "metamask",
          }),
        ],
        user: null,
      })
    ).toEqual({});
  });
});
