import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type GtBuybackSummary, useGtBuybackSummary } from "domain/gtBuyback/useGtBuybackSummary";
import { sendEarnPortfolioItemClickEvent } from "lib/userAnalytics/earnEvents";

import { GtAssetCard } from "../GtAssetCard";

vi.mock("lib/userAnalytics/earnEvents", () => ({
  sendEarnPortfolioItemClickEvent: vi.fn(),
}));

vi.mock("domain/gtBuyback/useGtBuybackSummary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("domain/gtBuyback/useGtBuybackSummary")>()),
  useGtBuybackSummary: vi.fn(),
}));

const mockSendEarnPortfolioItemClickEvent = vi.mocked(sendEarnPortfolioItemClickEvent);
const mockUseGtBuybackSummary = vi.mocked(useGtBuybackSummary);

i18n.load({ en: {} });
i18n.activate("en");

const GT = 10n ** 7n;
const GT_REWARDS = 7904400n;
const GT_REWARDS_USD = 129n * 10n ** 28n;
const ACCOUNT = "0x1234567890AbcdEF1234567890aBcDeF12345678";

function buybackSummary(overrides: Partial<GtBuybackSummary> = {}): GtBuybackSummary {
  return {
    gtBalance: GT_REWARDS,
    quotaTotal: 50n * GT,
    quotaUsed: 10n * GT,
    referralCode: "GMXFRIEND",
    withdrawableUsdc: 0n,
    totalBoughtBackUsdc: 0n,
    isSmartContractWallet: false,
    ...overrides,
  };
}

function mockBuyback(data: GtBuybackSummary | undefined) {
  mockUseGtBuybackSummary.mockReturnValue({ data, isLoading: false });
}

function renderCard(gtRewardsUsd: bigint | undefined) {
  return render(
    <I18nProvider i18n={i18n}>
      <GtAssetCard gtRewards={GT_REWARDS} gtRewardsUsd={gtRewardsUsd} account={ACCOUNT} />
    </I18nProvider>
  );
}

function getButton(name: string) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("GtAssetCard", () => {
  beforeEach(() => mockBuyback(undefined));
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

  it("links to GMTrade in a new tab and reports the click", () => {
    renderCard(GT_REWARDS_USD);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://gmtrade.xyz");
    expect(link.getAttribute("target")).toBe("_blank");

    fireEvent.click(link);
    expect(mockSendEarnPortfolioItemClickEvent).toHaveBeenCalledWith({ item: "GT", type: "details" });
  });

  it("disables the buyback while its data is unavailable", () => {
    renderCard(GT_REWARDS_USD);

    expect(getButton("Open buyback").disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Buyback history" })).toBeNull();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("shows the season quota and reports opening the buyback", () => {
    mockBuyback(buybackSummary());
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText(/^10 \/ 50 GT used$/)).toBeTruthy();

    fireEvent.click(getButton("Open buyback"));
    expect(mockSendEarnPortfolioItemClickEvent).toHaveBeenCalledWith({ item: "GT", type: "sell" });
  });

  it("uses the GT left after buyback sales for the balance and the sellable amount", () => {
    mockBuyback(buybackSummary({ gtBalance: 5n * 10n ** 6n }));
    renderCard(GT_REWARDS_USD);

    expect(screen.getAllByText(/^0\.5\s*GT$/)).toHaveLength(2);
    expect(screen.queryByText(/0\.79044\s*GT/)).toBeNull();
  });

  it("asks for a referral code before the buyback opens", () => {
    mockBuyback(buybackSummary({ referralCode: undefined, quotaTotal: 0n, quotaUsed: 0n }));
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText("Create a referral code on Solana to participate in the GT buyback.")).toBeTruthy();
    expect(screen.getByText("Not set")).toBeTruthy();
    expect(getButton("Create referral code").disabled).toBe(false);
    expect(screen.queryByRole("button", { name: "Open buyback" })).toBeNull();
  });

  it("blocks smart-contract wallets", () => {
    mockBuyback(buybackSummary({ isSmartContractWallet: true }));
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText(/smart-contract wallets can't join the buyback/)).toBeTruthy();
    expect(getButton("Open buyback").disabled).toBe(true);
  });

  it("explains when there is no sellable GT yet", () => {
    mockBuyback(buybackSummary({ quotaTotal: 0n, quotaUsed: 0n }));
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText(/No sellable GT right now/)).toBeTruthy();
    expect(getButton("Open buyback").disabled).toBe(false);
  });

  it("shows the status of an active request", () => {
    mockBuyback(
      buybackSummary({ activeRequest: { id: "1", gtAmount: 5n * GT, status: "awaitingPayout", createdAt: 0 } })
    );
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText(/5\s*GT was bought back\. The payout is being confirmed\./)).toBeTruthy();
  });

  it("offers to withdraw bought-back USDC", () => {
    mockBuyback(buybackSummary({ withdrawableUsdc: 148_250_000n, totalBoughtBackUsdc: 148_250_000n }));
    renderCard(GT_REWARDS_USD);

    expect(screen.getByText("148.25 USDC is ready to withdraw.")).toBeTruthy();
    expect(getButton("Withdraw").disabled).toBe(false);
  });
});
