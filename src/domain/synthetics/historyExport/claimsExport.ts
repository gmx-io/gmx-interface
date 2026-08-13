import { Address, isAddressEqual, withRetry } from "viem";

import { getChainSlug, getExplorerUrl } from "config/chains";
import { ClaimType } from "domain/synthetics/claimHistory/types";
import { RawClaimAction, fetchRawClaimActions } from "domain/synthetics/claimHistory/useClaimHistory";
import { MarketsInfoData, getMarketIndexName } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { CsvRow, serializeCsv } from "lib/csv";
import { getByKey } from "lib/objects";

import { CLAIMS_CSV_HEADERS, ClaimsCsvHeader, HISTORY_EXPORT_SCHEMA_VERSION } from "./csvSchemas";
import {
  HistoryExportProgress,
  createCsvRow,
  fetchAllHistoryExportPages,
  formatContractPriceDecimal,
  formatDecimal,
  formatTimestampUtc,
  formatUsdDecimal,
  getExportUpperTimestamp,
  getLogIndexFromIndexerId,
} from "./utils";

const CLAIMS_EXPORT_PAGE_SIZE = 300;

function getMetadata<T>(data: Record<string, T> | undefined, address: string | undefined): T | undefined {
  if (!address || !data) {
    return undefined;
  }

  const direct = getByKey(data, address);
  if (direct) {
    return direct;
  }

  const matchingKey = Object.keys(data).find((key) => {
    try {
      return isAddressEqual(key as Address, address as Address);
    } catch {
      return key === address;
    }
  });
  return matchingKey ? data[matchingKey] : undefined;
}

function getClaimStatus(eventName: ClaimType): string {
  if (eventName === ClaimType.SettleFundingFeeCreated) {
    return "created";
  }
  if (eventName === ClaimType.SettleFundingFeeCancelled) {
    return "cancelled";
  }
  return "executed";
}

function getClaimLegCount(action: RawClaimAction): number {
  return Math.max(
    action.marketAddresses.length,
    action.tokenAddresses.length,
    action.amounts.length,
    action.tokenPrices.length,
    action.isLongOrders?.length ?? 0,
    1
  );
}

export function buildClaimsCsvRows({
  chainId,
  rawActions,
  marketsInfoData,
  tokensData,
}: {
  chainId: number;
  rawActions: RawClaimAction[];
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}): CsvRow[] {
  return rawActions.flatMap((action) => {
    const actionId = `${chainId}:${action.id}`;
    const legCount = getClaimLegCount(action);

    return Array.from({ length: legCount }, (_, legIndex) => {
      const marketAddress =
        action.marketAddresses[legIndex] ?? (action.marketAddresses.length === 1 ? action.marketAddresses[0] : "");
      const tokenAddress =
        action.tokenAddresses[legIndex] ?? (action.tokenAddresses.length === 1 ? action.tokenAddresses[0] : "");
      const marketInfo = getMetadata(marketsInfoData, marketAddress);
      const token = getMetadata(tokensData, tokenAddress);
      const amountRaw = action.amounts[legIndex];
      const tokenPriceRaw = action.tokenPrices[legIndex];
      const isNonEconomic =
        action.eventName === ClaimType.SettleFundingFeeCreated ||
        action.eventName === ClaimType.SettleFundingFeeCancelled;
      const reviewReasons: string[] = [];
      const economicArrayLengths = [
        action.marketAddresses.length,
        action.tokenAddresses.length,
        action.amounts.length,
        action.tokenPrices.length,
      ].filter((length) => length > 0);

      if (marketAddress && !marketInfo) {
        reviewReasons.push("market metadata unavailable");
      }
      if (tokenAddress && !token && !isNonEconomic) {
        reviewReasons.push("token metadata unavailable");
      }
      if (!isNonEconomic && amountRaw === undefined) {
        reviewReasons.push("claim amount unavailable");
      }
      if (!isNonEconomic && tokenPriceRaw === undefined) {
        reviewReasons.push("claim token price unavailable");
      }
      if (!isNonEconomic && new Set(economicArrayLengths).size > 1) {
        reviewReasons.push("claim leg arrays are not aligned");
      }

      const row = createCsvRow<ClaimsCsvHeader>(CLAIMS_CSV_HEADERS);
      row.timestamp_utc = formatTimestampUtc(action.timestamp);
      row.event_name = action.eventName;
      row.status = getClaimStatus(action.eventName);
      row.market_name = marketInfo ? getMarketIndexName(marketInfo) : "";
      row.is_long = action.isLongOrders?.[legIndex] ?? "";
      row.token_symbol = token?.symbol ?? "";
      row.amount = isNonEconomic ? "" : formatDecimal(amountRaw, token?.decimals);
      row.token_price_usd = isNonEconomic ? "" : formatContractPriceDecimal(tokenPriceRaw, token?.decimals);
      row.amount_usd =
        isNonEconomic || amountRaw === undefined || tokenPriceRaw === undefined
          ? ""
          : formatUsdDecimal(BigInt(amountRaw) * BigInt(tokenPriceRaw));
      row.chain = getChainSlug(chainId);
      row.data_completeness = reviewReasons.length ? "partial" : "complete";
      row.manual_review_reason = reviewReasons.join("; ");
      row.index_token_symbol = marketInfo?.indexToken.symbol ?? "";
      row.token_address = tokenAddress;
      row.index_token_address = marketInfo?.indexTokenAddress ?? "";
      row.market_address = marketAddress;
      row.account = action.account;
      row.transaction_hash = action.transactionHash;
      row.explorer_url = `${getExplorerUrl(chainId)}tx/${action.transactionHash}`;
      row.chain_id = chainId;
      row.log_index = getLogIndexFromIndexerId(action.id);
      row.schema_version = HISTORY_EXPORT_SCHEMA_VERSION;
      row.record_id = `${actionId}:${legIndex}`;
      row.claim_action_id = actionId;
      row.leg_index = legIndex;
      return row;
    });
  });
}

export async function generateClaimsCsv({
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
}: {
  chainId: number;
  account: string;
  fromTxTimestamp?: number;
  toTxTimestamp?: number;
  eventName?: string[];
  marketAddresses?: string[];
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  signal?: AbortSignal;
  onProgress?: (progress: HistoryExportProgress) => void;
}): Promise<{ csv: string; rows: CsvRow[] }> {
  const upperTimestamp = getExportUpperTimestamp(toTxTimestamp);
  const rawActions = await fetchAllHistoryExportPages({
    pageSize: CLAIMS_EXPORT_PAGE_SIZE,
    signal,
    onProgress,
    fetchPage: async (pageIndex, pageSize) => {
      const result = await withRetry(
        () =>
          fetchRawClaimActions({
            chainId,
            account,
            pageIndex,
            pageSize,
            fromTxTimestamp,
            toTxTimestamp: upperTimestamp,
            eventName,
            marketAddresses,
            showDebugValues: true,
            includeTotalCount: pageIndex === 0,
            abortSignal: signal,
          }),
        { retryCount: 3, delay: 300, shouldRetry: () => !signal?.aborted }
      );

      return {
        items: result.claimActions,
        totalCount: result.totalCount,
      };
    },
  });
  const rows = buildClaimsCsvRows({ chainId, rawActions, marketsInfoData, tokensData });

  return {
    rows,
    csv: serializeCsv(CLAIMS_CSV_HEADERS, rows),
  };
}
