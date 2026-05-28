import type { ConnectedWallet, PrivyEvents } from "@privy-io/react-auth";
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

function createConnectedWallet({ connectedAt = Date.now() }: { connectedAt?: number } = {}) {
  return {
    address: "0x1111111111111111111111111111111111111111",
    chainId: "eip155:42161",
    connectedAt,
    connectorType: "injected",
    disconnect: vi.fn(),
    getEthereumProvider: vi.fn(),
    imported: false,
    isConnected: vi.fn(),
    linked: true,
    loginOrLink: vi.fn(),
    meta: {
      id: "io.rabby",
      name: "Rabby",
    },
    sign: vi.fn(),
    switchChain: vi.fn(),
    type: "ethereum",
    unlink: vi.fn(),
    walletClientType: "rabby_wallet",
  } as unknown as ConnectedWallet;
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
    mocks.setActiveWallet.mockReset();
    mocks.switchNetwork.mockReset().mockResolvedValue(undefined);
    mocks.wallets = [];
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

  it("ignores an already connected Privy wallet returned when the connect modal is closed", async () => {
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

    expect(mocks.setActiveWallet).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY)).toBeNull();
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
    expect(JSON.parse(localStorage.getItem(ACTIVE_PRIVY_WALLET_LOCAL_STORAGE_KEY) ?? "{}")).toMatchObject({
      address: wallet.address,
      connectorId: "io.rabby",
      connectorType: "injected",
      walletClientType: "rabby_wallet",
    });
  });
});
