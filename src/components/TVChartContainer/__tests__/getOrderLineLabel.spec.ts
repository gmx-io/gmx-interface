import { i18n } from "@lingui/core";
import type { MessageDescriptor } from "@lingui/core";
import { describe, expect, it } from "vitest";

import { OrderType } from "domain/synthetics/orders";
import { expandDecimals } from "lib/numbers";

import { getOrderLineLabel } from "../constants";

i18n.load({ en: {} });
i18n.activate("en");

const translate = (descriptor: MessageDescriptor) => i18n._(descriptor);

const usdcSizeData = {
  sizeInUsd: expandDecimals(500, 30),
  sizeInTokens: expandDecimals(500, 6),
  tokenSymbol: "USDC",
  tokenDecimals: 6,
};

describe("getOrderLineLabel", () => {
  it("labels a margin deposit with its deposited collateral instead of a $0 Limit", () => {
    const usdLabel = getOrderLineLabel(translate, {
      isLong: true,
      marketName: "ETH/USD",
      orderType: OrderType.LimitIncrease,
      sizeData: usdcSizeData,
      showSizeInTokens: false,
      isMarginDeposit: true,
    });

    expect(usdLabel).toContain("Deposit margin");
    expect(usdLabel).not.toContain("Limit");
    expect(usdLabel).toContain("500.00");

    const tokenLabel = getOrderLineLabel(translate, {
      isLong: true,
      marketName: "ETH/USD",
      orderType: OrderType.LimitIncrease,
      sizeData: usdcSizeData,
      showSizeInTokens: true,
      isMarginDeposit: true,
    });

    expect(tokenLabel).toContain("Deposit margin");
    expect(tokenLabel).toContain("USDC");
  });

  it("keeps the Limit label for a normal limit increase", () => {
    const label = getOrderLineLabel(translate, {
      isLong: true,
      marketName: "ETH/USD",
      orderType: OrderType.LimitIncrease,
      sizeData: {
        sizeInUsd: expandDecimals(1000, 30),
        sizeInTokens: expandDecimals(1, 18),
        tokenSymbol: "ETH",
        tokenDecimals: 18,
      },
      showSizeInTokens: false,
      isMarginDeposit: false,
    });

    expect(label).toContain("Limit");
    expect(label).not.toContain("Deposit margin");
  });
});
