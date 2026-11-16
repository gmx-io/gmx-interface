import { useEffect, useState } from "react";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { MarketsInfoResult } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokensDataResult } from "domain/synthetics/tokens";
import { useMeasureLoadTime } from "lib/metrics";
import { ApiDataSource } from "lib/metrics/types";
import useWallet from "lib/wallets/useWallet";

export function useCollectSyntheticsMetrics({
  tokensDataResult,
  marketsInfo,
  isCandlesLoaded,
  positionsInfoData,
  positionsInfoDataSource,
  positionsInfoError,
  isPositionsInfoLoading,
  pageType,
}: {
  tokensDataResult: TokensDataResult;
  marketsInfo: MarketsInfoResult;
  positionsInfoData: PositionsInfoData | undefined;
  positionsInfoDataSource: ApiDataSource | undefined;
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
    data: { dataSource: marketsInfo.dataSource },
  });

  useMeasureLoadTime({
    isLoaded: Boolean(
      marketsInfo.marketsInfoData &&
        account &&
        tokensDataResult.pricesUpdatedAt &&
        tokensDataResult.tokensData &&
        tokensDataResult.isBalancesLoaded &&
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
    data: { dataSource: positionsInfoDataSource },
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
