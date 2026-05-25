import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePrivyWalletLoader } from "./privyWalletLoader";
import WalletProvider from "./WalletProvider";

const mocks = vi.hoisted(() => ({
  privyProviderRendered: vi.fn(),
}));

vi.mock("wagmi", () => ({
  WagmiProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

vi.mock("./PrivyWalletProvider", () => ({
  default: ({ children }: { children: ReactNode }) => {
    mocks.privyProviderRendered();

    return <div data-testid="privy-wallet-provider">{children}</div>;
  },
}));

function LoaderStatus() {
  const { privyWalletLoadStatus } = usePrivyWalletLoader();

  return <div data-testid="privy-wallet-load-status">{privyWalletLoadStatus}</div>;
}

describe("WalletProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("starts loading the Privy wallet provider after the initial render", async () => {
    render(
      <WalletProvider>
        <LoaderStatus />
      </WalletProvider>
    );

    expect(screen.getByTestId("privy-wallet-load-status").textContent).toBe("idle");
    expect(screen.queryByTestId("privy-wallet-provider")).toBeNull();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.getByTestId("privy-wallet-load-status").textContent).toBe("loading");
  });
});
