import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectModalProvider, useConnectModal } from "./useConnectModal";

type LoginCallbacks = {
  onComplete?: (params: { loginAccount: { type: string } | null }) => void;
  onError?: (...args: unknown[]) => void;
};

type ConnectOrCreateWalletCallbacks = {
  onSuccess?: (...args: unknown[]) => void;
  onError?: (...args: unknown[]) => void;
};

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
    mocks.connectOrCreateWallet.mockImplementation(() => undefined);
    mocks.switchNetwork.mockResolvedValue(undefined);
    mocks.isPrivyReady = true;
    mocks.loginCallbacks = undefined;
    mocks.connectOrCreateWalletCallbacks = undefined;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("keeps global Privy login errors from closing external-wallet flows", () => {
    setup();

    expect(mocks.loginCallbacks?.onComplete).toEqual(expect.any(Function));
    expect(mocks.loginCallbacks?.onError).toBeUndefined();
  });

  it("closes the local connect state after email or social login completes", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(screen.getByRole("button").textContent).toBe("open");
    expect(mocks.connectOrCreateWallet).toHaveBeenCalledTimes(1);

    await act(async () => {
      mocks.loginCallbacks?.onComplete?.({
        loginAccount: { type: "email" },
      });
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("does not close external wallet login before Privy's wallet connect success", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    await act(async () => {
      mocks.loginCallbacks?.onComplete?.({
        loginAccount: { type: "wallet" },
      });
    });

    expect(screen.getByRole("button").textContent).toBe("open");
    expect(mocks.switchNetwork).not.toHaveBeenCalled();

    await act(async () => {
      mocks.connectOrCreateWalletCallbacks?.onSuccess?.({});
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
    expect(mocks.switchNetwork).toHaveBeenCalledWith(42161, true);
  });

  it("closes the local connect state after wallet connect succeeds", async () => {
    setup();

    await act(async () => {
      screen.getByRole("button").click();
    });

    await act(async () => {
      mocks.connectOrCreateWalletCallbacks?.onSuccess?.({});
    });

    expect(screen.getByRole("button").textContent).toBe("closed");
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
  });
});
