import { Trans, t } from "@lingui/macro";
import * as dateFns from "date-fns";
import type { BigNumber } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";

import { downloadAsCsv } from "components/DownloadAsCsv/DownloadAsCsv";
import { getExplorerUrl } from "config/chains";
import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { useMarketsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { useMarkets } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders/types";
import { isSwapOrderType } from "domain/synthetics/orders/utils";
import { usePositionsConstantsRequest } from "domain/synthetics/positions/usePositionsConstants";
import {
  PositionTradeAction,
  SwapTradeAction,
  TradeAction,
  TradeActionType,
  useTradeHistory,
} from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";
import { useNormalizeDateRange } from "lib/dates";
import { formatPositionMessage } from "./TradeHistoryRow/utils/position";
import type { RowDetails } from "./TradeHistoryRow/utils/shared";
import { formatSwapMessage } from "./TradeHistoryRow/utils/swap";

import Button from "components/Button/Button";
import Pagination from "components/Pagination/Pagination";
import usePagination from "components/Referrals/usePagination";
import { TradesHistorySkeleton } from "components/Skeleton/Skeleton";

import { DateRangeSelect } from "../DateRangeSelect/DateRangeSelect";
import { MarketFilter } from "../TableMarketFilter/MarketFilter";
import { TradeHistoryRow } from "./TradeHistoryRow/TradeHistoryRow";
import { ActionFilter } from "./filters/ActionFilter";

import downloadIcon from "img/ic_download_simple.svg";

import "./TradeHistorySynthetics.scss";

const TRADE_HISTORY_PREFETCH_SIZE = 100;
const ENTITIES_PER_PAGE = TRADE_HISTORY_PER_PAGE;

const CSV_ICON_INFO = {
  src: downloadIcon,
};

type Props = {
  shouldShowPaginationButtons: boolean;
  account: string | null | undefined;
  forAllAccounts?: boolean;
};

function useMarketAddressesFromTokenAddresses(tokenAddresses: string[]): string[] {
  const { chainId } = useChainId();
  const markets = useMarkets(chainId);

  const marketAddresses = useMemo(() => {
    const { marketsAddresses, marketsData } = markets;
    if (!marketsAddresses || !marketsData) {
      return [];
    }

    return marketsAddresses.filter((marketAddress) => {
      const marketData = marketsData[marketAddress];

      const marketTokenAddresses = [
        marketData.longTokenAddress,
        marketData.shortTokenAddress,
        marketData.indexTokenAddress,
      ];

      return tokenAddresses.some((tokenAddress) => marketTokenAddresses.includes(tokenAddress));
    });
  }, [tokenAddresses, markets]);

  return marketAddresses;
}

function useDownloadAsCsv(tradeActions: TradeAction[] | undefined, minCollateralUsd?: BigNumber) {
  const { chainId } = useChainId();
  const marketsInfoData = useMarketsInfoData();
  const handleCsvDownload = useCallback(() => {
    if (!tradeActions || !minCollateralUsd) {
      return;
    }

    const fullFormattedData = tradeActions
      .map((tradeAction) => {
        const explorerUrl = getExplorerUrl(chainId) + `tx/${tradeAction.transaction.hash}`;

        let rowDetails: RowDetails | null;

        if (isSwapOrderType(tradeAction.orderType!)) {
          rowDetails = formatSwapMessage(tradeAction as SwapTradeAction, marketsInfoData, false);
        } else {
          rowDetails = formatPositionMessage(tradeAction as PositionTradeAction, minCollateralUsd, false);
        }

        return {
          ...rowDetails,
          explorerUrl,
        };
      })
      .filter(Boolean);

    const timezone = dateFns.format(new Date(), "z");

    downloadAsCsv("trade-history", fullFormattedData, ["priceComment"], ",", {
      timestamp: t`Date` + ` (${timezone})`,
      action: t`Action`,
      size: t`Size`,
      market: t`Market`,
      fullMarket: t`Full market`,
      marketPrice: t`Mark Price`,
      acceptablePrice: t`Acceptable Price`,
      executionPrice: t`Execution Price`,
      triggerPrice: t`Trigger Price`,
      priceImpact: t`Price Impact`,
      explorerUrl: t`Transaction ID`,
    });
  }, [chainId, marketsInfoData, minCollateralUsd, tradeActions]);

  return handleCsvDownload;
}

export function TradeHistory(p: Props) {
  const { shouldShowPaginationButtons, forAllAccounts, account } = p;
  const { chainId } = useChainId();
  const showDebugValues = useShowDebugValues();
  const [dateRange, setDateRange] = useState<[Date | undefined, Date | undefined]>([undefined, undefined]);
  const [tokenAddressesFilter, setTokenAddressesFilter] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState<
    {
      orderType: OrderType;
      eventName: TradeActionType;
      isDepositOrWithdraw: boolean;
    }[]
  >([]);

  const [fromTxTimestamp, toTxTimestamp] = useNormalizeDateRange(dateRange);

  const marketAddresses = useMarketAddressesFromTokenAddresses(tokenAddressesFilter);

  const { minCollateralUsd } = usePositionsConstantsRequest(chainId);
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
    marketAddresses: marketAddresses,
    tokenAddresses: tokenAddressesFilter,
    orderEventCombinations: actionFilter,
  });

  const isConnected = Boolean(account);
  const isLoading = (forAllAccounts || isConnected) && (!minCollateralUsd || isHistoryLoading);

  const isEmpty = !isLoading && !tradeActions?.length;
  const { currentPage, setCurrentPage, getCurrentData, pageCount } = usePagination(
    [account, forAllAccounts].toString(),
    tradeActions,
    ENTITIES_PER_PAGE
  );
  const currentPageData = getCurrentData();
  const hasFilters = Boolean(dateRange[0] || dateRange[1] || tokenAddressesFilter.length || actionFilter.length);

  useEffect(() => {
    if (!pageCount || !currentPage) return;
    const totalPossiblePages = (TRADE_HISTORY_PREFETCH_SIZE * tradeActionsPageIndex) / TRADE_HISTORY_PER_PAGE;
    const doesMoreDataExist = pageCount >= totalPossiblePages;
    const isCloseToEnd = pageCount && pageCount < currentPage + 2;

    if (doesMoreDataExist && isCloseToEnd) {
      setTradeActionsPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, tradeActionsPageIndex, setTradeActionsPageIndex]);

  const handleCsvDownload = useDownloadAsCsv(tradeActions, minCollateralUsd);

  return (
    <div className="TradeHistorySynthetics">
      <div className="App-box">
        <div className="TradeHistorySynthetics-controls">
          <div>
            <Trans>Trade History</Trans>
          </div>
          <div className="TradeHistorySynthetics-controls-right">
            <div className="TradeHistorySynthetics-filters">
              <DateRangeSelect startDate={dateRange[0]} endDate={dateRange[1]} onChange={setDateRange} />
            </div>
            <Button variant="secondary" imgInfo={CSV_ICON_INFO} onClick={handleCsvDownload}>
              CSV
            </Button>
          </div>
        </div>
        <div className="TradeHistorySynthetics-horizontal-scroll-container">
          <table className="Exchange-list TradeHistorySynthetics-table">
            <colgroup>
              <col className="TradeHistorySynthetics-action-column" />
              <col className="TradeHistorySynthetics-market-column" />
              <col className="TradeHistorySynthetics-size-column" />
              <col className="TradeHistorySynthetics-price-column" />
            </colgroup>
            <thead className="TradeHistorySynthetics-header">
              <tr>
                <th>
                  <ActionFilter value={actionFilter} onChange={setActionFilter} />
                </th>
                <th>
                  <MarketFilter value={tokenAddressesFilter} onChange={setTokenAddressesFilter} />
                </th>
                <th>
                  <Trans>Size</Trans>
                </th>
                <th className="TradeHistorySynthetics-price-header">
                  <Trans>Price</Trans>
                </th>
              </tr>
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
        </div>
        {isEmpty && hasFilters && (
          <div className="TradeHistorySynthetics-padded-cell">
            <Trans>No trades match the selected filters</Trans>
          </div>
        )}
        {isEmpty && !hasFilters && !isLoading && (
          <div className="TradeHistorySynthetics-padded-cell">
            <Trans>No trades yet</Trans>
          </div>
        )}
      </div>

      {shouldShowPaginationButtons && (
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={(page) => setCurrentPage(page)} />
      )}
    </div>
  );
}
