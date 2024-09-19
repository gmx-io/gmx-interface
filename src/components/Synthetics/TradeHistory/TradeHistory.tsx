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

import Button from "components/Button/Button";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import { TradesHistorySkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { buildAccountDashboardUrl } from "pages/AccountDashboard/AccountDashboard";
import { DateRangeSelect } from "../DateRangeSelect/DateRangeSelect";
import { MarketFilterLongShort, MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { TradeHistoryRow } from "./TradeHistoryRow/TradeHistoryRow";
import { ActionFilter } from "./filters/ActionFilter";

import { useDownloadAsCsv } from "./useDownloadAsCsv";

import downloadIcon from "img/ic_download_simple.svg";
import PnlAnalysisIcon from "img/ic_pnl_analysis_20.svg?react";

import "./TradeHistorySynthetics.scss";

const TRADE_HISTORY_PREFETCH_SIZE = 100;
const ENTITIES_PER_PAGE = TRADE_HISTORY_PER_PAGE;

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
  const [actionFilter, setActionFilter] = useState<
    {
      orderType: OrderType;
      eventName: TradeActionType;
      isDepositOrWithdraw: boolean;
    }[]
  >([]);

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
      <Button variant="secondary" slim to={url}>
        <PnlAnalysisIcon className="mr-8 h-16 text-white" />
        <Trans>PnL Analysis</Trans>
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

  const [isCsvDownloading, handleCsvDownload] = useDownloadAsCsv({
    account,
    forAllAccounts,
    fromTxTimestamp,
    toTxTimestamp,
    marketsDirectionsFilter,
    orderEventCombinations: actionFilter,
    minCollateralUsd: minCollateralUsd,
  });

  return (
    <div className="TradeHistorySynthetics">
      <div className="App-box">
        <div className="flex flex-wrap items-center justify-between gap-y-8 px-16 py-8">
          <div>
            <Trans>Trade History</Trans>
          </div>
          <div className="TradeHistorySynthetics-controls-right">
            {pnlAnalysisButton}
            <div className="TradeHistorySynthetics-filters">
              <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />
            </div>
            <Button
              variant="secondary"
              slim
              disabled={isCsvDownloading}
              imgSrc={downloadIcon}
              onClick={handleCsvDownload}
            >
              CSV
            </Button>
          </div>
        </div>

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
                  <TooltipWithPortal content={<Trans>Realized PnL after fees and price impact.</Trans>}>
                    <Trans>RPnL ($)</Trans>
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
              {isEmpty && hasFilters && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd className="text-gray-300">
                    <Trans>No trades match the selected filters</Trans>
                  </TableTd>
                </TableTr>
              )}
              {isEmpty && !hasFilters && !isLoading && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd className="text-gray-300" colSpan={5}>
                    <Trans>No trades yet</Trans>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </table>
        </TableScrollFadeContainer>

        <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}
