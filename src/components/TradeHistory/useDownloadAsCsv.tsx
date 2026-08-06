import { t } from "@lingui/macro";
import { useCallback } from "react";

import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  buildCoinLedgerTradeExport,
  buildCoinTrackerTradeExport,
  buildKoinlyTradeExport,
} from "domain/synthetics/historyExport/providerExport";
import { generateTradeCsv } from "domain/synthetics/historyExport/tradeExport";
import {
  HistoryExportFormat,
  HistoryExportProgress,
  getHistoryExportFilename,
} from "domain/synthetics/historyExport/utils";
import { createZipBlob } from "domain/synthetics/historyExport/zip";
import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "domain/synthetics/tradeHistory";
import { downloadFile } from "lib/csv";

import { useHistoryExport } from "components/HistoryExport/useHistoryExport";

import type { MarketFilterLongShortItemData } from "../TableMarketFilter/MarketFilterLongShort";

export function useDownloadAsCsv({
  marketsDirectionsFilter,
  forAllAccounts,
  account,
  startDate,
  endDate,
  fromTxTimestamp,
  toTxTimestamp,
  orderEventCombinations,
  positionLifecycleId,
}: {
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
  forAllAccounts: boolean | undefined;
  account: string | null | undefined;
  startDate?: Date;
  endDate?: Date;
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
  positionLifecycleId?: string;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();

  const generate = useCallback(
    async (format: HistoryExportFormat, signal: AbortSignal, onProgress: (progress: HistoryExportProgress) => void) => {
      if ((!account && !forAllAccounts) || !marketsInfoData || !tokensData) {
        throw new Error("Required market/token data not loaded yet");
      }

      const canonical = await generateTradeCsv({
        chainId,
        account,
        forAllAccounts,
        fromTxTimestamp,
        toTxTimestamp,
        marketsDirectionsFilter,
        orderEventCombinations,
        positionLifecycleId,
        marketsInfoData,
        tokensData,
        signal,
        onProgress,
      });
      const filenameParams = {
        surface: "trade-history" as const,
        account,
        forAllAccounts,
        chainId,
        fromDate: startDate,
        toDate: endDate,
        fromTimestamp: fromTxTimestamp,
        toTimestamp: toTxTimestamp,
        schemaVersion: 1,
      };

      if (format === "gmx-detailed") {
        const filename = getHistoryExportFilename({
          ...filenameParams,
          format,
          extension: "csv",
        });
        downloadFile(filename, canonical.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "koinly") {
        const provider = buildKoinlyTradeExport(canonical.rows);
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "csv" });
        downloadFile(filename, provider.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "cointracker") {
        const provider = buildCoinTrackerTradeExport(canonical.rows);
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "csv" });
        downloadFile(filename, provider.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "coinledger") {
        const provider = buildCoinLedgerTradeExport(canonical.rows);
        const universalFilename = getHistoryExportFilename({
          ...filenameParams,
          format: "coinledger-universal",
          extension: "csv",
        });
        const marginFilename = getHistoryExportFilename({
          ...filenameParams,
          format: "coinledger-margin-gain-manual",
          extension: "csv",
        });
        const zip = createZipBlob([
          { name: universalFilename, contents: provider.universal.csv },
          { name: marginFilename, contents: provider.margin.csv },
        ]);
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "zip" });
        downloadFile(filename, zip, "application/zip");
      }
    },
    [
      account,
      chainId,
      endDate,
      forAllAccounts,
      fromTxTimestamp,
      marketsDirectionsFilter,
      marketsInfoData,
      orderEventCombinations,
      positionLifecycleId,
      startDate,
      toTxTimestamp,
      tokensData,
    ]
  );

  return useHistoryExport({ generate, canonicalFormatName: t`GMX Detailed CSV` });
}
