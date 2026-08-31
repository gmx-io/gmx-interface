import { describe, expect, it } from "vitest";

import type { Token } from "sdk/utils/tokens/types";

import { getTradeboxMarginDepositPrefill } from "../tradeboxMarginDepositPrefill";

const WETH: Token = {
  name: "Wrapped Ethereum",
  symbol: "WETH",
  decimals: 18,
  address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  isWrapped: true,
  baseSymbol: "ETH",
};

const ETH: Token = {
  name: "Ethereum",
  symbol: "ETH",
  decimals: 18,
  address: "0x0000000000000000000000000000000000000000",
  isNative: true,
  wrappedAddress: WETH.address,
};

const USDC: Token = {
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  isStable: true,
};

const VALID_TRIGGER = { triggerPriceInputValue: "3000", triggerPrice: 3000n * 10n ** 30n };

describe("getTradeboxMarginDepositPrefill", () => {
  it("passes both values when the pay token is the position collateral token", () => {
    expect(
      getTradeboxMarginDepositPrefill({
        payToken: WETH,
        payTokenInputValue: "1.5",
        payTokenAmount: 15n * 10n ** 17n,
        positionCollateralToken: WETH,
        ...VALID_TRIGGER,
      })
    ).toEqual({ collateralInputValue: "1.5", triggerPriceInputValue: "3000" });
  });

  it("treats the native token as equivalent to the wrapped collateral token", () => {
    expect(
      getTradeboxMarginDepositPrefill({
        payToken: ETH,
        payTokenInputValue: "0.25",
        payTokenAmount: 25n * 10n ** 16n,
        positionCollateralToken: WETH,
        ...VALID_TRIGGER,
      }).collateralInputValue
    ).toBe("0.25");

    expect(
      getTradeboxMarginDepositPrefill({
        payToken: WETH,
        payTokenInputValue: "0.25",
        payTokenAmount: 25n * 10n ** 16n,
        positionCollateralToken: ETH,
        ...VALID_TRIGGER,
      }).collateralInputValue
    ).toBe("0.25");
  });

  it("omits the amount for a non-matching pay token but still passes the trigger price", () => {
    expect(
      getTradeboxMarginDepositPrefill({
        payToken: USDC,
        payTokenInputValue: "1000",
        payTokenAmount: 1000n * 10n ** 6n,
        positionCollateralToken: WETH,
        ...VALID_TRIGGER,
      })
    ).toEqual({ collateralInputValue: undefined, triggerPriceInputValue: "3000" });
  });

  it("omits the amount when it is empty, zero or unparsed", () => {
    const base = { payToken: WETH, positionCollateralToken: WETH, ...VALID_TRIGGER };

    expect(
      getTradeboxMarginDepositPrefill({ ...base, payTokenInputValue: "", payTokenAmount: 0n }).collateralInputValue
    ).toBe(undefined);
    expect(
      getTradeboxMarginDepositPrefill({ ...base, payTokenInputValue: "0", payTokenAmount: 0n }).collateralInputValue
    ).toBe(undefined);
    expect(
      getTradeboxMarginDepositPrefill({ ...base, payTokenInputValue: "abc", payTokenAmount: undefined })
        .collateralInputValue
    ).toBe(undefined);
  });

  it("omits the amount when a token is missing", () => {
    expect(
      getTradeboxMarginDepositPrefill({
        payToken: undefined,
        payTokenInputValue: "1.5",
        payTokenAmount: 15n * 10n ** 17n,
        positionCollateralToken: WETH,
        ...VALID_TRIGGER,
      }).collateralInputValue
    ).toBe(undefined);

    expect(
      getTradeboxMarginDepositPrefill({
        payToken: WETH,
        payTokenInputValue: "1.5",
        payTokenAmount: 15n * 10n ** 17n,
        positionCollateralToken: undefined,
        ...VALID_TRIGGER,
      }).collateralInputValue
    ).toBe(undefined);
  });

  it("omits the trigger price when it is empty or does not parse to a positive price", () => {
    const base = {
      payToken: WETH,
      payTokenInputValue: "1.5",
      payTokenAmount: 15n * 10n ** 17n,
      positionCollateralToken: WETH,
    };

    expect(getTradeboxMarginDepositPrefill({ ...base, triggerPriceInputValue: "", triggerPrice: undefined })).toEqual({
      collateralInputValue: "1.5",
      triggerPriceInputValue: undefined,
    });
    expect(
      getTradeboxMarginDepositPrefill({ ...base, triggerPriceInputValue: "0", triggerPrice: undefined })
        .triggerPriceInputValue
    ).toBe(undefined);
    expect(
      getTradeboxMarginDepositPrefill({ ...base, triggerPriceInputValue: "0", triggerPrice: 0n }).triggerPriceInputValue
    ).toBe(undefined);
  });

  it("returns nothing when both inputs are empty", () => {
    expect(
      getTradeboxMarginDepositPrefill({
        payToken: WETH,
        payTokenInputValue: "",
        payTokenAmount: 0n,
        positionCollateralToken: WETH,
        triggerPriceInputValue: "",
        triggerPrice: undefined,
      })
    ).toEqual({ collateralInputValue: undefined, triggerPriceInputValue: undefined });
  });
});
