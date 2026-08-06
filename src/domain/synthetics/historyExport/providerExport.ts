import { parseUnits, formatUnits } from "viem";

import { CsvRow, serializeCsv } from "lib/csv";

import {
  COINLEDGER_MARGIN_CSV_HEADERS,
  COINLEDGER_UNIVERSAL_CSV_HEADERS,
  COINTRACKER_CSV_HEADERS,
  KOINLY_CSV_HEADERS,
} from "./csvSchemas";
import { absDecimal, createCsvRow, formatProviderTimestamp, getCsvString } from "./utils";

const DECIMAL_PRECISION = 30;

type ProviderResult = {
  csv: string;
  rows: CsvRow[];
};

type CoinLedgerTradeResult = {
  universal: ProviderResult;
  margin: ProviderResult;
};

export class UnsafeProviderProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeProviderProjectionError";
  }
}

function parseDecimal(value: string): bigint {
  return value ? parseUnits(value, DECIMAL_PRECISION) : 0n;
}

function formatDecimal(value: bigint): string {
  return formatUnits(value, DECIMAL_PRECISION);
}

function sumDecimalValues(values: string[]): string {
  return formatDecimal(values.reduce((total, value) => total + parseDecimal(value), 0n));
}

function subtractDecimalValues(value: string, subtrahends: string[]): string {
  return formatDecimal(subtrahends.reduce((total, item) => total - parseDecimal(item), parseDecimal(value)));
}

function divideDecimal(numerator: string, denominator: string): string {
  const numeratorRaw = parseDecimal(absDecimal(numerator));
  const denominatorRaw = parseDecimal(absDecimal(denominator));
  if (denominatorRaw === 0n) {
    throw new UnsafeProviderProjectionError("A provider amount could not be valued safely");
  }

  return formatUnits((numeratorRaw * 10n ** 18n) / denominatorRaw, 18);
}

function isZero(value: string): boolean {
  return !value || parseDecimal(value) === 0n;
}

function getTransactionDescription(row: CsvRow): string {
  const eventName = getCsvString(row, "event_name");
  const orderType = getCsvString(row, "order_type");
  const market = getCsvString(row, "market_name");
  return ["GMX", orderType || eventName, market].filter(Boolean).join(" ");
}

function getPositionSide(row: CsvRow): string {
  const isLong = getCsvString(row, "is_long");
  if (!isLong) return "";
  return isLong === "true" ? "Long" : "Short";
}

function getAssetIdentifier(row: CsvRow, symbolKey: string, addressKey: string): string {
  return getCsvString(row, symbolKey) || getCsvString(row, addressKey);
}

function getCashflowCurrency(cashflow: CsvRow, direction: "sent" | "received"): string {
  return getAssetIdentifier(cashflow, `${direction}_currency`, `${direction}_token_address`);
}

function assertSafeSwapCashflow(row: CsvRow, cashflow: CsvRow | undefined): asserts cashflow is CsvRow {
  if (
    !cashflow ||
    !getCsvString(cashflow, "sent_amount") ||
    !getCashflowCurrency(cashflow, "sent") ||
    !getCsvString(cashflow, "received_amount") ||
    !getCashflowCurrency(cashflow, "received")
  ) {
    throw new UnsafeProviderProjectionError(
      `Provider export cannot safely represent ${getCsvString(row, "record_id") || "an executed swap"}`
    );
  }
}

function assertSafeTransferCashflow(row: CsvRow, cashflow: CsvRow) {
  const sentAmount = getCsvString(cashflow, "sent_amount");
  const sentCurrency = getCashflowCurrency(cashflow, "sent");
  const receivedAmount = getCsvString(cashflow, "received_amount");
  const receivedCurrency = getCashflowCurrency(cashflow, "received");
  const hasCompleteSentSide = Boolean(sentAmount && sentCurrency);
  const hasCompleteReceivedSide = Boolean(receivedAmount && receivedCurrency);
  const hasIncompleteSide =
    Boolean(sentAmount) !== Boolean(sentCurrency) || Boolean(receivedAmount) !== Boolean(receivedCurrency);

  if (hasIncompleteSide || (!hasCompleteSentSide && !hasCompleteReceivedSide)) {
    throw new UnsafeProviderProjectionError(
      `Provider export cannot safely represent ${getCsvString(row, "record_id") || "a collateral transfer"}`
    );
  }
}

function getActionRows(rows: CsvRow[]): CsvRow[] {
  return rows.filter((row) => getCsvString(row, "row_type") === "action");
}

function getCashflow(rows: CsvRow[], actionId: string): CsvRow | undefined {
  return rows.find(
    (row) => getCsvString(row, "row_type") === "cashflow" && getCsvString(row, "action_id") === actionId
  );
}

function getSettledResultUsd(row: CsvRow): string {
  return sumDecimalValues([
    getCsvString(row, "base_pnl_usd"),
    getCsvString(row, "position_price_impact_usd"),
    getCsvString(row, "swap_price_impact_usd"),
  ]);
}

function getDiscountUsd(row: CsvRow): string {
  const aggregate = getCsvString(row, "trader_discount_usd");
  if (aggregate) {
    return aggregate;
  }
  return sumDecimalValues([getCsvString(row, "referral_discount_usd"), getCsvString(row, "pro_discount_usd")]);
}

function getNetSettledResultUsd(row: CsvRow): string {
  const result = sumDecimalValues([getSettledResultUsd(row), getDiscountUsd(row)]);
  return subtractDecimalValues(result, [
    getCsvString(row, "position_fee_usd"),
    getCsvString(row, "borrowing_fee_usd"),
    getCsvString(row, "funding_fee_usd"),
    getCsvString(row, "liquidation_fee_usd"),
    getCsvString(row, "swap_fee_usd"),
    getCsvString(row, "ui_fee_usd"),
  ]);
}

function getProviderAmountForUsd(row: CsvRow, usd: string): { amount: string; currency: string } {
  const price = getCsvString(row, "_collateral_token_price_usd");
  const currency = getAssetIdentifier(row, "collateral_token_symbol", "collateral_token_address");
  if (price && !isZero(price) && currency) {
    return { amount: divideDecimal(usd, price), currency };
  }

  return { amount: absDecimal(usd), currency: "USD" };
}

type FeeComponent = {
  amount: string;
  currency: string;
  description: string;
  koinlyTag: "futures fee" | "funding fee";
};

function getFeeComponents(row: CsvRow): FeeComponent[] {
  const tokenCurrency = getAssetIdentifier(row, "collateral_token_symbol", "collateral_token_address");
  const definitions = [
    ["position_fee_amount", "position_fee_usd", "position fee", "futures fee"],
    ["borrowing_fee_amount", "borrowing_fee_usd", "borrowing fee", "futures fee"],
    ["funding_fee_amount", "funding_fee_usd", "funding fee paid", "funding fee"],
    ["liquidation_fee_amount", "liquidation_fee_usd", "liquidation fee", "futures fee"],
    ["swap_fee_amount", "swap_fee_usd", "swap fee", "futures fee"],
    ["ui_fee_amount", "ui_fee_usd", "UI fee", "futures fee"],
  ] as const;

  return definitions.flatMap(([amountKey, usdKey, description, koinlyTag]) => {
    const usd = getCsvString(row, usdKey);
    const tokenAmount = getCsvString(row, amountKey);
    if (tokenAmount && !isZero(tokenAmount) && tokenCurrency) {
      return [{ amount: tokenAmount, currency: tokenCurrency, description, koinlyTag }];
    }

    if (usd && !isZero(usd)) {
      const providerAmount = getProviderAmountForUsd(row, usd);
      return [{ ...providerAmount, description, koinlyTag }];
    }

    if (!tokenAmount || isZero(tokenAmount)) {
      return [];
    }

    throw new UnsafeProviderProjectionError(`Provider export is missing a fee currency for ${description}`);
  });
}

function buildKoinlySwap(row: CsvRow, cashflow: CsvRow): CsvRow {
  const result = createCsvRow(KOINLY_CSV_HEADERS);
  result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "iso");
  result["Sent Amount"] = getCsvString(cashflow, "sent_amount");
  result["Sent Currency"] = getCashflowCurrency(cashflow, "sent");
  result["Received Amount"] = getCsvString(cashflow, "received_amount");
  result["Received Currency"] = getCashflowCurrency(cashflow, "received");
  const [swapFee] = getFeeComponents(row).filter((fee) => fee.description === "swap fee");
  result["Fee Amount"] = swapFee?.amount ?? "";
  result["Fee Currency"] = swapFee?.currency ?? "";
  result.TxHash = getCsvString(row, "transaction_hash");
  result.Description = getTransactionDescription(row);
  return result;
}

function buildCoinTrackerSwap(row: CsvRow, cashflow: CsvRow): CsvRow {
  const result = createCsvRow(COINTRACKER_CSV_HEADERS);
  result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  result["Received Quantity"] = getCsvString(cashflow, "received_amount");
  result["Received Currency"] = getCashflowCurrency(cashflow, "received");
  result["Sent Quantity"] = getCsvString(cashflow, "sent_amount");
  result["Sent Currency"] = getCashflowCurrency(cashflow, "sent");
  const [swapFee] = getFeeComponents(row).filter((fee) => fee.description === "swap fee");
  result["Fee Amount"] = swapFee?.amount ?? "";
  result["Fee Currency"] = swapFee?.currency ?? "";
  return result;
}

function buildCoinLedgerSwap(row: CsvRow, cashflow: CsvRow): CsvRow {
  const result = createCsvRow(COINLEDGER_UNIVERSAL_CSV_HEADERS);
  result["Date (UTC)"] = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  result.Platform = "GMX";
  result["Asset Sent"] = getCashflowCurrency(cashflow, "sent");
  result["Amount Sent"] = getCsvString(cashflow, "sent_amount");
  result["Asset Received"] = getCashflowCurrency(cashflow, "received");
  result["Amount Received"] = getCsvString(cashflow, "received_amount");
  const [swapFee] = getFeeComponents(row).filter((fee) => fee.description === "swap fee");
  result["Fee Currency"] = swapFee?.currency ?? "";
  result["Fee Amount"] = swapFee?.amount ?? "";
  result.Description = getTransactionDescription(row);
  result.TxHash = getCsvString(row, "transaction_hash");
  return result;
}

function getKoinlyPositionRows(row: CsvRow): CsvRow[] {
  const rows: CsvRow[] = [];
  const timestamp = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "iso");
  const resultUsd = getSettledResultUsd(row);

  if (!isZero(resultUsd)) {
    const result = createCsvRow(KOINLY_CSV_HEADERS);
    result.Date = timestamp;
    const { amount, currency } = getProviderAmountForUsd(row, resultUsd);
    if (parseDecimal(resultUsd) > 0n) {
      result["Received Amount"] = amount;
      result["Received Currency"] = currency;
    } else {
      result["Sent Amount"] = amount;
      result["Sent Currency"] = currency;
    }
    result.Tags = "realized gain";
    result.TxHash = getCsvString(row, "transaction_hash");
    result.Description = `${getTransactionDescription(row)} realized result`;
    rows.push(result);
  }

  for (const fee of getFeeComponents(row)) {
    const result = createCsvRow(KOINLY_CSV_HEADERS);
    result.Date = timestamp;
    result["Sent Amount"] = fee.amount;
    result["Sent Currency"] = fee.currency;
    result.Tags = fee.koinlyTag;
    result.TxHash = getCsvString(row, "transaction_hash");
    result.Description = `GMX ${fee.description}`;
    rows.push(result);
  }

  const tokenDiscountAmount = getCsvString(row, "trader_discount_amount");
  const discountUsd = getDiscountUsd(row);
  if ((tokenDiscountAmount && !isZero(tokenDiscountAmount)) || (discountUsd && !isZero(discountUsd))) {
    const tokenCurrency = getAssetIdentifier(row, "collateral_token_symbol", "collateral_token_address");
    let providerAmount: { amount: string; currency: string };
    if (tokenDiscountAmount && tokenCurrency) {
      providerAmount = { amount: tokenDiscountAmount, currency: tokenCurrency };
    } else if (discountUsd && !isZero(discountUsd)) {
      providerAmount = getProviderAmountForUsd(row, discountUsd);
    } else {
      throw new UnsafeProviderProjectionError("Provider export is missing the trader discount currency");
    }
    const result = createCsvRow(KOINLY_CSV_HEADERS);
    result.Date = timestamp;
    result["Received Amount"] = providerAmount.amount;
    result["Received Currency"] = providerAmount.currency;
    result.Tags = "futures fee";
    result.TxHash = getCsvString(row, "transaction_hash");
    result.Description = "GMX trader fee discount";
    rows.push(result);
  }

  return rows;
}

function getCoinTrackerPositionRows(row: CsvRow): CsvRow[] {
  const rows: CsvRow[] = [];
  const timestamp = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  const resultUsd = getSettledResultUsd(row);

  if (!isZero(resultUsd)) {
    const result = createCsvRow(COINTRACKER_CSV_HEADERS);
    result.Date = timestamp;
    const { amount, currency } = getProviderAmountForUsd(row, resultUsd);
    if (parseDecimal(resultUsd) > 0n) {
      result["Received Quantity"] = amount;
      result["Received Currency"] = currency;
      result.Tag = "margin gain";
    } else {
      result["Sent Quantity"] = amount;
      result["Sent Currency"] = currency;
      result.Tag = "margin loss";
    }
    rows.push(result);
  }

  for (const fee of getFeeComponents(row)) {
    const result = createCsvRow(COINTRACKER_CSV_HEADERS);
    result.Date = timestamp;
    result["Sent Quantity"] = fee.amount;
    result["Sent Currency"] = fee.currency;
    result.Tag = "margin fee";
    rows.push(result);
  }

  const tokenDiscountAmount = getCsvString(row, "trader_discount_amount");
  const discountUsd = getDiscountUsd(row);
  if ((tokenDiscountAmount && !isZero(tokenDiscountAmount)) || (discountUsd && !isZero(discountUsd))) {
    const tokenCurrency = getAssetIdentifier(row, "collateral_token_symbol", "collateral_token_address");
    let providerAmount: { amount: string; currency: string };
    if (tokenDiscountAmount && tokenCurrency) {
      providerAmount = { amount: tokenDiscountAmount, currency: tokenCurrency };
    } else if (discountUsd && !isZero(discountUsd)) {
      providerAmount = getProviderAmountForUsd(row, discountUsd);
    } else {
      throw new UnsafeProviderProjectionError("Provider export is missing the trader discount currency");
    }
    const result = createCsvRow(COINTRACKER_CSV_HEADERS);
    result.Date = timestamp;
    result["Received Quantity"] = providerAmount.amount;
    result["Received Currency"] = providerAmount.currency;
    result.Tag = "margin rebate";
    rows.push(result);
  }

  return rows;
}

function buildCoinLedgerMarginRow(row: CsvRow): CsvRow | undefined {
  const netUsd = getNetSettledResultUsd(row);
  if (isZero(netUsd)) {
    return undefined;
  }

  const result = createCsvRow(COINLEDGER_MARGIN_CSV_HEADERS);
  const isGain = parseDecimal(netUsd) > 0n;
  result["Date (UTC)"] = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  result.Platform = "GMX";
  result.Result = isGain ? "Gain" : "Loss";
  const providerAmount = getProviderAmountForUsd(row, netUsd);
  result.Asset = providerAmount.currency;
  result.Amount = providerAmount.amount;
  result["Net Worth USD"] = absDecimal(netUsd);
  result["Source Event"] = getCsvString(row, "order_type") || getCsvString(row, "event_name");
  result.Market = getCsvString(row, "market_name");
  result["Position Side"] = getPositionSide(row);
  result.Description = `Net settled result for ${getTransactionDescription(row)}`;
  result.TxHash = getCsvString(row, "transaction_hash");
  result["GMX Record ID"] = getCsvString(row, "record_id");
  result["Entry Method"] = "Manual Margin Gain";
  return result;
}

function isPureSwap(row: CsvRow): boolean {
  return ["MarketSwap", "LimitSwap"].includes(getCsvString(row, "order_type"));
}

function isExecuted(row: CsvRow): boolean {
  return getCsvString(row, "status") === "executed";
}

function isCollateralOnly(row: CsvRow): boolean {
  return getCsvString(row, "size_delta_usd") === "0" || getCsvString(row, "size_delta_usd") === "-0";
}

function buildKoinlyTransfer(row: CsvRow, cashflow: CsvRow): CsvRow {
  assertSafeTransferCashflow(row, cashflow);
  const result = createCsvRow(KOINLY_CSV_HEADERS);
  result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "iso");
  result["Sent Amount"] = getCsvString(cashflow, "sent_amount");
  result["Sent Currency"] = getCashflowCurrency(cashflow, "sent");
  result["Received Amount"] = getCsvString(cashflow, "received_amount");
  result["Received Currency"] = getCashflowCurrency(cashflow, "received");
  result.TxHash = getCsvString(row, "transaction_hash");
  result.Description = `${getTransactionDescription(row)} collateral transfer`;
  return result;
}

function buildCoinTrackerTransfer(row: CsvRow, cashflow: CsvRow): CsvRow {
  assertSafeTransferCashflow(row, cashflow);
  const result = createCsvRow(COINTRACKER_CSV_HEADERS);
  result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  result["Received Quantity"] = getCsvString(cashflow, "received_amount");
  result["Received Currency"] = getCashflowCurrency(cashflow, "received");
  result["Sent Quantity"] = getCsvString(cashflow, "sent_amount");
  result["Sent Currency"] = getCashflowCurrency(cashflow, "sent");
  result.Tag = "transfer";
  return result;
}

function buildCoinLedgerTransfer(row: CsvRow, cashflow: CsvRow): CsvRow {
  assertSafeTransferCashflow(row, cashflow);
  const result = createCsvRow(COINLEDGER_UNIVERSAL_CSV_HEADERS);
  const isDeposit = Boolean(getCsvString(cashflow, "received_amount"));
  result["Date (UTC)"] = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
  result.Platform = "GMX";
  result["Asset Sent"] = getCashflowCurrency(cashflow, "sent");
  result["Amount Sent"] = getCsvString(cashflow, "sent_amount");
  result["Asset Received"] = getCashflowCurrency(cashflow, "received");
  result["Amount Received"] = getCsvString(cashflow, "received_amount");
  result.Type = isDeposit ? "Deposit" : "Withdrawal";
  result.Description = `${getTransactionDescription(row)} collateral transfer`;
  result.TxHash = getCsvString(row, "transaction_hash");
  return result;
}

export function buildKoinlyTradeExport(canonicalRows: CsvRow[]): ProviderResult {
  const rows = getActionRows(canonicalRows).flatMap((row) => {
    if (!isExecuted(row)) return [];
    const cashflow = getCashflow(canonicalRows, getCsvString(row, "action_id"));
    if (isPureSwap(row)) {
      assertSafeSwapCashflow(row, cashflow);
      return [buildKoinlySwap(row, cashflow)];
    }
    const providerRows = getKoinlyPositionRows(row);
    if (isCollateralOnly(row) && cashflow) providerRows.unshift(buildKoinlyTransfer(row, cashflow));
    return providerRows;
  });
  return { rows, csv: serializeCsv(KOINLY_CSV_HEADERS, rows) };
}

export function buildCoinTrackerTradeExport(canonicalRows: CsvRow[]): ProviderResult {
  const rows = getActionRows(canonicalRows).flatMap((row) => {
    if (!isExecuted(row)) return [];
    const cashflow = getCashflow(canonicalRows, getCsvString(row, "action_id"));
    if (isPureSwap(row)) {
      assertSafeSwapCashflow(row, cashflow);
      return [buildCoinTrackerSwap(row, cashflow)];
    }
    const providerRows = getCoinTrackerPositionRows(row);
    if (isCollateralOnly(row) && cashflow) providerRows.unshift(buildCoinTrackerTransfer(row, cashflow));
    return providerRows;
  });
  return { rows, csv: serializeCsv(COINTRACKER_CSV_HEADERS, rows) };
}

export function buildCoinLedgerTradeExport(canonicalRows: CsvRow[]): CoinLedgerTradeResult {
  const universalRows: CsvRow[] = [];
  const marginRows: CsvRow[] = [];
  for (const row of getActionRows(canonicalRows)) {
    if (!isExecuted(row)) continue;
    const cashflow = getCashflow(canonicalRows, getCsvString(row, "action_id"));
    if (isPureSwap(row)) {
      assertSafeSwapCashflow(row, cashflow);
      universalRows.push(buildCoinLedgerSwap(row, cashflow));
      continue;
    }
    if (isCollateralOnly(row) && cashflow) universalRows.push(buildCoinLedgerTransfer(row, cashflow));
    const margin = buildCoinLedgerMarginRow(row);
    if (margin) marginRows.push(margin);
  }

  return {
    universal: { rows: universalRows, csv: serializeCsv(COINLEDGER_UNIVERSAL_CSV_HEADERS, universalRows) },
    margin: { rows: marginRows, csv: serializeCsv(COINLEDGER_MARGIN_CSV_HEADERS, marginRows) },
  };
}

function getClaimsEconomicRows(canonicalRows: CsvRow[]): CsvRow[] {
  return canonicalRows.filter((row) => {
    if (getCsvString(row, "status") !== "executed") {
      return false;
    }

    if (!getCsvString(row, "amount") || !getAssetIdentifier(row, "token_symbol", "token_address")) {
      throw new UnsafeProviderProjectionError(
        `Provider export cannot safely represent ${getCsvString(row, "record_id") || "an executed claim"}`
      );
    }

    return true;
  });
}

function getClaimDirection(row: CsvRow): "gain" | "loss" {
  return parseDecimal(getCsvString(row, "amount")) >= 0n ? "gain" : "loss";
}

export function buildKoinlyClaimsExport(canonicalRows: CsvRow[]): ProviderResult {
  const rows = getClaimsEconomicRows(canonicalRows).map((row) => {
    const result = createCsvRow(KOINLY_CSV_HEADERS);
    const direction = getClaimDirection(row);
    result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "iso");
    result[direction === "gain" ? "Received Amount" : "Sent Amount"] = absDecimal(getCsvString(row, "amount"));
    result[direction === "gain" ? "Received Currency" : "Sent Currency"] = getAssetIdentifier(
      row,
      "token_symbol",
      "token_address"
    );
    result.Tags =
      getCsvString(row, "event_name") === "ClaimFunding" ||
      getCsvString(row, "event_name") === "SettleFundingFeeExecuted"
        ? "funding fee"
        : "realized gain";
    result.TxHash = getCsvString(row, "transaction_hash");
    result.Description = `GMX ${getCsvString(row, "event_name")} ${getCsvString(row, "market_name")}`;
    return result;
  });
  return { rows, csv: serializeCsv(KOINLY_CSV_HEADERS, rows) };
}

export function buildCoinTrackerClaimsExport(canonicalRows: CsvRow[]): ProviderResult {
  const rows = getClaimsEconomicRows(canonicalRows).map((row) => {
    const result = createCsvRow(COINTRACKER_CSV_HEADERS);
    const direction = getClaimDirection(row);
    result.Date = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
    result[direction === "gain" ? "Received Quantity" : "Sent Quantity"] = absDecimal(getCsvString(row, "amount"));
    result[direction === "gain" ? "Received Currency" : "Sent Currency"] = getAssetIdentifier(
      row,
      "token_symbol",
      "token_address"
    );
    result.Tag = direction === "gain" ? "margin gain" : "margin loss";
    return result;
  });
  return { rows, csv: serializeCsv(COINTRACKER_CSV_HEADERS, rows) };
}

export function buildCoinLedgerClaimsExport(canonicalRows: CsvRow[]): ProviderResult {
  const rows = getClaimsEconomicRows(canonicalRows).map((row) => {
    const result = createCsvRow(COINLEDGER_MARGIN_CSV_HEADERS);
    const direction = getClaimDirection(row);
    result["Date (UTC)"] = formatProviderTimestamp(getCsvString(row, "timestamp_utc"), "us");
    result.Platform = "GMX";
    result.Result = direction === "gain" ? "Gain" : "Loss";
    result.Asset = getAssetIdentifier(row, "token_symbol", "token_address");
    result.Amount = absDecimal(getCsvString(row, "amount"));
    result["Net Worth USD"] = absDecimal(getCsvString(row, "amount_usd"));
    result["Source Event"] = getCsvString(row, "event_name");
    result.Market = getCsvString(row, "market_name");
    result["Position Side"] = getPositionSide(row);
    result.Description = `GMX ${getCsvString(row, "event_name")}`;
    result.TxHash = getCsvString(row, "transaction_hash");
    result["GMX Record ID"] = getCsvString(row, "record_id");
    result["Entry Method"] = "Manual Margin Gain";
    return result;
  });
  return { rows, csv: serializeCsv(COINLEDGER_MARGIN_CSV_HEADERS, rows) };
}
