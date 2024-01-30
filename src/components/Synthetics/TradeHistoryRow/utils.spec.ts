import { i18n } from "@lingui/core";
import { en as plurals } from "make-plural/plurals";
import { formatPositionMessage, formatSwapMessage } from "./utils";
import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
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
    expect(formatPositionMessage(requestIncreasePosition, minCollateralUsd)).toEqual([
      {
        text: "Request Market Increase: Long BTC +$3,735.44, ",
      },
      {
        text: "Acceptable Price: $25,814.79",
      },
    ]);

    expect(formatPositionMessage(withdraw1Usd, minCollateralUsd)).toEqual([
      { text: "Request Withdraw 1.0000 USDC from Short BTC" },
    ]);

    expect(formatPositionMessage(createOrderDecreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Create Take-Profit Order: Long BTC -$266.23, Trigger Price: > $30,000.00, Acceptable Price: $29,700.00",
      },
    ]);

    expect(formatPositionMessage(cancelOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Cancel Limit Order: Long ETH +$4.11, Trigger Price: < $1,629.40, Acceptable Price: $1,645.69",
      },
    ]);

    expect(formatPositionMessage(createOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Create Limit Order: Long BTC +$2.64, Trigger Price: < $1.00, Acceptable Price: $1.01",
      },
    ]);

    expect(formatPositionMessage(executeOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Execute Limit Order: Short ARB +$2,070.18, ",
      },
      {
        text: "Triggered at: < $0.010, Execution Price: $0.837",
        tooltipRows: [
          {
            label: "Order trigger price",
            showDollar: false,
            value: "$0.836",
            key: "trigger-price",
          },
          {
            label: "Acceptable Price",
            showDollar: false,
            value: "$0.827",
            key: "acceptable-price",
          },
        ],
      },
    ]);

    expect(formatPositionMessage(frozenOrderIncreaseShort, minCollateralUsd)).toEqual([
      {
        text: "Limit Order Execution Failed",
        isError: true,
      },
      {
        text: ": Short BTC +$1,348.82",
      },
      {
        text: ", Trigger Price: > $27,210.00, Acceptable Price: $26,937.90",
      },
    ]);

    expect(formatPositionMessage(undefinedOrder, minCollateralUsd)).toEqual(null);

    expect(formatPositionMessage(liquidated, minCollateralUsd)).toEqual([
      {
        text: "Liquidated",
        tooltipRows: [
          {
            label: "Mark Price",
            showDollar: false,
            value: "$6.090",
            key: "mark-price",
          },
          {
            label: "Initial collateral",
            showDollar: false,
            value: "214.7790 USDC ($214.77)",
            key: "initial-collateral",
          },
          {
            label: "Min required collateral",
            showDollar: false,
            value: "< $0.01",
            key: "min-collateral",
          },
          {
            label: "Borrow Fee",
            showDollar: false,
            value: "$0.00",
            className: "text-red",
            key: "borrow-fee",
          },
          {
            label: "Funding Fee",
            showDollar: false,
            value: "$0.00",
            className: "text-red",
            key: "funding-fee",
          },
          {
            label: "Position Fee",
            showDollar: false,
            value: "-$4.50",
            className: "text-red",
            key: "position-fee",
          },
          {
            label: "Price Impact",
            showDollar: false,
            value: "-$16.82",
            className: "text-red",
            key: "price-impact",
          },
          {
            label: "PnL After Fees",
            showDollar: false,
            value: "-$126.31",
            className: "text-red",
            key: "pnl-after-fees",
          },
        ],
        tooltipTitle: "This position was liquidated as the max leverage of 100.0x was exceeded.",
      },
      {
        text: " Short LINK -$6,441.90, Execution Price: $6.106",
      },
    ]);

    expect(formatPositionMessage(increaseLongETH, minCollateralUsd)).toEqual([
      { text: "Market Increase: Long ETH +$49.83, " },
      {
        text: "Execution Price: $1,584.74",
        tooltipRows: [
          {
            label: "Mark Price",
            showDollar: false,
            value: "$4.46",
            key: "mark-price",
          },
          {
            label: "Actual Price Impact",
            showDollar: false,
            value: "-$0.08",
            className: "text-red",
            key: "price-impact",
          },
        ],
      },
    ]);
  });

  it("formatSwapMessage", () => {
    // MARKET SWAPS
    expect(formatSwapMessage(requestSwap)).toEqual("Request Market Swap: 0.0119 WETH for 39.8800 USDC");
    expect(formatSwapMessage(executeSwap)).toEqual("Execute Market Swap: 1,080.6325 USDC for 1.1196 ETH");
    // LIMIT SWAPS
    expect(formatSwapMessage(executeOrderSwap)).toEqual(
      "Execute Limit Swap: 0.3000 WETH for 0.3698 BTC, Price: 1.2329 WETH / BTC"
    );
    expect(formatSwapMessage(failedSwap)).toEqual(
      "Limit Swap Execution Failed: 0.3000 WETH for 0.1326 BTC, Price: 0.4422 WETH / BTC"
    );
  });
});
