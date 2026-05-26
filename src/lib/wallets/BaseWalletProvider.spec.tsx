import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BaseWalletProvider } from "./BaseWalletProvider";
import { usePrivyWalletLoader } from "./privyWalletLoader";

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

function LoaderStatus() {
  const { isPrivyWalletInitializing } = usePrivyWalletLoader();

  return <div data-testid="privy-wallet-initializing">{String(isPrivyWalletInitializing)}</div>;
}

describe("BaseWalletProvider", () => {
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    window.requestIdleCallback = vi.fn();
    window.cancelIdleCallback = vi.fn();
  });

  afterEach(() => {
    cleanup();
    window.requestIdleCallback = originalRequestIdleCallback;
    window.cancelIdleCallback = originalCancelIdleCallback;
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not schedule or expose Privy loading", () => {
    localStorage.setItem("privy:session", "1");

    render(
      <BaseWalletProvider>
        <LoaderStatus />
      </BaseWalletProvider>
    );

    act(() => {
      window.dispatchEvent(new Event("load"));
      vi.runOnlyPendingTimers();
    });

    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    expect(screen.getByTestId("privy-wallet-initializing").textContent).toBe("false");
  });
});
