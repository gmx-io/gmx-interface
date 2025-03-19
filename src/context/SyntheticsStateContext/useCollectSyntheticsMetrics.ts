import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";

import { MarketsInfoResult } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { useMeasureLoadTime } from "lib/metrics";
import useWallet from "lib/wallets/useWallet";

export function useCollectSyntheticsMetrics({
  marketsInfo,
  isCandlesLoaded,
  positionsInfoData,
  positionsInfoError,
  isPositionsInfoLoading,
  pageType,
}: {
  marketsInfo: MarketsInfoResult;
  positionsInfoData: PositionsInfoData | undefined;
  isPositionsInfoLoading: boolean;
  isCandlesLoaded: boolean;
  positionsInfoError: Error | undefined;
  pageType: string;
}) {
  const { account } = useWallet();
  const { connectModalOpen } = useConnectModal();
  const [shouldSkipAccountMetrics, setShouldSkipAccountMetrics] = useState(false);

  useMeasureLoadTime({
    isLoaded: Boolean(account),
    error: undefined,
    skip: shouldSkipAccountMetrics,
    metricType: "accountInfo",
  });

  useMeasureLoadTime({
    isLoaded: Boolean(marketsInfo.marketsInfoData),
    error: marketsInfo.error,
    skip: shouldSkipAccountMetrics || pageType !== "trade",
    metricType: "marketsInfoLoad",
  });

  useMeasureLoadTime({
    isLoaded: Boolean(
      marketsInfo.marketsInfoData &&
        account &&
        marketsInfo.pricesUpdatedAt &&
        marketsInfo.tokensData &&
        marketsInfo.isBalancesLoaded &&
        isCandlesLoaded
    ),
    error: marketsInfo.error,
    skip: shouldSkipAccountMetrics || pageType !== "trade",
    metricType: "tradingDataLoad",
  });

  useMeasureLoadTime({
    isLoaded: Boolean(positionsInfoData && !isPositionsInfoLoading),
    error: positionsInfoError || marketsInfo.error,
    skip: shouldSkipAccountMetrics || pageType !== "trade",
    metricType: "positionsListLoad",
  });

  useEffect(
    function checkSkipAccountMetrics() {
      if (shouldSkipAccountMetrics) {
        return;
      }

      if (connectModalOpen) {
        setShouldSkipAccountMetrics(true);
        return;
      }
    },
    [connectModalOpen, shouldSkipAccountMetrics]
  );
}
