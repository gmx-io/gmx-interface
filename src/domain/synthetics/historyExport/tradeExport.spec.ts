import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import { buildTradeCsvRows } from "./tradeExport";

const USDC_PRICE = "1000000000000000000000000";

describe("buildTradeCsvRows", () => {
  it("keeps an action row and expands an executed swap cashflow", () => {
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "0xhash:70",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.LimitSwap,
          orderKey: "0xOrder",
          timestamp: 1783425600,
          transactionHash: "0xHash",
          swapPath: ["0xPool"],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "1000000000",
          minOutputAmount: "240000000000000000",
          executionAmountOut: "250000000000000000",
          shouldUnwrapNativeToken: false,
          swapFeeUsd: "3000000000000000000000000000000",
          swapImpactUsd: "-1200000000000000000000000000000",
          pnlUsd: "-4200000000000000000000000000000",
        },
      ] as any,
      marketsInfoData: {
        "0xPool": {
          marketTokenAddress: "0xPool",
          longTokenAddress: "0xWeth",
          shortTokenAddress: "0xUsdc",
          longToken: { address: "0xWeth" },
          shortToken: { address: "0xUsdc" },
        },
      } as any,
      tokensData: {
        "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 },
        "0xWeth": { address: "0xWeth", symbol: "ETH", decimals: 18 },
      } as any,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      row_type: "action",
      order_type: "LimitSwap",
      input_amount: "1000",
      output_amount: "0.25",
      swap_fee_usd: "3",
      swap_price_impact_usd: "-1.2",
      net_action_result_usd: "-4.2",
      log_index: "70",
    });
    expect(rows[1]).toMatchObject({
      row_type: "cashflow",
      sent_amount: "1000",
      sent_currency: "USDC",
      received_amount: "0.25",
      received_currency: "ETH",
      net_action_result_usd: "",
    });
  });

  it("separates settled and pending position impact", () => {
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "increase",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.MarketIncrease,
          orderKey: "0xIncrease",
          timestamp: 1783425600,
          transactionHash: "0xIncreaseHash",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "1000000000",
          sizeDeltaUsd: "10000000000000000000000000000000000",
          marketAddress: "0xMarket",
          isLong: true,
          shouldUnwrapNativeToken: false,
          srcChainId: "42161",
          priceImpactUsd: "2100000000000000000000000000000",
          pnlUsd: "-6750000000000000000000000000000",
          collateralTokenPriceMin: USDC_PRICE,
        },
        {
          id: "decrease",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.LimitDecrease,
          orderKey: "0xDecrease",
          timestamp: 1783512000,
          transactionHash: "0xDecreaseHash",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "4000000000000000000000000000000000",
          marketAddress: "0xMarket",
          isLong: true,
          shouldUnwrapNativeToken: false,
          srcChainId: "42161",
          totalImpactUsd: "-1400000000000000000000000000000",
          priceImpactUsd: "-1000000000000000000000000000000",
          basePnlUsd: "250000000000000000000000000000000",
          pnlUsd: "245900000000000000000000000000000",
          collateralTokenPriceMin: USDC_PRICE,
        },
      ] as any,
      marketsInfoData: {
        "0xMarket": {
          indexToken: { symbol: "ETH", decimals: 18 },
          indexTokenAddress: "0xEth",
          isSpotOnly: false,
        },
      } as any,
      tokensData: {
        "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 },
      } as any,
    });

    const increase = rows.find((row) => row.record_id === "42161:increase:action")!;
    const decrease = rows.find((row) => row.record_id === "42161:decrease:action")!;
    expect(increase).toMatchObject({ position_price_impact_usd: "", pending_price_impact_usd: "2.1" });
    expect(decrease).toMatchObject({
      size_delta_usd: "-4000",
      position_price_impact_usd: "-1.4",
      pending_price_impact_usd: "",
      base_pnl_usd: "250",
      net_action_result_usd: "245.9",
    });
  });

  it("retains unresolved source actions as partial rows", () => {
    const [row] = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "unknown",
          eventName: TradeActionType.OrderCancelled,
          account: "0xAccount",
          orderType: OrderType.LimitIncrease,
          orderKey: "0xOrder",
          timestamp: 1783425600,
          transactionHash: "0xHash",
          marketAddress: "0xUnknownMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUnknownToken",
          initialCollateralDeltaAmount: "1000000",
          sizeDeltaUsd: "1000000000000000000000000000000",
          shouldUnwrapNativeToken: false,
        },
      ] as any,
      marketsInfoData: {},
      tokensData: {},
    });

    expect(row).toMatchObject({
      row_type: "action",
      data_completeness: "partial",
      market_address: "0xUnknownMarket",
      collateral_token_address: "0xUnknownToken",
      action_id: "42161:unknown",
    });
  });

  it("assigns TWAP parts by timestamp and stable id", () => {
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "part-b",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.LimitIncrease,
          orderKey: "0xOrderB",
          timestamp: 1783425601,
          transactionHash: "0xHashB",
          marketAddress: "0xMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "1000000000000000000000000000000",
          shouldUnwrapNativeToken: false,
          twapGroupId: "twap-1",
          numberOfParts: 2,
        },
        {
          id: "part-a",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.LimitIncrease,
          orderKey: "0xOrderA",
          timestamp: 1783425600,
          transactionHash: "0xHashA",
          marketAddress: "0xMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "1000000000000000000000000000000",
          shouldUnwrapNativeToken: false,
          twapGroupId: "twap-1",
          numberOfParts: 2,
        },
      ] as any,
      marketsInfoData: {
        "0xMarket": {
          indexToken: { symbol: "ETH", decimals: 18 },
          indexTokenAddress: "0xEth",
          isSpotOnly: false,
        },
      } as any,
      tokensData: {
        "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 },
      } as any,
    });

    expect(rows.find((row) => row.action_id === "42161:part-a")).toMatchObject({
      twap_part: 1,
      twap_parts_total: 2,
    });
    expect(rows.find((row) => row.action_id === "42161:part-b")).toMatchObject({
      twap_part: 2,
      twap_parts_total: 2,
    });
  });

  it("retains order lifecycle and liquidation statuses", () => {
    const events = [
      ["created", TradeActionType.OrderCreated, OrderType.LimitIncrease],
      ["updated", TradeActionType.OrderUpdated, OrderType.LimitIncrease],
      ["cancelled", TradeActionType.OrderCancelled, OrderType.LimitIncrease],
      ["frozen", TradeActionType.OrderFrozen, OrderType.LimitIncrease],
      ["liquidated", TradeActionType.OrderExecuted, OrderType.Liquidation],
    ] as const;
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: events.map(([id, eventName, orderType], index) => ({
        id,
        eventName,
        account: "0xAccount",
        orderType,
        orderKey: `0xOrder${index}`,
        timestamp: 1783425600 + index,
        transactionHash: `0xHash${index}`,
        marketAddress: "0xMarket",
        swapPath: [],
        initialCollateralTokenAddress: "0xUsdc",
        initialCollateralDeltaAmount: "0",
        sizeDeltaUsd: "1",
        shouldUnwrapNativeToken: false,
      })) as any,
      marketsInfoData: {
        "0xMarket": {
          indexToken: { symbol: "ETH", decimals: 18 },
          indexTokenAddress: "0xEth",
          isSpotOnly: false,
        },
      } as any,
      tokensData: {
        "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 },
      } as any,
    });

    expect(rows.map((row) => [row.status, row.order_type])).toEqual([
      ["created", "LimitIncrease"],
      ["updated", "LimitIncrease"],
      ["cancelled", "LimitIncrease"],
      ["frozen", "LimitIncrease"],
      ["executed", "Liquidation"],
    ]);
  });
});
