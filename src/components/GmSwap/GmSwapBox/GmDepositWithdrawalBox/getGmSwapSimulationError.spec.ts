import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { encodeErrorResult, zeroAddress } from "viem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "lib/monkeyPatching";
import { ARBITRUM } from "config/chains";
import { CustomError } from "lib/errors";
import { abis } from "sdk/abis";
import { CustomErrorName } from "sdk/utils/errors";

import { getGmSwapSimulationError } from "./getGmSwapSimulationError";

// relay estimation errors reach the GM/GLV box as CustomError built by fallbackCustomError
const relayError = (name: string, args?: Record<string, unknown>) =>
  new CustomError({ name, message: JSON.stringify({ name, args }), args });

const pnlFactorExceededForShorts = encodeErrorResult({
  abi: abis.CustomErrors,
  errorName: CustomErrorName.PnlFactorExceededForShorts,
  args: [480103447088416912169261436793n, 450000000000000000000000000000n],
});

describe("getGmSwapSimulationError PRO-4168", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

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
  ])("shows %s in the button", (_, error, isDeposit, expected) => {
    expect(getGmSwapSimulationError({ chainId: ARBITRUM, error, isDeposit })).toEqual({ text: expected });
  });

  it.each([
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
  ])("keeps the diagnostics of %s under Show error in the tooltip", (_, error, isDeposit, expected) => {
    const { text, description } = getGmSwapSimulationError({ chainId: ARBITRUM, error, isDeposit });

    const { container, getByText } = render(createElement(I18nProvider, { i18n }, description));

    expect(text).toBe(expected);
    expect(container.textContent).not.toContain(error.name);

    fireEvent.click(getByText("Show error"));

    expect(container.textContent).toContain(error.name);
  });
});
