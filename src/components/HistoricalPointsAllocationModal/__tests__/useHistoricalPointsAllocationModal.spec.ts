import { describe, expect, it } from "vitest";

import { getShouldShowHistoricalPointsAllocationModal } from "../useHistoricalPointsAllocationModal";

const GMX_PRECISION = 10n ** 18n;

const baseBannerData = {
  isLoading: false,
  isManuallyRewarded: true,
  manualAllocatedPoints: 100n * GMX_PRECISION,
};

describe("getShouldShowHistoricalPointsAllocationModal", () => {
  it("shows when the manual allocation modal was not dismissed", () => {
    expect(
      getShouldShowHistoricalPointsAllocationModal({
        dismissedState: false,
        bannerData: baseBannerData,
      })
    ).toBe(true);
  });

  it("keeps the modal hidden after dismissal", () => {
    expect(
      getShouldShowHistoricalPointsAllocationModal({
        dismissedState: true,
        bannerData: baseBannerData,
      })
    ).toBe(false);
  });

  it("keeps the modal hidden after a legacy dismissal", () => {
    expect(
      getShouldShowHistoricalPointsAllocationModal({
        dismissedState: true,
        bannerData: baseBannerData,
      })
    ).toBe(false);
  });

  it("keeps the modal hidden after legacy object dismissal", () => {
    expect(
      getShouldShowHistoricalPointsAllocationModal({
        dismissedState: {
          dismissed: true,
          dismissedAfterFirstProgramEpochVolume: false,
        },
        bannerData: baseBannerData,
      })
    ).toBe(false);
  });
});
