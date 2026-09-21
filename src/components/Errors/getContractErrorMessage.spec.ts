import { describe, expect, it } from "vitest";

import { expandDecimals } from "lib/numbers";
import { CustomErrorName } from "sdk/utils/errors";

import { getContractErrorMessage } from "./getContractErrorMessage";

describe("getContractErrorMessage", () => {
  it("returns a friendly collateral cap error", () => {
    expect(
      getContractErrorMessage({
        errorData: {
          contractError: CustomErrorName.MaxCollateralSumExceeded,
          contractErrorArgs: {
            collateralSum: 101n,
            maxCollateralSum: 100n,
          },
        },
      })
    ).toBe("Maximum collateral capacity reached");
  });

  it("returns a friendly relay fee cap error", () => {
    expect(
      getContractErrorMessage({
        errorData: {
          contractError: CustomErrorName.MaxRelayFeeSwapExceeded,
          contractErrorArgs: {
            feeUsd: 101n,
            maxFeeUsd: 100n,
          },
        },
      })
    ).toBe("Relay fee exceeds the maximum allowed");
  });
});

describe("getContractErrorMessage — InsufficientCollateralUsd", () => {
  const call = (contractErrorArgs: Record<string, bigint>, isSizeIncrease?: boolean) =>
    getContractErrorMessage({
      errorData: { contractError: CustomErrorName.InsufficientCollateralUsd, contractErrorArgs },
      isSizeIncrease,
    });

  it("reports the remaining margin the contract returns, not a shortfall", () => {
    // 169976087486576063057841450000000n / 1e30 = 169.976… → $169.98; formatUsd puts a hair space after $
    expect(call({ remainingCollateralUsd: 169976087486576063057841450000000n }, true)).toMatch(
      /^Max leverage exceeded\. Remaining margin \$\s?169\.98 is below the minimum for the position size\. Increase margin or reduce size$/
    );
  });

  it("keeps the sign of a negative remaining margin", () => {
    // -5e30 / 1e30 = -5 → -$5.00
    expect(call({ remainingCollateralUsd: -expandDecimals(5, 30) })).toMatch(
      /^Max leverage exceeded\. Remaining margin -\$\s?5\.00 is below the minimum for the position size\. Increase margin or reduce size$/
    );
  });

  it("falls back to the copy without numbers", () => {
    expect(call({})).toBe("Max leverage exceeded. Increase margin or reduce size");
  });
});

describe("getContractErrorMessage — LiquidatablePosition", () => {
  const call = (reason: string, extraArgs: Record<string, bigint> = {}, isSizeIncrease?: boolean) =>
    getContractErrorMessage({
      errorData: {
        contractError: CustomErrorName.LiquidatablePosition,
        contractErrorArgs: {
          reason,
          remainingCollateralUsd: expandDecimals(90, 30),
          minCollateralUsd: expandDecimals(100, 30),
          ...extraArgs,
        },
      },
      isSizeIncrease,
    });

  it("routes the leverage reason to the increase-specific copy for a size increase", () => {
    expect(call("min collateral for leverage", {}, true)).toBe(
      "The position cannot be increased at the current leverage. Increase margin or reduce size."
    );
  });

  it("adds the margin figures to the increase copy when the contract reports them", () => {
    // formatUsd separates the sign with a non-breaking space, so match on the shape
    expect(call("min collateral for leverage", { minCollateralUsdForLeverage: expandDecimals(120, 30) }, true)).toMatch(
      /^The position cannot be increased at the current leverage\. Increase margin or reduce size\. Current margin: \$\s?90\.00, required: \$\s?120\.00$/
    );
  });

  it.each([false, undefined])(
    "uses the neutral copy for the leverage reason when the order is not a size increase (%s)",
    (isSizeIncrease) => {
      expect(call("min collateral for leverage", {}, isSizeIncrease)).toBe(
        "Margin is below the minimum required for the position size"
      );
    }
  );

  it("adds the margin figures to the neutral copy when the contract reports them", () => {
    expect(
      call("min collateral for leverage", { minCollateralUsdForLeverage: expandDecimals(120, 30) }, false)
    ).toMatch(
      /^Margin is below the minimum required for the position size\. Current: \$\s?90\.00, required: \$\s?120\.00$/
    );
  });

  it.each(["min collateral", "< 0"])("keeps the generic copy for reason '%s'", (reason) => {
    // formatUsd separates the sign with a non-breaking space, so match on the shape
    expect(call(reason)).toMatch(/^Position would be liquidatable\. Current: \$\s?90\.00, required: \$\s?100\.00$/);
  });
});
