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
        "action": "Request Market Increase",
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "market": "Short AVAX/USD",
        "price": "<  $35.05",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "size": "+$1,054.88",
        "timestamp": "08 Feb 2024, 10:50",
      }
    `);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Request Withdraw",
        "fullMarket": "AVAX/USD [WAVAX-USDC]",
        "market": "Short AVAX/USD",
        "price": ">  $43.23",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "size": "12.3357 USDC",
        "timestamp": "15 Feb 2024, 18:34",
      }
    `);

    expect(formatPositionMessage(deposit1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Request Deposit",
        "fullMarket": "DOGE/USD [ETH-DAI]",
        "market": "Long DOGE/USD",
        "price": "<  $0.08",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "size": "0.0500 DAI",
        "timestamp": "15 Feb 2024, 21:30",
      }
    `);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Create Take-Profit Order",
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Long BTC/USD",
        "price": ">  $30,000.00",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": > ",
            "$29,700.00",
          ],
        ],
        "size": "-$266.23",
        "timestamp": "15 Sep 2023, 13:29",
      }
    `);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Cancel Limit Order",
        "fullMarket": "ETH/USD [WETH-USDC]",
        "market": "Long ETH/USD",
        "price": "<  $1,629.40",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": < ",
            "$1,645.69",
          ],
        ],
        "size": "+$4.11",
        "timestamp": "15 Sep 2023, 13:37",
      }
    `);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Create Limit Order",
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Long BTC/USD",
        "price": "<  $1.00",
        "priceComment": Array [
          "Trigger price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": < ",
            "$1.01",
          ],
        ],
        "size": "+$2.64",
        "timestamp": "15 Sep 2023, 14:54",
      }
    `);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Execute Limit Order",
        "fullMarket": "ARB/USD [ARB-USDC]",
        "market": "Short ARB/USD",
        "price": "< $0.01",
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": < ",
            "$0.82",
          ],
          Array [
            "Order Execution Price",
            ": ",
            "$0.83",
          ],
          Array [
            "Price Impact",
            ": ",
            Object {
              "state": "error",
              "text": "-$16.82",
            },
          ],
          "",
          "Order execution price takes into account price impact.",
        ],
        "size": "+$2,070.18",
        "timestamp": "18 Sep 2023, 16:43",
      }
    `);

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Failed Limit Order",
        "fullMarket": "BTC/USD [BTC-USDC]",
        "market": "Short BTC/USD",
        "price": undefined,
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": < ",
            "$26,937.90",
          ],
          undefined,
        ],
        "size": "+$1,348.82",
        "timestamp": "18 Sep 2023, 15:14",
      }
    `);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Create Trigger",
        "fullMarket": "XRP/USD [WETH-USDC]",
        "market": "Long XRP/USD",
        "price": undefined,
        "size": "-$4,954.24",
        "timestamp": "18 Sep 2023, 11:52",
      }
    `);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Liquidated",
        "fullMarket": "LINK/USD [LINK-USDC]",
        "market": "Short LINK/USD",
        "price": "$6.09",
        "priceComment": Array [
          "Mark price for the liquidation.",
          "",
          "This position was liquidated as the max. leverage of 100.0x was exceeded when taking into account fees.",
          "",
          Array [
            "Order Execution Price",
            ": ",
            "$6.10",
          ],
          "Order execution price takes into account price impact.",
          "",
          Array [
            "Initial Collateral",
            ": ",
            "214.7790 USDC ($214.77)",
          ],
          Array [
            "PnL",
            ": ",
            Object {
              "state": "error",
              "text": "-$126.31",
            },
          ],
          Array [
            "Borrow Fee",
            ": ",
            Object {
              "state": "error",
              "text": "$0.00",
            },
          ],
          Array [
            "Funding Fee",
            ": ",
            Object {
              "state": "error",
              "text": "$0.00",
            },
          ],
          Array [
            "Position Fee",
            ": ",
            Object {
              "state": "error",
              "text": "-$4.50",
            },
          ],
          Array [
            "Price Impact",
            ": ",
            Object {
              "state": "error",
              "text": "-$16.82",
            },
          ],
          "",
          Array [
            "PnL after Fees and Price Impact",
            ": ",
            Object {
              "state": "error",
              "text": "-$126.31",
            },
          ],
          "",
          Array [
            "Leftover Collateral",
            ": ",
            "< $0.01",
          ],
          Array [
            "Min. required Collateral",
            ": ",
            "< $0.01",
          ],
        ],
        "size": "-$6,441.90",
        "timestamp": "04 Sep 2023, 06:38",
      }
    `);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toMatchInlineSnapshot(`
      Object {
        "action": "Market Increase",
        "fullMarket": "ETH/USD [WETH-USDC]",
        "market": "Long ETH/USD",
        "price": "$4.46",
        "priceComment": Array [
          "Mark price for the order.",
          "",
          Array [
            "Order Acceptable Price",
            ": < ",
            "$1,589.47",
          ],
          Array [
            "Order Execution Price",
            ": ",
            "$1,584.74",
          ],
          Array [
            "Price Impact",
            ": ",
            Object {
              "state": "error",
              "text": "-$0.08",
            },
          ],
          "",
          "Order execution price takes into account price impact.",
        ],
        "size": "+$49.83",
        "timestamp": "21 Sep 2023, 19:32",
      }
    `);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toMatchInlineSnapshot(`
      Object {
        "action": "Request Market Swap",
        "market": "...",
        "price": "> 3,327.54 USDC / WETH",
        "priceComment": Array [
          "Acceptable price for the order.",
        ],
        "size": "0.0119 WETH to 39.8800 USDC",
        "timestamp": "02 Oct 2023, 18:35",
      }
    `);
    expect(formatSwapMessage(executeSwap)).toMatchInlineSnapshot(`
      Object {
        "action": "Execute Market Swap",
        "market": "...",
        "price": "965.18 USDC / ETH",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          "Order Acceptable Price: < 965.18 USDC / ETH",
        ],
        "size": "1,080.6325 USDC to 1.1196 ETH",
        "timestamp": "02 Oct 2023, 06:08",
      }
    `);
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toMatchInlineSnapshot(`
      Object {
        "action": "Execute Limit Swap",
        "market": "...",
        "price": "0.8110 WETH / BTC",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          "Order Trigger Price: > 0.8110 WETH / BTC",
        ],
        "size": "0.3000 WETH to 0.3698 BTC",
        "timestamp": "29 Sep 2023, 10:46",
      }
    `);
    expect(formatSwapMessage(failedSwap)).toMatchInlineSnapshot(`
      Object {
        "action": "Failed Limit Swap",
        "market": "...",
        "price": "2.2613 WETH / BTC",
        "priceComment": Array [
          "Execution price for the order.",
          "",
          "Order Trigger Price: < 2.2613 WETH / BTC",
        ],
        "size": "0.3000 WETH to 0.1326 BTC",
        "timestamp": "29 Sep 2023, 10:45",
      }
    `);
  });
});
