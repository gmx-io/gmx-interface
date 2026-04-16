import { useCallback, useEffect, useState } from "react";

import { HISTORICAL_POINTS_ALLOCATION_MODAL_DISMISSED_KEY } from "config/localStorage";
import { usePersonalizedBannerData } from "domain/synthetics/incentives/usePersonalizedBannerData";
import { useLocalStorageSerializeKey } from "lib/localStorage";

export function useHistoricalPointsAllocationModal() {
  const bannerData = usePersonalizedBannerData();
  const [dismissed, setDismissed] = useLocalStorageSerializeKey(
    HISTORICAL_POINTS_ALLOCATION_MODAL_DISMISSED_KEY,
    false
  );
  const [isVisible, setIsVisible] = useState(false);

  const shouldShow =
    !dismissed &&
    !bannerData.isLoading &&
    bannerData.isManuallyRewarded &&
    bannerData.manualAllocatedPoints !== undefined &&
    bannerData.manualAllocatedPoints > 0n;

  useEffect(() => {
    if (shouldShow && !isVisible) {
      setIsVisible(true);
    }
  }, [shouldShow, isVisible]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setDismissed(true);
  }, [setDismissed]);

  return {
    isVisible,
    setIsVisible: handleClose,
    manualAllocatedPoints: bannerData.manualAllocatedPoints,
    manualBonusUsd: bannerData.manualBonusUsd,
  };
}
