import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectModalProvider, useConnectModal } from "./useConnectModal";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  isPrivyModalOpen: false,
  connectOrCreateWallet: vi.fn(),
  connectWallet: vi.fn(),
  disconnectPrivyWalletsFromWagmi: vi.fn(),
  pushError: vi.fn(),
  switchNetwork: vi.fn(),
  wallets: [{ address: "0x1", meta: { id: "io.phantom" }, walletClientType: "phantom" }],
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    authenticated: mocks.authenticated,
  }),
  useModalStatus: () => ({
    isOpen: mocks.isPrivyModalOpen,
  }),
  useConnectOrCreateWallet: () => ({
    connectOrCreateWallet: mocks.connectOrCreateWallet,
  }),
  useConnectWallet: () => ({
    connectWallet: mocks.connectWallet,
  }),
  useWallets: () => ({
    wallets: mocks.wallets,
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
    pushError: mocks.pushError,
  },
}));

vi.mock("lib/wallets", () => ({
  switchNetwork: mocks.switchNetwork,
}));

vi.mock("lib/wallets/privyWagmi", () => ({
  disconnectPrivyWalletsFromWagmi: mocks.disconnectPrivyWalletsFromWagmi,
}));

function setup() {
  let context!: ReturnType<typeof useConnectModal>;

  function TestComponent() {
    context = useConnectModal();
    return null;
  }

  render(
    <ConnectModalProvider>
      <TestComponent />
    </ConnectModalProvider>
  );

  return () => context;
}

describe("ConnectModalProvider", () => {
  beforeEach(() => {
    mocks.authenticated = false;
    mocks.isPrivyModalOpen = false;
    mocks.disconnectPrivyWalletsFromWagmi.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses connectOrCreateWallet for unauthenticated users", async () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    await waitFor(() => expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1));
    expect(mocks.disconnectPrivyWalletsFromWagmi).toHaveBeenCalledWith(mocks.wallets);
    expect(mocks.connectWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(true);
  });

  it("uses connectWallet for authenticated users after extension-side disconnects", async () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    await waitFor(() => expect(mocks.connectWallet).toHaveBeenCalledTimes(1));
    expect(mocks.disconnectPrivyWalletsFromWagmi).toHaveBeenCalledWith(mocks.wallets);
    expect(mocks.connectOrCreateWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(true);
  });

  it("marks stale Privy wallets disconnected before opening the modal", async () => {
    let resolveDisconnect!: () => void;
    mocks.disconnectPrivyWalletsFromWagmi.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDisconnect = resolve;
      })
    );

    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.disconnectPrivyWalletsFromWagmi).toHaveBeenCalledWith(mocks.wallets);
    expect(mocks.connectOrCreateWallet).not.toHaveBeenCalled();

    await act(async () => {
      resolveDisconnect();
    });

    await waitFor(() => expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1));
  });

  it("does not start another Privy wallet request while one is pending", async () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      getContext().openConnectModal?.();
    });

    await waitFor(() => expect(mocks.connectWallet).toHaveBeenCalledTimes(1));
  });
});
