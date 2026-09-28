import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getSyntheticsTradeOptionsKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { BuyGmxModal } from "../BuyGmxModal";

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

const mockUseChainId = vi.mocked(useChainId);
const mockUseWallet = vi.mocked(useWallet);

i18n.load({ en: {} });
i18n.activate("en");

describe("BuyGmxModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseWallet.mockReturnValue({ active: false } as ReturnType<typeof useWallet>);
  });

  afterEach(cleanup);

  it("opens an accessible dialog outside synthetics context and configures the Arbitrum GMX swap", async () => {
    const history = createMemoryHistory({ initialEntries: ["/rewards/history"] });

    render(
      <I18nProvider i18n={i18n}>
        <Router history={history}>
          <BuyGmxModal isVisible setIsVisible={vi.fn()} />
        </Router>
      </I18nProvider>
    );

    const dialog = screen.getByRole("dialog", { name: "Buy GMX" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Buy GMX on GMX swap" }));

    expect(history.location.pathname).toBe("/trade/swap");
    expect(history.location.search).toBe("?mode=market&from=USDC&to=GMX");
  });

  it("opens the Arbitrum GMX swap even with malformed stored trade options", () => {
    const history = createMemoryHistory({ initialEntries: ["/rewards/history"] });
    const storageKey = JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM));
    localStorage.setItem(storageKey, "malformed");

    render(
      <I18nProvider i18n={i18n}>
        <Router history={history}>
          <BuyGmxModal isVisible setIsVisible={vi.fn()} />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Buy GMX on GMX swap" }));

    expect(history.location.pathname).toBe("/trade/swap");
    expect(history.location.search).toBe("?mode=market&from=USDC&to=GMX");
  });
});
