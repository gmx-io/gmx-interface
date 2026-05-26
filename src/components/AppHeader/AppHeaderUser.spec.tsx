import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppHeaderUser } from "./AppHeaderUser";

const mocks = vi.hoisted(() => ({
  active: false,
  account: undefined as string | undefined,
  isConnectModalLoading: false,
  openConnectModal: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: 42161, srcChainId: undefined }),
}));

vi.mock("lib/userAnalytics", () => ({
  sendUserAnalyticsConnectWalletClickEvent: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ active: mocks.active, account: mocks.account }),
}));

vi.mock("lib/wallets/useConnectModal", () => ({
  useConnectModal: () => ({
    isConnectModalLoading: mocks.isConnectModalLoading,
    openConnectModal: mocks.openConnectModal,
  }),
}));

vi.mock("components/Button/Button", () => ({
  default: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
    <button data-testid="loading-wallet" disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("components/OneClickButton/OneClickButton", () => ({
  OneClickButton: () => <div data-testid="one-click-button" />,
}));

vi.mock("img/ic_spinner.svg?react", () => ({
  default: () => <span data-testid="loading-spinner" />,
}));

vi.mock("../AddressDropdown/AddressDropdown", () => ({
  AddressDropdown: ({ account }: { account: string }) => <div data-testid="address-dropdown">{account}</div>,
}));

vi.mock("../ConnectWalletButton/ConnectWalletButton", () => ({
  default: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => (
    <button data-testid="connect-wallet" disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("../NetworkDropdown/NetworkDropdown", () => ({
  default: () => <div data-testid="network-dropdown" />,
}));

describe("AppHeaderUser", () => {
  beforeEach(() => {
    mocks.active = false;
    mocks.account = undefined;
    mocks.isConnectModalLoading = false;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the address dropdown visible for connected users while Privy is loading", () => {
    mocks.active = true;
    mocks.account = "0x123";
    mocks.isConnectModalLoading = true;

    render(<AppHeaderUser openSettings={vi.fn()} />);

    expect(screen.getByTestId("address-dropdown").textContent).toBe("0x123");
    expect(screen.queryByTestId("loading-wallet")).toBeNull();
  });
});
