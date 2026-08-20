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

describe("getContractErrorMessage — LiquidatablePosition", () => {
  const call = (reason: string) =>
    getContractErrorMessage({
      errorData: {
        contractError: CustomErrorName.LiquidatablePosition,
        contractErrorArgs: {
          reason,
          remainingCollateralUsd: expandDecimals(90, 30),
          minCollateralUsd: expandDecimals(100, 30),
        },
      },
    });

  it("routes the leverage reason to the increase-specific copy", () => {
    expect(call("min collateral for leverage")).toBe(
      "The position cannot be increased at the current leverage. Increase margin or reduce size."
    );
  });

  it.each(["min collateral", "< 0"])("keeps the generic copy for reason '%s'", (reason) => {
    // formatUsd separates the sign with a non-breaking space, so match on the shape
    expect(call(reason)).toMatch(/^Position would be liquidatable\. Current: \$\s?90\.00, required: \$\s?100\.00$/);
  });
});
