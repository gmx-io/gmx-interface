import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";

import { WalletReadyContent } from "./WalletReadyContent";

vi.mock("lib/wallets/useIsWalletInitializing", () => ({
  useIsWalletInitializing: vi.fn(),
}));

vi.mock("components/Loader/Loader", () => ({
  default: () => <div>Loading wallet</div>,
}));

const mockUseIsWalletInitializing = vi.mocked(useIsWalletInitializing);

i18n.load({ en: {} });
i18n.activate("en");

function walletReadyContentNode() {
  return (
    <I18nProvider i18n={i18n}>
      <WalletReadyContent>
        <div>Page content</div>
      </WalletReadyContent>
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WalletReadyContent", () => {
  it("hides page content while Privy or the wallet is initializing", () => {
    mockUseIsWalletInitializing.mockReturnValue(true);

    render(walletReadyContentNode());

    expect(screen.queryByText("Page content")).toBeNull();
    expect(screen.getByText("Loading wallet")).toBeDefined();
  });

  it("renders page content when Privy and the wallet are ready", () => {
    mockUseIsWalletInitializing.mockReturnValue(false);

    render(walletReadyContentNode());

    expect(screen.getByText("Page content")).toBeDefined();
    expect(screen.queryByText("Loading wallet")).toBeNull();
  });

  it("does not unmount page content during later wallet reconnects", () => {
    mockUseIsWalletInitializing.mockReturnValue(true);
    const view = render(walletReadyContentNode());

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.queryByText("Page content")).toBeNull();

    mockUseIsWalletInitializing.mockReturnValue(false);
    view.rerender(walletReadyContentNode());
    expect(screen.getByText("Page content")).toBeDefined();

    mockUseIsWalletInitializing.mockReturnValue(true);
    view.rerender(walletReadyContentNode());

    expect(screen.getByText("Page content")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
