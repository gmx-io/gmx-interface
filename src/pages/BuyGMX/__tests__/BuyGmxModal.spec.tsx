import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { Router } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { getSyntheticsTradeOptionsKey } from "config/localStorage";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/utils/trade";

import { StandaloneBuyGmxModal } from "../BuyGmxModal";

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

describe("StandaloneBuyGmxModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseWallet.mockReturnValue({ active: false } as ReturnType<typeof useWallet>);
  });

  afterEach(cleanup);

  it("opens outside synthetics context and configures the Arbitrum GMX swap", () => {
    const history = createMemoryHistory({ initialEntries: ["/rewards/history"] });

    render(
      <I18nProvider i18n={i18n}>
        <Router history={history}>
          <StandaloneBuyGmxModal isVisible setIsVisible={vi.fn()} />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Buy GMX on GMX swap" }));

    expect(history.location.pathname).toBe("/trade/swap");
    const storedOptions = JSON.parse(
      localStorage.getItem(JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM))) ?? "{}"
    );
    expect(storedOptions).toMatchObject({
      tradeType: TradeType.Swap,
      tradeMode: TradeMode.Market,
      tokens: {
        fromTokenAddress: getTokenBySymbol(ARBITRUM, "USDC").address,
        swapToTokenAddress: getContract(ARBITRUM, "GMX"),
      },
    });
  });

  it("replaces malformed stored trade options and opens the Arbitrum GMX swap", () => {
    const history = createMemoryHistory({ initialEntries: ["/rewards/history"] });
    const storageKey = JSON.stringify(getSyntheticsTradeOptionsKey(ARBITRUM));
    localStorage.setItem(storageKey, "malformed");

    render(
      <I18nProvider i18n={i18n}>
        <Router history={history}>
          <StandaloneBuyGmxModal isVisible setIsVisible={vi.fn()} />
        </Router>
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Buy GMX on GMX swap" }));

    expect(history.location.pathname).toBe("/trade/swap");
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toMatchObject({
      tradeType: TradeType.Swap,
      tradeMode: TradeMode.Market,
      tokens: {
        fromTokenAddress: getTokenBySymbol(ARBITRUM, "USDC").address,
        swapToTokenAddress: getContract(ARBITRUM, "GMX"),
      },
    });
  });
});
