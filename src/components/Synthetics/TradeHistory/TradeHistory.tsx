import { Trans } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Address } from "viem";

import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders/types";
import { usePositionsConstantsRequest } from "domain/synthetics/positions/usePositionsConstants";
import { TradeAction, TradeActionType, useTradeHistory } from "domain/synthetics/tradeHistory";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { HistoryControl } from "components/HistoryControl/HistoryControl";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import { TradesHistorySkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CalendarIcon from "img/ic_calendar.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";

import { DateRangeSelect } from "../DateRangeSelect/DateRangeSelect";
import { MarketFilterLongShort, MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { ActionFilter } from "./filters/ActionFilter";
import { TradeHistoryRow } from "./TradeHistoryRow/TradeHistoryRow";
import { useDownloadAsCsv } from "./useDownloadAsCsv";

import "./TradeHistorySynthetics.scss";

const TRADE_HISTORY_PREFETCH_SIZE = 100;
const ENTITIES_PER_PAGE = TRADE_HISTORY_PER_PAGE;

type ActionFilter = {
  orderType: OrderType[];
  eventName: TradeActionType;
  isDepositOrWithdraw: boolean;
  isTwap: boolean;
};

export function useTradeHistoryState(p: {
  account: Address | null | undefined;
  forAllAccounts?: boolean;
  hideDashboardLink?: boolean;
}): Props & { controls: ReactNode } {
  const { forAllAccounts, account, hideDashboardLink = false } = p;
  const chainId = useSelector(selectChainId);
  const showDebugValues = useShowDebugValues();
  const [startDate, endDate, setDateRange] = useDateRange();
  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [actionFilter, setActionFilter] = useState<ActionFilter[]>([]);

  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(startDate, endDate);

  const {
    positionsConstants: { minCollateralUsd },
  } = usePositionsConstantsRequest(chainId);

  const {
    tradeActions,
    isLoading: isHistoryLoading,
    pageIndex: tradeActionsPageIndex,
    setPageIndex: setTradeActionsPageIndex,
  } = useTradeHistory(chainId, {
    account,
    forAllAccounts,
    pageSize: TRADE_HISTORY_PREFETCH_SIZE,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations: actionFilter,
  });

  const isConnected = Boolean(account);
  const isLoading = (forAllAccounts || isConnected) && (minCollateralUsd === undefined || isHistoryLoading);

  const isEmpty = !isLoading && !tradeActions?.length;
  const {
    currentPage,
    setCurrentPage,
    currentData: currentPageData,
    pageCount,
  } = usePagination([account, forAllAccounts].toString(), tradeActions, ENTITIES_PER_PAGE);

  const hasFilters = Boolean(startDate || endDate || marketsDirectionsFilter.length || actionFilter.length);

  const pnlAnalysisButton = useMemo(() => {
    if (!account || hideDashboardLink) {
      return null;
    }

    const url = buildAccountDashboardUrl(account, chainId, 2);

    return (
      <Link to={url}>
        <HistoryControl icon={<PnlAnalysisIcon />} label={<Trans>PnL Analysis</Trans>} />
      </Link>
    );
  }, [account, chainId, hideDashboardLink]);

  useEffect(() => {
    if (!pageCount || !currentPage) return;
    const totalPossiblePages = (TRADE_HISTORY_PREFETCH_SIZE * tradeActionsPageIndex) / TRADE_HISTORY_PER_PAGE;
    const doesMoreDataExist = pageCount >= totalPossiblePages;
    const isCloseToEnd = pageCount && pageCount < currentPage + 2;

    if (doesMoreDataExist && isCloseToEnd) {
      setTradeActionsPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, tradeActionsPageIndex, setTradeActionsPageIndex]);

  const [, handleCsvDownload] = useDownloadAsCsv({
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations: actionFilter,
    minCollateralUsd: minCollateralUsd,
  });

  const controls = (
    <div className="flex items-center">
      {pnlAnalysisButton}

      <DateRangeSelect
        handle={<HistoryControl icon={<CalendarIcon />} label={<Trans>All time</Trans>} />}
        startDate={startDate}
        endDate={endDate}
        onChange={setDateRange}
      />

      <HistoryControl icon={<DownloadIcon />} label={<Trans>CSV</Trans>} onClick={handleCsvDownload} />
    </div>
  );

  return {
    isLoading,
    isEmpty,
    hasFilters,
    currentPage,
    setCurrentPage,
    currentPageData,
    pageCount,
    actionFilter,
    setActionFilter,
    marketsDirectionsFilter,
    setMarketsDirectionsFilter,
    forAllAccounts,
    showDebugValues,
    minCollateralUsd,
    controls,
  };
}

type Props = {
  forAllAccounts: boolean | undefined;
  actionFilter: ActionFilter[];
  setActionFilter: (actionFilter: ActionFilter[]) => void;
  marketsDirectionsFilter: MarketFilterLongShortItemData[];
  setMarketsDirectionsFilter: (marketsDirectionsFilter: MarketFilterLongShortItemData[]) => void;
  currentPage: number;
  setCurrentPage: (currentPage: number) => void;
  currentPageData: TradeAction[];
  isLoading: boolean;
  isEmpty: boolean;
  hasFilters: boolean;
  showDebugValues: boolean;
  minCollateralUsd: bigint | undefined;
  pageCount: number;
};

export function TradeHistory(p: Props) {
  const {
    forAllAccounts,
    actionFilter,
    setActionFilter,
    marketsDirectionsFilter,
    setMarketsDirectionsFilter,
    currentPage,
    setCurrentPage,
    currentPageData,
    isLoading,
    isEmpty,
    hasFilters,
    showDebugValues,
    minCollateralUsd,
    pageCount,
  } = p;

  return (
    <div className="TradeHistorySynthetics">
      <div className="App-box">
        <TableScrollFadeContainer>
          <table className="TradeHistorySynthetics-table">
            <colgroup>
              <col className="TradeHistorySynthetics-action-column" />
              <col className="TradeHistorySynthetics-market-column" />
              <col className="TradeHistorySynthetics-size-column" />
              <col className="TradeHistorySynthetics-price-column" />
              <col className="TradeHistorySynthetics-pnl-fees-column" />
            </colgroup>
            <thead>
              <TableTheadTr bordered>
                <TableTh>
                  <ActionFilter value={actionFilter} onChange={setActionFilter} />
                </TableTh>
                <TableTh>
                  <MarketFilterLongShort
                    withPositions="all"
                    value={marketsDirectionsFilter}
                    onChange={setMarketsDirectionsFilter}
                  />
                </TableTh>
                <TableTh>
                  <Trans>Size</Trans>
                </TableTh>
                <TableTh>
                  <Trans>Price</Trans>
                </TableTh>
                <TableTh className="TradeHistorySynthetics-pnl-fees-header">
                  <TooltipWithPortal
                    styleType="iconStroke"
                    content={<Trans>Realized PnL after fees and price impact.</Trans>}
                  >
                    <Trans>RPnL</Trans>
                  </TooltipWithPortal>
                </TableTh>
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
                  />
                ))
              )}
            </tbody>
          </table>
          {isEmpty && hasFilters && (
            <EmptyTableContent
              isLoading={false}
              isEmpty={isEmpty}
              emptyText={<Trans>No trades match the selected filters</Trans>}
            />
          )}
          {isEmpty && !hasFilters && !isLoading && (
            <EmptyTableContent isLoading={false} isEmpty={isEmpty} emptyText={<Trans>No trades yet</Trans>} />
          )}
        </TableScrollFadeContainer>

        <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
