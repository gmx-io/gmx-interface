import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrivyWalletLoader } from "context/PrivyWalletContext/PrivyWalletLoaderContext";

import WalletProvider from "../WalletProvider";

const mocks = vi.hoisted(() => ({
  privyProviderRendered: vi.fn(),
}));

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("../walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

vi.mock("context/PrivyWalletContext/PrivyWalletProvider", () => ({
  default: ({ children }: { children: ReactNode }) => {
    mocks.privyProviderRendered();

    return <div data-testid="privy-wallet-provider">{children}</div>;
  },
}));

function LoaderStatus() {
  const { isPrivyWalletInitializing } = usePrivyWalletLoader();

  return <div data-testid="privy-wallet-initializing">{String(isPrivyWalletInitializing)}</div>;
}

describe("WalletProvider", () => {
  const originalReadyState = document.readyState;
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;
  let idleCallback: IdleRequestCallback | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    idleCallback = undefined;

    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "loading",
    });
    window.requestIdleCallback = vi.fn((callback) => {
      idleCallback = callback;

      return 1;
    });
    window.cancelIdleCallback = vi.fn();
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: originalReadyState,
    });
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("starts loading the Privy wallet provider after page load and idle time", async () => {
    render(
      <WalletProvider>
        <LoaderStatus />
      </WalletProvider>
    );

    expect(screen.getByTestId("privy-wallet-initializing").textContent).toBe("false");
    expect(screen.queryByTestId("privy-wallet-provider")).toBeNull();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId("privy-wallet-initializing").textContent).toBe("false");

    act(() => {
      window.dispatchEvent(new Event("load"));
    });

    expect(window.requestIdleCallback).toHaveBeenCalled();
    expect(screen.getByTestId("privy-wallet-initializing").textContent).toBe("false");

    act(() => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 10 });
    });

    expect(screen.getByTestId("privy-wallet-initializing").textContent).toBe("true");
  });
});
