import { Address, getAddress, isAddressEqual, withRetry } from "viem";

import { getExplorerUrl, getChainSlug } from "config/chains";
import { MarketsInfoData, getMarketIndexName } from "domain/synthetics/markets";
import {
  isDecreaseOrderType,
  isIncreaseOrderType,
  isLimitOrderType,
  isLiquidationOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders/types";
import { TokensData } from "domain/synthetics/tokens";
import { getSwapPathOutputAddresses } from "domain/synthetics/trade/utils";
import {
  TwapPartTradeAction,
  fetchRawTradeActions,
  fetchTwapGroupExecutedActions,
} from "domain/synthetics/tradeHistory/useTradeHistory";
import { isFullPositionCloseSizeDeltaUsd } from "domain/tpsl/utils";
import { CsvRow, serializeCsv } from "lib/csv";
import { getByKey } from "lib/objects";
import { TradeAction as SubsquidTradeAction } from "sdk/codegen/subsquid";
import { getWrappedToken } from "sdk/configs/tokens";
import { applyFactor } from "sdk/utils/numbers";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

import { HISTORY_EXPORT_SCHEMA_VERSION, TRADE_CSV_HEADERS, TradeCsvHeader } from "./csvSchemas";
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
  throwIfExportAborted,
} from "./utils";

const TRADE_EXPORT_PAGE_SIZE = 300;

const ACTION_ECONOMIC_HEADERS: TradeCsvHeader[] = [
  "base_pnl_usd",
  "net_action_result_usd",
  "position_price_impact_usd",
  "swap_price_impact_usd",
  "pending_price_impact_usd",
  "claimable_price_impact_diff_usd",
  "position_fee_amount",
  "position_fee_usd",
  "borrowing_fee_amount",
  "borrowing_fee_usd",
  "funding_fee_amount",
  "funding_fee_usd",
  "liquidation_fee_amount",
  "liquidation_fee_usd",
  "swap_fee_amount",
  "swap_fee_usd",
  "ui_fee_amount",
  "ui_fee_usd",
  "trader_discount_amount",
  "trader_discount_usd",
  "referral_discount_usd",
  "pro_discount_usd",
  "execution_fee_paid_native",
  "execution_fee_refund_native",
  "execution_fee_currency",
  "wallet_gas_fee_native",
];

function getMetadata<T>(data: Record<string, T> | undefined, address: string | null | undefined): T | undefined {
  if (!address || !data) {
    return undefined;
  }

  const direct = getByKey(data, address);
  if (direct) {
    return direct;
  }

  const matchingKey = Object.keys(data).find((key) => areAddressesEqual(key, address));
  return matchingKey ? data[matchingKey] : undefined;
}

function areAddressesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  try {
    return isAddressEqual(left as Address, right as Address);
  } catch {
    return left === right;
  }
}

function getOrderTypeName(orderType: number): string {
  return OrderType[orderType] ?? String(orderType);
}

function normalizeLookupAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

function getTradeStatus(eventName: string): string {
  switch (eventName) {
    case TradeActionType.OrderCreated:
      return "created";
    case TradeActionType.OrderExecuted:
      return "executed";
    case TradeActionType.OrderUpdated:
      return "updated";
    case TradeActionType.OrderCancelled:
      return "cancelled";
    case TradeActionType.OrderFrozen:
      return "frozen";
    default:
      return eventName;
  }
}

function getTargetTokenAddress({
  action,
  chainId,
  marketsInfoData,
}: {
  action: SubsquidTradeAction;
  chainId: number;
  marketsInfoData: MarketsInfoData | undefined;
}): string | undefined {
  if (!marketsInfoData || !action.initialCollateralTokenAddress) {
    return undefined;
  }

  return getSwapPathOutputAddresses({
    marketsInfoData,
    initialCollateralAddress: normalizeLookupAddress(action.initialCollateralTokenAddress),
    isIncrease: isIncreaseOrderType(action.orderType),
    shouldUnwrapNativeToken: Boolean(action.shouldUnwrapNativeToken),
    swapPath: (action.swapPath ?? []).map(normalizeLookupAddress),
    wrappedNativeTokenAddress: getWrappedToken(chainId).address,
  }).outTokenAddress;
}

function formatTokenUsd(amount: string | null | undefined, price: string | null | undefined): string {
  if (amount === undefined || amount === null || price === undefined || price === null) {
    return "";
  }

  return formatUsdDecimal(BigInt(amount) * BigInt(price));
}

function getTwapPartByActionId(actions: TwapPartTradeAction[]): Map<string, number> {
  const groups = new Map<string, TwapPartTradeAction[]>();

  for (const action of actions) {
    if (!action.twapGroupId || action.eventName !== TradeActionType.OrderExecuted) {
      continue;
    }
    const items = groups.get(action.twapGroupId) ?? [];
    items.push(action);
    groups.set(action.twapGroupId, items);
  }

  const result = new Map<string, number>();
  for (const groupActions of groups.values()) {
    groupActions
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
      .forEach((action, index) => result.set(action.id, index + 1));
  }
  return result;
}

function createCashflowRow({
  actionRow,
  actionId,
  legIndex,
  sentAmount,
  sentCurrency,
  sentTokenAddress,
  receivedAmount,
  receivedCurrency,
  receivedTokenAddress,
  usdValuation,
  valuationSource,
}: {
  actionRow: CsvRow;
  actionId: string;
  legIndex: number;
  sentAmount?: string;
  sentCurrency?: string;
  sentTokenAddress?: string;
  receivedAmount?: string;
  receivedCurrency?: string;
  receivedTokenAddress?: string;
  usdValuation?: string;
  valuationSource?: string;
}): CsvRow {
  const row: CsvRow = { ...actionRow };
  for (const header of ACTION_ECONOMIC_HEADERS) {
    row[header] = "";
  }
  row.sent_amount = sentAmount ?? "";
  row.sent_currency = sentCurrency ?? "";
  row.sent_token_address = sentTokenAddress ?? "";
  row.received_amount = receivedAmount ?? "";
  row.received_currency = receivedCurrency ?? "";
  row.received_token_address = receivedTokenAddress ?? "";
  row.usd_valuation = usdValuation ?? "";
  row.valuation_source = valuationSource ?? "";
  row.row_type = "cashflow";
  row.leg_index = legIndex;
  row.record_id = `${actionId}:cashflow:${legIndex}`;
  return row;
}

export function filterRawTradeActionsForExport({
  chainId,
  rawActions,
  marketsInfoData,
  marketsDirectionsFilter,
}: {
  chainId: number;
  rawActions: SubsquidTradeAction[];
  marketsInfoData: MarketsInfoData | undefined;
  marketsDirectionsFilter: MarketFilterLongShortItemData[] | undefined;
}): SubsquidTradeAction[] {
  const collateralFilters = (marketsDirectionsFilter ?? []).filter(
    (filter) => filter.direction !== "any" && filter.direction !== "swap" && filter.collateralAddress
  );
  if (!collateralFilters.length) {
    return rawActions;
  }

  // Mirrors the collateral filtering the table applies in processRawTradeActions: when any
  // collateral filter is active, limit and trigger-decrease actions must match one of the
  // filters scoped to their market and direction, even if that market has none. The table
  // cannot render at all without marketsInfoData; the export keeps limit actions instead,
  // since rows must not disappear because metadata is unresolved.
  return rawActions.filter((action) => {
    if (isSwapOrderType(action.orderType)) {
      return true;
    }

    const matchingFilters = collateralFilters.filter(
      (filter) =>
        filter.direction === (action.isLong ? "long" : "short") &&
        areAddressesEqual(filter.marketAddress, action.marketAddress)
    );

    if (isLimitOrderType(action.orderType)) {
      if (!marketsInfoData) {
        return true;
      }
      const targetAddress = getTargetTokenAddress({ action, chainId, marketsInfoData });
      return (
        targetAddress !== undefined &&
        matchingFilters.some((filter) => areAddressesEqual(targetAddress, filter.collateralAddress))
      );
    }

    if (isTriggerDecreaseOrderType(action.orderType)) {
      return matchingFilters.some((filter) =>
        areAddressesEqual(action.initialCollateralTokenAddress, filter.collateralAddress)
      );
    }

    return true;
  });
}

export function buildTradeCsvRows({
  chainId,
  rawActions,
  twapGroupActions,
  marketsInfoData,
  tokensData,
}: {
  chainId: number;
  rawActions: SubsquidTradeAction[];
  // Complete executed actions of every involved TWAP group; part numbers derived from a
  // filtered subset would change with the export window and break the stable dedup contract.
  twapGroupActions?: TwapPartTradeAction[];
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}): CsvRow[] {
  const twapParts = getTwapPartByActionId(twapGroupActions ?? rawActions);

  return rawActions.flatMap((action) => {
    const actionId = `${chainId}:${action.id}`;
    const isSwap = isSwapOrderType(action.orderType);
    const isExecuted = action.eventName === TradeActionType.OrderExecuted;
    const isIncrease = isIncreaseOrderType(action.orderType);
    const isDecrease = isDecreaseOrderType(action.orderType) || isLiquidationOrderType(action.orderType);
    const marketInfo = getMetadata(marketsInfoData, action.marketAddress);
    const collateralToken = getMetadata(tokensData, action.initialCollateralTokenAddress);
    const targetTokenAddress = getTargetTokenAddress({ action, chainId, marketsInfoData });
    const targetToken = getMetadata(tokensData, targetTokenAddress);
    const indexToken = marketInfo?.indexToken;
    const reviewReasons: string[] = [];

    if (!isSwap && action.marketAddress && !marketInfo) {
      reviewReasons.push("market metadata unavailable");
    }
    if (action.initialCollateralTokenAddress && !collateralToken) {
      reviewReasons.push("collateral token metadata unavailable");
    }
    if ((action.swapPath?.length ?? 0) > 0 && !targetTokenAddress) {
      reviewReasons.push("swap output metadata unavailable");
    }
    if (targetTokenAddress && !targetToken) {
      reviewReasons.push("output token metadata unavailable");
    }
    if (isSwap && isExecuted && (action.swapFeeUsd === null || action.swapFeeUsd === undefined)) {
      reviewReasons.push("swap fee unavailable");
    }
    if (isSwap && isExecuted && (action.swapImpactUsd === null || action.swapImpactUsd === undefined)) {
      reviewReasons.push("swap price impact unavailable");
    }

    const uiFeeFactor =
      action.uiFeeFactor === null || action.uiFeeFactor === undefined ? undefined : BigInt(action.uiFeeFactor);
    if (isExecuted && uiFeeFactor !== undefined && uiFeeFactor > 0n && (isSwap || (action.swapPath?.length ?? 0) > 0)) {
      // Swap legs charge ui fees per hop on amounts the indexer doesn't expose
      reviewReasons.push("swap ui fee unavailable");
    }

    const collateralPrice = action.collateralTokenPriceMin ?? action.collateralTokenPriceMax;
    const positionImpact = isExecuted
      ? action.srcChainId !== null && action.srcChainId !== undefined && isDecrease
        ? action.totalImpactUsd ?? action.priceImpactUsd
        : action.srcChainId === null || action.srcChainId === undefined
          ? action.priceImpactUsd
          : undefined
      : undefined;
    const pendingImpact =
      isExecuted && isIncrease && action.srcChainId !== null && action.srcChainId !== undefined
        ? action.priceImpactUsd
        : undefined;
    const signedSizeMultiplier = isDecrease ? -1n : 1n;
    const sizeDeltaUsd =
      action.sizeDeltaUsd === null || action.sizeDeltaUsd === undefined ? undefined : BigInt(action.sizeDeltaUsd);
    // TP/SL "close entire position" orders store MaxUint256 as a sentinel, not an economic size;
    // the table shows them as "Full position close" and the executed event carries the real size
    const isFullPositionClose = sizeDeltaUsd !== undefined && isFullPositionCloseSizeDeltaUsd(sizeDeltaUsd);
    // The indexer doesn't store ui fees; derive them the way the contract charges them:
    // usd = applyFactor(sizeDeltaUsd, uiFeeFactor), amount = usd / collateralTokenPrice.min
    const uiFeeUsd =
      isExecuted && !isSwap && uiFeeFactor !== undefined && sizeDeltaUsd !== undefined
        ? applyFactor(sizeDeltaUsd, uiFeeFactor)
        : undefined;
    const row = createCsvRow<TradeCsvHeader>(TRADE_CSV_HEADERS);

    row.timestamp_utc = formatTimestampUtc(action.timestamp);
    row.order_type = getOrderTypeName(action.orderType);
    row.event_name = action.eventName;
    row.status = getTradeStatus(action.eventName);
    row.market_name = isSwap
      ? [collateralToken?.symbol, targetToken?.symbol].filter(Boolean).join("/")
      : marketInfo
        ? getMarketIndexName(marketInfo)
        : "";
    row.is_long = isSwap ? "" : action.isLong ?? "";
    row.chain = getChainSlug(chainId);
    row.reason = action.reason ?? "";
    row.data_completeness = reviewReasons.length ? "partial" : "complete";
    row.manual_review_reason = reviewReasons.join("; ");
    row.size_delta_usd =
      sizeDeltaUsd === undefined || isFullPositionClose ? "" : formatUsdDecimal(sizeDeltaUsd * signedSizeMultiplier);
    row.size_delta_tokens =
      action.sizeDeltaInTokens === null || action.sizeDeltaInTokens === undefined
        ? ""
        : formatDecimal(BigInt(action.sizeDeltaInTokens) * signedSizeMultiplier, indexToken?.decimals);
    row.position_size_usd = formatUsdDecimal(action.positionSizeInUsd);
    row.position_size_tokens = formatDecimal(action.positionSizeInTokens, indexToken?.decimals);
    row.collateral_delta_amount = formatDecimal(action.initialCollateralDeltaAmount, collateralToken?.decimals);
    row.collateral_delta_usd = formatTokenUsd(action.initialCollateralDeltaAmount, collateralPrice);
    row.trigger_price = formatContractPriceDecimal(action.triggerPrice, indexToken?.decimals);
    row.acceptable_price = formatContractPriceDecimal(action.acceptablePrice, indexToken?.decimals);
    row.execution_price = formatContractPriceDecimal(action.executionPrice, indexToken?.decimals);
    row.contract_trigger_price = formatContractPriceDecimal(action.contractTriggerPrice, indexToken?.decimals);
    row.input_amount = isSwap ? formatDecimal(action.initialCollateralDeltaAmount, collateralToken?.decimals) : "";
    row.input_token_symbol = isSwap ? collateralToken?.symbol ?? "" : "";
    row.output_amount = formatDecimal(action.executionAmountOut, targetToken?.decimals);
    row.output_token_symbol =
      action.executionAmountOut !== null && action.executionAmountOut !== undefined ? targetToken?.symbol ?? "" : "";
    row.min_output_amount = formatDecimal(action.minOutputAmount, targetToken?.decimals ?? collateralToken?.decimals);
    row.execution_amount_out = formatDecimal(action.executionAmountOut, targetToken?.decimals);
    row.swap_path = action.swapPath?.join(">") ?? "";
    row.base_pnl_usd = isExecuted ? formatUsdDecimal(action.basePnlUsd) : "";
    row.net_action_result_usd = isExecuted ? formatUsdDecimal(action.pnlUsd) : "";
    row.position_price_impact_usd = formatUsdDecimal(positionImpact);
    row.swap_price_impact_usd =
      isExecuted && !(isIncrease && action.srcChainId !== null && action.srcChainId !== undefined)
        ? formatUsdDecimal(action.swapImpactUsd)
        : "";
    row.pending_price_impact_usd = formatUsdDecimal(pendingImpact);
    // Capped off the settled impact and paid out later as a ClaimPriceImpact claim, so it is not part of net_action_result_usd
    row.claimable_price_impact_diff_usd = isExecuted ? formatUsdDecimal(action.priceImpactDiffUsd) : "";
    row.position_fee_amount = isExecuted ? formatDecimal(action.positionFeeAmount, collateralToken?.decimals) : "";
    row.position_fee_usd = isExecuted ? formatTokenUsd(action.positionFeeAmount, collateralPrice) : "";
    row.borrowing_fee_amount = isExecuted ? formatDecimal(action.borrowingFeeAmount, collateralToken?.decimals) : "";
    row.borrowing_fee_usd = isExecuted ? formatTokenUsd(action.borrowingFeeAmount, collateralPrice) : "";
    row.funding_fee_amount = isExecuted ? formatDecimal(action.fundingFeeAmount, collateralToken?.decimals) : "";
    row.funding_fee_usd = isExecuted ? formatTokenUsd(action.fundingFeeAmount, collateralPrice) : "";
    row.liquidation_fee_amount = isExecuted
      ? formatDecimal(action.liquidationFeeAmount, collateralToken?.decimals)
      : "";
    row.liquidation_fee_usd = isExecuted ? formatTokenUsd(action.liquidationFeeAmount, collateralPrice) : "";
    row.swap_fee_usd = isExecuted ? formatUsdDecimal(action.swapFeeUsd) : "";
    row.ui_fee_usd = uiFeeUsd === undefined ? "" : formatUsdDecimal(uiFeeUsd);
    row.ui_fee_amount =
      uiFeeUsd !== undefined && action.collateralTokenPriceMin && BigInt(action.collateralTokenPriceMin) > 0n
        ? formatDecimal(uiFeeUsd / BigInt(action.collateralTokenPriceMin), collateralToken?.decimals)
        : "";
    row.trader_discount_amount = isExecuted
      ? formatDecimal(action.traderDiscountAmount, collateralToken?.decimals)
      : "";
    row.trader_discount_usd = isExecuted ? formatTokenUsd(action.traderDiscountAmount, collateralPrice) : "";
    (row as CsvRow)._collateral_token_price_usd = formatContractPriceDecimal(
      collateralPrice,
      collateralToken?.decimals
    );
    row.index_token_symbol = indexToken?.symbol ?? "";
    row.index_token_address = marketInfo?.indexTokenAddress ?? "";
    row.collateral_token_symbol = collateralToken?.symbol ?? "";
    row.collateral_token_address = action.initialCollateralTokenAddress ?? "";
    row.input_token_address = isSwap ? action.initialCollateralTokenAddress ?? "" : "";
    row.output_token_address =
      action.executionAmountOut !== null && action.executionAmountOut !== undefined ? targetTokenAddress ?? "" : "";
    row.market_address = action.marketAddress ?? "";
    row.decrease_swap_type =
      action.decreasePositionSwapType === null || action.decreasePositionSwapType === undefined
        ? ""
        : DecreasePositionSwapType[Number(action.decreasePositionSwapType)] ?? String(action.decreasePositionSwapType);
    row.account = action.account;
    row.transaction_hash = action.transactionHash;
    row.explorer_url = `${getExplorerUrl(chainId)}tx/${action.transactionHash}`;
    row.chain_id = chainId;
    row.log_index = getLogIndexFromIndexerId(action.id);
    row.src_chain_id = action.srcChainId ?? "";
    row.order_key = action.orderKey;
    row.position_key = action.positionKey ?? "";
    row.position_lifecycle_id = action.positionLifecycleId ?? "";
    row.twap_group_id = action.twapGroupId ?? "";
    row.twap_part = twapParts.get(action.id) ?? "";
    row.twap_parts_total = action.numberOfParts ?? "";
    row.reason_bytes = action.reasonBytes ?? "";
    row.schema_version = HISTORY_EXPORT_SCHEMA_VERSION;
    row.record_id = `${actionId}:action`;
    row.action_id = actionId;
    row.row_type = "action";

    const rows: CsvRow[] = [row];
    if (!isExecuted) {
      return rows;
    }

    if (isSwap && action.executionAmountOut !== null && action.executionAmountOut !== undefined) {
      rows.push(
        createCashflowRow({
          actionRow: row,
          actionId,
          legIndex: 0,
          sentAmount: formatDecimal(action.initialCollateralDeltaAmount, collateralToken?.decimals),
          sentCurrency: collateralToken?.symbol,
          sentTokenAddress: action.initialCollateralTokenAddress ?? undefined,
          receivedAmount: formatDecimal(action.executionAmountOut, targetToken?.decimals),
          receivedCurrency: targetToken?.symbol,
          receivedTokenAddress: targetTokenAddress,
        })
      );
    } else if (isIncrease && BigInt(action.initialCollateralDeltaAmount) > 0n) {
      rows.push(
        createCashflowRow({
          actionRow: row,
          actionId,
          legIndex: 0,
          sentAmount: formatDecimal(action.initialCollateralDeltaAmount, collateralToken?.decimals),
          sentCurrency: collateralToken?.symbol,
          sentTokenAddress: action.initialCollateralTokenAddress ?? undefined,
          usdValuation: formatTokenUsd(action.initialCollateralDeltaAmount, collateralPrice),
          valuationSource: collateralPrice ? "indexed collateral token price" : undefined,
        })
      );
    } else if (isDecrease && action.executionAmountOut !== null && action.executionAmountOut !== undefined) {
      rows.push(
        createCashflowRow({
          actionRow: row,
          actionId,
          legIndex: 0,
          receivedAmount: formatDecimal(action.executionAmountOut, targetToken?.decimals),
          receivedCurrency: targetToken?.symbol,
          receivedTokenAddress: targetTokenAddress,
        })
      );
    } else if (isDecrease && sizeDeltaUsd === 0n && BigInt(action.initialCollateralDeltaAmount) > 0n) {
      const receivedRaw = action.executionAmountOut ?? action.initialCollateralDeltaAmount;
      const receivedToken = action.executionAmountOut ? targetToken : collateralToken;
      const receivedAddress = action.executionAmountOut
        ? targetTokenAddress
        : action.initialCollateralTokenAddress ?? undefined;
      rows.push(
        createCashflowRow({
          actionRow: row,
          actionId,
          legIndex: 0,
          receivedAmount: formatDecimal(receivedRaw, receivedToken?.decimals),
          receivedCurrency: receivedToken?.symbol,
          receivedTokenAddress: receivedAddress,
          usdValuation: action.executionAmountOut
            ? undefined
            : formatTokenUsd(action.initialCollateralDeltaAmount, collateralPrice),
          valuationSource: !action.executionAmountOut && collateralPrice ? "indexed collateral token price" : undefined,
        })
      );
    }

    return rows;
  });
}

export async function generateTradeCsv({
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
}: {
  chainId: number;
  account: string | null | undefined;
  forAllAccounts?: boolean;
  fromTxTimestamp?: number;
  toTxTimestamp?: number;
  marketsDirectionsFilter?: MarketFilterLongShortItemData[];
  orderEventCombinations?: Parameters<typeof fetchRawTradeActions>[0]["orderEventCombinations"];
  positionLifecycleId?: string;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  signal?: AbortSignal;
  onProgress?: (progress: HistoryExportProgress) => void;
}): Promise<{ csv: string; rows: CsvRow[] }> {
  const upperTimestamp = getExportUpperTimestamp(toTxTimestamp);
  const rawActions = await fetchAllHistoryExportPages({
    pageSize: TRADE_EXPORT_PAGE_SIZE,
    signal,
    onProgress,
    fetchPage: async (pageIndex, pageSize) => {
      const result = await withRetry(
        () =>
          fetchRawTradeActions({
            chainId,
            pageIndex,
            pageSize,
            includeTotalCount: pageIndex === 0,
            marketsDirectionsFilter,
            forAllAccounts,
            account,
            fromTxTimestamp,
            toTxTimestamp: upperTimestamp,
            orderEventCombinations,
            positionLifecycleId,
            showDebugValues: true,
            abortSignal: signal,
          }),
        { retryCount: 3, delay: 300, shouldRetry: () => !signal?.aborted }
      );
      if (!result) {
        throw new Error("Trade history source is unavailable");
      }
      return { items: result.tradeActions, totalCount: result.totalCount };
    },
  });
  const filteredActions = filterRawTradeActionsForExport({
    chainId,
    rawActions,
    marketsInfoData,
    marketsDirectionsFilter,
  });
  const twapGroupIdsByAccount = new Map<string, Set<string>>();
  for (const action of filteredActions) {
    if (!action.twapGroupId) {
      continue;
    }
    const accountGroupIds = twapGroupIdsByAccount.get(action.account) ?? new Set<string>();
    accountGroupIds.add(action.twapGroupId);
    twapGroupIdsByAccount.set(action.account, accountGroupIds);
  }
  const twapGroupActions: TwapPartTradeAction[] = [];
  for (const [actionAccount, accountGroupIds] of twapGroupIdsByAccount) {
    throwIfExportAborted(signal);
    const accountActions = await withRetry(
      () =>
        fetchTwapGroupExecutedActions({
          chainId,
          account: actionAccount,
          twapGroupIds: Array.from(accountGroupIds),
          abortSignal: signal,
        }),
      { retryCount: 3, delay: 300, shouldRetry: () => !signal?.aborted }
    );
    twapGroupActions.push(...accountActions);
  }
  throwIfExportAborted(signal);
  const rows = buildTradeCsvRows({
    chainId,
    rawActions: filteredActions,
    twapGroupActions,
    marketsInfoData,
    tokensData,
  });

  return {
    rows,
    csv: serializeCsv(TRADE_CSV_HEADERS, rows),
  };
}
