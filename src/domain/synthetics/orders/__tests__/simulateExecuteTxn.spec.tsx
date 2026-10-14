import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
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

import "lib/monkeyPatching";
import { ARBITRUM } from "config/chains";
import { SwapPricingType } from "domain/synthetics/orders";
import { abis } from "sdk/abis";
import { CustomErrorName } from "sdk/utils/errors";

import { simulateExecuteTxn, type SimulateExecuteParams } from "../simulateExecuteTxn";

const { helperToastError, simulateContract } = vi.hoisted(() => ({
  helperToastError: vi.fn(),
  simulateContract: vi.fn(),
}));

vi.mock("lib/helperToast", () => ({ helperToast: { error: helperToastError } }));
vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({ simulateContract }) }));
vi.mock("lib/tenderly", () => ({ getTenderlyConfig: () => null, simulateTxWithTenderly: vi.fn() }));

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

describe("simulateExecuteTxn error toast PRO-4168", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
    helperToastError.mockClear();
  });

  afterEach(cleanup);

  it.each([
    [
      "the nested PnL-factor cause of a GM withdrawal",
      "simulateExecuteLatestWithdrawal",
      wrapInExternalCall(pnlFactorExceededForShorts),
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later.",
    ],
    [
      "the nested PnL-factor cause of a GLV withdrawal",
      "simulateExecuteLatestGlvWithdrawal",
      wrapInExternalCall(pnlFactorExceededForShorts),
      "Withdrawal unavailable: selling this amount would raise short traders' PnL-to-pool ratio to 48.01%, above the 45% limit. Try a smaller amount or try again later.",
    ],
    [
      "the nested PnL-factor cause of a deposit",
      "simulateExecuteLatestDeposit",
      wrapInExternalCall(pnlFactorExceededForShorts),
      "Max profit limit reached. Current: 48.01%, max: 45.00%",
    ],
    [
      "the flow title for an unmapped error",
      "simulateExecuteLatestWithdrawal",
      encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" }),
      "Withdrawal error",
    ],
    [
      "the flow title for a wrapped cause that is not a custom error",
      "simulateExecuteLatestWithdrawal",
      wrapInExternalCall("0x08c379a0"),
      "Withdrawal error",
    ],
  ] as [string, SimulateExecuteParams["method"], Hex, string][])("toasts %s", async (_, method, data, message) => {
    simulateContract.mockRejectedValue(viemRevert(data));

    await expect(
      simulateExecuteTxn(ARBITRUM, {
        account: zeroAddress,
        createMulticallPayload: [],
        primaryPriceOverrides: {},
        tokensData: {},
        value: 0n,
        method,
        errorTitle: "Withdrawal error",
        swapPricingType: SwapPricingType.Withdrawal,
        blockTimestampData: { blockTimestamp: 1n, localTimestamp: 1n },
      })
    ).rejects.toBeInstanceOf(ContractFunctionExecutionError);

    const content: ReactNode = helperToastError.mock.calls[0][0];
    const { container } = render(<I18nProvider i18n={i18n}>{content}</I18nProvider>);

    expect(container.textContent).toContain(message);
  });
});
