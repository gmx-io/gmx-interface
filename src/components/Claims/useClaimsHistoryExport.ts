import { useCallback } from "react";

import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { generateClaimsCsv } from "domain/synthetics/historyExport/claimsExport";
import { HISTORY_EXPORT_SCHEMA_VERSION } from "domain/synthetics/historyExport/csvSchemas";
import {
  buildCoinLedgerClaimsExport,
  buildCoinTrackerClaimsExport,
  buildKoinlyClaimsExport,
} from "domain/synthetics/historyExport/providerExport";
import {
  HistoryExportFormat,
  HistoryExportProgress,
  getHistoryExportFilename,
  throwIfExportAborted,
} from "domain/synthetics/historyExport/utils";
import { downloadFile } from "lib/csv";
import { sleep } from "lib/sleep";

import { useHistoryExport } from "components/HistoryExport/useHistoryExport";

export function useClaimsHistoryExport({
  account,
  startDate,
  endDate,
  fromTxTimestamp,
  toTxTimestamp,
  eventName,
  marketAddresses,
}: {
  account: string | null | undefined;
  startDate?: Date;
  endDate?: Date;
  fromTxTimestamp?: number;
  toTxTimestamp?: number;
  eventName?: string[];
  marketAddresses?: string[];
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();

  const generate = useCallback(
    async (format: HistoryExportFormat, signal: AbortSignal, onProgress: (progress: HistoryExportProgress) => void) => {
      if (!account || !marketsInfoData || !tokensData) {
        throw new Error("Required claims export data is not loaded yet");
      }

      const canonical = await generateClaimsCsv({
        chainId,
        account,
        fromTxTimestamp,
        toTxTimestamp,
        eventName,
        marketAddresses,
        marketsInfoData,
        tokensData,
        signal,
        onProgress,
      });
      // Yield so a pending cancel click is handled before the synchronous provider projection
      await sleep(0);
      throwIfExportAborted(signal);
      const filenameParams = {
        surface: "claims-history" as const,
        account,
        chainId,
        fromDate: startDate,
        toDate: endDate,
        fromTimestamp: fromTxTimestamp,
        toTimestamp: toTxTimestamp,
        schemaVersion: HISTORY_EXPORT_SCHEMA_VERSION,
      };

      if (format === "gmx-claims") {
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "csv" });
        downloadFile(filename, canonical.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "koinly") {
        const provider = buildKoinlyClaimsExport(canonical.rows);
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "csv" });
        downloadFile(filename, provider.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "cointracker") {
        const provider = buildCoinTrackerClaimsExport(canonical.rows);
        const filename = getHistoryExportFilename({ ...filenameParams, format, extension: "csv" });
        downloadFile(filename, provider.csv, "text/csv;charset=utf-8");
        return;
      }

      if (format === "coinledger") {
        const provider = buildCoinLedgerClaimsExport(canonical.rows);
        const filename = getHistoryExportFilename({
          ...filenameParams,
          format: "coinledger-margin-gain-manual",
          extension: "csv",
        });
        downloadFile(filename, provider.csv, "text/csv;charset=utf-8");
      }
    },
    [
      account,
      chainId,
      endDate,
      eventName,
      fromTxTimestamp,
      marketAddresses,
      marketsInfoData,
      startDate,
      toTxTimestamp,
      tokensData,
    ]
  );

  return useHistoryExport({ generate });
}
