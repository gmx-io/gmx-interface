import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { CustomError, extendError, parseError } from "lib/errors";
import { expandDecimals } from "lib/numbers";

import { getDebugErrorMessage, getTxnErrorToast } from "./errorToasts";

describe("getDebugErrorMessage", () => {
  it("carries the taskId so the user can copy it out of a failure", () => {
    const message = getDebugErrorMessage({ errorMessage: "boom", data: { taskId: "0xabc" } });

    expect(message).toContain("boom");
    expect(message).toContain("0xabc");
  });

  it("shows the taskId even when there is no message to go with it", () => {
    expect(getDebugErrorMessage({ data: { taskId: "0xabc" } })).toContain("0xabc");
  });

  it("falls back to the trace id when the request never became a task", () => {
    const message = getDebugErrorMessage({ errorMessage: "refused", data: { traceId: "tr-1" } });

    expect(message).toContain("refused");
    expect(message).toContain("tr-1");
  });

  it("shows both when both are known", () => {
    const message = getDebugErrorMessage({ data: { taskId: "0xabc", traceId: "tr-1" } });

    expect(message).toContain("0xabc");
    expect(message).toContain("tr-1");
  });

  it("keeps the contract error and its arguments", () => {
    const message = getDebugErrorMessage({
      contractError: "InsufficientExecutionFee",
      contractErrorArgs: [1200, 1000],
      errorMessage: "boom",
    });

    expect(message).toContain("InsufficientExecutionFee");
    expect(message).toContain("1200");
  });

  it("lists the argument values of a contract error decoded by name", () => {
    const message = getDebugErrorMessage({
      contractError: "UnableToWithdrawCollateral",
      contractErrorArgs: { estimatedRemainingCollateralUsd: 90n },
      errorMessage: "boom",
    });

    expect(message).toBe("UnableToWithdrawCollateral [90] boom");
  });

  it("is unchanged when no task is involved", () => {
    expect(getDebugErrorMessage({ errorMessage: "boom" })).toBe("boom");
    expect(getDebugErrorMessage(undefined)).toBeUndefined();
  });
});

describe("getTxnErrorToast", () => {
  it("explains a decrease that the order simulation rejects for the leverage reason", () => {
    const simulationError = extendError(
      new CustomError({
        name: "LiquidatablePosition",
        message: "{}",
        args: {
          reason: "min collateral for leverage",
          remainingCollateralUsd: expandDecimals(90, 30),
          minCollateralUsd: expandDecimals(5, 30),
          minCollateralUsdForLeverage: expandDecimals(120, 30),
        },
      }),
      { errorContext: "simulation" }
    );

    const { errorContent } = getTxnErrorToast(ARBITRUM, parseError(simulationError), { isDecrease: true });

    // formatUsd separates the sign with a non-breaking space, so match on the shape
    expect(errorContent).toMatch(
      /^The remaining position would exceed the maximum allowed leverage\. Close a larger part, withdraw less, or add margin first\. Remaining margin: \$\s?90\.00, required: \$\s?120\.00$/
    );
  });
});
