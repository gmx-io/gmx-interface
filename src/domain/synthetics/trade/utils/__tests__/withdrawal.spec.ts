import { parseUnits } from "viem";
import { describe, expect, it } from "vitest";

import { MarketInfo } from "domain/synthetics/markets";
import { TokenData } from "domain/synthetics/tokens";

import { getWithdrawalAmounts } from "../withdrawal";
import { MARKET_INFO_FIXTURE } from "./fixtures";

const USDG_TOKEN: TokenData = {
  name: "Global Dollar",
  symbol: "USDG",
  decimals: 6,
  address: "0x004B506865409877C9fA29bfb1ebA929984B9bbC",
  isStable: true,
  prices: { minPrice: parseUnits("1", 30), maxPrice: parseUnits("1", 30) },
};

const USDG_MARKET_INFO: MarketInfo = {
  ...MARKET_INFO_FIXTURE,
  name: "ETH/USD [USDG-USDG]",
  longTokenAddress: USDG_TOKEN.address,
  shortTokenAddress: USDG_TOKEN.address,
  longToken: USDG_TOKEN,
  shortToken: USDG_TOKEN,
  isSameCollaterals: true,
  longPoolAmount: parseUnits("500000", 6),
  shortPoolAmount: parseUnits("500000", 6),
  poolValueMax: parseUnits("1000000", 30),
  swapFeeFactorForBalanceWasImproved: 0n,
  swapFeeFactorForBalanceWasNotImproved: 0n,
  withdrawalFeeFactorBalanceWasImproved: parseUnits("0.0005", 30),
  withdrawalFeeFactorBalanceWasNotImproved: parseUnits("0.0007", 30),
};

const USDG_MARKET_TOKEN: TokenData = {
  name: "GM",
  symbol: "GM",
  decimals: 18,
  address: USDG_MARKET_INFO.marketTokenAddress,
  prices: { minPrice: parseUnits("1", 30), maxPrice: parseUnits("1", 30) },
  totalSupply: parseUnits("1000000", 18),
};

const BASE_PARAMS = {
  marketInfo: USDG_MARKET_INFO,
  marketToken: USDG_MARKET_TOKEN,
  marketTokenAmount: 0n,
  longTokenAmount: 0n,
  shortTokenAmount: 0n,
  uiFeeFactor: 0n,
};

describe("getWithdrawalAmounts", () => {
  it("charges the withdrawal fee, not the swap fee, when selling GM", () => {
    const amounts = getWithdrawalAmounts({
      ...BASE_PARAMS,
      marketTokenAmount: parseUnits("12", 18),
      strategy: "byMarketToken",
    });

    expect(amounts.swapFeeUsd).toBe(parseUnits("0.0084", 30));
    expect(amounts.longTokenAmount + amounts.shortTokenAmount).toBe(parseUnits("11.9916", 6));
  });

  it("charges the withdrawal fee, not the swap fee, when the sell is entered as receive amounts", () => {
    const amounts = getWithdrawalAmounts({
      ...BASE_PARAMS,
      longTokenAmount: parseUnits("6", 6),
      shortTokenAmount: parseUnits("6", 6),
      strategy: "byCollaterals",
    });

    expect(amounts.swapFeeUsd).toBe(parseUnits("0.0084", 30));
  });
});
