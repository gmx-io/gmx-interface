import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectModalProvider, useConnectModal } from "./ConnectModalContext";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  connectOrCreateWalletCallbacks: undefined as undefined | { onError: (error: string) => void; onSuccess: () => void },
  isPrivyModalOpen: false,
  connectOrCreateWallet: vi.fn(),
  connectWalletCallbacks: undefined as undefined | { onError: (error: string) => void; onSuccess: () => void },
  connectWallet: vi.fn(),
  pushError: vi.fn(),
  switchNetwork: vi.fn(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    authenticated: mocks.authenticated,
  }),
  useModalStatus: () => ({
    isOpen: mocks.isPrivyModalOpen,
  }),
  useConnectOrCreateWallet: (callbacks: { onError: (error: string) => void; onSuccess: () => void }) => {
    mocks.connectOrCreateWalletCallbacks = callbacks;
    return { connectOrCreateWallet: mocks.connectOrCreateWallet };
  },
  useConnectWallet: (callbacks: { onError: (error: string) => void; onSuccess: () => void }) => {
    mocks.connectWalletCallbacks = callbacks;
    return { connectWallet: mocks.connectWallet };
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
    mocks.connectOrCreateWalletCallbacks = undefined;
    mocks.isPrivyModalOpen = false;
    mocks.connectWalletCallbacks = undefined;
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

  it("reports connect-or-create errors and allows another attempt", () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      mocks.connectOrCreateWalletCallbacks?.onError("connect_or_create_failed");
      getContext().openConnectModal?.();
    });

    expect(mocks.pushError).toHaveBeenCalledWith("connect_or_create_failed", "connectModal.connectOrCreateWallet");
    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(2);
  });

  it("reports connect errors and allows another attempt", () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      mocks.connectWalletCallbacks?.onError("connect_failed");
      getContext().openConnectModal?.();
    });

    expect(mocks.pushError).toHaveBeenCalledWith("connect_failed", "connectModal.connectWallet");
    expect(mocks.connectWallet).toHaveBeenCalledTimes(2);
  });
});
