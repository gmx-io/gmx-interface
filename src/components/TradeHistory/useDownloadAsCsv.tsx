import { t, Trans } from "@lingui/macro";
import { format as dateFnsFormat } from "date-fns/format";
import { useCallback, useState } from "react";
import { withRetry } from "viem";

import { getExplorerUrl } from "config/chains";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isSwapOrderType } from "domain/synthetics/orders";
import type { OrderType } from "domain/synthetics/orders/types";
import type { PositionTradeAction, SwapTradeAction, TradeActionType } from "domain/synthetics/tradeHistory";
import { processRawTradeActions } from "domain/synthetics/tradeHistory/processTradeActions";
import { fetchRawTradeActions } from "domain/synthetics/tradeHistory/useTradeHistory";
import { downloadAsCsv } from "lib/csv";
import { definedOrThrow } from "lib/guards";
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

      while (hasMorePages) {
        const rawPage = await withRetry(
          () =>
            fetchRawTradeActions({
              chainId,
              pageIndex: currentPageIndex,
              pageSize: PAGE_SIZE,
              marketsDirectionsFilter,
              forAllAccounts,
              account,
              fromTxTimestamp,
              toTxTimestamp,
              orderEventCombinations,
            }),
          {
            retryCount: 3,
            delay: 300,
          }
        );

        const processedPage = processRawTradeActions({
          chainId,
          rawActions: rawPage,
          marketsInfoData,
          tokensData,
          marketsDirectionsFilter,
        }) as (PositionTradeAction | SwapTradeAction)[] | undefined;

        if (!processedPage || processedPage.length === 0 || processedPage.length < PAGE_SIZE) {
          hasMorePages = false;
        }

        if (processedPage && processedPage.length) {
          aggregatedTradeActions.push(...processedPage);
        }
        currentPageIndex += 1;
      }

      definedOrThrow(aggregatedTradeActions);

      const fullFormattedData = aggregatedTradeActions
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

      const timezone = dateFnsFormat(new Date(), "z");

      downloadAsCsv("trade-history", fullFormattedData, ["priceComment"], {
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
        pnl: t`PnL ($)`,
      });
    } catch (error) {
      helperToast.error(
        <div>
          <Trans>Failed to download trade history CSV.</Trans>
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
    toTxTimestamp,
    tokensData,
  ]);

  return [isLoading, handleCsvDownload];
}
