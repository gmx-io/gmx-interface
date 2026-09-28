import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  zeroAddress,
  type Abi,
  type Hex,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { abis } from "sdk/abis";

import { toastCustomOrStargateError } from "./toastCustomOrStargateError";

const { helperToastError } = vi.hoisted(() => ({ helperToastError: vi.fn() }));

vi.mock("lib/helperToast", () => ({
  helperToast: { error: helperToastError },
}));

const viemRevert = (data: Hex) =>
  new ContractFunctionExecutionError(
    new ContractFunctionRevertedError({ abi: abis.CustomErrors as Abi, data, functionName: "multicall" }),
    { abi: [], functionName: "multicall" }
  );

describe("toastCustomOrStargateError", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
    helperToastError.mockClear();
  });

  afterEach(cleanup);

  it.each([
    [
      "nested PnL-factor revert of the TON GM withdrawal PRO-4168",
      encodeErrorResult({
        abi: abis.CustomErrors,
        errorName: "ExternalCallFailed",
        args: [
          encodeErrorResult({
            abi: abis.CustomErrors,
            errorName: "PnlFactorExceededForShorts",
            args: [480103447088416912169261436793n, 450000000000000000000000000000n],
          }),
        ],
      }),
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later.",
      "ExternalCallFailed",
    ],
    [
      "top-level mapped revert",
      encodeErrorResult({ abi: abis.CustomErrors, errorName: "DisabledMarket", args: [zeroAddress] }),
      "Market temporarily disabled",
      "DisabledMarket",
    ],
    [
      "unmapped revert",
      encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" }),
      "Transaction failed",
      "EmptyWithdrawalAmount",
    ],
    [
      "wrapped unmapped revert",
      encodeErrorResult({
        abi: abis.CustomErrors,
        errorName: "ExternalCallFailed",
        args: [encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" })],
      }),
      "Transaction failed",
      "ExternalCallFailed",
    ],
  ])("shows readable copy for a %s and keeps the raw error under Show error", (_, data, message, rawErrorName) => {
    toastCustomOrStargateError(ARBITRUM, viemRevert(data), { actionName: "GM Withdrawal", isLpWithdrawal: true });

    const content: ReactNode = helperToastError.mock.calls[0][0];
    const { container, getByText } = render(<I18nProvider i18n={i18n}>{content}</I18nProvider>);

    expect(container.textContent).toContain(message);
    expect(container.textContent).not.toContain(rawErrorName);

    fireEvent.click(getByText("Show error"));

    expect(container.textContent).toContain(rawErrorName);
  });
});
