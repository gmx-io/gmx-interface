import { i18n } from "@lingui/core";
import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import { TradeActionType } from "domain/synthetics/tradeHistory";
import { MaxUint256, PRECISION, applyFactor, formatUsd } from "lib/numbers";
import type { PositionTradeAction } from "sdk/utils/tradeHistory/types";

import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
  createOrderStopMarketLong,
  deposit1Usd,
  executeOrderIncreaseLong,
  executeOrderMarketIncreaseLongWithFee,
  executeOrderStopMarketLong,
  executeOrderSwap,
  executeSwap,
  executeTwapIncreaseWithFee,
  failedSwap,
  frozenOrderIncreaseShort,
  increaseLongETH,
  liquidated,
  requestIncreasePosition,
  requestSwap,
  undefinedOrder,
  withdraw1Usd,
} from "./mocks";
import { formatPositionMessage, getSettlementTooltipLines } from "./utils/position";
import { anchorCloseRow, anchorOpenRow } from "./utils/settlementMocks";
import { getErrorTooltipTitle } from "./utils/shared";
import { formatSwapMessage } from "./utils/swap";

i18n.load({ en: {} });
i18n.activate("en");

const minCollateralUsd = BigInt(100);

describe("TradeHistoryRow helpers", () => {
  it("maps known contract error names for action tooltips", () => {
    expect(getErrorTooltipTitle("InvalidDecreaseOrderSize", false)).toBe("Invalid decrease size");
  });

  it("maps user-facing trade history errors and preserves raw names in the fallback", () => {
    expect(getErrorTooltipTitle("DisabledFeature", false)).toBe("This action is currently disabled");
    expect(getErrorTooltipTitle("InsufficientFundsToPayForCosts", false)).toBe(
      "Insufficient collateral to cover order costs"
    );
    expect(getErrorTooltipTitle("LiquidatablePosition", false)).toBe(
      "Position would be liquidatable at current prices"
    );
    expect(getErrorTooltipTitle("MaxPoolAmountForDepositExceeded", false)).toBe(
      "Max deposit capacity reached for this pool"
    );
    expect(getErrorTooltipTitle("EmptyPosition", false)).toBe("Position not found. It may have been closed");
    expect(getErrorTooltipTitle("UnexpectedBorrowingFactor", false)).toBe(
      "Order failed due to a protocol validation error: UnexpectedBorrowingFactor"
    );
  });

  it("formatPositionMessage", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Dubai");

    expect(formatPositionMessage(requestIncreasePosition, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 35.0578",
        "action": "Request Market Increase",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "indexName": "AVAX/USD",
        "indexTokenSymbol": "AVAX",
        "isLong": false,
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "WAVAX-USDC",
        "price": ">  $ 35.0578",
        "priceComment": [
          "Acceptable price for the order",
        ],
        "priceImpact": undefined,
        "size": "+$ 1,054.88",
        "timestamp": "08 Feb 2024, 10:50",
        "timestampUTC": "UTC: 2024-02-08 06:50:50",
      }
    `);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 43.2376",
        "action": "Request withdraw",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "indexName": "AVAX/USD",
        "indexTokenSymbol": "AVAX",
        "isLong": false,
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "WAVAX-USDC",
        "price": "<  $ 43.2376",
        "priceComment": [
          "Acceptable price for the order",
        ],
        "priceImpact": undefined,
        "size": "12.34 USDC",
        "timestamp": "15 Feb 2024, 18:34",
        "timestampUTC": "UTC: 2024-02-15 14:34:48",
      }
    `);

    expect(formatPositionMessage(deposit1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 0.085152",
        "action": "Request deposit",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "DOGE/USD [ETH-DAI]",
        "indexName": "DOGE/USD",
        "indexTokenSymbol": "DOGE",
        "isLong": true,
        "market": "Long DOGE/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "ETH-DAI",
        "price": "<  $ 0.085152",
        "priceComment": [
          "Acceptable price for the order",
        ],
        "priceImpact": undefined,
        "size": "0.050 DAI",
        "timestamp": "15 Feb 2024, 21:30",
        "timestampUTC": "UTC: 2024-02-15 17:30:44",
      }
    `);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 29,700.00",
        "action": "Create Take-Profit",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "BTC-USDC",
        "price": ">  $ 30,000.00",
        "priceComment": [
          "Trigger price for the order",
        ],
        "priceImpact": undefined,
        "size": "-$ 266.23",
        "timestamp": "15 Sep 2023, 13:29",
        "timestampUTC": "UTC: 2023-09-15 09:29:36",
        "triggerPrice": ">  $ 30,000.00",
      }
    `);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1,645.69",
        "action": "Cancel Limit",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "ETH/USD [WETH-USDC]",
        "indexName": "ETH/USD",
        "indexTokenSymbol": "ETH",
        "isLong": true,
        "market": "Long ETH/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "WETH-USDC",
        "price": "<  $ 1,629.40",
        "priceComment": [
          "Trigger price for the order",
        ],
        "priceImpact": undefined,
        "size": "+$ 4.11",
        "timestamp": "15 Sep 2023, 13:37",
        "timestampUTC": "UTC: 2023-09-15 09:37:13",
        "triggerPrice": "<  $ 1,629.40",
      }
    `);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1.01",
        "action": "Create Limit",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "BTC-USDC",
        "price": "<  $ 1.00",
        "priceComment": [
          "Trigger price for the order",
        ],
        "priceImpact": undefined,
        "size": "+$ 2.64",
        "timestamp": "15 Sep 2023, 14:54",
        "timestampUTC": "UTC: 2023-09-15 10:54:04",
        "triggerPrice": "<  $ 1.00",
      }
    `);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 0.82764",
        "action": "Execute Limit",
        "executionPrice": "$ 0.83711",
        "fees": "-$ 16.82",
        "feesTooltip": [
          {
            "key": "Price impact",
            "value": "-$ 16.82",
          },
        ],
        "fullMarket": "ARB/USD [ARB-USDC]",
        "indexName": "ARB/USD",
        "indexTokenSymbol": "ARB",
        "isLong": false,
        "market": "Short ARB/USD",
        "marketPrice": "< $ 0.00001",
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "ARB-USDC",
        "price": "< $ 0.00001",
        "priceComment": [
          "Mark price for the order",
          "",
          {
            "key": "Order trigger price",
            "value": ">  $ 0.83600",
          },
          {
            "key": "Price impact",
            "value": [
              {
                "state": "error",
                "text": "-$ 16.82",
              },
              " ",
              {
                "state": "error",
                "text": "(-81 bps)",
              },
            ],
          },
        ],
        "priceImpact": "-$ 16.82",
        "size": "+$ 2,070.19",
        "sizeComment": [
          {
            "key": "Margin delta",
            "value": "+202.62 USDC",
          },
        ],
        "timestamp": "18 Sep 2023, 16:43",
        "timestampUTC": "UTC: 2023-09-18 12:43:18",
      }
    `);

    expect(formatPositionMessage(executeOrderMarketIncreaseLongWithFee, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 0.82764",
        "action": "Market Increase",
        "executionPrice": "$ 0.83711",
        "fees": "-$ 16.82",
        "feesTooltip": [
          {
            "key": "Price impact",
            "value": "-$ 16.82",
          },
        ],
        "fullMarket": "ARB/USD [ARB-USDC]",
        "indexName": "ARB/USD",
        "indexTokenSymbol": "ARB",
        "isLong": false,
        "market": "Short ARB/USD",
        "marketPrice": "< $ 0.00001",
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "ARB-USDC",
        "price": "< $ 0.00001",
        "priceComment": [
          "Mark price for the order",
          "",
          {
            "key": "Price impact",
            "value": [
              {
                "state": "error",
                "text": "-$ 16.82",
              },
              " ",
              {
                "state": "error",
                "text": "(-81 bps)",
              },
            ],
          },
        ],
        "priceImpact": "-$ 16.82",
        "size": "+$ 2,070.19",
        "sizeComment": [
          {
            "key": "Margin delta",
            "value": "+202.62 USDC",
          },
        ],
        "timestamp": "18 Sep 2023, 16:43",
        "timestampUTC": "UTC: 2023-09-18 12:43:18",
      }
    `);

    // Opening fees no longer appear in RPNL \u2014 they belong in the Fees column.
    expect(formatPositionMessage(executeTwapIncreaseWithFee, minCollateralUsd).pnl).toBeUndefined();
    expect(formatPositionMessage(executeTwapIncreaseWithFee, minCollateralUsd).pnlTooltip).toBeUndefined();
    expect(formatPositionMessage(executeTwapIncreaseWithFee, minCollateralUsd).fees).toBe("-$\u200a16.82");

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd).pnl).toBeUndefined();
    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd).pnlTooltip).toBeUndefined();
    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd).fees).toBeUndefined();

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 26,937.90",
        "action": "Failed Limit",
        "actionComment": undefined,
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isActionError": true,
        "isLong": false,
        "market": "Short BTC/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "BTC-USDC",
        "price": "",
        "priceComment": [
          "Mark price for the order",
          "",
          {
            "key": "Order trigger price",
            "value": ">  $ 27,210.00",
          },
          {
            "key": "Order acceptable price",
            "value": ">  $ 26,937.90",
          },
          undefined,
        ],
        "priceImpact": "-$ 9,488.99",
        "size": "+$ 1,348.83",
        "timestamp": "18 Sep 2023, 15:14",
        "timestampUTC": "UTC: 2023-09-18 11:14:09",
      }
    `);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "action": "Create Trigger",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "XRP/USD [WETH-USDC]",
        "indexName": "XRP/USD",
        "indexTokenSymbol": "XRP",
        "isLong": true,
        "market": "Long XRP/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "WETH-USDC",
        "price": "",
        "priceComment": null,
        "priceImpact": undefined,
        "size": "-$ 4,954.24",
        "timestamp": "18 Sep 2023, 11:52",
        "timestampUTC": "UTC: 2023-09-18 07:52:39",
      }
    `);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "action": "Liquidated",
        "executionPrice": "$ 6.1063",
        "fees": "-$ 22.38",
        "feesTooltip": [
          {
            "key": "Close fee",
            "value": "-$ 4.51",
          },
          {
            "key": "Liquidation fee",
            "value": "-$ 1.05",
          },
          {
            "key": "Price impact",
            "value": "-$ 16.82",
          },
        ],
        "fullMarket": "LINK/USD [LINK-USDC]",
        "indexName": "LINK/USD",
        "indexTokenSymbol": "LINK",
        "isActionError": true,
        "isLong": false,
        "market": "Short LINK/USD",
        "marketPrice": "$ 6.0907",
        "pnl": "-$ 126.32",
        "pnlState": "error",
        "poolName": "LINK-USDC",
        "price": "$ 6.0907",
        "priceComment": [
          "Mark price for the liquidation",
          "",
          "Liquidated as the max allowed leverage was exceeded when accounting for fees.",
          "",
          {
            "key": "Initial margin",
            "value": "214.78 USDC ($ 214.78)",
          },
          {
            "key": "PnL",
            "value": {
              "state": "error",
              "text": "-$ 126.32",
            },
          },
          {
            "key": "Borrow fee",
            "value": {
              "state": "error",
              "text": "$ 0.00",
            },
          },
          {
            "key": "Funding fee",
            "value": {
              "state": "error",
              "text": "$ 0.00",
            },
          },
          {
            "key": "Close fee",
            "value": {
              "state": "error",
              "text": "-$ 4.51",
            },
          },
          "",
          undefined,
          {
            "key": "Margin at liquidation",
            "value": "$ 83.95",
          },
          "",
          {
            "key": "Price impact",
            "value": [
              {
                "state": "error",
                "text": "-$ 16.82",
              },
              " ",
              {
                "state": "error",
                "text": "(-26 bps)",
              },
            ],
          },
          {
            "key": "Liquidation fee",
            "value": {
              "state": "error",
              "text": "-$ 1.05",
            },
          },
          "",
          {
            "key": "Returned margin",
            "value": "$ 66.08",
          },
        ],
        "priceImpact": undefined,
        "size": "-$ 6,441.90",
        "timestamp": "04 Sep 2023, 06:38",
        "timestampUTC": "UTC: 2023-09-04 02:38:49",
      }
    `);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1,589.47",
        "action": "Market Increase",
        "executionPrice": "$ 1,584.74",
        "fees": "-$ 0.09",
        "feesTooltip": [
          {
            "key": "Price impact",
            "value": "-$ 0.09",
          },
        ],
        "fullMarket": "ETH/USD [WETH-USDC]",
        "indexName": "ETH/USD",
        "indexTokenSymbol": "ETH",
        "isLong": true,
        "market": "Long ETH/USD",
        "marketPrice": "$ 4.47",
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "WETH-USDC",
        "price": "$ 4.47",
        "priceComment": [
          "Mark price for the order",
          "",
          {
            "key": "Price impact",
            "value": [
              {
                "state": "error",
                "text": "-$ 0.09",
              },
              " ",
              {
                "state": "error",
                "text": "(-17 bps)",
              },
            ],
          },
        ],
        "priceImpact": "-$ 0.09",
        "size": "+$ 49.83",
        "sizeComment": [
          {
            "key": "Margin delta",
            "value": "+5.69 USDC",
          },
        ],
        "timestamp": "21 Sep 2023, 19:32",
        "timestampUTC": "UTC: 2023-09-21 15:32:40",
      }
    `);

    expect(formatPositionMessage(createOrderStopMarketLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": undefined,
        "action": "Create Stop Market",
        "executionPrice": undefined,
        "fees": undefined,
        "feesTooltip": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "BTC-USDC",
        "price": ">  $ 95,600.00",
        "priceComment": [
          "Trigger price for the order",
        ],
        "priceImpact": undefined,
        "size": "+$ 3.62",
        "timestamp": "18 Sep 2023, 16:43",
        "timestampUTC": "UTC: 2023-09-18 12:43:18",
        "triggerPrice": ">  $ 95,600.00",
      }
    `);

    expect(formatPositionMessage(executeOrderStopMarketLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": undefined,
        "action": "Execute Stop Market",
        "executionPrice": "$ 95,754.58",
        "fees": "< -$ 0.01",
        "feesTooltip": [
          {
            "key": "Open fee",
            "value": "< -$ 0.01",
          },
          {
            "key": "Borrow fee",
            "value": "< -$ 0.01",
          },
          {
            "key": "Funding fee",
            "value": "< -$ 0.01",
          },
          {
            "key": "Price impact",
            "value": "< +$ 0.01",
          },
        ],
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": "$ 95,754.20",
        "pnl": undefined,
        "pnlState": undefined,
        "poolName": "BTC-USDC",
        "price": "$ 95,754.20",
        "priceComment": [
          "Mark price for the order",
          "",
          {
            "key": "Order trigger price",
            "value": ">  $ 95,600.00",
          },
          {
            "key": "Price impact",
            "value": [
              {
                "state": "success",
                "text": "< +$ 0.01",
              },
              " ",
              {
                "state": "success",
                "text": "(0 bps)",
              },
            ],
          },
        ],
        "priceImpact": "< +$ 0.01",
        "size": "+$ 3.62",
        "timestamp": "18 Sep 2023, 16:43",
        "timestampUTC": "UTC: 2023-09-18 12:43:18",
      }
    `);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  3,327.55 USDC per WETH",
        "action": "Request Market Swap",
        "executionPrice": "...",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": ">  3,327.55 USDC per WETH",
        "priceComment": [
          "Acceptable price for the order",
        ],
        "size": "0.011985 WETH to 39.88 USDC",
        "swapFromTokenAmount": "0.011985",
        "swapFromTokenSymbol": "WETH",
        "swapToTokenAmount": "39.88",
        "swapToTokenSymbol": "USDC",
        "timestamp": "02 Oct 2023, 18:35",
        "timestampUTC": "UTC: 2023-10-02 14:35:16",
      }
    `);
    expect(formatSwapMessage(executeSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  968.044 USDC per ETH",
        "action": "Execute Market Swap",
        "executionPrice": "965.185 USDC per ETH",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": "965.185 USDC per ETH",
        "priceComment": [
          "Execution price for the order",
          "",
          {
            "key": "Order acceptable price",
            "value": "<  968.044 USDC per ETH",
          },
        ],
        "size": "1,080.63 USDC to 1.1196 ETH",
        "swapFromTokenAmount": "1,080.63",
        "swapFromTokenSymbol": "USDC",
        "swapToTokenAmount": "1.1196",
        "swapToTokenSymbol": "ETH",
        "timestamp": "02 Oct 2023, 06:08",
        "timestampUTC": "UTC: 2023-10-02 02:08:40",
      }
    `);
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  2.2613 WETH per BTC",
        "action": "Execute Limit Swap",
        "executionPrice": "0.81109 WETH per BTC",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": "0.81109 WETH per BTC",
        "priceComment": [
          "Execution price for the order",
          "",
          {
            "key": "Order acceptable price",
            "value": "<  2.2613 WETH per BTC",
          },
        ],
        "size": "0.30000 WETH to 0.36987 BTC",
        "swapFromTokenAmount": "0.30000",
        "swapFromTokenSymbol": "WETH",
        "swapToTokenAmount": "0.36987",
        "swapToTokenSymbol": "BTC",
        "timestamp": "29 Sep 2023, 10:46",
        "timestampUTC": "UTC: 2023-09-29 06:46:39",
      }
    `);
    expect(formatSwapMessage(failedSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  2,054.58 USDC per ETH",
        "action": "Failed Limit Swap",
        "actionComment": [
          {
            "state": "error",
            "text": "Insufficient liquidity",
          },
        ],
        "executionPrice": "...",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "isActionError": true,
        "market": "...",
        "price": "2,056.13 USDC per ETH",
        "priceComment": [
          "Execution price for the order",
          "",
          {
            "key": "Order acceptable price",
            "value": "<  2,054.58 USDC per ETH",
          },
        ],
        "size": "1.00 USDC to 0.0004863 ETH",
        "swapFromTokenAmount": "1.00",
        "swapFromTokenSymbol": "USDC",
        "swapToTokenAmount": "0.0004863",
        "swapToTokenSymbol": "ETH",
        "timestamp": "14 Feb 2024, 13:33",
        "timestampUTC": "UTC: 2024-02-14 09:33:19",
      }
    `);
  });

  describe("formatSwapMessage settled economics", () => {
    const swapFeeUsd = (PRECISION * 3n) / 2n;
    const swapImpactUsd = -PRECISION / 2n;

    it("exposes swap fee and swap price impact for executed swaps", () => {
      for (const executedSwap of [executeSwap, executeOrderSwap]) {
        expect(formatSwapMessage({ ...executedSwap, swapFeeUsd, swapImpactUsd })).toMatchObject({
          fees: "-$ 2.00",
          feesTooltip: [
            { key: "Swap fee", value: "-$ 1.50" },
            { key: "Swap price impact", value: "-$ 0.50" },
          ],
          priceImpact: "-$ 0.50",
        });
      }
    });

    it("exposes settled economics for each executed TWAP swap part", () => {
      const twapSwapPart = {
        ...executeSwap,
        twapParams: { twapGroupId: "0x01", numberOfParts: 3 },
        swapFeeUsd,
        swapImpactUsd,
      };

      expect(formatSwapMessage(twapSwapPart)).toMatchObject({
        action: "Execute TWAP Swap part",
        fees: "-$ 2.00",
        priceImpact: "-$ 0.50",
      });
    });

    it("keeps a genuine zero visible and omits missing economics", () => {
      expect(formatSwapMessage({ ...executeSwap, swapFeeUsd, swapImpactUsd: 0n })).toMatchObject({
        fees: "-$ 1.50",
        feesTooltip: [
          { key: "Swap fee", value: "-$ 1.50" },
          { key: "Swap price impact", value: "$ 0.00" },
        ],
        priceImpact: "$ 0.00",
      });

      const withoutIndexedEconomics = formatSwapMessage({
        ...executeSwap,
        swapFeeUsd: undefined,
        swapImpactUsd: undefined,
      });

      expect(withoutIndexedEconomics.fees).toBeUndefined();
      expect(withoutIndexedEconomics.feesTooltip).toBeUndefined();
      expect(withoutIndexedEconomics.priceImpact).toBeUndefined();
    });

    it("does not report economics for swap actions that did not execute", () => {
      for (const notExecutedSwap of [requestSwap, failedSwap]) {
        const details = formatSwapMessage({ ...notExecutedSwap, swapFeeUsd, swapImpactUsd });

        expect(details.fees).toBeUndefined();
        expect(details.feesTooltip).toBeUndefined();
        expect(details.priceImpact).toBeUndefined();
      }
    });
  });

  it("formatPositionMessage renders 'Full position close' for full-close TP/SL actions", () => {
    const fullCloseCreate = {
      ...createOrderDecreaseLong,
      sizeDeltaUsd: MaxUint256,
    };
    expect(formatPositionMessage(fullCloseCreate, minCollateralUsd).size).toBe("Full position close");

    const fullCloseUpdate = {
      ...createOrderDecreaseLong,
      eventName: TradeActionType.OrderUpdated,
      sizeDeltaUsd: MaxUint256,
    };
    expect(formatPositionMessage(fullCloseUpdate, minCollateralUsd).size).toBe("Full position close");

    const fullCloseCancel = {
      ...createOrderDecreaseLong,
      eventName: TradeActionType.OrderCancelled,
      sizeDeltaUsd: MaxUint256,
    };
    expect(formatPositionMessage(fullCloseCancel, minCollateralUsd).size).toBe("Full position close");

    const fullCloseStopLoss = {
      ...createOrderDecreaseLong,
      orderType: OrderType.StopLossDecrease,
      sizeDeltaUsd: MaxUint256,
    };
    expect(formatPositionMessage(fullCloseStopLoss, minCollateralUsd).size).toBe("Full position close");
  });

  it("formatPositionMessage uses block-time minCollateralFactorForLiquidation for liquidations", () => {
    const currentFactor = PRECISION / 200n;
    const blockTimeFactor = PRECISION / 100n;

    const historicalLiquidation = {
      ...liquidated,
      marketInfo: {
        ...liquidated.marketInfo,
        minCollateralFactorForLiquidation: currentFactor,
      },
      minCollateralFactorForLiquidation: blockTimeFactor,
    };

    const details = formatPositionMessage(historicalLiquidation, minCollateralUsd);

    expect(details.priceComment).toContainEqual(
      "Liquidated as max leverage of 100.0x was exceeded when accounting for fees."
    );

    const expectedMinMargin = formatUsd(applyFactor(historicalLiquidation.sizeDeltaUsd, blockTimeFactor));
    const currentConfigMinMargin = formatUsd(applyFactor(historicalLiquidation.sizeDeltaUsd, currentFactor));
    expect(expectedMinMargin).not.toBe(currentConfigMinMargin);
    expect(details.priceComment).toContainEqual({ key: "Minimum required margin", value: expectedMinMargin });
  });

  it("formatPositionMessage hides factor-derived rows when the block-time factor is unresolved", () => {
    for (const unresolved of [undefined, 0n]) {
      const oldLiquidation = {
        ...liquidated,
        marketInfo: {
          ...liquidated.marketInfo,
          minCollateralFactorForLiquidation: PRECISION / 100n,
        },
        minCollateralFactorForLiquidation: unresolved,
      };

      const details = formatPositionMessage(oldLiquidation, minCollateralUsd);
      const rowKeys = (details.priceComment ?? [])
        .filter((line) => typeof line === "object" && line !== null && "key" in line)
        .map((line) => (line as { key: string }).key);

      expect(details.priceComment).toContainEqual(
        "Liquidated as the max allowed leverage was exceeded when accounting for fees."
      );
      expect(details.priceComment).not.toContainEqual(
        "Liquidated as max leverage of 0.0x was exceeded when accounting for fees."
      );
      expect(rowKeys).not.toContain("Minimum required margin");
      expect(rowKeys).toContain("Margin at liquidation");
    }
  });

  it("formatPositionMessage includes indexed trader discounts in the fee breakdown", () => {
    const actionWithFee = {
      ...executeOrderIncreaseLong,
      collateralTokenPriceMin: executeOrderIncreaseLong.initialCollateralToken.prices.minPrice,
      priceImpactUsd: undefined,
      positionFeeAmount: 10_000_000n,
      borrowingFeeAmount: undefined,
      fundingFeeAmount: undefined,
      swapFeeUsd: undefined,
      liquidationFeeAmount: undefined,
      totalImpactUsd: undefined,
    };

    expect(formatPositionMessage(actionWithFee, minCollateralUsd).fees).toBe("-$ 10.00");
    expect(formatPositionMessage(actionWithFee, minCollateralUsd).feesTooltip).toEqual([
      {
        key: "Open fee",
        value: "-$ 10.00",
      },
    ]);

    expect(formatPositionMessage({ ...actionWithFee, traderDiscountAmount: 500_000n }, minCollateralUsd)).toMatchObject(
      {
        fees: "-$ 9.50",
        feesTooltip: [
          {
            key: "Open fee",
            value: "-$ 10.00",
          },
          {
            key: "Referral discount",
            value: "+$ 0.50",
          },
        ],
      }
    );
  });

  describe("getSettlementTooltipLines", () => {
    it("reconciles against the original margin when the opening row is matched", () => {
      const result = getSettlementTooltipLines(anchorCloseRow, anchorOpenRow).filter((line) => line !== undefined);

      expect(result).toEqual([
        "",
        "Settlement",
        "",
        { key: "Initial margin", value: "1,000.00\u00a0USDC" },
        { key: "Open fee / discount", value: "-3.79\u00a0USDC" },
        { key: "Margin at close", value: "996.21\u00a0USDC" },
        { key: "RPNL", value: { text: "+$ 294.76", state: "success" } },
        { key: "Net close fees / impact", value: { text: "+$ 35.58", state: "success" } },
        { key: "Wallet received", value: "~1,326.64\u00a0USDC" },
      ]);
    });

    it("falls back to close-side-only settlement when the opening row is not matched", () => {
      const result = getSettlementTooltipLines(anchorCloseRow, undefined).filter((line) => line !== undefined);

      expect(result).toEqual([
        "",
        "Settlement",
        "",
        { key: "Margin at close", value: "996.21\u00a0USDC" },
        { key: "RPNL", value: { text: "+$ 294.76", state: "success" } },
        { key: "Net close fees / impact", value: { text: "+$ 35.58", state: "success" } },
        { key: "Wallet received", value: "~1,326.64\u00a0USDC" },
      ]);
    });

    it("marks the USD received value as an estimate when the collateral was swapped on close", () => {
      const swappedAction = {
        ...anchorCloseRow,
        swapPath: ["0x0000000000000000000000000000000000000001"],
      } as unknown as PositionTradeAction;

      const result = getSettlementTooltipLines(swappedAction, anchorOpenRow).filter((line) => line !== undefined);

      expect(result.at(-1)).toEqual({ key: "Wallet received", value: "~$ 1,326.31" });
    });

    it("includes the liquidation fee in the settlement for liquidation actions", () => {
      const liquidationAction = {
        ...anchorCloseRow,
        orderType: OrderType.Liquidation,
        liquidationFeeAmount: 1000000n,
      } as unknown as PositionTradeAction;

      const result = getSettlementTooltipLines(liquidationAction, anchorOpenRow).filter((line) => line !== undefined);

      expect(result).toEqual([
        "",
        "Settlement",
        "",
        { key: "Initial margin", value: "1,000.00\u00a0USDC" },
        { key: "Open fee / discount", value: "-3.79\u00a0USDC" },
        { key: "Margin at close", value: "996.21\u00a0USDC" },
        { key: "RPNL", value: { text: "+$ 294.76", state: "success" } },
        { key: "Net close fees / impact", value: { text: "+$ 34.58", state: "success" } },
        { key: "Wallet received", value: "~1,325.64\u00a0USDC" },
      ]);
    });

    it("reports a combined USD total when profit could have been paid in the pnl token", () => {
      const splitPayoutAction = {
        ...anchorCloseRow,
        isLong: true,
      } as unknown as PositionTradeAction;

      const result = getSettlementTooltipLines(splitPayoutAction, anchorOpenRow).filter((line) => line !== undefined);

      expect(result.at(-1)).toEqual({ key: "Wallet received", value: "~$\u200a1,326.31" });
    });

    it("excludes impact diverted to claimable collateral from the received amount", () => {
      const withDiffAction = {
        ...anchorCloseRow,
        priceImpactDiffUsd: 100n * 10n ** 30n,
      } as unknown as PositionTradeAction;

      const withoutDiff = getSettlementTooltipLines(anchorCloseRow, anchorOpenRow).at(-1) as { value: string };
      const withDiff = getSettlementTooltipLines(withDiffAction, anchorOpenRow).at(-1) as { value: string };

      expect(withoutDiff.value).toBe("~1,326.64\u00a0USDC");
      expect(withDiff.value).toBe("~1,226.61\u00a0USDC");
    });

    it("clamps the received amount to zero when costs wipe out the position", () => {
      const wipedOutAction = {
        ...anchorCloseRow,
        orderType: OrderType.Liquidation,
        basePnlUsd: -2_000n * 10n ** 30n,
        liquidationFeeAmount: 1_000_000n,
      } as unknown as PositionTradeAction;

      const result = getSettlementTooltipLines(wipedOutAction, anchorOpenRow).at(-1) as { value: string };

      expect(result.value).toBe("~0.00\u00a0USDC");
    });

    it("relabels the received row as a GMX balance movement for multichain closes", () => {
      const result = getSettlementTooltipLines(anchorCloseRow, anchorOpenRow, true).filter(
        (line) => line !== undefined
      );

      expect(result.at(-1)).toEqual({ key: "Received at close (GMX balance)", value: "~1,326.64\u00a0USDC" });
    });
  });
});
