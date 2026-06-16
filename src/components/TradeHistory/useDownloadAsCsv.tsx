import { t, Trans } from "@lingui/macro";
import { format as dateFnsFormat } from "date-fns/format";
import { useCallback, useState } from "react";
import { withRetry } from "viem";

import { getExplorerUrl } from "config/chains";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isSwapOrderType } from "domain/synthetics/orders";
import { OrderType } from "domain/synthetics/orders/types";
import {
  filterLifecycleTradeActionsByDisplayFilters,
  getPositionLifecycleSlice,
  PositionLifecycleFilter,
  PositionTradeAction,
  resolveTradeHistoryFetchParams,
  SwapTradeAction,
  TradeActionType,
} from "domain/synthetics/tradeHistory";
import { processRawTradeActions } from "domain/synthetics/tradeHistory/processTradeActions";
import { fetchRawTradeActions } from "domain/synthetics/tradeHistory/useTradeHistory";
import { downloadAsCsv } from "lib/csv";
import { helperToast } from "lib/helperToast";

import { ToastifyDebug } from "components/ToastifyDebug/ToastifyDebug";

import type { MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";
import { formatPositionMessage } from "./TradeHistoryRow/utils/position";
import type { RowDetails } from "./TradeHistoryRow/utils/shared";
import { formatSwapMessage } from "./TradeHistoryRow/utils/swap";

const PAGE_SIZE = 300;

export function useDownloadAsCsv({
  marketsDirectionsFilter,
  forAllAccounts,
  account,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
  minCollateralUsd,
  positionLifecycleFilter,
}: {
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
  forAllAccounts: boolean | undefined;
  account: string | null | undefined;
  fromTxTimestamp: number | undefined;
  toTxTimestamp: number | undefined;
  orderEventCombinations:
    | {
        eventName?: TradeActionType | undefined;
        orderType?: OrderType[] | undefined;
        isDepositOrWithdraw?: boolean | undefined;
        isTwap?: boolean | undefined;
      }[]
    | undefined;

  minCollateralUsd?: bigint;
  positionLifecycleFilter?: PositionLifecycleFilter;
}): [boolean, () => Promise<void>] {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const [isLoading, setIsLoading] = useState(false);

  const handleCsvDownload = useCallback(async () => {
    try {
      setIsLoading(true);

      // Ensure dependent data is available before fetching
      if (!marketsInfoData || !tokensData || minCollateralUsd === undefined) {
        throw new Error("Required market/token data not loaded yet");
      }

      // Fetch in pages to avoid GraphQL response-size limits
      const aggregatedTradeActions: (PositionTradeAction | SwapTradeAction)[] = [];
      let currentPageIndex = 0;
      let hasMorePages = true;
      // totalCount is only returned on the first page; keep it for the later pages.
      let totalCount: number | undefined;

      const fetchParams = resolveTradeHistoryFetchParams({
        positionLifecycleFilter,
        fromTxTimestamp,
        toTxTimestamp,
        marketsDirectionsFilter,
        orderEventCombinations,
      });

      while (hasMorePages) {
        const rawPageResult = await withRetry(
          () =>
            fetchRawTradeActions({
              chainId,
              pageIndex: currentPageIndex,
              pageSize: PAGE_SIZE,
              forAllAccounts,
              account,
              ...fetchParams,
            }),
          {
            retryCount: 3,
            delay: 300,
          }
        );
        const rawPage = rawPageResult?.tradeActions;

        if (rawPageResult?.totalCount !== undefined) {
          totalCount = rawPageResult.totalCount;
        }

        // Use raw page length; processing can drop rows.
        hasMorePages =
          totalCount !== undefined
            ? (currentPageIndex + 1) * PAGE_SIZE < totalCount
            : Boolean(rawPage && rawPage.length === PAGE_SIZE);

        const processedPage = processRawTradeActions({
          chainId,
          rawActions: rawPage,
          marketsInfoData,
          tokensData,
        }) as (PositionTradeAction | SwapTradeAction)[] | undefined;

        if (processedPage && processedPage.length) {
          aggregatedTradeActions.push(...processedPage);
        }

        if (
          positionLifecycleFilter &&
          !getPositionLifecycleSlice(aggregatedTradeActions, positionLifecycleFilter).needsMoreData
        ) {
          hasMorePages = false;
        }

        currentPageIndex += 1;
      }

      let exportedTradeActions: (PositionTradeAction | SwapTradeAction)[] = aggregatedTradeActions;

      if (positionLifecycleFilter) {
        const lifecycleSlice = getPositionLifecycleSlice(aggregatedTradeActions, positionLifecycleFilter);
        exportedTradeActions = (filterLifecycleTradeActionsByDisplayFilters({
          tradeActions: lifecycleSlice.tradeActions,
          fromTxTimestamp,
          toTxTimestamp,
          orderEventCombinations,
        }) ?? []) as (PositionTradeAction | SwapTradeAction)[];

        if (exportedTradeActions.length === 0) {
          throw new Error("Position history could not be loaded for the CSV export");
        }
      }

      const fullFormattedData = exportedTradeActions
        .map((tradeAction) => {
          const explorerUrl = getExplorerUrl(chainId) + `tx/${tradeAction.transactionHash}`;

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

      const timezone = dateFnsFormat(new Date(), "z");

      downloadAsCsv("trade-history", fullFormattedData, ["priceComment", "feesTooltip"], {
        timestamp: t`DATE` + ` (${timezone})`,
        action: t`ACTION`,
        size: t`SIZE`,
        market: t`MARKET`,
        fullMarket: t`FULL MARKET`,
        marketPrice: t`MARK PRICE`,
        acceptablePrice: t`ACCEPTABLE PRICE`,
        executionPrice: t`EXECUTION PRICE`,
        triggerPrice: t`TRIGGER PRICE`,
        priceImpact: t`PRICE IMPACT`,
        explorerUrl: t`TRANSACTION ID`,
        pnl: t`RPNL ($)`,
        fees: t`FEES ($)`,
      });
    } catch (error) {
      helperToast.error(
        <div>
          <Trans>Failed to download trade history CSV</Trans>
          <br />
          <br />
          <ToastifyDebug error={String(error)} />
        </div>
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    account,
    chainId,
    forAllAccounts,
    fromTxTimestamp,
    marketsDirectionsFilter,
    marketsInfoData,
    minCollateralUsd,
    orderEventCombinations,
    positionLifecycleFilter,
    toTxTimestamp,
    tokensData,
  ]);

  return [isLoading, handleCsvDownload];
}
