import { ethers } from "ethers";
import { encodeErrorResult, zeroAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { isCustomError } from "lib/errors";
import { abis } from "sdk/abis";
import { CustomErrorName } from "sdk/utils/errors";

import { getContractErrorMessageFromError } from "components/Errors/getContractErrorMessage";

import { fallbackCustomError } from "./fallbackCustomError";

const pnlFactorExceededForShorts = encodeErrorResult({
  abi: abis.CustomErrors,
  errorName: CustomErrorName.PnlFactorExceededForShorts,
  args: [480103447088416912169261436793n, 450000000000000000000000000000n],
});
const wrapInExternalCall = (data: Hex) =>
  encodeErrorResult({ abi: abis.CustomErrors, errorName: CustomErrorName.ExternalCallFailed, args: [data] });

const catchError = (error: unknown) =>
  fallbackCustomError(() => Promise.reject(error), "gasLimit").then(
    () => undefined,
    (thrown) => thrown
  );

describe("fallbackCustomError PRO-4168", () => {
  it("rethrows a relay call exception as a CustomError that keeps the nested cause", async () => {
    const error = await catchError(
      ethers.makeError("execution reverted (unknown custom error)", "CALL_EXCEPTION", {
        transaction: { to: zeroAddress, data: "0x" },
        data: wrapInExternalCall(pnlFactorExceededForShorts),
        action: "estimateGas",
        reason: null,
        invocation: null,
        revert: null,
      })
    );

    expect(isCustomError(error)).toBe(true);
    expect(error.name).toBe(CustomErrorName.ExternalCallFailed);
    expect(error.errorContext).toBe("gasLimit");
    expect(getContractErrorMessageFromError({ chainId: ARBITRUM, error, isLpWithdrawal: true })).toBe(
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later."
    );
  });

  it("rethrows an error without revert data as is", async () => {
    const original = new Error("network error");

    const error = await catchError(original);

    expect(error).toBe(original);
    expect(error.errorContext).toBe("gasLimit");
  });
});
