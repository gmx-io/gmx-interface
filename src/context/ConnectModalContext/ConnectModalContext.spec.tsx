import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectModalProvider, useConnectModal } from "./ConnectModalContext";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  isPrivyModalOpen: false,
  connectWalletCallbacks: undefined as undefined | { onError: (error: string) => void; onSuccess: () => void },
  connectWallet: vi.fn(),
  loginCallbacks: undefined as
    | undefined
    | { onComplete: (params: { wasAlreadyAuthenticated?: boolean }) => void; onError: (error: string) => void },
  login: vi.fn(),
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
  useConnectWallet: (callbacks: { onError: (error: string) => void; onSuccess: () => void }) => {
    mocks.connectWalletCallbacks = callbacks;
    return { connectWallet: mocks.connectWallet };
  },
  useLogin: (callbacks: {
    onComplete: (params: { wasAlreadyAuthenticated?: boolean }) => void;
    onError: (error: string) => void;
  }) => {
    mocks.loginCallbacks = callbacks;
    return { login: mocks.login };
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
    mocks.isPrivyModalOpen = false;
    mocks.connectWalletCallbacks = undefined;
    mocks.loginCallbacks = undefined;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows only EVM wallets for an unauthenticated EVM connect", () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.login).toHaveBeenCalledWith({ walletChainType: "ethereum-only" });
    expect(mocks.connectWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(true);
  });

  it("shows only Solana wallets for an unauthenticated Solana connect", () => {
    localStorage.setItem("SELECTED_NETWORK", "-1");
    localStorage.setItem("SELECTED_NETWORK_WAS_APP_SELECTED", "true");
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.login).toHaveBeenCalledWith({ walletChainType: "solana-only" });
    expect(mocks.connectWallet).not.toHaveBeenCalled();
  });

  it("uses connectWallet for authenticated users after extension-side disconnects", () => {
    mocks.authenticated = true;
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.connectWallet).toHaveBeenCalledWith({ walletChainType: "ethereum-only" });
    expect(mocks.login).not.toHaveBeenCalled();
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

  it("reports login errors and allows another attempt", () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      mocks.loginCallbacks?.onError("login_failed");
      getContext().openConnectModal?.();
    });

    expect(mocks.pushError).toHaveBeenCalledWith("login_failed", "connectModal.login");
    expect(mocks.login).toHaveBeenCalledTimes(2);
  });

  it("switches to the settlement chain after an EVM login", () => {
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      mocks.loginCallbacks?.onComplete({ wasAlreadyAuthenticated: false });
    });

    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("does not switch chains after a Solana login", () => {
    localStorage.setItem("SELECTED_NETWORK", "-1");
    localStorage.setItem("SELECTED_NETWORK_WAS_APP_SELECTED", "true");
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
      mocks.loginCallbacks?.onComplete({ wasAlreadyAuthenticated: false });
    });

    expect(mocks.switchNetwork).not.toHaveBeenCalled();
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
