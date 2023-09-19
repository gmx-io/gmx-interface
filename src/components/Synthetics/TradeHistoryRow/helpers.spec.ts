import { i18n } from "@lingui/core";
import catalogEn from "locales/en/messages.js";
import { en as plurals } from "make-plural/plurals";
import { formatPositionOrderMessage } from "./helpers";
import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
  executeOrderIncreaseLong,
  freezeOrderIncreaseShort,
  liquidated,
  requestIncreasePosition,
  undefinedOrder,
  withdraw1Usd,
} from "./mocks";
import { bigNumberify } from "lib/numbers";

i18n.loadLocaleData({ en: { plurals } });
i18n.load({ en: catalogEn.messages });
i18n.activate("en");

const minCollateralUsd = bigNumberify(100)!;

describe("TradeHistoryRow helpers", () => {
  it("formatPositionOrderMessage", () => {
    expect(formatPositionOrderMessage(requestIncreasePosition, minCollateralUsd)).toEqual([
      {
        text: "Request Increase Long BTC +$3,735.44, Acceptable Price: $25,814.79",
      },
    ]);

    expect(formatPositionOrderMessage(withdraw1Usd, minCollateralUsd)).toEqual([
      { text: "Request Withdraw 1.0000 USDC from Short BTC" },
    ]);

    expect(formatPositionOrderMessage(createOrderDecreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Create Order: Decrease Long BTC -$266.23, Trigger Price: > $30,000.00",
      },
    ]);

    expect(formatPositionOrderMessage(cancelOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Cancel Order: Increase Long ETH +$4.11, Trigger Price: < $1,629.40, Acceptable Price: $1,645.69",
      },
    ]);

    expect(formatPositionOrderMessage(createOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Create Order: Increase Long BTC +$2.64, Trigger Price: < $1.00, Acceptable Price: $1.01",
      },
    ]);

    expect(formatPositionOrderMessage(executeOrderIncreaseLong, minCollateralUsd)).toEqual([
      {
        text: "Execute Order: Increase Short ARB +$2,070.18,",
      },
      {
        text: "Triggered at: <$0.010, Execution Price: $0.837",
        tooltipTitle: "This order was executed at the trigger price.",
        tooltipProps: [
          {
            label: "Order trigger price",
            showDollar: false,
            value: "$0.836",
          },
          {
            label: "Acceptable Price",
            showDollar: false,
            value: "$0.827",
          },
        ],
      },
    ]);

    expect(formatPositionOrderMessage(freezeOrderIncreaseShort, minCollateralUsd)).toEqual([
      {
        text: "Execution Failed: Increase Short BTC +$1,348.82, Trigger Price: > $27,210.00, Acceptable Price: $26,937.90",
      },
    ]);

    expect(formatPositionOrderMessage(undefinedOrder, minCollateralUsd)).toEqual(null);

    expect(formatPositionOrderMessage(liquidated, minCollateralUsd)).toEqual([
      {
        text: "Liquidated",
        tooltipProps: [
          {
            label: "Mark Price",
            showDollar: false,
            value: "$6.09",
          },
          {
            label: "Initial collateral",
            showDollar: false,
            value: "214.7790 USDC ($214.77)",
          },
          {
            label: "Min required collateral",
            showDollar: false,
            value: "<$0.01",
          },
          {
            label: "Borrow Fee",
            showDollar: false,
            value: "$0.00",
          },
          {
            label: "Funding Fee",
            showDollar: false,
            value: "$0.00",
          },
          {
            label: "Position Fee",
            showDollar: false,
            value: "$4.50",
          },
          {
            label: "Price Impact",
            showDollar: false,
            value: "-$16.82",
          },
          {
            label: "PnL",
            showDollar: false,
            value: "-$126.31",
          },
        ],
        tooltipTitle: "This position was liquidated as the max leverage of 100.0x was exceeded.",
      },
      {
        text: "Short LINK -$6,441.90, Execution Price: $6.106",
      },
    ]);
  });
});
