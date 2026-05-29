import type { ConnectedWallet, PrivyEvents, User } from "@privy-io/react-auth";
import { act, render, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY } from "config/localStorage";

type ConnectWalletError = Parameters<NonNullable<PrivyEvents["connectOrCreateWallet"]["onError"]>>[0];

const mocks = vi.hoisted(() => ({
  account: {
    address: undefined as string | undefined,
    connector: undefined as { id: string } | undefined,
  },
  connectOrCreateWallet: vi.fn(),
  connectOrCreateWalletCallbacks: undefined as PrivyEvents["connectOrCreateWallet"] | undefined,
  createWallet: vi.fn(),
  loginCallbacks: undefined as PrivyEvents["login"] | undefined,
  openConnectModal: undefined as (() => void) | undefined,
  privy: {
    authenticated: false,
    ready: true,
    user: null as User | null,
  },
  setActiveWallet: vi.fn(),
  switchNetwork: vi.fn(() => Promise.resolve()),
  wallets: [] as ConnectedWallet[],
}));

vi.mock("@privy-io/react-auth", () => ({
  useConnectOrCreateWallet: (callbacks?: PrivyEvents["connectOrCreateWallet"]) => {
    mocks.connectOrCreateWalletCallbacks = callbacks;

    return {
      connectOrCreateWallet: mocks.connectOrCreateWallet,
    };
  },
  useCreateWallet: () => ({
    createWallet: mocks.createWallet,
  }),
  useLogin: (callbacks?: PrivyEvents["login"]) => {
    mocks.loginCallbacks = callbacks;

    return {
      login: vi.fn(),
    };
  },
  useWallets: () => ({
    wallets: mocks.wallets,
  }),
  usePrivy: () => mocks.privy,
}));

vi.mock("@privy-io/wagmi", () => ({
  useSetActiveWallet: () => ({
    setActiveWallet: mocks.setActiveWallet,
  }),
}));

vi.mock("@wagmi/core", () => ({
  getAccount: () => mocks.account,
  watchAccount: () => () => undefined,
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

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

import { ConnectModalProvider, useConnectModal } from "./useConnectModal";

function createConnectedWallet({
  address = "0x1111111111111111111111111111111111111111",
  connectedAt = Date.now(),
  connectorType = "injected",
  meta = {
    id: "io.rabby",
    name: "Rabby",
  },
  walletClientType = "rabby_wallet",
}: {
  address?: string;
  connectedAt?: number;
  connectorType?: string;
  meta?: { id: string; name: string };
  walletClientType?: string;
} = {}) {
  return {
    address,
    chainId: "eip155:42161",
    connectedAt,
    connectorType,
    disconnect: vi.fn(),
    getEthereumProvider: vi.fn(),
    imported: false,
    isConnected: vi.fn(),
    linked: true,
    loginOrLink: vi.fn(),
    meta,
    sign: vi.fn(),
    switchChain: vi.fn(),
    type: "ethereum",
    unlink: vi.fn(),
    walletClientType,
  } as unknown as ConnectedWallet;
}

function createEmbeddedWallet({ connectedAt = Date.now() }: { connectedAt?: number } = {}) {
  return createConnectedWallet({
    address: "0x2222222222222222222222222222222222222222",
    connectedAt,
    connectorType: "embedded",
    meta: {
      id: "io.privy.wallet",
      name: "Privy Wallet",
    },
    walletClientType: "privy",
  });
}

function createUserWithLinkedWallet(wallet: ConnectedWallet) {
  return {
    linkedAccounts: [
      {
        address: wallet.address,
        chainType: "ethereum",
        connectorType: wallet.connectorType,
        imported: false,
        type: "wallet",
        walletClientType: wallet.walletClientType,
      },
    ],
  } as unknown as User;
}

function getPrivyConnectorId(wallet: ConnectedWallet) {
  return `${wallet.meta.id}.${wallet.address}`;
}

function getStoredActiveWallet() {
  return JSON.parse(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY) ?? "{}");
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

function ConnectModalConsumer() {
  const { openConnectModal } = useConnectModal();

  useEffect(() => {
    mocks.openConnectModal = openConnectModal;
  }, [openConnectModal]);

  return null;
}

function renderProvider(children: ReactNode = <ConnectModalConsumer />) {
  return render(<ConnectModalProvider>{children}</ConnectModalProvider>);
}

describe("ConnectModalProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.account = {
      address: undefined,
      connector: undefined,
    };
    mocks.connectOrCreateWallet.mockClear();
    mocks.connectOrCreateWalletCallbacks = undefined;
    mocks.createWallet.mockReset();
    mocks.loginCallbacks = undefined;
    mocks.openConnectModal = undefined;
    mocks.privy = {
      authenticated: false,
      ready: true,
      user: null,
    };
    mocks.setActiveWallet.mockReset();
    mocks.switchNetwork.mockReset().mockResolvedValue(undefined);
    mocks.wallets = [];
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("ignores a late Privy connect success after the connect modal is canceled", async () => {
    const wallet = createConnectedWallet();
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);

    act(() => {
      mocks.connectOrCreateWalletCallbacks?.onError?.("exited_auth_flow" as ConnectWalletError);
    });

    await act(async () => {
      await mocks.connectOrCreateWalletCallbacks?.onSuccess?.({ wallet });
    });

    expect(mocks.setActiveWallet).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("keeps the existing active wallet when the connect modal is canceled before wallet selection", () => {
    const activeWallet = createConnectedWallet();
    const existingActiveWallet = {
      address: activeWallet.address,
      connectorId: "io.rabby",
      connectorType: "injected",
      walletClientType: "rabby_wallet",
    };
    localStorage.setItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY, JSON.stringify(existingActiveWallet));

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    act(() => {
      mocks.connectOrCreateWalletCallbacks?.onError?.("exited_auth_flow" as ConnectWalletError);
    });

    expect(getStoredActiveWallet()).toMatchObject(existingActiveWallet);
    expect(mocks.setActiveWallet).not.toHaveBeenCalled();
  });

  it("activates an already connected Privy wallet selected during an active connect attempt", async () => {
    const wallet = createConnectedWallet({ connectedAt: Date.now() - 1000 });
    mocks.account = {
      address: wallet.address,
      connector: { id: "io.rabby" },
    };
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    await act(async () => {
      await mocks.connectOrCreateWalletCallbacks?.onSuccess?.({ wallet });
    });

    expect(mocks.setActiveWallet).toHaveBeenCalledWith(wallet);
    expect(getStoredActiveWallet()).toMatchObject({
      address: wallet.address,
      connectorId: "io.rabby",
    });
  });

  it("activates the selected wallet while the connect attempt is still active", async () => {
    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    const wallet = createConnectedWallet({ connectedAt: Date.now() + 1 });
    mocks.account = {
      address: wallet.address,
      connector: { id: "io.rabby" },
    };

    await act(async () => {
      await mocks.connectOrCreateWalletCallbacks?.onSuccess?.({ wallet });
    });

    await waitFor(() => {
      expect(mocks.setActiveWallet).toHaveBeenCalledWith(wallet);
    });
    expect(getStoredActiveWallet()).toMatchObject({
      address: wallet.address,
      connectorId: "io.rabby",
      connectorType: "injected",
      walletClientType: "rabby_wallet",
    });
  });

  it("activates a Google login embedded wallet after an OAuth redirect", async () => {
    const { unmount } = renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    unmount();

    const wallet = createEmbeddedWallet();
    const user = createUserWithLinkedWallet(wallet);
    mocks.account = {
      address: wallet.address,
      connector: { id: getPrivyConnectorId(wallet) },
    };
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.loginCallbacks?.onComplete?.({
        isNewUser: false,
        loginAccount: null,
        loginMethod: "google",
        user,
        wasAlreadyAuthenticated: false,
      });
    });

    await waitFor(() => {
      expect(mocks.setActiveWallet).toHaveBeenCalledWith(wallet);
    });
    expect(getStoredActiveWallet()).toMatchObject({
      address: wallet.address,
      connectorType: "embedded",
      walletClientType: "privy",
    });
  });

  it("stores the matching connected wallet connector after wallet login", async () => {
    const address = "0x3333333333333333333333333333333333333333";
    const metamaskWallet = createConnectedWallet({
      address,
      meta: {
        id: "io.metamask",
        name: "MetaMask",
      },
      walletClientType: "metamask",
    });
    const rabbyWallet = createConnectedWallet({
      address,
      meta: {
        id: "io.rabby",
        name: "Rabby",
      },
      walletClientType: "rabby_wallet",
    });
    mocks.account = {
      address,
      connector: { id: "io.rabby" },
    };
    mocks.wallets = [metamaskWallet, rabbyWallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    act(() => {
      mocks.loginCallbacks?.onComplete?.({
        isNewUser: false,
        loginAccount: {
          address,
          chainType: "ethereum",
          connectorType: "injected",
          imported: false,
          type: "wallet",
          walletClientType: "rabby_wallet",
        } as never,
        loginMethod: "siwe",
        user: { linkedAccounts: [] } as unknown as User,
        wasAlreadyAuthenticated: false,
      });
    });

    await waitFor(() => {
      expect(mocks.setActiveWallet).toHaveBeenCalledWith(rabbyWallet);
    });
    expect(getStoredActiveWallet()).toMatchObject({
      address,
      connectorId: "io.rabby",
      connectorType: "injected",
      walletClientType: "rabby_wallet",
    });
  });

  it("does not let a stale activation timeout cancel a newer connect attempt", async () => {
    vi.useFakeTimers();

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    const staleWallet = createConnectedWallet({
      address: "0x4444444444444444444444444444444444444444",
      meta: {
        id: "io.metamask",
        name: "MetaMask",
      },
      walletClientType: "metamask",
    });

    act(() => {
      void mocks.connectOrCreateWalletCallbacks?.onSuccess?.({ wallet: staleWallet });
    });

    await flushPromises();

    const activeWallet = createConnectedWallet({
      address: "0x5555555555555555555555555555555555555555",
    });

    act(() => {
      vi.advanceTimersByTime(1000);
      mocks.openConnectModal?.();
    });

    act(() => {
      void mocks.connectOrCreateWalletCallbacks?.onSuccess?.({ wallet: activeWallet });
    });

    await flushPromises();

    await act(async () => {
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
    });

    expect(getStoredActiveWallet()).toMatchObject({
      address: activeWallet.address,
      connectorId: "io.rabby",
    });
    expect(mocks.setActiveWallet).toHaveBeenCalledWith(activeWallet);
    expect(mocks.switchNetwork).not.toHaveBeenCalled();
  });

  it("opens Privy connect UI for authenticated embedded-wallet users without activating immediately", () => {
    const wallet = createEmbeddedWallet();
    const user = createUserWithLinkedWallet(wallet);
    mocks.privy = {
      authenticated: true,
      ready: true,
      user,
    };
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
    expect(mocks.createWallet).not.toHaveBeenCalled();
    expect(mocks.setActiveWallet).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("activates an authenticated embedded wallet after Privy confirms social login", async () => {
    const wallet = createEmbeddedWallet();
    const user = createUserWithLinkedWallet(wallet);
    mocks.account = {
      address: wallet.address,
      connector: { id: getPrivyConnectorId(wallet) },
    };
    mocks.privy = {
      authenticated: true,
      ready: true,
      user,
    };
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    act(() => {
      mocks.loginCallbacks?.onComplete?.({
        isNewUser: false,
        loginAccount: null,
        loginMethod: "google",
        user,
        wasAlreadyAuthenticated: true,
      });
    });

    await waitFor(() => {
      expect(mocks.setActiveWallet).toHaveBeenCalledWith(wallet);
    });
    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
  });

  it("opens wallet selection for authenticated external-wallet users", () => {
    const wallet = createConnectedWallet();
    mocks.privy = {
      authenticated: true,
      ready: true,
      user: createUserWithLinkedWallet(wallet),
    };
    mocks.wallets = [wallet];

    renderProvider();

    act(() => {
      mocks.openConnectModal?.();
    });

    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
    expect(mocks.createWallet).not.toHaveBeenCalled();
    expect(mocks.setActiveWallet).not.toHaveBeenCalled();
  });
});
