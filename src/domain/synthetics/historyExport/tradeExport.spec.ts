import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders/types";
import { TradeActionType } from "sdk/utils/tradeHistory/types";

import type { MarketFilterLongShortItemData } from "components/TableMarketFilter/MarketFilterLongShort";

import { buildTradeCsvRows, filterRawTradeActionsForExport } from "./tradeExport";

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
          priceImpactDiffUsd: "800000000000000000000000000000",
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

  it("keeps the capped claimable impact separate from the settled result", () => {
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "capped",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.MarketDecrease,
          orderKey: "0xCapped",
          timestamp: 1783512000,
          transactionHash: "0xCappedHash",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "4000000000000000000000000000000000",
          marketAddress: "0xMarket",
          isLong: true,
          shouldUnwrapNativeToken: false,
          srcChainId: "42161",
          totalImpactUsd: "-30920012773763338383616464187500",
          priceImpactUsd: "-53207667269697429074513629527107",
          priceImpactDiffUsd: "17337787356205129002853995330865",
          basePnlUsd: "100000000000000000000000000000000",
          pnlUsd: "69079987226236661616383535812500",
          collateralTokenPriceMin: USDC_PRICE,
        },
      ] as any,
      marketsInfoData: {
        "0xMarket": { indexToken: { symbol: "ETH", decimals: 18 }, indexTokenAddress: "0xEth", isSpotOnly: false },
      } as any,
      tokensData: { "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 } } as any,
    });

    const action = rows.find((row) => row.row_type === "action")!;
    // The claimable diff is capped off the settled impact, so it must not be folded into the settled total
    expect(action).toMatchObject({
      position_price_impact_usd: "-30.9200127737633383836164641875",
      claimable_price_impact_diff_usd: "17.337787356205129002853995330865",
      base_pnl_usd: "100",
      net_action_result_usd: "69.0799872262366616163835358125",
    });
  });

  it("leaves the claimable impact blank on unexecuted actions", () => {
    const [row] = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "cancelled",
          eventName: TradeActionType.OrderCancelled,
          account: "0xAccount",
          orderType: OrderType.LimitDecrease,
          orderKey: "0xCancelled",
          timestamp: 1783512000,
          transactionHash: "0xCancelledHash",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "1000000000000000000000000000000",
          marketAddress: "0xMarket",
          isLong: true,
          shouldUnwrapNativeToken: false,
          priceImpactDiffUsd: "17337787356205129002853995330865",
        },
      ] as any,
      marketsInfoData: {
        "0xMarket": { indexToken: { symbol: "ETH", decimals: 18 }, indexTokenAddress: "0xEth", isSpotOnly: false },
      } as any,
      tokensData: { "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 } } as any,
    });

    expect(row).toMatchObject({ status: "cancelled", claimable_price_impact_diff_usd: "" });
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

  it("numbers TWAP parts from the complete group instead of the export window", () => {
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
          numberOfParts: 3,
        },
      ] as any,
      // The window cut off the first part, but the group fetch still returns it
      twapGroupActions: [
        { id: "part-a", eventName: TradeActionType.OrderExecuted, timestamp: 1783425600, twapGroupId: "twap-1" },
        { id: "part-b", eventName: TradeActionType.OrderExecuted, timestamp: 1783425601, twapGroupId: "twap-1" },
      ],
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

    expect(rows.find((row) => row.action_id === "42161:part-b")).toMatchObject({
      twap_part: 2,
      twap_parts_total: 3,
    });
  });

  it("derives ui fees the way the contract charges them", () => {
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "uifee",
          eventName: TradeActionType.OrderExecuted,
          account: "0xAccount",
          orderType: OrderType.MarketIncrease,
          orderKey: "0xOrder",
          timestamp: 1783425600,
          transactionHash: "0xHash",
          marketAddress: "0xMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "10000000000000000000000000000000000",
          // 0.05%
          uiFeeFactor: "500000000000000000000000000",
          collateralTokenPriceMin: USDC_PRICE,
          isLong: true,
          shouldUnwrapNativeToken: false,
        },
        {
          id: "cancelled",
          eventName: TradeActionType.OrderCancelled,
          account: "0xAccount",
          orderType: OrderType.MarketIncrease,
          orderKey: "0xCancelled",
          timestamp: 1783425601,
          transactionHash: "0xCancelledHash",
          marketAddress: "0xMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          sizeDeltaUsd: "10000000000000000000000000000000000",
          uiFeeFactor: "500000000000000000000000000",
          collateralTokenPriceMin: USDC_PRICE,
          isLong: true,
          shouldUnwrapNativeToken: false,
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

    expect(rows.find((row) => row.action_id === "42161:uifee")).toMatchObject({
      ui_fee_usd: "5",
      ui_fee_amount: "5",
    });
    expect(rows.find((row) => row.action_id === "42161:cancelled")).toMatchObject({
      ui_fee_usd: "",
      ui_fee_amount: "",
    });
  });

  it("flags executed swaps whose charged ui fee cannot be derived", () => {
    const createSwap = (id: string, uiFeeFactor: string) => ({
      id,
      eventName: TradeActionType.OrderExecuted,
      account: "0xAccount",
      orderType: OrderType.MarketSwap,
      orderKey: `0xOrder-${id}`,
      timestamp: 1783425600,
      transactionHash: `0xHash-${id}`,
      swapPath: ["0xPool"],
      initialCollateralTokenAddress: "0xUsdc",
      initialCollateralDeltaAmount: "1000000000",
      executionAmountOut: "250000000000000000",
      shouldUnwrapNativeToken: false,
      swapFeeUsd: "3000000000000000000000000000000",
      swapImpactUsd: "-1200000000000000000000000000000",
      uiFeeFactor,
    });
    const rows = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [createSwap("swap-uifee", "500000000000000000000000000"), createSwap("swap-free", "0")] as any,
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

    expect(rows.find((row) => row.action_id === "42161:swap-uifee")).toMatchObject({
      ui_fee_usd: "",
      ui_fee_amount: "",
      data_completeness: "partial",
      manual_review_reason: "swap ui fee unavailable",
    });
    expect(rows.find((row) => row.action_id === "42161:swap-free")).toMatchObject({
      ui_fee_usd: "",
      data_completeness: "complete",
      manual_review_reason: "",
    });
  });

  it("leaves size blank on full-position-close TP/SL sentinels instead of a bogus number", () => {
    const [row] = buildTradeCsvRows({
      chainId: 42161,
      rawActions: [
        {
          id: "full-close",
          eventName: TradeActionType.OrderCreated,
          account: "0xAccount",
          orderType: OrderType.LimitDecrease,
          orderKey: "0xOrder",
          timestamp: 1783425600,
          transactionHash: "0xHash",
          marketAddress: "0xMarket",
          swapPath: [],
          initialCollateralTokenAddress: "0xUsdc",
          initialCollateralDeltaAmount: "0",
          // MaxUint256 marks "close entire position" on TP/SL orders
          sizeDeltaUsd: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
          isLong: true,
          shouldUnwrapNativeToken: false,
        },
      ] as any,
      marketsInfoData: {
        "0xMarket": { indexToken: { symbol: "ETH", decimals: 18 }, indexTokenAddress: "0xEth", isSpotOnly: false },
      } as any,
      tokensData: { "0xUsdc": { address: "0xUsdc", symbol: "USDC", decimals: 6 } } as any,
    });

    expect(row).toMatchObject({
      order_type: "LimitDecrease",
      size_delta_usd: "",
      data_completeness: "complete",
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

describe("filterRawTradeActionsForExport", () => {
  const marketsInfoData = {
    "0xEthMarket": { indexToken: { symbol: "ETH", decimals: 18 }, indexTokenAddress: "0xEth", isSpotOnly: false },
    "0xBtcMarket": { indexToken: { symbol: "BTC", decimals: 8 }, indexTokenAddress: "0xBtc", isSpotOnly: false },
  } as any;
  const marketsDirectionsFilter = [
    { marketAddress: "0xEthMarket", direction: "long", collateralAddress: "0xUsdc" },
    // "Any collateral" filter for another market must not keep that market's limit/trigger actions
    { marketAddress: "0xBtcMarket", direction: "long" },
  ] as MarketFilterLongShortItemData[];

  function createAction(overrides: Record<string, unknown>) {
    return {
      id: "action",
      eventName: TradeActionType.OrderExecuted,
      account: "0xAccount",
      orderKey: "0xOrder",
      timestamp: 1783425600,
      transactionHash: "0xHash",
      swapPath: [],
      initialCollateralTokenAddress: "0xUsdc",
      initialCollateralDeltaAmount: "0",
      shouldUnwrapNativeToken: false,
      isLong: true,
      ...overrides,
    } as any;
  }

  it("hides limit and trigger-decrease actions exactly like the table does", () => {
    const rawActions = [
      createAction({ id: "eth-limit-match", orderType: OrderType.LimitIncrease, marketAddress: "0xEthMarket" }),
      createAction({
        id: "eth-trigger-other-collateral",
        orderType: OrderType.StopLossDecrease,
        marketAddress: "0xEthMarket",
        initialCollateralTokenAddress: "0xWeth",
      }),
      // Hidden by the table because no collateral filter is set for its market and direction
      createAction({ id: "btc-limit", orderType: OrderType.LimitIncrease, marketAddress: "0xBtcMarket" }),
      createAction({ id: "btc-market", orderType: OrderType.MarketIncrease, marketAddress: "0xBtcMarket" }),
      createAction({ id: "swap", orderType: OrderType.MarketSwap, swapPath: ["0xPool"] }),
    ];

    const filtered = filterRawTradeActionsForExport({
      chainId: 42161,
      rawActions,
      marketsInfoData,
      marketsDirectionsFilter,
    });

    expect(filtered.map((action) => action.id)).toEqual(["eth-limit-match", "btc-market", "swap"]);
  });

  it("keeps every action when no collateral filter is active", () => {
    const rawActions = [
      createAction({ id: "btc-limit", orderType: OrderType.LimitIncrease, marketAddress: "0xBtcMarket" }),
    ];

    const filtered = filterRawTradeActionsForExport({
      chainId: 42161,
      rawActions,
      marketsInfoData,
      marketsDirectionsFilter: [{ marketAddress: "0xBtcMarket", direction: "long" }] as MarketFilterLongShortItemData[],
    });

    expect(filtered.map((action) => action.id)).toEqual(["btc-limit"]);
  });

  it("keeps limit actions when market metadata is unavailable", () => {
    const filtered = filterRawTradeActionsForExport({
      chainId: 42161,
      rawActions: [createAction({ id: "eth-limit", orderType: OrderType.LimitIncrease, marketAddress: "0xEthMarket" })],
      marketsInfoData: undefined,
      marketsDirectionsFilter,
    });

    expect(filtered.map((action) => action.id)).toEqual(["eth-limit"]);
  });
});
