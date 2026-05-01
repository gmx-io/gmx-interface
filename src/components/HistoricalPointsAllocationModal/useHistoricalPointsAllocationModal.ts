import { useCallback, useEffect, useState } from "react";

import { HISTORICAL_POINTS_ALLOCATION_MODAL_DISMISSED_KEY } from "config/localStorage";
import type { PersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useLocalStorageSerializeKey } from "lib/localStorage";

type HistoricalPointsAllocationModalDismissedState =
  | boolean
  | {
      dismissed: boolean;
      dismissedAfterFirstProgramEpochVolume?: boolean;
    };

function getIsDismissedForCurrentState(
  dismissedState: HistoricalPointsAllocationModalDismissedState | undefined,
  hasVolumeAfterFirstProgramEpoch: boolean
) {
  if (hasVolumeAfterFirstProgramEpoch) {
    return typeof dismissedState === "object" && dismissedState.dismissedAfterFirstProgramEpochVolume === true;
  }

  return typeof dismissedState === "object" ? dismissedState.dismissed : dismissedState === true;
}

export function getShouldShowHistoricalPointsAllocationModal({
  dismissedState,
  bannerData,
}: {
  dismissedState: HistoricalPointsAllocationModalDismissedState | undefined;
  bannerData: Pick<
    PersonalizedBannerData,
    "hasVolumeAfterFirstProgramEpoch" | "isLoading" | "isManuallyRewarded" | "manualAllocatedPoints"
  >;
}) {
  return (
    !getIsDismissedForCurrentState(dismissedState, bannerData.hasVolumeAfterFirstProgramEpoch) &&
    !bannerData.isLoading &&
    bannerData.isManuallyRewarded &&
    bannerData.manualAllocatedPoints !== undefined &&
    bannerData.manualAllocatedPoints > 0n
  );
}

export function useHistoricalPointsAllocationModal() {
  const bannerData = usePersonalizedBannerData();
  const [dismissedState, setDismissedState] =
    useLocalStorageSerializeKey<HistoricalPointsAllocationModalDismissedState>(
      HISTORICAL_POINTS_ALLOCATION_MODAL_DISMISSED_KEY,
      false
    );
  const [isVisible, setIsVisible] = useState(false);

  const shouldShow = getShouldShowHistoricalPointsAllocationModal({
    dismissedState,
    bannerData,
  });

  useEffect(() => {
    if (shouldShow && !isVisible) {
      setIsVisible(true);
    }
  }, [shouldShow, isVisible]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setDismissedState((previousState) => ({
      dismissed: true,
      dismissedAfterFirstProgramEpochVolume:
        bannerData.hasVolumeAfterFirstProgramEpoch ||
        (typeof previousState === "object" && previousState.dismissedAfterFirstProgramEpochVolume === true),
    }));
  }, [bannerData.hasVolumeAfterFirstProgramEpoch, setDismissedState]);

  return {
    isVisible,
    setIsVisible: handleClose,
    manualAllocatedPoints: bannerData.manualAllocatedPoints,
    manualBonusUsd: bannerData.manualBonusUsd,
  };
}
