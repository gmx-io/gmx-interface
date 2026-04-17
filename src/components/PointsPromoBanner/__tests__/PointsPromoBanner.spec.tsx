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
  isManuallyRewarded: false,
  manualAllocatedPoints: undefined,
  manualBonusUsd: undefined,
  recommendedStakeGmx: undefined,
  estimatedRewardsUsd: undefined,
  hasPersonalizedData: false,
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

  it("shows generic text when hasPersonalizedData is false", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      hasPersonalizedData: false,
    });

    renderBanner();

    expect(screen.getByText(/Start earning points and unlock rewards/)).toBeDefined();
  });

  it("shows bonus text when isManuallyRewarded is true", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      hasPersonalizedData: true,
      isManuallyRewarded: true,
      manualBonusUsd: 500n * 10n ** 30n, // $500.00
    });

    renderBanner();

    const bannerText = screen.getByText(/received a points bonus worth/);
    expect(bannerText).toBeDefined();
  });

  it("shows staking recommendation text when personalized data available", () => {
    mockUsePersonalizedBannerData.mockReturnValue({
      ...defaultBannerData,
      hasPersonalizedData: true,
      isManuallyRewarded: false,
      recommendedStakeGmx: 1000,
      estimatedRewardsUsd: 50,
    });

    renderBanner();

    expect(screen.getByText(/staking/)).toBeDefined();
    expect(screen.getByText(/1\.0k/)).toBeDefined();
  });

  it("contains link to /points", () => {
    renderBanner();

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/points");
  });

  it("clicking the banner link calls setDismissed with true", () => {
    renderBanner();

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });

  it("dismiss button calls setDismissed with true", () => {
    renderBanner();

    const dismissButton = screen.getByRole("button");
    fireEvent.click(dismissButton);

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });
});
