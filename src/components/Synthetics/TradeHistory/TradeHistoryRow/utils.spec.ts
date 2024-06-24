import { i18n } from "@lingui/core";
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

i18n.load({ en: {} });
i18n.activate("en");

const minCollateralUsd = BigInt(100);

describe("TradeHistoryRow helpers", () => {
  it("formatPositionMessage", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Dubai");

    expect(formatPositionMessage(requestIncreasePosition, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": ">  $35.05",
  "action": "Request Market Increase",
  "executionPrice": undefined,
  "fullMarket": "AVAX/USD [WAVAX-USDC]",
  "indexName": "AVAX/USD",
  "indexTokenSymbol": "AVAX",
  "isLong": false,
  "market": "Short AVAX/USD",
  "marketPrice": undefined,
  "poolName": "WAVAX-USDC",
  "price": ">  $35.05",
  "priceComment": Array [
    "Acceptable price for the order.",
  ],
  "priceImpact": undefined,
  "size": "+$1,054.88",
  "timestamp": "08 Feb 2024, 10:50",
  "timestampISO": "2024-02-08T10:50:50+04:00",
}
`);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  $43.23",
  "action": "Request Withdraw",
  "executionPrice": undefined,
  "fullMarket": "AVAX/USD [WAVAX-USDC]",
  "indexName": "AVAX/USD",
  "indexTokenSymbol": "AVAX",
  "isLong": false,
  "market": "Short AVAX/USD",
  "marketPrice": undefined,
  "poolName": "WAVAX-USDC",
  "price": "<  $43.23",
  "priceComment": Array [
    "Acceptable price for the order.",
  ],
  "priceImpact": undefined,
  "size": "12.3357 USDC",
  "timestamp": "15 Feb 2024, 18:34",
  "timestampISO": "2024-02-15T18:34:48+04:00",
}
`);

    expect(formatPositionMessage(deposit1Usd, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  $0.0851",
  "action": "Request Deposit",
  "executionPrice": undefined,
  "fullMarket": "DOGE/USD [ETH-DAI]",
  "indexName": "DOGE/USD",
  "indexTokenSymbol": "DOGE",
  "isLong": true,
  "market": "Long DOGE/USD",
  "marketPrice": undefined,
  "poolName": "ETH-DAI",
  "price": "<  $0.0851",
  "priceComment": Array [
    "Acceptable price for the order.",
  ],
  "priceImpact": undefined,
  "size": "0.0500 DAI",
  "timestamp": "15 Feb 2024, 21:30",
  "timestampISO": "2024-02-15T21:30:44+04:00",
}
`);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": ">  $29,700.00",
  "action": "Create Take-Profit Order",
  "executionPrice": undefined,
  "fullMarket": "BTC/USD [BTC-USDC]",
  "indexName": "BTC/USD",
  "indexTokenSymbol": "BTC",
  "isLong": true,
  "market": "Long BTC/USD",
  "marketPrice": undefined,
  "poolName": "BTC-USDC",
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
  "timestampISO": "2023-09-15T13:29:36+04:00",
  "triggerPrice": ">  $30,000.00",
}
`);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  $1,645.69",
  "action": "Cancel Limit Order",
  "executionPrice": undefined,
  "fullMarket": "ETH/USD [WETH-USDC]",
  "indexName": "ETH/USD",
  "indexTokenSymbol": "ETH",
  "isLong": true,
  "market": "Long ETH/USD",
  "marketPrice": undefined,
  "poolName": "WETH-USDC",
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
  "timestampISO": "2023-09-15T13:37:13+04:00",
  "triggerPrice": "<  $1,629.40",
}
`);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  $1.01",
  "action": "Create Limit Order",
  "executionPrice": undefined,
  "fullMarket": "BTC/USD [BTC-USDC]",
  "indexName": "BTC/USD",
  "indexTokenSymbol": "BTC",
  "isLong": true,
  "market": "Long BTC/USD",
  "marketPrice": undefined,
  "poolName": "BTC-USDC",
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
  "timestampISO": "2023-09-15T14:54:04+04:00",
  "triggerPrice": "<  $1.00",
}
`);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": ">  $0.827",
  "action": "Execute Limit Order",
  "executionPrice": "$0.837",
  "fullMarket": "ARB/USD [ARB-USDC]",
  "indexName": "ARB/USD",
  "indexTokenSymbol": "ARB",
  "isLong": false,
  "market": "Short ARB/USD",
  "marketPrice": "< $0.010",
  "poolName": "ARB-USDC",
  "price": "< $0.010",
  "priceComment": Array [
    "Mark price for the order.",
    "",
    Object {
      "key": "Order Trigger Price",
      "value": ">  $0.836",
    },
    Object {
      "key": "Order Acceptable Price",
      "value": ">  $0.827",
    },
    Object {
      "key": "Order Execution Price",
      "value": "$0.837",
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
  "size": "+$2,070.187",
  "timestamp": "18 Sep 2023, 16:43",
  "timestampISO": "2023-09-18T16:43:18+04:00",
}
`);

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": ">  $26,937.90",
  "action": "Failed Limit Order",
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
  "priceComment": Array [
    "Mark price for the order.",
    "",
    Object {
      "key": "Order Trigger Price",
      "value": ">  $27,210.00",
    },
    Object {
      "key": "Order Acceptable Price",
      "value": ">  $26,937.90",
    },
    undefined,
  ],
  "priceImpact": "-$9,488.98",
  "size": "+$1,348.82",
  "timestamp": "18 Sep 2023, 15:14",
  "timestampISO": "2023-09-18T15:14:09+04:00",
}
`);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
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
  "size": "-$4,954.2429",
  "timestamp": "18 Sep 2023, 11:52",
  "timestampISO": "2023-09-18T11:52:39+04:00",
}
`);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "action": "Liquidated",
  "executionPrice": "$6.106",
  "fullMarket": "LINK/USD [LINK-USDC]",
  "indexName": "LINK/USD",
  "indexTokenSymbol": "LINK",
  "isActionError": true,
  "isLong": false,
  "market": "Short LINK/USD",
  "marketPrice": "$6.090",
  "pnl": "-$126.31",
  "pnlState": "error",
  "poolName": "LINK-USDC",
  "price": "$6.090",
  "priceComment": Array [
    "Mark price for the liquidation.",
    "",
    "This position was liquidated as the max. leverage of 100.0x was exceeded when taking into account fees.",
    "",
    Object {
      "key": "Order Execution Price",
      "value": "$6.106",
    },
    "",
    "Order execution price takes into account price impact.",
    "",
    Object {
      "key": "Initial Collateral",
      "value": "214.779 USDC ($214.77)",
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
      "key": "Leftover Collateral Excluding Impact",
      "value": "$83.95",
    },
    Object {
      "key": "Min. required Collateral",
      "value": "$64.41",
    },
  ],
  "priceImpact": "-$16.82",
  "size": "-$6,441.900",
  "timestamp": "04 Sep 2023, 06:38",
  "timestampISO": "2023-09-04T06:38:49+04:00",
}
`);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  $1,589.47",
  "action": "Market Increase",
  "executionPrice": "$1,584.74",
  "fullMarket": "ETH/USD [WETH-USDC]",
  "indexName": "ETH/USD",
  "indexTokenSymbol": "ETH",
  "isLong": true,
  "market": "Long ETH/USD",
  "marketPrice": "$4.46",
  "poolName": "WETH-USDC",
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
  "timestampISO": "2023-09-21T19:32:40+04:00",
}
`);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": ">  3,327.54 USDC / WETH",
  "action": "Request Market Swap",
  "executionPrice": "...",
  "fullMarket": "...",
  "fullMarketNames": undefined,
  "market": "...",
  "pathTokenSymbols": undefined,
  "price": ">  3,327.54 USDC / WETH",
  "priceComment": Array [
    "Acceptable price for the order.",
  ],
  "size": "0.0119 WETH to 39.8800 USDC",
  "timestamp": "02 Oct 2023, 18:35",
  "timestampISO": "2023-10-02T18:35:16+04:00",
}
`);
    expect(formatSwapMessage(executeSwap)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  968.04 USDC / ETH",
  "action": "Execute Market Swap",
  "executionPrice": "965.18 USDC / ETH",
  "fullMarket": "...",
  "fullMarketNames": undefined,
  "market": "...",
  "pathTokenSymbols": undefined,
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
  "timestampISO": "2023-10-02T06:08:40+04:00",
}
`);
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  2.2613 WETH / BTC",
  "action": "Execute Limit Swap",
  "executionPrice": "0.8110 WETH / BTC",
  "fullMarket": "...",
  "fullMarketNames": undefined,
  "market": "...",
  "pathTokenSymbols": undefined,
  "price": "0.8110 WETH / BTC",
  "priceComment": Array [
    "Execution price for the order.",
    "",
    Object {
      "key": "Order Acceptable Price",
      "value": "<  2.2613 WETH / BTC",
    },
  ],
  "size": "0.3000 WETH to 0.3698 BTC",
  "timestamp": "29 Sep 2023, 10:46",
  "timestampISO": "2023-09-29T10:46:39+04:00",
}
`);
    expect(formatSwapMessage(failedSwap)).toMatchInlineSnapshot(`
Object {
  "acceptablePrice": "<  2,054.58 USDC / ETH",
  "action": "Failed Limit Swap",
  "actionComment": Array [
    Object {
      "state": "error",
      "text": "Not enough Available Swap Liquidity to fill the Order. The Order will get filled when the condition is met and there is enough Available Swap Liquidity.",
    },
  ],
  "executionPrice": "...",
  "fullMarket": "...",
  "fullMarketNames": undefined,
  "isActionError": true,
  "market": "...",
  "pathTokenSymbols": undefined,
  "price": "2,056.13 USDC / ETH",
  "priceComment": Array [
    "Execution price for the order.",
    "",
    Object {
      "key": "Order Acceptable Price",
      "value": "<  2,054.58 USDC / ETH",
    },
  ],
  "size": "1.0000 USDC to 0.0004 ETH",
  "timestamp": "14 Feb 2024, 13:33",
  "timestampISO": "2024-02-14T13:33:19+04:00",
}
`);
  });
});
