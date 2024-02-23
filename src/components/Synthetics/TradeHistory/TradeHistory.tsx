import { Trans } from "@lingui/macro";
import * as dateFns from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { useShowDebugValues } from "context/SyntheticsStateContext/hooks/settingsHooks";
import { useMarkets } from "domain/synthetics/markets";
import { OrderType } from "domain/synthetics/orders/types";
import { usePositionsConstantsRequest } from "domain/synthetics/positions/usePositionsConstants";
import { TradeActionType, useTradeHistory } from "domain/synthetics/tradeHistory";
import { useChainId } from "lib/chains";

import Button from "components/Button/Button";
import Pagination from "components/Pagination/Pagination";
import usePagination from "components/Referrals/usePagination";
import { DateRangeSelect } from "./DateRangeSelect/DateRangeSelect";
import { TradeHistoryRow } from "./TradeHistoryRow/TradeHistoryRow";

import { ActionFilter } from "./filters/ActionFilter";
import { MarketFilter } from "./filters/MarketFilter";

import downloadIcon from "img/ic_download_simple.svg";

import "./TradeHistorySynthetics.scss";

const PAGE_SIZE = 100;
const ENTITIES_PER_PAGE = 25;

const CSV_ICON_INFO = {
  src: downloadIcon,
};

const INCLUDING_CURRENT_DAY_DURATION = {
  hours: 23,
  minutes: 59,
  seconds: 59,
};

type Props = {
  shouldShowPaginationButtons: boolean;
  account: string | null | undefined;
  forAllAccounts?: boolean;
};

function toSeconds(date: Date) {
  return date.getTime() / 1000;
}

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
      isDepositOrWithdraw?: boolean;
    }[]
  >([]);

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
    pageSize: PAGE_SIZE,
    fromTxTimestamp: dateRange[0] ? toSeconds(dateRange[0]) : undefined,
    toTxTimestamp: dateRange[1] ? toSeconds(dateFns.add(dateRange[1], INCLUDING_CURRENT_DAY_DURATION)) : undefined,
    marketAddresses: marketAddresses,
    tokenAddresses: tokenAddressesFilter,
    orderEventCombinations: actionFilter,
  });

  const isLoading = !!account && (!minCollateralUsd || isHistoryLoading);

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
    const totalPossiblePages = (PAGE_SIZE * tradeActionsPageIndex) / TRADE_HISTORY_PER_PAGE;
    const doesMoreDataExist = pageCount >= totalPossiblePages;
    const isCloseToEnd = pageCount && pageCount < currentPage + 2;

    if (doesMoreDataExist && isCloseToEnd) {
      setTradeActionsPageIndex((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, tradeActionsPageIndex, setTradeActionsPageIndex]);

  return (
    <div className="TradeHistorySynthetics">
      <div className="App-box">
        <div className="TradeHistorySynthetics-controls">
          <div className="TradeHistorySynthetics-filters">
            <DateRangeSelect startDate={dateRange[0]} endDate={dateRange[1]} onChange={setDateRange} />
          </div>
          <Button variant="secondary" imgInfo={CSV_ICON_INFO}>
            CSV
          </Button>
        </div>
        {isLoading && (
          <div className="TradeHistorySynthetics-padded-cell">
            <Trans>Loading...</Trans>
          </div>
        )}

        {!isLoading && (
          <div className="TradeHistorySynthetics-horizontal-scroll-container">
            <table className="Exchange-list TradeHistorySynthetics-table">
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
                  <th>
                    <Trans>Price</Trans>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPageData?.map((tradeAction) => (
                  <TradeHistoryRow
                    key={tradeAction.id}
                    tradeAction={tradeAction}
                    minCollateralUsd={minCollateralUsd!}
                    showDebugValues={showDebugValues}
                    shouldDisplayAccount={forAllAccounts}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
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
