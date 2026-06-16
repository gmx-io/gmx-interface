import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders/types";
import { usePositionsConstantsRequest } from "domain/synthetics/positions/usePositionsConstants";
import {
  filterLifecycleTradeActionsByDisplayFilters,
  getPositionLifecycleSlice,
  PositionLifecycleFilter,
  PositionTradeAction,
  resolveTradeHistoryFetchParams,
  TradeActionType,
  useTradeHistory,
} from "domain/synthetics/tradeHistory";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { useBreakpoints } from "lib/useBreakpoints";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Pagination/usePagination";
import { TradesHistorySkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowLeftIcon from "img/ic_arrow_left.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import PieChartIcon from "img/ic_pie_chart.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { DateRangeSelect } from "../DateRangeSelect/DateRangeSelect";
import { MarketFilterLongShort, MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { ActionFilter } from "./filters/ActionFilter";
import { TradeHistoryRow } from "./TradeHistoryRow/TradeHistoryRow";
import { useDownloadAsCsv } from "./useDownloadAsCsv";

import "./TradeHistorySynthetics.scss";

const TRADE_HISTORY_PREFETCH_SIZE = 100;
const POSITION_LIFECYCLE_PREFETCH_SIZE = TRADE_HISTORY_PREFETCH_SIZE;
const ENTITIES_PER_PAGE = TRADE_HISTORY_PER_PAGE;

type ActionFilter = {
  orderType: OrderType[];
  eventName: TradeActionType;
  isDepositOrWithdraw: boolean;
  isTwap: boolean;
};

type Props = {
  account: Address | null | undefined;
  forAllAccounts?: boolean;
  hideDashboardLink?: boolean;
};

export function TradeHistory(p: Props) {
  const { forAllAccounts, account, hideDashboardLink = false } = p;
  const chainId = useSelector(selectChainId);
  const showDebugValues = useShowDebugValues();
  const [startDate, endDate, setDateRange] = useDateRange();
  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [actionFilter, setActionFilter] = useState<ActionFilter[]>([]);
  const [positionLifecycleFilter, setPositionLifecycleFilter] = useState<PositionLifecycleFilter | undefined>();

  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(startDate, endDate);

  const { positionsConstants } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd } = positionsConstants || {};

  const tradeHistoryFetchParams = useMemo(
    () =>
      resolveTradeHistoryFetchParams({
        positionLifecycleFilter,
        fromTxTimestamp,
        toTxTimestamp,
        marketsDirectionsFilter,
        orderEventCombinations: actionFilter,
      }),
    [actionFilter, fromTxTimestamp, marketsDirectionsFilter, positionLifecycleFilter, toTxTimestamp]
  );

  const {
    tradeActions,
    totalCount,
    isLoading: isHistoryLoading,
    error: historyError,
    hasMorePages: hasMoreTradeActionPages,
    isFetchingNextPage,
    setPageIndex: setTradeActionsPageIndex,
  } = useTradeHistory(chainId, {
    account,
    forAllAccounts,
    pageSize: positionLifecycleFilter ? POSITION_LIFECYCLE_PREFETCH_SIZE : TRADE_HISTORY_PREFETCH_SIZE,
    ...tradeHistoryFetchParams,
  });

  const positionLifecycleSlice = useMemo(
    () => getPositionLifecycleSlice(tradeActions, positionLifecycleFilter),
    [positionLifecycleFilter, tradeActions]
  );
  const isLifecycleSliceIncomplete =
    Boolean(positionLifecycleFilter) &&
    positionLifecycleSlice.needsMoreData &&
    hasMoreTradeActionPages &&
    !historyError;
  const shouldRequestMoreLifecycleRows = isLifecycleSliceIncomplete && !isHistoryLoading && !isFetchingNextPage;
  const isLifecycleCrawling = Boolean(positionLifecycleFilter) && (isLifecycleSliceIncomplete || isFetchingNextPage);

  const filteredTradeActions = useMemo(
    () =>
      positionLifecycleFilter
        ? filterLifecycleTradeActionsByDisplayFilters({
            tradeActions: positionLifecycleSlice.tradeActions,
            fromTxTimestamp,
            toTxTimestamp,
            orderEventCombinations: actionFilter,
          })
        : tradeActions,
    [
      actionFilter,
      fromTxTimestamp,
      positionLifecycleFilter,
      positionLifecycleSlice.tradeActions,
      toTxTimestamp,
      tradeActions,
    ]
  );

  const paginationKey = useMemo(
    () =>
      JSON.stringify([
        account,
        forAllAccounts,
        fromTxTimestamp,
        toTxTimestamp,
        marketsDirectionsFilter,
        actionFilter,
        positionLifecycleFilter,
      ]),
    [
      account,
      actionFilter,
      forAllAccounts,
      fromTxTimestamp,
      marketsDirectionsFilter,
      positionLifecycleFilter,
      toTxTimestamp,
    ]
  );
  const {
    currentPage,
    setCurrentPage,
    currentData: loadedCurrentPageData,
    pageCount,
  } = usePagination(
    paginationKey,
    filteredTradeActions,
    ENTITIES_PER_PAGE,
    positionLifecycleFilter ? undefined : totalCount
  );

  const currentPageStartIndex = (currentPage - 1) * ENTITIES_PER_PAGE;
  const directPageOffset =
    Math.floor(currentPageStartIndex / TRADE_HISTORY_PREFETCH_SIZE) * TRADE_HISTORY_PREFETCH_SIZE;
  const shouldFetchDirectPage = Boolean(
    !positionLifecycleFilter &&
      totalCount !== undefined &&
      filteredTradeActions &&
      currentPageStartIndex < totalCount &&
      filteredTradeActions.length <= currentPageStartIndex
  );

  const {
    tradeActions: directPageTradeActions,
    isLoading: isDirectPageLoading,
    error: directPageError,
  } = useTradeHistory(chainId, {
    account: shouldFetchDirectPage ? account : undefined,
    forAllAccounts: shouldFetchDirectPage ? forAllAccounts : undefined,
    pageSize: TRADE_HISTORY_PREFETCH_SIZE,
    pageOffset: directPageOffset,
    ...tradeHistoryFetchParams,
  });

  const directPageStartIndex = currentPageStartIndex - directPageOffset;
  const directCurrentPageData = directPageTradeActions?.slice(
    directPageStartIndex,
    directPageStartIndex + ENTITIES_PER_PAGE
  );
  const currentPageData = (shouldFetchDirectPage ? directCurrentPageData : loadedCurrentPageData) ?? [];
  const displayError = historyError || directPageError;
  const isInitialHistoryLoading = isHistoryLoading && filteredTradeActions === undefined;

  const isConnected = Boolean(account);
  const isLoading =
    (forAllAccounts || isConnected) &&
    (minCollateralUsd === undefined ||
      isInitialHistoryLoading ||
      (shouldFetchDirectPage && isDirectPageLoading && directPageTradeActions === undefined) ||
      (isLifecycleSliceIncomplete && !filteredTradeActions?.length));

  const isEmpty = !isLoading && !currentPageData.length;

  const hasFilters = Boolean(
    startDate || endDate || marketsDirectionsFilter.length || actionFilter.length || positionLifecycleFilter
  );

  const handleSelectPositionLifecycle = useCallback((tradeAction: PositionTradeAction) => {
    if (!tradeAction.positionKey) {
      return;
    }

    setPositionLifecycleFilter({
      positionKey: tradeAction.positionKey,
      sourceActionId: tradeAction.id,
    });
  }, []);

  const handleClearPositionLifecycleFilter = useCallback(() => {
    setPositionLifecycleFilter(undefined);
  }, []);

  const pnlAnalysisButton = useMemo(() => {
    if (!account || hideDashboardLink) {
      return null;
    }

    const url = buildAccountDashboardUrl(account, chainId, 2);

    return (
      <Button variant="ghost" to={url}>
        <PieChartIcon className="size-16" />

        <Trans>PnL analysis</Trans>
      </Button>
    );
  }, [account, chainId, hideDashboardLink]);

  useEffect(() => {
    if (positionLifecycleFilter && shouldRequestMoreLifecycleRows) {
      setTradeActionsPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [positionLifecycleFilter, shouldRequestMoreLifecycleRows, setTradeActionsPageIndex]);

  const [isLoadingCsv, handleCsvDownload] = useDownloadAsCsv({
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations: actionFilter,
    minCollateralUsd: minCollateralUsd,
    positionLifecycleFilter,
  });

  const { isMobile } = useBreakpoints();

  let actions = (
    <>
      {positionLifecycleFilter ? (
        <Button
          variant="ghost"
          onClick={handleClearPositionLifecycleFilter}
          className="flex items-center gap-4"
          aria-label={t`Clear position history filter`}
          title={t`Clear position history filter`}
        >
          {isLifecycleCrawling ? <SpinnerIcon className="size-16 animate-spin" /> : <ArrowLeftIcon className="size-16" />}
          <Trans>Back to all trades</Trans>
        </Button>
      ) : null}

      {pnlAnalysisButton}

      <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />

      <Button variant="ghost" onClick={handleCsvDownload} className="flex items-center gap-4">
        {isLoadingCsv ? <SpinnerIcon className="mr-4 animate-spin" /> : <DownloadIcon className="size-16" />}
        <Trans>CSV</Trans>
      </Button>
    </>
  );

  const controls = <div className="flex items-center gap-4">{actions}</div>;

  return (
    <div className="TradeHistorySynthetics flex grow flex-col bg-slate-900">
      <div className="flex items-center justify-between gap-8 pl-20 pr-8 pt-8">
        {!isMobile ? (
          <span className="text-body-medium font-medium">
            <Trans>Trade history</Trans>
          </span>
        ) : null}

        {controls}
      </div>
      <TableScrollFadeContainer disableScrollFade={currentPageData.length === 0} className="flex grow flex-col">
        <table className="TradeHistorySynthetics-table table-fixed">
          <colgroup>
            <col className="TradeHistorySynthetics-action-column" />
            <col className="TradeHistorySynthetics-market-column" />
            <col className="TradeHistorySynthetics-size-column" />
            <col className="TradeHistorySynthetics-price-column" />
            <col className="TradeHistorySynthetics-pnl-column" />
            <col className="TradeHistorySynthetics-fees-column" />
            <col className="TradeHistorySynthetics-actions-column" />
          </colgroup>
          <thead>
            <TableTheadTr>
              <TableTh className="w-[16%]">
                <ActionFilter value={actionFilter} onChange={setActionFilter} />
              </TableTh>
              <TableTh className="w-[16%]">
                <MarketFilterLongShort
                  withPositions="all"
                  value={marketsDirectionsFilter}
                  onChange={setMarketsDirectionsFilter}
                />
              </TableTh>
              <TableTh className="w-[20%]">
                <Trans>SIZE</Trans>
              </TableTh>
              <TableTh className="w-[16%]">
                <Trans>PRICE</Trans>
              </TableTh>
              <TableTh className="w-[10%]">
                <TooltipWithPortal
                  variant="iconStroke"
                  content={<Trans>Realized PnL before fees, discounts and price impact.</Trans>}
                >
                  <Trans>RPNL</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh className="w-[10%]">
                <TooltipWithPortal
                  variant="iconStroke"
                  content={
                    <Trans>
                      Net total of action-level fees, and price impact. Hover the value to see the breakdown.
                    </Trans>
                  }
                >
                  <Trans>FEES</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh className="w-[132px]" />
            </TableTheadTr>
          </thead>
          <tbody>
            {isLoading ? (
              <TradesHistorySkeleton withTimestamp={forAllAccounts} />
            ) : (
              currentPageData.map((tradeAction) => (
                <TradeHistoryRow
                  key={tradeAction.id}
                  tradeAction={tradeAction}
                  minCollateralUsd={minCollateralUsd!}
                  showDebugValues={showDebugValues}
                  shouldDisplayAccount={forAllAccounts}
                  onSelectPositionLifecycle={handleSelectPositionLifecycle}
                />
              ))
            )}
          </tbody>
        </table>
        {isEmpty && Boolean(displayError) && (
          <EmptyTableContent
            isLoading={false}
            isEmpty={isEmpty}
            emptyText={<Trans>Failed to load trade history</Trans>}
          />
        )}
        {isEmpty && !displayError && hasFilters && (
          <EmptyTableContent
            isLoading={false}
            isEmpty={isEmpty}
            emptyText={<Trans>No trades match the selected filters</Trans>}
          />
        )}
        {isEmpty && !displayError && !hasFilters && !isLoading && (
          <EmptyTableContent isLoading={false} isEmpty={isEmpty} emptyText={<Trans>No trades yet</Trans>} />
        )}
      </TableScrollFadeContainer>

      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}
