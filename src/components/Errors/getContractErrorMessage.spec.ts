import { ethers } from "ethers";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  zeroAddress,
  type Abi,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { CustomError } from "lib/errors";
import { expandDecimals } from "lib/numbers";
import { abis } from "sdk/abis";
import { CustomErrorName } from "sdk/utils/errors";

import { getContractErrorMessage, getContractErrorMessageFromError } from "./getContractErrorMessage";

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

  it("explains a bridge output below the signed minimum as a bridge fee increase PRO-4110", () => {
    expect(
      getContractErrorMessage({
        errorData: {
          contractError: CustomErrorName.InsufficientBridgeOutputAmount,
          contractErrorArgs: {
            outputAmount: 499_748n,
            minAmountOut: 500_000n,
          },
        },
      })
    ).toBe("Bridge fee increased. Funds remain in your GMX Account. Try again");
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

describe("getContractErrorMessage — GM/GLV and multichain flows PRO-4168", () => {
  // TON GM withdrawal revert: 48.01% short PnL-to-pool ratio against the 45% withdrawal cap
  const pnlFactorExceededForShorts = encodeErrorResult({
    abi: abis.CustomErrors,
    errorName: CustomErrorName.PnlFactorExceededForShorts,
    args: [480103447088416912169261436793n, 450000000000000000000000000000n],
  });
  const wrapInExternalCall = (data: Hex) =>
    encodeErrorResult({ abi: abis.CustomErrors, errorName: CustomErrorName.ExternalCallFailed, args: [data] });
  const viemRevert = (data: Hex) =>
    new ContractFunctionExecutionError(
      new ContractFunctionRevertedError({ abi: abis.CustomErrors as Abi, data, functionName: "multicall" }),
      { abi: [], functionName: "multicall" }
    );

  const shortsWithdrawalMessage =
    "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later.";

  it.each([
    ["a simulation revert", viemRevert(wrapInExternalCall(pnlFactorExceededForShorts))],
    [
      "a doubly wrapped simulation revert",
      viemRevert(wrapInExternalCall(wrapInExternalCall(pnlFactorExceededForShorts))),
    ],
    [
      "a relay call exception",
      ethers.makeError("execution reverted (unknown custom error)", "CALL_EXCEPTION", {
        transaction: { to: zeroAddress, data: "0x" },
        data: wrapInExternalCall(pnlFactorExceededForShorts),
        action: "call",
        reason: null,
        invocation: null,
        revert: null,
      }),
    ],
    [
      "a wallet send revert",
      ethers.makeError("could not coalesce error", "UNKNOWN_ERROR", {
        error: { code: 3, message: "execution reverted", data: wrapInExternalCall(pnlFactorExceededForShorts) },
      }),
    ],
    [
      "a relay estimation error",
      new CustomError({
        name: CustomErrorName.ExternalCallFailed,
        message: "",
        args: { data: wrapInExternalCall(pnlFactorExceededForShorts) },
      }),
    ],
  ])("resolves %s to the innermost PnL-factor cause of a withdrawal", (_, error) => {
    expect(getContractErrorMessageFromError({ chainId: ARBITRUM, error, isLpWithdrawal: true })).toBe(
      shortsWithdrawalMessage
    );
  });

  it.each([
    [
      "an unmapped error",
      wrapInExternalCall(encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" })),
    ],
    ["a cause that is not a custom error", wrapInExternalCall("0x08c379a0")],
  ])("leaves %s wrapped in ExternalCallFailed unmapped outside orders", (_, data) => {
    expect(getContractErrorMessageFromError({ chainId: ARBITRUM, error: viemRevert(data) })).toBeUndefined();
  });

  it.each([
    [
      "long side of a withdrawal",
      {
        contractError: CustomErrorName.PnlFactorExceededForLongs,
        contractErrorArgs: { pnlToPoolFactor: 623100000000000000000000000000n, maxPnlFactor: expandDecimals(6, 29) },
      },
      true,
      "Withdrawal unavailable: selling this amount would raise long traders' PnL-to-pool ratio to 62.31%, above the 60% limit. Try a smaller amount or try again later.",
    ],
    [
      "PnL factor outside a withdrawal",
      {
        contractError: CustomErrorName.PnlFactorExceededForShorts,
        contractErrorArgs: { pnlToPoolFactor: 480103447088416912169261436793n, maxPnlFactor: expandDecimals(45, 28) },
      },
      false,
      "Max profit limit reached. Current: 48.01%, max: 45.00%",
    ],
    [
      "withdrawal ratio that rounds to its limit",
      {
        contractError: CustomErrorName.PnlFactorExceededForShorts,
        contractErrorArgs: { pnlToPoolFactor: 450040000000000000000000000000n, maxPnlFactor: expandDecimals(45, 28) },
      },
      true,
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 45.01%, above the 45% limit. Try a smaller amount or try again later.",
    ],
    [
      "PnL factor that rounds to its limit outside a withdrawal",
      {
        contractError: CustomErrorName.PnlFactorExceededForLongs,
        contractErrorArgs: { pnlToPoolFactor: 450040000000000000000000000000n, maxPnlFactor: expandDecimals(45, 28) },
      },
      false,
      "Max profit limit reached. Current: 45.01%, max: 45.00%",
    ],
    [
      "top-level mapped error",
      { contractError: CustomErrorName.DisabledMarket, contractErrorArgs: { market: zeroAddress } },
      true,
      "Market temporarily disabled",
    ],
    [
      "wrapped unmapped error",
      {
        contractError: CustomErrorName.ExternalCallFailed,
        contractErrorArgs: {
          data: encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" }),
        },
      },
      true,
      "Order execution failed",
    ],
    ["unmapped error", { contractError: "EmptyWithdrawalAmount", contractErrorArgs: undefined }, true, undefined],
  ])("maps %s", (_, errorData, isLpWithdrawal, expected) => {
    expect(getContractErrorMessage({ chainId: ARBITRUM, errorData, isLpWithdrawal })).toBe(expected);
  });
});
