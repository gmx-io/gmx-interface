import { describe, expect, it } from "vitest";

import { getIsConfirmedOutOfGasPaymentTokenBalance } from "./expressParamsUtils";

describe("getIsConfirmedOutOfGasPaymentTokenBalance", () => {
  it("does not confirm insufficiency while the balance has not loaded yet", () => {
    expect(
      getIsConfirmedOutOfGasPaymentTokenBalance({
        isOutGasTokenBalance: true,
        isGasPaymentTokenBalanceLoaded: false,
      })
    ).toBe(false);
  });

  it("confirms insufficiency once the balance is loaded and too low", () => {
    expect(
      getIsConfirmedOutOfGasPaymentTokenBalance({
        isOutGasTokenBalance: true,
        isGasPaymentTokenBalanceLoaded: true,
      })
    ).toBe(true);
  });

  it("does not confirm when the loaded balance is sufficient", () => {
    expect(
      getIsConfirmedOutOfGasPaymentTokenBalance({
        isOutGasTokenBalance: false,
        isGasPaymentTokenBalanceLoaded: true,
      })
    ).toBe(false);
  });

  it("does not confirm when validations are missing", () => {
    expect(getIsConfirmedOutOfGasPaymentTokenBalance(undefined)).toBe(false);
  });
});
