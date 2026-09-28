import { encodeErrorResult, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import "lib/monkeyPatching";
import { ARBITRUM } from "config/chains";
import { CustomError } from "lib/errors";
import { abis } from "sdk/abis";
import { CustomErrorName } from "sdk/utils/errors";

import { getGmSwapSimulationErrorText } from "./getGmSwapSimulationErrorText";

// relay estimation errors reach the GM/GLV box as CustomError built by fallbackCustomError
const relayError = (name: string, args?: Record<string, unknown>) =>
  new CustomError({ name, message: JSON.stringify({ name, args }), args });

const pnlFactorExceededForShorts = encodeErrorResult({
  abi: abis.CustomErrors,
  errorName: CustomErrorName.PnlFactorExceededForShorts,
  args: [480103447088416912169261436793n, 450000000000000000000000000000n],
});

describe("getGmSwapSimulationErrorText PRO-4168", () => {
  it.each([
    [
      "the nested PnL-factor cause of a withdrawal",
      relayError(CustomErrorName.ExternalCallFailed, { data: pnlFactorExceededForShorts }),
      false,
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later.",
    ],
    [
      "the nested PnL-factor cause of a deposit",
      relayError(CustomErrorName.ExternalCallFailed, { data: pnlFactorExceededForShorts }),
      true,
      "Max profit limit reached. Current: 48.01%, max: 45.00%",
    ],
    [
      "a top-level mapped error",
      relayError(CustomErrorName.DisabledMarket, { market: zeroAddress }),
      false,
      "Market temporarily disabled",
    ],
    ["an insufficient GMX Account balance", relayError("InsufficientMultichainBalance"), true, "Insufficient balance"],
    [
      "a pool at capacity",
      relayError(CustomErrorName.MaxPoolAmountExceeded, { poolAmount: 2n, maxPoolAmount: 1n }),
      true,
      "Maximum pool capacity reached",
    ],
    ["an unmapped withdrawal error", relayError("EmptyWithdrawalAmount"), false, "Error simulating withdrawal"],
    [
      "a wrapped unmapped withdrawal error",
      relayError(CustomErrorName.ExternalCallFailed, {
        data: encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" }),
      }),
      false,
      "Error simulating withdrawal",
    ],
    ["an unmapped deposit error", relayError("EmptyWithdrawalAmount"), true, "Error simulating deposit"],
  ])("shows %s", (_, error, isDeposit, expected) => {
    expect(getGmSwapSimulationErrorText({ chainId: ARBITRUM, error, isDeposit })).toBe(expected);
  });
});
