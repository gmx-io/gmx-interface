import { i18n } from "@lingui/core";
import catalogEn from "locales/en/messages.js";
import { en as plurals } from "make-plural/plurals";
import { formatPositionOrderMessage } from "./helpers";
import {
  cancelOrderIncreaseLong,
  createOrderDecreaseLong,
  createOrderIncreaseLong,
  executeOrderDecreaseShort,
  executeOrderIncreaseShort,
  freezeOrderIncreaseShort,
  liquidationLongXRP,
  requestIncreasePosition,
  undefinedOrder,
  withdraw1Usd,
} from "./mocks";

i18n.loadLocaleData({ en: { plurals } });
i18n.load({ en: catalogEn.messages });
i18n.activate("en");

describe("TradeHistoryRow helpers", () => {
  it("formatPositionOrderMessage", () => {
    expect(formatPositionOrderMessage(requestIncreasePosition)).toBe(
      "Request Increase Long BTC +$3,735.44, Acceptable Price: $25,814.79"
    );

    expect(formatPositionOrderMessage(withdraw1Usd)).toBe("Request Withdraw 1.0000 USDC from Short BTC");

    expect(formatPositionOrderMessage(createOrderDecreaseLong)).toBe(
      "Create Order: Decrease Long BTC -$266.23, Trigger Price: > $30,000.00"
    );

    expect(formatPositionOrderMessage(cancelOrderIncreaseLong)).toBe(
      "Cancel Order: Increase Long ETH +$4.11, Trigger Price: < $1,629.40, Acceptable Price: $1,645.69"
    );

    expect(formatPositionOrderMessage(createOrderIncreaseLong)).toBe(
      "Create Order: Increase Long BTC +$2.64, Trigger Price: < $1.00, Acceptable Price: $1.01"
    );

    expect(formatPositionOrderMessage(executeOrderDecreaseShort)).toBe(
      "Execute Order: Decrease Short BTC -$224,742.69, Triggered at: $27,360.00, Execution Price: $27,371.62"
    );

    expect(formatPositionOrderMessage(executeOrderIncreaseShort)).toBe(
      "Execute Order: Increase Short ARB +$2,070.18, Triggered at: $0.836, Execution Price: $0.837"
    );

    expect(formatPositionOrderMessage(freezeOrderIncreaseShort)).toBe(
      "Execution Failed: Increase Short BTC +$1,348.82, Trigger Price: > $27,210.00, Acceptable Price: $26,937.90"
    );

    expect(formatPositionOrderMessage(undefinedOrder)).toBe(null);

    expect(formatPositionOrderMessage(liquidationLongXRP)).toBe("Long XRP -$4,954.24, Execution Price: $0.4911");
  });
});
