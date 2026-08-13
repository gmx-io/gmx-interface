import { formatUnits } from "viem";

import { getChainSlug } from "config/chains";
import { CsvCell, CsvRow } from "lib/csv";
import { USD_DECIMALS } from "lib/numbers";

export type HistoryExportSurface = "trade-history" | "claims-history";
export type HistoryExportFormat = "gmx-detailed" | "gmx-claims" | "koinly" | "cointracker" | "coinledger";
export type HistoryExportFilenameFormat =
  | HistoryExportFormat
  | "coinledger-universal"
  | "coinledger-margin-gain-manual";

export type HistoryExportProgress = {
  loadedRecords: number;
  totalRecords?: number;
};

export type HistoryExportPage<T> = {
  items: T[];
  totalCount?: number;
};

export function createCsvRow<T extends string>(headers: readonly T[]): Record<T, CsvCell> {
  return Object.fromEntries(headers.map((header) => [header, ""])) as Record<T, CsvCell>;
}

export function formatDecimal(
  value: bigint | string | number | null | undefined,
  decimals: number | undefined
): string {
  if (value === undefined || value === null || value === "" || decimals === undefined) {
    return "";
  }

  return formatUnits(BigInt(value), decimals);
}

export function formatUsdDecimal(value: bigint | string | number | null | undefined): string {
  return formatDecimal(value, USD_DECIMALS);
}

export function formatContractPriceDecimal(
  value: bigint | string | number | null | undefined,
  tokenDecimals: number | undefined
): string {
  if (tokenDecimals === undefined) {
    return "";
  }

  return formatDecimal(value, USD_DECIMALS - tokenDecimals);
}

export function formatTimestampUtc(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().replace(".000Z", "Z");
}

export function formatProviderTimestamp(timestampUtc: string, format: "iso" | "us"): string {
  const [date, time] = timestampUtc.replace("Z", "").split("T");

  if (format === "iso") {
    return `${date} ${time}`;
  }

  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year} ${time}`;
}

function formatDateToken(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value * 1000);
  const year = value instanceof Date ? date.getFullYear() : date.getUTCFullYear();
  const month = String((value instanceof Date ? date.getMonth() : date.getUTCMonth()) + 1).padStart(2, "0");
  const day = String(value instanceof Date ? date.getDate() : date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function getDateRangeToken(from?: number | Date, to?: number | Date): string {
  if (from !== undefined && to !== undefined) {
    return `${formatDateToken(from)}-${formatDateToken(to)}`;
  }
  if (from !== undefined) {
    return `from-${formatDateToken(from)}`;
  }
  if (to !== undefined) {
    return `to-${formatDateToken(to)}`;
  }
  return "all-time";
}

export function getHistoryExportFilename({
  surface,
  account,
  forAllAccounts,
  chainId,
  fromDate,
  toDate,
  fromTimestamp,
  toTimestamp,
  format,
  schemaVersion,
  extension,
}: {
  surface: HistoryExportSurface;
  account?: string | null;
  forAllAccounts?: boolean;
  chainId: number;
  fromDate?: Date;
  toDate?: Date;
  fromTimestamp?: number;
  toTimestamp?: number;
  format: HistoryExportFilenameFormat;
  schemaVersion: number;
  extension: "csv" | "zip";
}): string {
  const accountToken = forAllAccounts ? "all-accounts" : account || "unknown-account";
  return [
    "gmx",
    surface,
    accountToken,
    getChainSlug(chainId),
    getDateRangeToken(fromDate ?? fromTimestamp, toDate ?? toTimestamp),
    format,
    `schema-${schemaVersion}`,
  ]
    .join("-")
    .concat(`.${extension}`);
}

export function getExportUpperTimestamp(toTimestamp?: number): number {
  const now = Math.floor(Date.now() / 1000);
  return toTimestamp === undefined ? now : Math.min(now, toTimestamp);
}

export function getLogIndexFromIndexerId(id: string): string {
  const separatorIndex = id.lastIndexOf(":");
  if (separatorIndex === -1) {
    return "";
  }

  const logIndex = id.slice(separatorIndex + 1);
  return /^\d+$/.test(logIndex) ? logIndex : "";
}

export function throwIfExportAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Export cancelled", "AbortError");
  }
}

export async function fetchAllHistoryExportPages<T>({
  pageSize,
  fetchPage,
  signal,
  onProgress,
}: {
  pageSize: number;
  fetchPage: (pageIndex: number, pageSize: number) => Promise<HistoryExportPage<T>>;
  signal?: AbortSignal;
  onProgress?: (progress: HistoryExportProgress) => void;
}): Promise<T[]> {
  const items: T[] = [];
  let pageIndex = 0;
  let totalCount: number | undefined;
  let hasMore = true;

  while (hasMore) {
    throwIfExportAborted(signal);
    const page = await fetchPage(pageIndex, pageSize);
    throwIfExportAborted(signal);

    if (pageIndex === 0) {
      totalCount = page.totalCount;
    }

    items.push(...page.items);
    onProgress?.({ loadedRecords: items.length, totalRecords: totalCount });

    hasMore = totalCount !== undefined ? items.length < totalCount : page.items.length === pageSize;
    if (!hasMore) {
      break;
    }

    if (page.items.length === 0) {
      throw new Error("History export source returned an incomplete page");
    }

    pageIndex += 1;
  }

  return items;
}

export function getCsvString(row: CsvRow, key: string): string {
  const value = row[key];
  return value === undefined || value === null ? "" : String(value);
}

export function absDecimal(value: string): string {
  return value.startsWith("-") || value.startsWith("+") ? value.slice(1) : value;
}
