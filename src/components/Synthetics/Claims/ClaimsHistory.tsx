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

import Button from "components/Button/Button";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import usePagination from "components/Referrals/usePagination";
import { ClaimsHistorySkeleton } from "components/Skeleton/Skeleton";
import { DateRangeSelect } from "components/Synthetics/DateRangeSelect/DateRangeSelect";
import { MarketFilter } from "components/Synthetics/TableMarketFilter/MarketFilter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import downloadIcon from "img/ic_download_simple.svg";

import { claimCollateralEventTitles } from "./ClaimHistoryRow/ClaimCollateralHistoryRow";
import { claimFundingFeeEventTitles } from "./ClaimHistoryRow/ClaimFundingFeesHistoryRow";
import { ClaimHistoryRow } from "./ClaimHistoryRow/ClaimHistoryRow";
import { ActionFilter } from "./filters/ActionFilter";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

import "./ClaimsHistory.scss";

const CLAIMS_HISTORY_PREFETCH_SIZE = 100;

export function ClaimsHistory() {
  const chainId = useSelector(selectChainId);
  const account = useAccount();

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

  return (
    <>
      <div className="App-box">
        <div className="ClaimsHistory-controls">
          <div>
            <Trans>Claims History</Trans>
          </div>
          <div className="ClaimsHistory-controls-right">
            <div className="ClaimsHistory-filters">
              <DateRangeSelect startDate={startDate} endDate={endDate} onChange={setDateRange} />
            </div>
            <Button variant="secondary" imgSrc={downloadIcon} onClick={handleCsvDownload}>
              CSV
            </Button>
          </div>
        </div>

        <TableScrollFadeContainer>
          <table className="ClaimsHistory-table">
            <colgroup>
              <col className="ClaimsHistory-action-column" />
              <col className="ClaimsHistory-market-column" />
              <col className="ClaimsHistory-size-column" />
            </colgroup>
            <thead>
              <TableTheadTr bordered>
                <TableTh>
                  <ActionFilter value={eventNameFilter} onChange={setEventNameFilter} />
                </TableTh>
                <TableTh>
                  <MarketFilter excludeSpotOnly value={marketAddressesFilter} onChange={setMarketAddressesFilter} />
                </TableTh>
                <TableTh className="ClaimsHistory-price-header">
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
              {isEmpty && !hasFilters && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={3} className="text-slate-100">
                    <Trans>No claims yet</Trans>
                  </TableTd>
                </TableTr>
              )}

              {isEmpty && hasFilters && (
                <TableTr hoverable={false} bordered={false}>
                  <TableTd colSpan={3} className="text-slate-100">
                    <Trans>No claims match the selected filters</Trans>
                  </TableTd>
                </TableTr>
              )}
            </tbody>
          </table>
        </TableScrollFadeContainer>

        <BottomTablePagination page={currentPage} pageCount={pageCount} onPageChange={setCurrentPage} />
      </div>
    </>
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
