import { Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { OrderType } from "domain/synthetics/orders/types";
import { usePositionsConstantsRequest } from "domain/synthetics/positions/usePositionsConstants";
import { TradeActionType, useTradeHistory } from "domain/synthetics/tradeHistory";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { useBreakpoints } from "lib/useBreakpoints";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import { TradesHistorySkeleton } from "components/Skeleton/Skeleton";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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

  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(startDate, endDate);

  const { positionsConstants } = usePositionsConstantsRequest(chainId);
  const { minCollateralUsd } = positionsConstants || {};

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
      <Button variant="ghost" to={url}>
        <PieChartIcon className="size-16" />

        <Trans>PnL analysis</Trans>
      </Button>
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

  const [isLoadingCsv, handleCsvDownload] = useDownloadAsCsv({
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations: actionFilter,
    minCollateralUsd: minCollateralUsd,
  });

  const { isMobile } = useBreakpoints();

  let actions = (
    <>
      {pnlAnalysisButton}

      <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />

      <Button variant="ghost" onClick={handleCsvDownload} className="flex items-center gap-4">
        {isLoadingCsv ? <SpinnerIcon className="mr-4 animate-spin" /> : <DownloadIcon className="size-16" />}
        CSV
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
            <col className="TradeHistorySynthetics-pnl-fees-column" />
          </colgroup>
          <thead>
            <TableTheadTr>
              <TableTh className="w-[18%]">
                <ActionFilter value={actionFilter} onChange={setActionFilter} />
              </TableTh>
              <TableTh className="w-[18%]">
                <MarketFilterLongShort
                  withPositions="all"
                  value={marketsDirectionsFilter}
                  onChange={setMarketsDirectionsFilter}
                />
              </TableTh>
              <TableTh className="w-[26%]">
                <Trans>SIZE</Trans>
              </TableTh>
              <TableTh className="w-[22%]">
                <Trans>PRICE</Trans>
              </TableTh>
              <TableTh className="w-[12%]">
                <TooltipWithPortal
                  variant="iconStroke"
                  content={<Trans>Realized PnL after fees and net price impact</Trans>}
                >
                  <Trans>RPNL</Trans>
                </TooltipWithPortal>
              </TableTh>
              <TableTh className="w-[100px]" />
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
  );
}
