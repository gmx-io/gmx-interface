import { useEffect, useState } from "react";

import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { MarketsInfoResult } from "domain/synthetics/markets";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TokensDataResult } from "domain/synthetics/tokens";
import { useMeasureLoadTime } from "lib/metrics";
import { ApiDataSource, FailedDataSource } from "lib/metrics/types";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

export function useCollectSyntheticsMetrics({
  tokensDataResult,
  marketsInfo,
  isCandlesLoaded,
  positionsInfoData,
  positionsInfoDataSource,
  positionsInfoError,
  positionsInfoFailedDataSource,
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
  positionsInfoFailedDataSource: FailedDataSource | undefined;
  pageType: string;
}) {
  const { account } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const { connectModalOpen } = useConnectModal();
  const [shouldSkipAccountMetrics, setShouldSkipAccountMetrics] = useState(false);

  const isMarketDataLoaded = Boolean(
    marketsInfo.marketsInfoData && tokensDataResult.pricesUpdatedAt && tokensDataResult.tokensData && isCandlesLoaded
  );
  const isTradingDataLoaded = Boolean(isMarketDataLoaded && account && tokensDataResult.isBalancesLoaded);
  const isPositionsListLoaded = Boolean(positionsInfoData && !isPositionsInfoLoading);
  const hasWallet = Boolean(account) || isWalletInitializing;

  useMeasureLoadTime({
    isLoaded: Boolean(account),
    error: undefined,
    skip: shouldSkipAccountMetrics,
    metricType: "accountInfo",
  });

  useMeasureLoadTime({
    isLoaded: Boolean(marketsInfo.marketsInfoData),
    error: marketsInfo.error,
    failedDataSource: marketsInfo.failedDataSource,
    skip: shouldSkipAccountMetrics || pageType !== "trade",
    metricType: "marketsInfoLoad",
    data: { dataSource: marketsInfo.dataSource },
  });

  useMeasureLoadTime({
    isLoaded: isTradingDataLoaded,
    isPageLoaded: hasWallet ? isTradingDataLoaded : isMarketDataLoaded,
    error: marketsInfo.error,
    failedDataSource: marketsInfo.failedDataSource,
    skip: shouldSkipAccountMetrics || pageType !== "trade",
    metricType: "tradingDataLoad",
  });

  useMeasureLoadTime({
    isLoaded: isPositionsListLoaded,
    isPageLoaded: hasWallet ? isPositionsListLoaded : Boolean(marketsInfo.marketsInfoData),
    error: positionsInfoError || marketsInfo.error,
    failedDataSource: positionsInfoError ? positionsInfoFailedDataSource : marketsInfo.failedDataSource,
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
