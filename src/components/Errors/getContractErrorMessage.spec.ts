import { describe, expect, it } from "vitest";

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
