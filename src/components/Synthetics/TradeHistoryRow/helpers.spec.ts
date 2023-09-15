import { formatPositionOrderMessage } from "./helpers";
import { cancelOrderIncreaseLong, createOrderDecreaseLong, requestIncreasePosition, withdraw1Usd } from "./mocks";
import { en as plurals } from "make-plural/plurals";
import catalogEn from "locales/en/messages.js";
import { i18n } from "@lingui/core";

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
      "Create Order: Decrease Long BTC -$266.23, BTC Price: > $30,000.00"
    );

    expect(formatPositionOrderMessage(cancelOrderIncreaseLong)).toBe(
      "Cancel Order: Increase Long ETH +$4.11, ETH Price: < $1,629.40"
    );
  });
});
