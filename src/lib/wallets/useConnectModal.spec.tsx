import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectModalProvider, useConnectModal } from "./useConnectModal";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  isPrivyModalOpen: false,
  connectOrCreateWallet: vi.fn(),
  connectOrCreateWalletCallbacks: undefined as { onSuccess?: (params: { wallet: object }) => void } | undefined,
  connectWallet: vi.fn(),
  connectWalletCallbacks: undefined as { onSuccess?: (params: { wallet: object }) => void } | undefined,
  allowPrivyWalletForWagmi: vi.fn(),
  pushError: vi.fn(),
  switchNetwork: vi.fn(() => Promise.resolve()),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    authenticated: mocks.authenticated,
  }),
  useModalStatus: () => ({
    isOpen: mocks.isPrivyModalOpen,
  }),
  useConnectOrCreateWallet: (callbacks: { onSuccess?: (params: { wallet: object }) => void }) => {
    mocks.connectOrCreateWalletCallbacks = callbacks;
    return {
      connectOrCreateWallet: mocks.connectOrCreateWallet,
    };
  },
  useConnectWallet: (callbacks: { onSuccess?: (params: { wallet: object }) => void }) => {
    mocks.connectWalletCallbacks = callbacks;
    return {
      connectWallet: mocks.connectWallet,
    };
  },
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
  allowPrivyWalletForWagmi: mocks.allowPrivyWalletForWagmi,
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
    mocks.connectOrCreateWalletCallbacks = undefined;
    mocks.connectWalletCallbacks = undefined;
    mocks.switchNetwork.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses connectOrCreateWallet for unauthenticated users", () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
    expect(mocks.connectWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(true);
  });

  it("uses connectWallet for authenticated users after extension-side disconnects", () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.connectWallet).toHaveBeenCalledTimes(1);
    expect(mocks.connectOrCreateWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(true);
  });

  it("does not start another Privy wallet request while one is pending", () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      getContext().openConnectModal?.();
    });

    expect(mocks.connectWallet).toHaveBeenCalledTimes(1);
  });

  it("allows the selected wallet for Privy wagmi sync on success", () => {
    const wallet = { type: "ethereum", address: "0x1", meta: { id: "io.phantom" }, walletClientType: "phantom" };

    setup();

    act(() => {
      mocks.connectWalletCallbacks?.onSuccess?.({ wallet });
    });

    expect(mocks.allowPrivyWalletForWagmi).toHaveBeenCalledWith(wallet);
  });
});
