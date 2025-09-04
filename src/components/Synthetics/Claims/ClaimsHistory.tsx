import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import formatDate from "date-fns/format";
import { useCallback, useEffect, useState } from "react";

import { getExplorerUrl } from "config/chains";
import { CLAIMS_HISTORY_PER_PAGE } from "config/ui";
import { useAccount } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ClaimAction, ClaimType, useClaimCollateralHistory } from "domain/synthetics/claimHistory";
import { downloadAsCsv } from "lib/csv";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { formatTokenAmount } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";

import Button from "components/Button/Button";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import { ClaimsHistorySkeleton } from "components/Skeleton/Skeleton";
import { DateRangeSelect } from "components/Synthetics/DateRangeSelect/DateRangeSelect";
import { MarketFilter } from "components/Synthetics/TableMarketFilter/MarketFilter";
import { TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import DownloadIcon from "img/ic_download2.svg?react";

import { claimCollateralEventTitles } from "./ClaimHistoryRow/ClaimCollateralHistoryRow";
import { claimFundingFeeEventTitles } from "./ClaimHistoryRow/ClaimFundingFeesHistoryRow";
import { ClaimHistoryRow } from "./ClaimHistoryRow/ClaimHistoryRow";
import { ActionFilter } from "./filters/ActionFilter";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

import "./ClaimsHistory.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

export type ClaimsHistoryProps = {
  isLoading: boolean;
  isEmpty: boolean;
  hasFilters: boolean;
  eventNameFilter: string[];
  setEventNameFilter: (eventNameFilter: string[]) => void;
  marketAddressesFilter: string[];
  setMarketAddressesFilter: (marketAddressesFilter: string[]) => void;
  currentPage: number;
  setCurrentPage: (currentPage: number) => void;
  pageCount: number;
  currentPageData: ClaimAction[];
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
    pageIndex,
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

  const { currentPage, setCurrentPage, getCurrentData, pageCount } = usePagination(
    String(account),
    claimActions || EMPTY_ARRAY,
    CLAIMS_HISTORY_PER_PAGE
  );
  const currentPageData = getCurrentData();

  const isEmpty = !account || claimActions?.length === 0;
  const hasFilters = Boolean(startDate || endDate || eventNameFilter.length || marketAddressesFilter.length);

  useEffect(() => {
    if (!pageCount || !currentPage) return;
    const totalPossiblePages = (CLAIMS_HISTORY_PREFETCH_SIZE * pageIndex) / CLAIMS_HISTORY_PER_PAGE;
    const doesMoreDataExist = pageCount >= totalPossiblePages;
    const isCloseToEnd = pageCount && pageCount < currentPage + 2;

    if (doesMoreDataExist && isCloseToEnd) {
      setPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, pageIndex, setPageIndex]);

  const handleCsvDownload = useDownloadAsCsv(claimActions);

  const controls = (
    <div className="flex">
      <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />
      <Button variant="ghost" onClick={handleCsvDownload} className="flex items-center gap-4">
        <div className="size-16">
          <DownloadIcon />
        </div>
        <span className="text-body-small font-medium">CSV</span>
      </Button>
    </div>
  );

  return (
    <div className="flex grow flex-col bg-slate-900">
      <div className="flex items-center justify-between gap-8 pl-20 pr-8 pt-8">
        {!isMobile ? (
          <span className="text-body-medium font-medium">
            <Trans>Claims history</Trans>
          </span>
        ) : null}

        {controls}
      </div>
      <TableScrollFadeContainer disableScrollFade={isEmpty} className="flex grow flex-col">
        {!isEmpty && (
          <table className="ClaimsHistory-table table-fixed">
            <colgroup>
              <col className="ClaimsHistory-action-column" />
              <col className="ClaimsHistory-market-column" />
              <col className="ClaimsHistory-size-column" />
            </colgroup>
            <thead>
              <TableTheadTr>
                <TableTh className="w-[40%]">
                  <ActionFilter value={eventNameFilter} onChange={setEventNameFilter} />
                </TableTh>
                <TableTh className="w-[40%]">
                  <MarketFilter excludeSpotOnly value={marketAddressesFilter} onChange={setMarketAddressesFilter} />
                </TableTh>
                <TableTh className="ClaimsHistory-price-header w-[20%]">
                  <Trans>Size</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {isLoading ? (
                <ClaimsHistorySkeleton />
              ) : (
                currentPageData.map((claimAction) => <ClaimHistoryRow key={claimAction.id} claimAction={claimAction} />)
              )}
            </tbody>
          </table>
        )}

        {isEmpty && !hasFilters && (
          <EmptyTableContent isLoading={false} isEmpty={isEmpty} emptyText={<Trans>No claims yet</Trans>} />
        )}

        {isEmpty && hasFilters && (
          <EmptyTableContent
            isLoading={false}
            isEmpty={isEmpty}
            emptyText={<Trans>No claims match the selected filters</Trans>}
          />
        )}
      </TableScrollFadeContainer>

      <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
    </div>
  );
}

function useDownloadAsCsv(claimActions?: ClaimAction[]) {
  const chainId = useSelector(selectChainId);
  const { _ } = useLingui();

  const handleCsvDownload = useCallback(() => {
    if (!claimActions) {
      return;
    }

    const fullFormattedData = claimActions.flatMap((claimAction) => {
      if (claimAction.type === "collateral") {
        let action: string = _(claimCollateralEventTitles[claimAction.eventName]);

        return claimAction.claimItems.flatMap((claimItem) => {
          return [
            claimItem.longTokenAmount > 0 && {
              explorerUrl: getExplorerUrl(chainId) + `tx/${claimAction.transaction.hash}`,
              timestamp: formatTradeActionTimestamp(claimAction.timestamp, false),
              action: action,
              market: claimItem.marketInfo.name,
              size: formatTokenAmount(
                claimItem.longTokenAmount,
                claimItem.marketInfo.longToken.decimals,
                claimItem.marketInfo.longToken.symbol,
                { isStable: claimItem.marketInfo.longToken.isStable }
              ),
            },
            claimItem.shortTokenAmount > 0 && {
              explorerUrl: getExplorerUrl(chainId) + `tx/${claimAction.transaction.hash}`,
              timestamp: formatTradeActionTimestamp(claimAction.timestamp, false),
              action: action,
              market: claimItem.marketInfo.name,
              size: formatTokenAmount(
                claimItem.shortTokenAmount,
                claimItem.marketInfo.shortToken.decimals,
                claimItem.marketInfo.shortToken.symbol,
                { isStable: claimItem.marketInfo.shortToken.isStable }
              ),
            },
          ].filter(Boolean);
        });
      }

      let action: string = _(claimFundingFeeEventTitles[claimAction.eventName]);
      return claimAction.markets.map((market, index) => ({
        explorerUrl: getExplorerUrl(chainId) + `tx/${claimAction.transaction.hash}`,
        timestamp: formatTradeActionTimestamp(claimAction.timestamp, false),
        action: action,
        market: (claimAction.isLongOrders[index] ? t`Long` : t`Short`) + " " + market.name,
        size:
          claimAction.eventName === ClaimType.SettleFundingFeeCreated
            ? "-"
            : formatTokenAmount(
                claimAction.amounts[index],
                claimAction.tokens[index].decimals,
                claimAction.tokens[index].symbol,
                { isStable: claimAction.tokens[index].isStable }
              ),
      }));
    });

    const timezone = formatDate(new Date(), "z");

    downloadAsCsv("claims-history", fullFormattedData, [], {
      timestamp: t`Date` + ` (${timezone})`,
      action: t`Action`,
      market: t`Market`,
      size: t`Size`,
      explorerUrl: t`Transaction ID`,
    });
  }, [chainId, claimActions, _]);

  return handleCsvDownload;
}
