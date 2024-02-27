import { i18n } from "@lingui/core";
import { en as plurals } from "make-plural/plurals";
import { formatPositionMessage } from "./utils/position";
import { formatSwapMessage } from "./utils/swap";
import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
  deposit1Usd,
  executeOrderIncreaseLong,
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
import { bigNumberify } from "lib/numbers";

i18n.loadLocaleData({ en: { plurals } });
i18n.load({ en: {} });
i18n.activate("en");

const minCollateralUsd = bigNumberify(100)!;

describe("TradeHistoryRow helpers", () => {
  it("formatPositionMessage", () => {
    expect(formatPositionMessage(requestIncreasePosition, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $35.05",
        "action": "Request Market Increase",
        "executionPrice": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "price": "<  $35.05",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "+$1,054.88",
        "timestamp": "08 Feb 2024, 10:50",
      }
    `);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": ">  $43.23",
        "action": "Request Withdraw",
        "executionPrice": undefined,
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "market": "Short AVAX/USD",
        "marketPrice": undefined,
        "price": ">  $43.23",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "12.3357 USDC",
        "timestamp": "15 Feb 2024, 18:34",
      }
    `);

    expect(formatPositionMessage(deposit1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $0.08",
        "action": "Request Deposit",
        "executionPrice": undefined,
        "fullMarket": "DOGE/USD [ETH-DAI]",
        "market": "Long DOGE/USD",
        "marketPrice": undefined,
        "price": "<  $0.08",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "priceImpact": undefined,
        "size": "0.0500 DAI",
        "timestamp": "15 Feb 2024, 21:30",
      }
    `);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": ">  $29,700.00",
        "action": "Create Take-Profit Order",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "price": ">  $30,000.00",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": ">  $29,700.00",
          },
        ],
        "priceImpact": undefined,
        "size": "-$266.23",
        "timestamp": "15 Sep 2023, 13:29",
        "triggerPrice": ">  $30,000.00",
      }
    `);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $1,645.69",
        "action": "Cancel Limit Order",
        "executionPrice": undefined,
        "fullMarket": "ETH/USD [WETH-USDC]",
        "market": "Long ETH/USD",
        "marketPrice": undefined,
        "price": "<  $1,629.40",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  $1,645.69",
          },
        ],
        "priceImpact": undefined,
        "size": "+$4.11",
        "timestamp": "15 Sep 2023, 13:37",
        "triggerPrice": "<  $1,629.40",
      }
    `);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $1.01",
        "action": "Create Limit Order",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Long BTC/USD",
        "marketPrice": undefined,
        "price": "<  $1.00",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  $1.01",
          },
        ],
        "priceImpact": undefined,
        "size": "+$2.64",
        "timestamp": "15 Sep 2023, 14:54",
        "triggerPrice": "<  $1.00",
      }
    `);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $0.82",
        "action": "Execute Limit Order",
        "executionPrice": "$0.83",
        "fullMarket": "ARB/USD [ARB-USDC]",
        "market": "Short ARB/USD",
        "marketPrice": "< $0.01",
        "price": "< $0.01",
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  $0.82",
          },
          Object {
            "key": "Order Execution Price",
            "value": "$0.83",
          },
          Object {
            "key": "Price Impact",
            "value": Object {
              "state": "error",
              "text": "-$16.82",
            },
          },
          "",
          "Order execution price takes into account price impact.",
        ],
        "priceImpact": "-$16.82",
        "size": "+$2,070.18",
        "timestamp": "18 Sep 2023, 16:43",
      }
    `);

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $26,937.90",
        "action": "Failed Limit Order",
        "executionPrice": undefined,
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Short BTC/USD",
        "marketPrice": undefined,
        "price": "",
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  $26,937.90",
          },
          undefined,
        ],
        "priceImpact": "-$9,488.98",
        "size": "+$1,348.82",
        "timestamp": "18 Sep 2023, 15:14",
      }
    `);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Create Trigger",
        "executionPrice": undefined,
        "fullMarket": "XRP/USD [WETH-USDC]",
        "market": "Long XRP/USD",
        "marketPrice": undefined,
        "price": "",
        "priceImpact": undefined,
        "size": "-$4,954.24",
        "timestamp": "18 Sep 2023, 11:52",
      }
    `);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Liquidated",
        "executionPrice": "$6.10",
        "fullMarket": "LINK/USD [LINK-USDC]",
        "market": "Short LINK/USD",
        "marketPrice": "$6.09",
        "price": "$6.09",
        "priceComment": Array [
          "Mark price for the liquidation.",
          "",
          "This position was liquidated as the max. leverage of 100.0x was exceeded when taking into account fees.",
          "",
          Object {
            "key": "Order Execution Price",
            "value": "$6.10",
          },
          "Order execution price takes into account price impact.",
          "",
          Object {
            "key": "Initial Collateral",
            "value": "214.7790 USDC ($214.77)",
          },
          Object {
            "key": "PnL",
            "value": Object {
              "state": "error",
              "text": "-$126.31",
            },
          },
          Object {
            "key": "Borrow Fee",
            "value": Object {
              "state": "error",
              "text": "$0.00",
            },
          },
          Object {
            "key": "Funding Fee",
            "value": Object {
              "state": "error",
              "text": "$0.00",
            },
          },
          Object {
            "key": "Position Fee",
            "value": Object {
              "state": "error",
              "text": "-$4.50",
            },
          },
          Object {
            "key": "Price Impact",
            "value": Object {
              "state": "error",
              "text": "-$16.82",
            },
          },
          "",
          Object {
            "key": "PnL after Fees and Price Impact",
            "value": Object {
              "state": "error",
              "text": "-$126.31",
            },
          },
          "",
          Object {
            "key": "Leftover Collateral",
            "value": "< $0.01",
          },
          Object {
            "key": "Min. required Collateral",
            "value": "< $0.01",
          },
        ],
        "priceImpact": "-$16.82",
        "size": "-$6,441.90",
        "timestamp": "04 Sep 2023, 06:38",
      }
    `);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  $1,589.47",
        "action": "Market Increase",
        "executionPrice": "$1,584.74",
        "fullMarket": "ETH/USD [WETH-USDC]",
        "market": "Long ETH/USD",
        "marketPrice": "$4.46",
        "price": "$4.46",
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  $1,589.47",
          },
          Object {
            "key": "Order Execution Price",
            "value": "$1,584.74",
          },
          Object {
            "key": "Price Impact",
            "value": Object {
              "state": "error",
              "text": "-$0.08",
            },
          },
          "",
          "Order execution price takes into account price impact.",
        ],
        "priceImpact": "-$0.08",
        "size": "+$49.83",
        "timestamp": "21 Sep 2023, 19:32",
      }
    `);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  0.00 USDC / WETH",
        "action": "Request Market Swap",
        "executionPrice": "...",
        "fullMarket": "...",
        "market": "...",
        "price": "<  0.00 USDC / WETH",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "size": "0.0119 WETH to 39.8800 USDC",
        "timestamp": "02 Oct 2023, 18:35",
      }
    `);
    expect(formatSwapMessage(executeSwap)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  968.04 USDC / ETH",
        "action": "Execute Market Swap",
        "executionPrice": "965.18 USDC / ETH",
        "fullMarket": "...",
        "market": "...",
        "price": "965.18 USDC / ETH",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  968.04 USDC / ETH",
          },
        ],
        "size": "1,080.6325 USDC to 1.1196 ETH",
        "timestamp": "02 Oct 2023, 06:08",
      }
    `);
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": ">  0.4422 WETH / BTC",
        "action": "Execute Limit Swap",
        "executionPrice": "0.8110 WETH / BTC",
        "fullMarket": "...",
        "market": "...",
        "price": "0.8110 WETH / BTC",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": ">  0.4422 WETH / BTC",
          },
        ],
        "size": "0.3000 WETH to 0.3698 BTC",
        "timestamp": "29 Sep 2023, 10:46",
      }
    `);
    expect(formatSwapMessage(failedSwap)).toMatchInlineSnapshot(`
      Object {
        "acceptablePrice": "<  2.2613 WETH / BTC",
        "action": "Failed Limit Swap",
        "executionPrice": "...",
        "fullMarket": "...",
        "market": "...",
        "price": "...",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          Object {
            "key": "Order Acceptable Price",
            "value": "<  2.2613 WETH / BTC",
          },
        ],
        "size": "0.3000 WETH to",
        "timestamp": "29 Sep 2023, 10:45",
      }
    `);
  });
});
