import type { ConnectedWallet, Wallet } from "@privy-io/react-auth";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActivePrivyWalletStorageKey } from "./activeWalletStorage";

const mocks = vi.hoisted(() => ({
  connectOrCreateWalletCallbacks: undefined as any,
  createWallet: vi.fn(),
  loginCallbacks: undefined as any,
  setActiveWallet: vi.fn(),
  switchNetwork: vi.fn(),
  user: { id: "did:privy:user-id", linkedAccounts: [] as any[] },
}));

vi.mock("@privy-io/react-auth", () => ({
  useConnectOrCreateWallet: (callbacks: any) => {
    mocks.connectOrCreateWalletCallbacks = callbacks;
    return { connectOrCreateWallet: vi.fn() };
  },
  useCreateWallet: () => ({
    createWallet: mocks.createWallet,
  }),
  useLogin: (callbacks: any) => {
    mocks.loginCallbacks = callbacks;
  },
  usePrivy: () => ({
    user: mocks.user,
  }),
}));

vi.mock("@privy-io/wagmi", () => ({
  useSetActiveWallet: () => ({
    setActiveWallet: mocks.setActiveWallet,
  }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSettlementChainId: () => [42161],
}));

vi.mock("config/multichain", () => ({
  isSourceChain: () => false,
}));

vi.mock("lib/metrics", () => ({
  metrics: {
    pushError: vi.fn(),
  },
}));

vi.mock("lib/wallets", () => ({
  switchNetwork: mocks.switchNetwork,
}));

function createConnectedWallet(
  wallet: Pick<ConnectedWallet, "address" | "connectorType" | "walletClientType" | "linked">
) {
  return {
    chainId: "eip155:42161",
    getEthereumProvider: vi.fn(),
    meta: { id: wallet.walletClientType, name: wallet.walletClientType },
    type: "ethereum",
    ...wallet,
  } as unknown as ConnectedWallet;
}

function createEmbeddedWallet(walletClientType = "privy") {
  return {
    address: "0x0000000000000000000000000000000000000001",
    chainType: "ethereum",
    connectorType: "embedded",
    walletClientType,
  } as Wallet;
}

async function setupProvider() {
  const { ConnectModalProvider } = await import("./useConnectModal");

  render(<ConnectModalProvider>content</ConnectModalProvider>);
}

describe("ConnectModalProvider Privy wallet selection", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.connectOrCreateWalletCallbacks = undefined;
    mocks.loginCallbacks = undefined;
    mocks.user = { id: "did:privy:user-id", linkedAccounts: [] };
    mocks.setActiveWallet.mockResolvedValue(undefined);
    mocks.switchNetwork.mockResolvedValue(undefined);
  });

  it("switches wagmi to the connected wallet before finishing connectOrCreateWallet success", async () => {
    const wallet = createConnectedWallet({
      address: "0x0000000000000000000000000000000000000002",
      connectorType: "injected",
      linked: true,
      walletClientType: "rabby_wallet",
    });

    await setupProvider();

    mocks.connectOrCreateWalletCallbacks.onSuccess({ wallet });

    await waitFor(() => expect(mocks.setActiveWallet).toHaveBeenCalledWith(wallet));
    expect(localStorage.getItem(getActivePrivyWalletStorageKey(mocks.user.id))).toBe(
      JSON.stringify({
        address: wallet.address,
        connectorType: wallet.connectorType,
        walletClientType: wallet.walletClientType,
      })
    );
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("creates and stores an embedded wallet after email login when the user has no embedded wallet", async () => {
    const createdWallet = createEmbeddedWallet();
    mocks.user = {
      id: "did:privy:user-id",
      linkedAccounts: [
        {
          address: "0x0000000000000000000000000000000000000003",
          chainType: "ethereum",
          connectorType: "injected",
          type: "wallet",
          walletClientType: "rabby_wallet",
        },
      ],
    };
    mocks.createWallet.mockResolvedValue(createdWallet);

    await setupProvider();

    mocks.loginCallbacks.onComplete({
      isNewUser: false,
      loginAccount: null,
      loginMethod: "email",
      user: mocks.user,
      wasAlreadyAuthenticated: false,
    });

    await waitFor(() => expect(mocks.createWallet).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(localStorage.getItem(getActivePrivyWalletStorageKey(mocks.user.id))).toBe(
        JSON.stringify({
          address: createdWallet.address,
          connectorType: createdWallet.connectorType,
          walletClientType: createdWallet.walletClientType,
        })
      )
    );
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });
});
