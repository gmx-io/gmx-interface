import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";

import { GtAssetCard } from "../GtAssetCard";

vi.mock("lib/userAnalytics/earnEvents", () => ({
  sendEarnPortfolioItemClickEvent: vi.fn(),
}));

const mockSendEarnPortfolioItemClickEvent = vi.mocked(sendEarnPortfolioItemClickEvent);

i18n.load({ en: {} });
i18n.activate("en");

const GT_REWARDS = 7904400n;
const GT_REWARDS_USD = 129n * 10n ** 28n;

function renderCard(gtRewardsUsd: bigint | undefined) {
  return render(
    <I18nProvider i18n={i18n}>
      <GtAssetCard gtRewards={GT_REWARDS} gtRewardsUsd={gtRewardsUsd} />
    </I18nProvider>
  );
}

describe("GtAssetCard", () => {
  afterEach(cleanup);

  it("shows the GT amount with its USD value", () => {
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText(/0\.79044\s*GT/)).toBeTruthy();
    expect(screen.getByText(/\(\$\s*1\.29\)/)).toBeTruthy();
  });

  it("shows the GT amount alone while the GT price is unavailable", () => {
    renderCard(undefined);

    expect(screen.getByText(/0\.79044\s*GT/)).toBeTruthy();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it("disables the Buy and Sell buttons", () => {
    renderCard(GT_REWARDS_USD);

    expect((screen.getByRole("button", { name: "Buy" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Sell" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("links to GMTrade in a new tab and reports the click", () => {
    renderCard(GT_REWARDS_USD);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://gmtrade.xyz");
    expect(link.getAttribute("target")).toBe("_blank");

    fireEvent.click(link);
    expect(mockSendEarnPortfolioItemClickEvent).toHaveBeenCalledWith({ item: "GT", type: "details" });
  });
});
