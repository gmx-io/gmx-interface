import { describe, expect, it } from "vitest";

import { USD_DECIMALS } from "config/factors";
import { expandDecimals, parseValue } from "lib/numbers";

import { formatMarginDepositPriceInput, getMarginDepositPrefill } from "../marginDepositPrefill";

const USDC_DECIMALS = 6;
const POSITION_KEY = "0xposition";
const ORDER_KEY = "0xorder";

const order = {
  initialCollateralDeltaAmount: expandDecimals(250, USDC_DECIMALS),
  triggerPrice: expandDecimals(1800, USD_DECIMALS),
};

describe("formatMarginDepositPriceInput", () => {
  it("returns an empty string for a missing price", () => {
    expect(formatMarginDepositPriceInput(undefined, undefined)).toBe("");
  });

  it("formats a price into a value the trigger price input can parse back", () => {
    const formatted = formatMarginDepositPriceInput(expandDecimals(1800, USD_DECIMALS), undefined);

    expect(formatted).toBe("1800.00");
    expect(parseValue(formatted, USD_DECIMALS)).toBe(expandDecimals(1800, USD_DECIMALS));
  });

  it("applies the visual multiplier like the trigger price selector expects", () => {
    const price = expandDecimals(1, USD_DECIMALS) / 1000n;
    const formatted = formatMarginDepositPriceInput(price, 1000);

    // the selector divides the parsed input by the visual multiplier again
    expect(parseValue(formatted, USD_DECIMALS)! / 1000n).toBe(price);
  });
});

describe("getMarginDepositPrefill", () => {
  it("uses the request values when they are provided", () => {
    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY, collateralInputValue: "100", triggerPriceInputValue: "1500" },
        order: undefined,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toEqual({ collateralInputValue: "100", triggerPriceInputValue: "1500" });
  });

  it("leaves inputs untouched when the request carries no values and nothing is replaced", () => {
    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY },
        order: undefined,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toEqual({ collateralInputValue: undefined, triggerPriceInputValue: undefined });
  });

  it("prefills from the replaced order", () => {
    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY },
        order,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toEqual({ collateralInputValue: "250", triggerPriceInputValue: "1800.00" });
  });

  it("keeps request values ahead of the replaced order values", () => {
    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY, triggerPriceInputValue: "1750" },
        order,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toEqual({ collateralInputValue: "250", triggerPriceInputValue: "1750" });
  });

  it("waits for the replaced order to load", () => {
    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY },
        order: undefined,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toBeUndefined();

    expect(
      getMarginDepositPrefill({
        request: { positionKey: POSITION_KEY, replacingOrderKey: ORDER_KEY },
        order,
        collateralTokenDecimals: undefined,
        visualMultiplier: undefined,
      })
    ).toBeUndefined();
  });

  it("does not wait for the order when the request already carries both values", () => {
    expect(
      getMarginDepositPrefill({
        request: {
          positionKey: POSITION_KEY,
          replacingOrderKey: ORDER_KEY,
          collateralInputValue: "300",
          triggerPriceInputValue: "1700",
        },
        order: undefined,
        collateralTokenDecimals: USDC_DECIMALS,
        visualMultiplier: undefined,
      })
    ).toEqual({ collateralInputValue: "300", triggerPriceInputValue: "1700" });
  });
});
