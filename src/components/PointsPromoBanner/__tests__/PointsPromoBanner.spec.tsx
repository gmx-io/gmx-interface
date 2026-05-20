import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/constants", () => ({
  isIncentivesEnabled: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/usePersonalizedBannerData", () => ({
  usePersonalizedBannerData: vi.fn(),
}));

let mockDismissed = false;
const mockSetDismissed = vi.fn();

vi.mock("lib/localStorage", () => ({
  useLocalStorageSerializeKey: vi.fn(() => [mockDismissed, mockSetDismissed]),
}));

vi.mock("lib/userAnalytics/pointsEvents", () => ({
  sendPointsPageNavigationEvent: vi.fn(),
}));

vi.mock("context/ThemeContext/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

// Import after mocks
import { isIncentivesEnabled } from "domain/synthetics/incentives/constants";
import type { PersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { PointsPromoBanner } from "../PointsPromoBanner";

const mockUseChainId = vi.mocked(useChainId);
const mockIsIncentivesEnabled = vi.mocked(isIncentivesEnabled);
const mockUsePersonalizedBannerData = vi.mocked(usePersonalizedBannerData);
const mockUseLocalStorage = vi.mocked(useLocalStorageSerializeKey);

i18n.load({ en: {} });
i18n.activate("en");

const ARBITRUM = 42161;

const defaultBannerData: PersonalizedBannerData = {
  bannerVariant: "new-or-low-fees",
  isManuallyRewarded: false,
  manualAllocatedPoints: undefined,
  manualBonusUsd: undefined,
  estimatedRewardsUsd: undefined,
  isLoading: false,
};

function renderBanner() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <PointsPromoBanner />
      </MemoryRouter>
    </I18nProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDismissed = false;
  mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as any);
  mockIsIncentivesEnabled.mockReturnValue(true);
  mockUsePersonalizedBannerData.mockReturnValue(defaultBannerData);
  mockUseLocalStorage.mockImplementation(() => [mockDismissed, mockSetDismissed] as any);
});

afterEach(() => {
  cleanup();
});

describe("PointsPromoBanner", () => {
  it("returns null when isIncentivesEnabled returns false", () => {
    mockIsIncentivesEnabled.mockReturnValue(false);

    const { container } = renderBanner();

    expect(container.innerHTML).toBe("");
  });

  it("returns null when dismissed (localStorage)", () => {
    mockDismissed = true;
    mockUseLocalStorage.mockImplementation(() => [true, mockSetDismissed] as any);

    const { container } = renderBanner();

    expect(container.innerHTML).toBe("");
  });

  it("returns null while data is still loading", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: undefined,
      isLoading: true,
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe("");
  });

  it("keeps manual reward text hidden when legacy dismissed state exists", () => {
    mockUseLocalStorage.mockImplementation(() => [true, mockSetDismissed] as any);
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "manual-reward",
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n,
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe("");
  });

  it("keeps manual reward text hidden when legacy object dismissed state exists", () => {
    mockUseLocalStorage.mockImplementation(
      () => [{ dismissed: true, dismissedAfterFirstProgramEpochVolume: false }, mockSetDismissed] as any
    );
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "manual-reward",
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n,
    });

    const { container } = renderBanner();

    expect(container.innerHTML).toBe("");
  });

  it("shows new-or-low-fees text by default", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "new-or-low-fees",
    });

    renderBanner();

    expect(screen.getByText(/Stake GMX and receive up to 50% of your fees back/)).toBeDefined();
  });

  it("shows manual reward text when bannerVariant is manual-reward", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "manual-reward",
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n, // $500
    });

    renderBanner();

    expect(screen.getByText(/You've received bonus of/)).toBeDefined();
    expect(screen.getByText(/Start trading to redeem your rewards/)).toBeDefined();
  });

  it("shows recent-activity text when bannerVariant is recent-activity", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "recent-activity",
      estimatedRewardsUsd: 200,
    });

    renderBanner();

    expect(screen.getByText(/With your recent activity, staking/)).toBeDefined();
    expect(screen.getByText(/\$200 in rewards/)).toBeDefined();
  });

  it('renders "Stake GMX" CTA and links to /points for recent-activity variant', () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "recent-activity",
      estimatedRewardsUsd: 200,
    });

    renderBanner();

    expect(screen.getByText("Stake GMX")).toBeDefined();
    expect(screen.queryByText(/Learn more/)).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/points");
  });

  it("renders Learn more CTA for new-or-low-fees variant and links to /points", () => {
    renderBanner();

    expect(screen.getByText(/Learn more/)).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/points");
  });

  it("renders Learn more CTA for manual-reward variant and links to /points", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "manual-reward",
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n,
    });

    renderBanner();

    expect(screen.getByText(/Learn more/)).toBeDefined();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/points");
  });

  it("clicking the banner link records one-time dismissal", () => {
    renderBanner();

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });

  it("dismiss button records one-time dismissal and hides immediately", () => {
    const { container } = renderBanner();

    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
    expect(container.innerHTML).toBe("");
  });

  it("records dismissal for manual reward text", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      bannerVariant: "manual-reward",
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n,
    });

    renderBanner();

    fireEvent.click(screen.getByRole("button"));

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });
});
