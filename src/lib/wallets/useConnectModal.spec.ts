import { describe, expect, it } from "vitest";

import { getActiveWalletStorageValueAfterLogin } from "./useConnectModal";

function createUserWithWallet(
  walletClientType: string,
  connectorType = walletClientType === "privy" ? "embedded" : "injected"
) {
  return {
    id: "did:privy:user-id",
    linkedAccounts: [
      {
        address: `0x${walletClientType.padEnd(40, "0").slice(0, 40)}`,
        type: "wallet",
        chainType: "ethereum",
        walletClientType,
        connectorType,
      },
    ],
  } as any;
}

describe("getActiveWalletStorageValueAfterLogin", () => {
  it("does not store a pending embedded wallet selection for email login", () => {
    expect(
      getActiveWalletStorageValueAfterLogin({
        loginMethod: "email",
        wasAlreadyAuthenticated: false,
        user: createUserWithWallet("rabby_wallet"),
      })
    ).toBeUndefined();
  });

  it("does not overwrite active wallet storage for an existing authenticated session", () => {
    expect(
      getActiveWalletStorageValueAfterLogin({
        loginMethod: null,
        wasAlreadyAuthenticated: true,
        user: createUserWithWallet("privy"),
      })
    ).toBeUndefined();
  });

  it("stores the existing embedded wallet for email login", () => {
    const user = createUserWithWallet("privy");

    expect(
      getActiveWalletStorageValueAfterLogin({
        loginMethod: "email",
        wasAlreadyAuthenticated: false,
        user,
      })
    ).toEqual({
      address: user.linkedAccounts[0].address,
      connectorType: "embedded",
      walletClientType: "privy",
    });
  });

  it("stores a Privy v2 embedded wallet for email login", () => {
    const user = createUserWithWallet("privy-v2", "embedded");

    expect(
      getActiveWalletStorageValueAfterLogin({
        loginMethod: "email",
        wasAlreadyAuthenticated: false,
        user,
      })
    ).toEqual({
      address: user.linkedAccounts[0].address,
      connectorType: "embedded",
      walletClientType: "privy-v2",
    });
  });

  it("stores the login wallet for wallet login", () => {
    const user = createUserWithWallet("rabby_wallet");

    expect(
      getActiveWalletStorageValueAfterLogin({
        loginAccount: user.linkedAccounts[0],
        loginMethod: "siwe",
        wasAlreadyAuthenticated: false,
        user,
      })
    ).toEqual({
      address: user.linkedAccounts[0].address,
      connectorType: "injected",
      walletClientType: "rabby_wallet",
    });
  });
});
