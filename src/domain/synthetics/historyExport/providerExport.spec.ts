import { describe, expect, it } from "vitest";

import { CsvRow } from "lib/csv";

import {
  buildCoinLedgerTradeExport,
  buildCoinTrackerTradeExport,
  buildCoinTrackerClaimsExport,
  buildKoinlyTradeExport,
} from "./providerExport";

const settledDecrease: CsvRow = {
  row_type: "action",
  status: "executed",
  action_id: "42161:decrease",
  record_id: "42161:decrease:action",
  timestamp_utc: "2026-07-02T12:00:00Z",
  order_type: "LimitDecrease",
  event_name: "OrderExecuted",
  market_name: "ETH/USD",
  is_long: true,
  transaction_hash: "0xbbb",
  collateral_token_symbol: "USDC",
  _collateral_token_price_usd: "1",
  base_pnl_usd: "250",
  position_price_impact_usd: "-1.4",
  swap_price_impact_usd: "",
  position_fee_amount: "2.4",
  position_fee_usd: "2.4",
  funding_fee_amount: "0.3",
  funding_fee_usd: "0.3",
  data_completeness: "complete",
};

describe("provider exports", () => {
  it("maps settled result and fees without adding net_action_result_usd again", () => {
    const result = buildKoinlyTradeExport([{ ...settledDecrease, net_action_result_usd: "999999" }]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      "Received Amount": "248.6",
      "Received Currency": "USDC",
      Tags: "realized gain",
    });
    expect(result.rows[1]).toMatchObject({ "Sent Amount": "2.4", Tags: "futures fee" });
    expect(result.rows[2]).toMatchObject({ "Sent Amount": "0.3", Tags: "funding fee" });
  });

  it("never folds the claimable price impact diff into a provider result", () => {
    const withClaimableDiff = { ...settledDecrease, claimable_price_impact_diff_usd: "40" };

    expect(buildKoinlyTradeExport([withClaimableDiff]).rows[0]).toMatchObject({ "Received Amount": "248.6" });
    expect(buildCoinLedgerTradeExport([withClaimableDiff]).margin.rows[0]).toMatchObject({ Amount: "245.9" });
  });

  it("labels CoinLedger universal swap rows as trades", () => {
    const result = buildCoinLedgerTradeExport([
      {
        row_type: "action",
        status: "executed",
        order_type: "MarketSwap",
        action_id: "42161:swap",
        record_id: "42161:swap:action",
        timestamp_utc: "2026-07-02T12:00:00Z",
        transaction_hash: "0xSwap",
        data_completeness: "complete",
      },
      {
        row_type: "cashflow",
        action_id: "42161:swap",
        sent_amount: "100",
        sent_currency: "USDC",
        received_amount: "0.03",
        received_currency: "ETH",
      },
    ]);

    expect(result.universal.rows).toEqual([
      expect.objectContaining({ Type: "Trade", "Asset Sent": "USDC", "Asset Received": "ETH" }),
    ]);
    expect(result.margin.rows).toHaveLength(0);
  });

  it("nets settled components once for CoinLedger manual rows", () => {
    const result = buildCoinLedgerTradeExport([settledDecrease]);
    expect(result.margin.rows).toHaveLength(1);
    expect(result.margin.rows[0]).toMatchObject({
      Result: "Gain",
      Amount: "245.9",
      "Net Worth USD": "245.9",
      "Entry Method": "Manual Margin Gain",
    });
  });

  it("omits non-economic claim lifecycle rows", () => {
    const result = buildCoinTrackerClaimsExport([
      { status: "created", event_name: "SettleFundingFeeCreated", amount: "" },
      {
        status: "executed",
        event_name: "ClaimFunding",
        amount: "12.5",
        token_symbol: "USDC",
        timestamp_utc: "2026-07-07T12:00:00Z",
        data_completeness: "complete",
      },
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ "Received Quantity": "12.5", Tag: "margin gain" });
  });

  it("does not reject an economic record for unrelated metadata gaps", () => {
    const result = buildKoinlyTradeExport([
      {
        ...settledDecrease,
        data_completeness: "partial",
        manual_review_reason: "market metadata unavailable",
      },
    ]);

    expect(result.rows).toHaveLength(3);
  });

  it("exports swaps with complete token legs when historical fee details are unavailable", () => {
    const result = buildKoinlyTradeExport([
      {
        row_type: "action",
        status: "executed",
        order_type: "MarketSwap",
        action_id: "42161:historical-swap",
        record_id: "42161:historical-swap:action",
        timestamp_utc: "2025-07-02T12:00:00Z",
        transaction_hash: "0xHistoricalSwap",
        collateral_token_symbol: "USDC",
        data_completeness: "partial",
        manual_review_reason: "swap fee unavailable; swap price impact unavailable",
      },
      {
        row_type: "cashflow",
        action_id: "42161:historical-swap",
        sent_amount: "100",
        sent_currency: "USDC",
        received_amount: "0.03",
        received_currency: "ETH",
      },
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({
        "Sent Amount": "100",
        "Sent Currency": "USDC",
        "Received Amount": "0.03",
        "Received Currency": "ETH",
        "Fee Amount": "",
        "Fee Currency": "",
      }),
    ]);
  });

  it("omits an incompatible swap without blocking the provider export", () => {
    const rows: CsvRow[] = [
      {
        row_type: "action",
        status: "executed",
        order_type: "MarketSwap",
        action_id: "42161:incomplete-swap",
        record_id: "42161:incomplete-swap:action",
        timestamp_utc: "2025-07-02T12:00:00Z",
        data_completeness: "partial",
      },
      {
        row_type: "cashflow",
        action_id: "42161:incomplete-swap",
        sent_amount: "100",
        sent_currency: "USDC",
        received_amount: "",
        received_currency: "ETH",
      },
      settledDecrease,
    ];

    expect(buildKoinlyTradeExport(rows).rows).toHaveLength(3);
    expect(buildCoinTrackerTradeExport(rows).rows).toHaveLength(3);
    expect(buildCoinLedgerTradeExport(rows).margin.rows).toHaveLength(1);
  });

  it("uses USD when a swap fee cannot be converted to its fee token", () => {
    const swap: CsvRow[] = [
      {
        row_type: "action",
        status: "executed",
        order_type: "MarketSwap",
        action_id: "42161:swap",
        record_id: "42161:swap:action",
        timestamp_utc: "2026-07-02T12:00:00Z",
        collateral_token_symbol: "USDC",
        swap_fee_usd: "1",
        data_completeness: "complete",
      },
      {
        row_type: "cashflow",
        action_id: "42161:swap",
        sent_amount: "100",
        sent_currency: "USDC",
        received_amount: "0.03",
        received_currency: "ETH",
      },
    ];

    expect(buildKoinlyTradeExport(swap).rows[0]).toMatchObject({
      "Fee Amount": "1",
      "Fee Currency": "USD",
    });
  });

  it("uses USD for a settled result when its historical collateral price is unavailable", () => {
    const result = buildKoinlyTradeExport([
      {
        ...settledDecrease,
        _collateral_token_price_usd: "",
        data_completeness: "partial",
        manual_review_reason: "collateral token price unavailable",
      },
    ]);

    expect(result.rows[0]).toMatchObject({
      "Received Amount": "248.6",
      "Received Currency": "USD",
    });
  });

  it("maps an executed swap and its fee without inventing token legs", () => {
    const result = buildKoinlyTradeExport([
      {
        row_type: "action",
        status: "executed",
        order_type: "MarketSwap",
        action_id: "42161:swap",
        record_id: "42161:swap:action",
        timestamp_utc: "2026-07-02T12:00:00Z",
        transaction_hash: "0xSwap",
        collateral_token_symbol: "USDC",
        _collateral_token_price_usd: "1",
        swap_fee_usd: "0.3",
        data_completeness: "complete",
      },
      {
        row_type: "cashflow",
        action_id: "42161:swap",
        sent_amount: "100",
        sent_currency: "USDC",
        received_amount: "0.03",
        received_currency: "ETH",
      },
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({
        "Sent Amount": "100",
        "Sent Currency": "USDC",
        "Received Amount": "0.03",
        "Received Currency": "ETH",
        "Fee Amount": "0.3",
        "Fee Currency": "USDC",
      }),
    ]);
  });

  it("exports claims when only their optional USD price or market metadata is unavailable", () => {
    const result = buildCoinTrackerClaimsExport([
      {
        status: "executed",
        event_name: "ClaimFunding",
        amount: "12.5",
        amount_usd: "",
        token_symbol: "USDC",
        timestamp_utc: "2026-07-07T12:00:00Z",
        data_completeness: "partial",
        manual_review_reason: "claim token price unavailable; market metadata unavailable",
      },
    ]);

    expect(result.rows).toEqual([
      expect.objectContaining({
        "Received Quantity": "12.5",
        "Received Currency": "USDC",
      }),
    ]);
  });
});
