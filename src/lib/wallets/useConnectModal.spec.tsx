import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  hasPrivyConnectIntent,
  isPrivyDisconnectInProgress,
  markPrivyDisconnectStarted,
  resetPrivyWalletSelection,
  shouldUseEmbeddedWalletForCurrentPrivyConnect,
  shouldUseExternalWalletForCurrentPrivyConnect,
} from "./privyWalletSelection";
import { ConnectModalProvider, useConnectModal } from "./useConnectModal";

type LoginCallbacks = {
  onComplete?: (params: {
    user: unknown;
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: "email" | "siwe";
    loginAccount: { type: string } | null;
  }) => void;
  onError?: (...args: unknown[]) => void;
};

type ConnectOrCreateWalletCallbacks = {
  onSuccess?: (...args: unknown[]) => void;
  onError?: (...args: unknown[]) => void;
};

function mockPrivySuccessWallet({
  walletClientType,
  connectorType,
}: {
  walletClientType: string;
  connectorType: string;
}) {
  return {
    wallet: {
      address: "0x1",
      walletClientType,
      connectorType,
    },
  };
}

const mocks = vi.hoisted(() => {
  const state = {
    connectOrCreateWallet: vi.fn(),
    loginCallbacks: undefined as LoginCallbacks | undefined,
    connectOrCreateWalletCallbacks: undefined as ConnectOrCreateWalletCallbacks | undefined,
    isPrivyReady: true,
    switchNetwork: vi.fn(),
    useConnectOrCreateWallet: vi.fn(),
    useLogin: vi.fn(),
    usePrivy: vi.fn(),
  };

  state.useConnectOrCreateWallet.mockImplementation((callbacks: ConnectOrCreateWalletCallbacks | undefined) => {
    state.connectOrCreateWalletCallbacks = callbacks;
    return {
      connectOrCreateWallet: state.connectOrCreateWallet,
    };
  });

  state.useLogin.mockImplementation((callbacks: LoginCallbacks | undefined) => {
    state.loginCallbacks = callbacks;
    return {
      login: vi.fn(),
    };
  });

  state.usePrivy.mockImplementation(() => ({
    ready: state.isPrivyReady,
  }));

  return state;
});

vi.mock("@privy-io/react-auth", () => ({
  useConnectOrCreateWallet: mocks.useConnectOrCreateWallet,
  useLogin: mocks.useLogin,
  usePrivy: mocks.usePrivy,
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

function TestComponent() {
  const { openConnectModal, connectModalOpen, isConnectModalLoading } = useConnectModal();

  return (
    <button type="button" data-loading={isConnectModalLoading} onClick={() => openConnectModal?.()}>
      {connectModalOpen ? "open" : "closed"}
    </button>
  );
}

function setup() {
  return render(
    <ConnectModalProvider>
      <TestComponent />
    </ConnectModalProvider>
  );
}

describe("ConnectModalProvider", () => {
  beforeEach(() => {
    mocks.switchNetwork.mockResolvedValue(undefined);
    mocks.isPrivyReady = true;
    mocks.loginCallbacks = undefined;
    mocks.connectOrCreateWalletCallbacks = undefined;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetPrivyWalletSelection();
    vi.clearAllMocks();
  });

  it("keeps global Privy login errors from closing external-wallet flows", () => {
    setup();

    expect(mocks.loginCallbacks?.onComplete).toEqual(expect.any(Function));
    expect(mocks.loginCallbacks?.onError).toBeUndefined();
  });

  it("closes the local connect state after email or social login completes", async () => {
    markPrivyDisconnectStarted();

    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(screen.getByRole("button").textContent).toBe("open");
    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
    expect(hasPrivyConnectIntent()).toBe(true);
    expect(isPrivyDisconnectInProgress()).toBe(false);

    await act(async () => {
      mocks.loginCallbacks?.onComplete?.({
        user: {},
        isNewUser: false,
        wasAlreadyAuthenticated: false,
        loginMethod: "email",
        loginAccount: null,
      });
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(shouldUseEmbeddedWalletForCurrentPrivyConnect()).toBe(true);
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("does not prefer embedded wallet after wallet login completes", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    await act(async () => {
      mocks.loginCallbacks?.onComplete?.({
        user: {},
        isNewUser: false,
        wasAlreadyAuthenticated: false,
        loginMethod: "siwe",
        loginAccount: { type: "wallet" },
      });
    });

    expect(shouldUseEmbeddedWalletForCurrentPrivyConnect()).toBe(false);
    expect(shouldUseExternalWalletForCurrentPrivyConnect()).toBe(true);
  });

  it("marks wallet connect success as an external-wallet selection", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    await act(async () => {
      mocks.connectOrCreateWalletCallbacks?.onSuccess?.(
        mockPrivySuccessWallet({ walletClientType: "metamask", connectorType: "injected" })
      );
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(shouldUseExternalWalletForCurrentPrivyConnect()).toBe(true);
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("marks embedded wallet connect success from social login as an embedded-wallet selection", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    await act(async () => {
      mocks.connectOrCreateWalletCallbacks?.onSuccess?.(
        mockPrivySuccessWallet({ walletClientType: "privy", connectorType: "embedded" })
      );
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(shouldUseEmbeddedWalletForCurrentPrivyConnect()).toBe(true);
    expect(shouldUseExternalWalletForCurrentPrivyConnect()).toBe(false);
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("waits for Privy readiness before opening the wallet modal", async () => {
    mocks.isPrivyReady = false;
    const view = setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(screen.getByRole("button").getAttribute("data-loading")).toBe("true");
    expect(mocks.connectOrCreateWallet).not.toHaveBeenCalled();
    expect(hasPrivyConnectIntent()).toBe(false);

    mocks.isPrivyReady = true;

    await act(async () => {
      view.rerender(
        <ConnectModalProvider>
          <TestComponent />
        </ConnectModalProvider>
      );
    });

    expect(screen.getByRole("button").textContent).toBe("open");
    expect(screen.getByRole("button").getAttribute("data-loading")).toBe("false");
    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);
    expect(hasPrivyConnectIntent()).toBe(true);
  });
});
