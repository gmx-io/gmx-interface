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
const METAMASK_IOS_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WebView MetaMaskMobile";
const originalEthereumDescriptor = Object.getOwnPropertyDescriptor(window, "ethereum");

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
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    if (originalEthereumDescriptor) {
      Object.defineProperty(window, "ethereum", originalEthereumDescriptor);
    } else {
      delete window.ethereum;
    }
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

  it("uses only the injected wallet inside the MetaMask iOS browser", () => {
    mocks.authenticated = true;
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(METAMASK_IOS_USER_AGENT);
    Object.defineProperty(window, "ethereum", { configurable: true, value: { isMetaMask: true } });
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.connectWallet).toHaveBeenCalledWith({ walletList: ["detected_ethereum_wallets"] });
  });

  it("waits for MetaMask iOS to inject its provider before opening Privy", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(METAMASK_IOS_USER_AGENT);
    Object.defineProperty(window, "ethereum", { configurable: true, value: undefined });
    const getContext = setup();

    act(() => {
      getContext().openConnectModal?.();
    });

    expect(mocks.connectOrCreateWallet).not.toHaveBeenCalled();
    expect(getContext().connectModalOpen).toBe(false);

    await act(async () => {
      Object.defineProperty(window, "ethereum", { configurable: true, value: { isMetaMask: true } });
      window.dispatchEvent(new Event("ethereum#initialized"));
      await Promise.resolve();
    });

    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
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
