import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { CLAIMS_HISTORY_PER_PAGE } from "config/ui";
import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { EMPTY_ARRAY } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { CLAIMS_EXPORT_OPTIONS, HistoryExportModal } from "components/HistoryExport/HistoryExportModal";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { ClaimsHistorySkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { MarketFilter } from "components/TableMarketFilter/MarketFilter";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import DownloadIcon from "img/ic_download2.svg?react";

import { ClaimHistoryRow } from "./ClaimHistoryRow/ClaimHistoryRow";
import { ActionFilter } from "./filters/ActionFilter";
import { useClaimsHistoryExport } from "./useClaimsHistoryExport";

import "./ClaimsHistory.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

type HistoryLayout = {
  account: string | undefined;
  chainId: number;
  height: number;
  rowHeights: number[];
};

export function ClaimsHistory() {
  const chainId = useSelector(selectChainId);
  const account = useAccount();
  const { isMobile } = useBreakpoints();
  const [startDate, endDate, setDateRange] = useDateRange();
  const [eventNameFilter, setEventNameFilter] = useState<string[]>([]);
  const [marketAddressesFilter, setMarketAddressesFilter] = useState<string[]>([]);

  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(startDate, endDate);

  const {
    claimActions,
    hasMorePages,
    setPageIndex,
    isLoading: isHistoryLoading,
  } = useClaimCollateralHistory(chainId, {
    pageSize: CLAIMS_HISTORY_PREFETCH_SIZE,
    fromTxTimestamp: fromTxTimestamp,
    toTxTimestamp: toTxTimestamp,
    eventName: eventNameFilter,
    marketAddresses: marketAddressesFilter,
  });
  const isConnected = Boolean(account);
  const isLoading = isConnected && isHistoryLoading;

  const {
    currentPage,
    setCurrentPage,
    currentData: currentPageData,
    pageCount,
  } = usePagination(String(account), claimActions || EMPTY_ARRAY, CLAIMS_HISTORY_PER_PAGE);
  const isEmpty = !account || claimActions?.length === 0;
  const hasFilters = Boolean(startDate || endDate || eventNameFilter.length || marketAddressesFilter.length);

  const resultsRef = useRef<HTMLDivElement>(null);
  const settledLayout = useRef<HistoryLayout>();
  const loadingLayout =
    isLoading && settledLayout.current?.account === account && settledLayout.current?.chainId === chainId
      ? settledLayout.current
      : undefined;
  const isLoadingEmpty = isLoading && loadingLayout?.rowHeights.length === 0;
  const skeletonRowHeights = isLoadingEmpty
    ? Array<number>(3).fill(loadingLayout.height / 3)
    : loadingLayout?.rowHeights;
  const loadingStyle = useMemo<CSSProperties | undefined>(
    () => (loadingLayout ? { height: loadingLayout.height, overflow: "hidden" } : undefined),
    [loadingLayout]
  );

  useLayoutEffect(() => {
    const results = resultsRef.current;
    if (isLoading || !results) return;
    if (!claimActions) {
      settledLayout.current = undefined;
      return;
    }

    // Keep geometry only, so loading never displays results from another period.
    const measureLayout = () => {
      settledLayout.current = {
        account,
        chainId,
        height: results.getBoundingClientRect().height,
        rowHeights: Array.from(results.querySelectorAll("tbody > tr"), (row) => row.getBoundingClientRect().height),
      };
    };

    measureLayout();
    const observer = new ResizeObserver(measureLayout);
    observer.observe(results);
    return () => observer.disconnect();
  }, [account, chainId, isLoading, claimActions, currentPageData, pageCount]);

  useEffect(() => {
    if (hasMorePages && pageCount < currentPage + 2) {
      setPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, hasMorePages, setPageIndex]);

  const historyExport = useClaimsHistoryExport({
    account,
    startDate,
    endDate,
    fromTxTimestamp,
    toTxTimestamp,
    eventName: eventNameFilter,
    marketAddresses: marketAddressesFilter,
  });

  const controls = (
    <div className="flex">
      <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />
      <Button
        variant="ghost"
        disabled={!account}
        onClick={() => historyExport.setIsModalVisible(true)}
        className="flex items-center gap-4"
      >
        <div className="size-16">
          <DownloadIcon />
        </div>
        <span className="text-body-small font-medium">
          <Trans>CSV</Trans>
        </span>
      </Button>
    </div>
  );

  return (
    <div className="flex grow flex-col bg-slate-900">
      <HistoryExportModal
        isVisible={historyExport.isModalVisible}
        setIsVisible={historyExport.setIsModalVisible}
        title={t`Export claims history`}
        options={CLAIMS_EXPORT_OPTIONS}
        isGenerating={historyExport.isGenerating}
        activeFormat={historyExport.activeFormat}
        progress={historyExport.progress}
        error={historyExport.error}
        onSelect={historyExport.start}
        onCancel={historyExport.cancel}
      />
      <div className="flex items-center justify-between gap-8 pl-20 pr-8 pt-8">
        {!isMobile ? (
          <span className="text-body-medium font-medium">
            <Trans>Claims history</Trans>
          </span>
        ) : null}

        {controls}
      </div>
      <div ref={resultsRef} aria-busy={isLoading} className="flex grow flex-col" style={loadingStyle}>
        <TableScrollFadeContainer disableScrollFade={isEmpty || isLoadingEmpty} className="flex grow flex-col">
          {(!isEmpty || isLoading) && (
            <table className={cx("ClaimsHistory-table table-fixed", { "!w-full": isLoadingEmpty })}>
              <colgroup>
                <col className="ClaimsHistory-action-column" />
                <col className="ClaimsHistory-market-column" />
                <col className="ClaimsHistory-size-column" />
              </colgroup>
              {!isLoadingEmpty && (
                <thead>
                  <TableTheadTr>
                    <TableTh className="w-[40%]">
                      <ActionFilter value={eventNameFilter} onChange={setEventNameFilter} />
                    </TableTh>
                    <TableTh className="w-[40%]">
                      <MarketFilter excludeSpotOnly value={marketAddressesFilter} onChange={setMarketAddressesFilter} />
                    </TableTh>
                    <TableTh className="ClaimsHistory-price-header w-[20%]">
                      <Trans>SIZE</Trans>
                    </TableTh>
                  </TableTheadTr>
                </thead>
              )}
              <tbody>
                {isLoading ? (
                  skeletonRowHeights ? (
                    skeletonRowHeights.map((rowHeight, index) => (
                      <ClaimsHistorySkeleton key={index} count={1} rowHeight={rowHeight} />
                    ))
                  ) : (
                    <ClaimsHistorySkeleton />
                  )
                ) : (
                  currentPageData.map((claimAction) => (
                    <ClaimHistoryRow key={claimAction.id} claimAction={claimAction} />
                  ))
                )}
              </tbody>
            </table>
          )}

          {!isLoading && isEmpty && !hasFilters && (
            <EmptyTableContent isLoading={false} isEmpty={isEmpty} emptyText={<Trans>No claims yet</Trans>} />
          )}

          {!isLoading && isEmpty && hasFilters && (
            <EmptyTableContent
              isLoading={false}
              isEmpty={isEmpty}
              emptyText={<Trans>No claims match the selected filters</Trans>}
            />
          )}
        </TableScrollFadeContainer>

        {!isLoading && <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />}
      </div>
    </div>
  );
}
