import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetPrivyMock, useConnectOrCreateWallet, useLogin, usePrivy, useWallets } from "./privyReactAuth";

describe("Privy React Auth Playwright mock", () => {
  beforeEach(() => {
    __resetPrivyMock();
  });
  it("passes a realistic wallet payload to connectOrCreateWallet success callbacks", () => {
    const onSuccess = vi.fn();

    const { connectOrCreateWallet } = useConnectOrCreateWallet({ onSuccess });
    connectOrCreateWallet();

    expect(onSuccess).toHaveBeenCalledWith({
      wallet: expect.objectContaining({
        address: expect.any(String),
        type: "ethereum",
        walletClientType: expect.any(String),
        connectorType: expect.any(String),
      }),
    });
  });

  it("passes realistic login params to login complete callbacks", () => {
    const onComplete = vi.fn();

    const { login } = useLogin({ onComplete });
    login();

    expect(onComplete).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: expect.any(String),
        linkedAccounts: expect.any(Array),
      }),
      isNewUser: false,
      wasAlreadyAuthenticated: false,
      loginMethod: "email",
      loginAccount: null,
    });
  });

  it("keeps usePrivy and useWallets in sync with mock login state", () => {
    useLogin().login();

    expect(usePrivy().user).toEqual(
      expect.objectContaining({
        id: expect.any(String),
      })
    );
    expect(useWallets().wallets).toEqual([
      expect.objectContaining({
        address: expect.any(String),
      }),
    ]);
  });
});
