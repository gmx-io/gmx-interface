import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { sendRewardsBannerEvent, sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";

import { AffiliateRewardsPromoBanner } from "../AffiliateRewardsPromoBanner";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));

vi.mock("lib/userAnalytics/rewardsEvents", () => ({
  sendRewardsBannerEvent: vi.fn(),
  sendRewardsNavigationEvent: vi.fn(),
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockSendRewardsBannerEvent = vi.mocked(sendRewardsBannerEvent);
const mockSendRewardsNavigationEvent = vi.mocked(sendRewardsNavigationEvent);

i18n.load({ en: {} });
i18n.activate("en");

function renderBanner() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <AffiliateRewardsPromoBanner account={ACCOUNT} />
      </MemoryRouter>
    </I18nProvider>
  );
}

describe("AffiliateRewardsPromoBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseIncentivesV2State.mockReturnValue({ isActive: true } as ReturnType<typeof useIncentivesV2State>);
  });

  afterEach(cleanup);

  it("shows the referral reward promotion and links to the Rewards page", () => {
    renderBanner();

    expect(screen.getByRole("heading", { name: "Referral Bonus" })).toBeDefined();
    expect(screen.getByText("Refer traders and earn 50% of their rewards while the program is live.")).toBeDefined();

    const readMoreLink = screen.getByRole("link", { name: "Read more" });
    expect(readMoreLink.getAttribute("href")).toBe("/rewards");
    fireEvent.click(readMoreLink);

    expect(mockSendRewardsBannerEvent).toHaveBeenCalledWith("BannerShown", "referrals-rewards-program", ACCOUNT);
    expect(mockSendRewardsBannerEvent).toHaveBeenCalledWith("BannerClick", "referrals-rewards-program");
    expect(mockSendRewardsNavigationEvent).toHaveBeenCalledWith({ source: "ReferralsPageBanner" });
  });

  it("can be dismissed independently for the current account", () => {
    renderBanner();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByTestId("affiliate-rewards-promo-banner")).toBeNull();
    expect(mockSendRewardsBannerEvent).toHaveBeenCalledWith("BannerDismiss", "referrals-rewards-program");

    cleanup();
    renderBanner();
    expect(screen.queryByTestId("affiliate-rewards-promo-banner")).toBeNull();
  });

  it("stays hidden while the incentives program is inactive", () => {
    mockUseIncentivesV2State.mockReturnValue({ isActive: false } as ReturnType<typeof useIncentivesV2State>);

    renderBanner();

    expect(screen.queryByTestId("affiliate-rewards-promo-banner")).toBeNull();
    expect(mockSendRewardsBannerEvent).not.toHaveBeenCalled();
  });
});
