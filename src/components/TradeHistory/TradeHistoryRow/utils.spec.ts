import { i18n } from "@lingui/core";
import { describe, expect, it } from "vitest";

import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
  createOrderStopMarketLong,
  deposit1Usd,
  executeOrderIncreaseLong,
  executeOrderStopMarketLong,
  executeOrderSwap,
  executeSwap,
  failedSwap,
  frozenOrderIncreaseShort,
  increaseLongETH,
  liquidated,
  requestIncreasePosition,
  requestSwap,
  undefinedOrder,
  withdraw1Usd,
} from "./mocks";
import { formatPositionMessage } from "./utils/position";
import { formatSwapMessage } from "./utils/swap";

i18n.load({ en: {} });
i18n.activate("en");

const minCollateralUsd = BigInt(100);

describe("TradeHistoryRow helpers", () => {
  it("formatPositionMessage", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Dubai");

    expect(formatPositionMessage(requestIncreasePosition, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $\u200a35.0578",
        "action": "Request Market Increase",
        "executionPrice": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "indexName": "AVAX/USD",
        "indexTokenSymbol": "AVAX",
        "isLong": false,
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "poolName": "WAVAX-USDC",
        "price": ">  $\u200a35.0578",
        "priceComment": [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "+$\u200a1,054.88",
        "timestamp": "08 Feb 2024, 10:50",
        "timestampISO": "2024-02-08T10:50:50+04:00",
      }
    `);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $\u200a43.2376",
        "action": "Request Withdraw",
        "executionPrice": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "indexName": "AVAX/USD",
        "indexTokenSymbol": "AVAX",
        "isLong": false,
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "poolName": "WAVAX-USDC",
        "price": "<  $\u200a43.2376",
        "priceComment": [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "12.34 USDC",
        "timestamp": "15 Feb 2024, 18:34",
        "timestampISO": "2024-02-15T18:34:48+04:00",
      }
    `);

    expect(formatPositionMessage(deposit1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $\u200a0.085152",
        "action": "Request Deposit",
        "executionPrice": undefined,
        "fullMarket": "DOGE/USD [ETH-DAI]",
        "indexName": "DOGE/USD",
        "indexTokenSymbol": "DOGE",
        "isLong": true,
        "market": "Long DOGE/USD",
        "marketPrice": undefined,
        "poolName": "ETH-DAI",
        "price": "<  $\u200a0.085152",
        "priceComment": [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "0.050 DAI",
        "timestamp": "15 Feb 2024, 21:30",
        "timestampISO": "2024-02-15T21:30:44+04:00",
      }
    `);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 29,700.00",
        "action": "Create Take Profit",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "poolName": "BTC-USDC",
        "price": ">  $ 30,000.00",
        "priceComment": [
          "Trigger price for the order.",
        ],
        "priceImpact": undefined,
        "size": "-$ 266.23",
        "timestamp": "15 Sep 2023, 13:29",
        "timestampISO": "2023-09-15T13:29:36+04:00",
        "triggerPrice": ">  $ 30,000.00",
      }
    `);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1,645.69",
        "action": "Cancel Limit",
        "executionPrice": undefined,
        "fullMarket": "ETH/USD [WETH-USDC]",
        "indexName": "ETH/USD",
        "indexTokenSymbol": "ETH",
        "isLong": true,
        "market": "Long ETH/USD",
        "marketPrice": undefined,
        "poolName": "WETH-USDC",
        "price": "<  $ 1,629.40",
        "priceComment": [
          "Trigger price for the order.",
        ],
        "priceImpact": undefined,
        "size": "+$ 4.11",
        "timestamp": "15 Sep 2023, 13:37",
        "timestampISO": "2023-09-15T13:37:13+04:00",
        "triggerPrice": "<  $ 1,629.40",
      }
    `);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1.01",
        "action": "Create Limit",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "poolName": "BTC-USDC",
        "price": "<  $ 1.00",
        "priceComment": [
          "Trigger price for the order.",
        ],
        "priceImpact": undefined,
        "size": "+$ 2.64",
        "timestamp": "15 Sep 2023, 14:54",
        "timestampISO": "2023-09-15T14:54:04+04:00",
        "triggerPrice": "<  $ 1.00",
      }
    `);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 0.82764",
        "action": "Execute Limit",
        "executionPrice": "$ 0.83711",
        "fullMarket": "ARB/USD [ARB-USDC]",
        "indexName": "ARB/USD",
        "indexTokenSymbol": "ARB",
        "isLong": false,
        "market": "Short ARB/USD",
        "marketPrice": "< $ 0.00001",
        "poolName": "ARB-USDC",
        "price": "< $ 0.00001",
        "priceComment": [
          "Mark price for the order.",
          "",
          {
            "key": "Order Trigger Price",
            "value": ">  $ 0.83600",
          },
          {
            "key": "Price Impact",
            "value": {
              "state": "error",
              "text": "-$ 16.82",
            },
          },
        ],
        "priceImpact": "-$ 16.82",
        "size": "+$ 2,070.19",
        "timestamp": "18 Sep 2023, 16:43",
        "timestampISO": "2023-09-18T16:43:18+04:00",
      }
    `);

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  $ 26,937.90",
        "action": "Failed Limit",
        "actionComment": undefined,
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isActionError": true,
        "isLong": false,
        "market": "Short BTC/USD",
        "marketPrice": undefined,
        "poolName": "BTC-USDC",
        "price": "",
        "priceComment": [
          "Mark price for the order.",
          "",
          {
            "key": "Order Trigger Price",
            "value": ">  $ 27,210.00",
          },
          {
            "key": "Order Acceptable Price",
            "value": ">  $ 26,937.90",
          },
          undefined,
        ],
        "priceImpact": "-$ 9,488.99",
        "size": "+$ 1,348.83",
        "timestamp": "18 Sep 2023, 15:14",
        "timestampISO": "2023-09-18T15:14:09+04:00",
      }
    `);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "action": "Create Trigger",
        "executionPrice": undefined,
        "fullMarket": "XRP/USD [WETH-USDC]",
        "indexName": "XRP/USD",
        "indexTokenSymbol": "XRP",
        "isLong": true,
        "market": "Long XRP/USD",
        "marketPrice": undefined,
        "poolName": "WETH-USDC",
        "price": "",
        "priceImpact": undefined,
        "size": "-$\u200a4,954.24",
        "timestamp": "18 Sep 2023, 11:52",
        "timestampISO": "2023-09-18T11:52:39+04:00",
      }
    `);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "action": "Liquidated",
        "executionPrice": "$ 6.1063",
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
          "Mark price for the liquidation.",
          "",
          "This position was liquidated as the max. leverage of 0.0x was exceeded when taking into account fees.",
          "",
          {
            "key": "Initial Collateral",
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
            "key": "Borrow Fee",
            "value": {
              "state": "error",
              "text": "$ 0.00",
            },
          },
          {
            "key": "Funding Fee",
            "value": {
              "state": "error",
              "text": "$ 0.00",
            },
          },
          {
            "key": "Close Fee",
            "value": {
              "state": "error",
              "text": "-$ 4.51",
            },
          },
          "",
          {
            "key": "Min. Required Collateral",
            "value": "< $ 0.01",
          },
          {
            "key": "Collateral at Liquidation",
            "value": "$ 83.95",
          },
          "",
          {
            "key": "Price Impact",
            "value": {
              "state": "error",
              "text": "-$ 16.82",
            },
          },
          {
            "key": "Liquidation Fee",
            "value": {
              "state": "error",
              "text": "-$ 1.05",
            },
          },
          "",
          {
            "key": "Returned Collateral",
            "value": "$ 66.08",
          },
        ],
        "priceImpact": undefined,
        "size": "-$ 6,441.90",
        "timestamp": "04 Sep 2023, 06:38",
        "timestampISO": "2023-09-04T06:38:49+04:00",
      }
    `);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  $ 1,589.47",
        "action": "Market Increase",
        "executionPrice": "$ 1,584.74",
        "fullMarket": "ETH/USD [WETH-USDC]",
        "indexName": "ETH/USD",
        "indexTokenSymbol": "ETH",
        "isLong": true,
        "market": "Long ETH/USD",
        "marketPrice": "$ 4.47",
        "poolName": "WETH-USDC",
        "price": "$ 4.47",
        "priceComment": [
          "Mark price for the order.",
          "",
          {
            "key": "Price Impact",
            "value": {
              "state": "error",
              "text": "-$ 0.09",
            },
          },
        ],
        "priceImpact": "-$ 0.09",
        "size": "+$ 49.83",
        "timestamp": "21 Sep 2023, 19:32",
        "timestampISO": "2023-09-21T19:32:40+04:00",
      }
    `);

    expect(formatPositionMessage(createOrderStopMarketLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": undefined,
        "action": "Create Stop Market",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "poolName": "BTC-USDC",
        "price": ">  $\u200a95,600.00",
        "priceComment": [
          "Trigger price for the order.",
        ],
        "priceImpact": undefined,
        "size": "+$\u200a3.62",
        "timestamp": "18 Sep 2023, 16:43",
        "timestampISO": "2023-09-18T16:43:18+04:00",
        "triggerPrice": ">  $\u200a95,600.00",
      }
    `);

    expect(formatPositionMessage(executeOrderStopMarketLong, minCollateralUsd)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": undefined,
        "action": "Execute Stop Market",
        "executionPrice": "$ 95,754.58",
        "fullMarket": "BTC/USD [BTC-USDC]",
        "indexName": "BTC/USD",
        "indexTokenSymbol": "BTC",
        "isLong": true,
        "market": "Long BTC/USD",
        "marketPrice": "$ 95,754.20",
        "poolName": "BTC-USDC",
        "price": "$ 95,754.20",
        "priceComment": [
          "Mark price for the order.",
          "",
          {
            "key": "Order Trigger Price",
            "value": ">  $ 95,600.00",
          },
          {
            "key": "Price Impact",
            "value": {
              "state": "success",
              "text": "< +$ 0.01",
            },
          },
        ],
        "priceImpact": "< +$ 0.01",
        "size": "+$ 3.62",
        "timestamp": "18 Sep 2023, 16:43",
        "timestampISO": "2023-09-18T16:43:18+04:00",
      }
    `);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": ">  3,327.55 USDC / WETH",
        "action": "Request Market Swap",
        "executionPrice": "...",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": ">  3,327.55 USDC / WETH",
        "priceComment": [
          "Acceptable price for the order.",
        ],
        "size": "0.011985 WETH to 39.88 USDC",
        "swapFromTokenAmount": "0.011985",
        "swapFromTokenSymbol": "WETH",
        "swapToTokenAmount": "39.88",
        "swapToTokenSymbol": "USDC",
        "timestamp": "02 Oct 2023, 18:35",
        "timestampISO": "2023-10-02T18:35:16+04:00",
      }
    `);
    expect(formatSwapMessage(executeSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  968.044 USDC / ETH",
        "action": "Execute Market Swap",
        "executionPrice": "965.185 USDC / ETH",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": "965.185 USDC / ETH",
        "priceComment": [
          "Execution price for the order.",
          "",
          {
            "key": "Order Acceptable Price",
            "value": "<  968.044 USDC / ETH",
          },
        ],
        "size": "1,080.63 USDC to 1.1196 ETH",
        "swapFromTokenAmount": "1,080.63",
        "swapFromTokenSymbol": "USDC",
        "swapToTokenAmount": "1.1196",
        "swapToTokenSymbol": "ETH",
        "timestamp": "02 Oct 2023, 06:08",
        "timestampISO": "2023-10-02T06:08:40+04:00",
      }
    `);
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  2.2613 WETH / BTC",
        "action": "Execute Limit Swap",
        "executionPrice": "0.81109 WETH / BTC",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "market": "...",
        "price": "0.81109 WETH / BTC",
        "priceComment": [
          "Execution price for the order.",
          "",
          {
            "key": "Order Acceptable Price",
            "value": "<  2.2613 WETH / BTC",
          },
        ],
        "size": "0.30000 WETH to 0.36987 BTC",
        "swapFromTokenAmount": "0.30000",
        "swapFromTokenSymbol": "WETH",
        "swapToTokenAmount": "0.36987",
        "swapToTokenSymbol": "BTC",
        "timestamp": "29 Sep 2023, 10:46",
        "timestampISO": "2023-09-29T10:46:39+04:00",
      }
    `);
    expect(formatSwapMessage(failedSwap)).toMatchInlineSnapshot(`
      {
        "acceptablePrice": "<  2,054.58 USDC / ETH",
        "action": "Failed Limit Swap",
        "actionComment": [
          {
            "state": "error",
            "text": "Insufficient available liquidity.",
          },
        ],
        "executionPrice": "...",
        "fullMarket": "...",
        "fullMarketNames": undefined,
        "isActionError": true,
        "market": "...",
        "price": "2,056.13 USDC / ETH",
        "priceComment": [
          "Execution price for the order.",
          "",
          {
            "key": "Order Acceptable Price",
            "value": "<  2,054.58 USDC / ETH",
          },
        ],
        "size": "1.00 USDC to 0.00048635 ETH",
        "swapFromTokenAmount": "1.00",
        "swapFromTokenSymbol": "USDC",
        "swapToTokenAmount": "0.00048635",
        "swapToTokenSymbol": "ETH",
        "timestamp": "14 Feb 2024, 13:33",
        "timestampISO": "2024-02-14T13:33:19+04:00",
      }
    `);
  });
});
