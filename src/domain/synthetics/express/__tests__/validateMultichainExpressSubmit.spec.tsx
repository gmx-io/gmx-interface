import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";

import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";

import { reportMultichainExpressSubmitError } from "../validateMultichainExpressSubmit";

const mocks = vi.hoisted(() => ({
  toastError: vi.fn(),
  metric: vi.fn(),
}));

vi.mock("lib/helperToast", () => ({
  helperToast: { error: mocks.toastError, success: vi.fn(), info: vi.fn() },
}));

vi.mock("lib/metrics/utils", () => ({
  sendTxnValidationErrorMetric: mocks.metric,
}));

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

function makeExpressParams(overrides: { isGmxAccount: boolean; isOutGasTokenBalance: boolean }): ExpressTxnParams {
  return {
    chainId: ARBITRUM,
    isGmxAccount: overrides.isGmxAccount,
    gasPaymentValidations: {
      isGasPaymentTokenBalanceLoaded: true,
      isOutGasTokenBalance: overrides.isOutGasTokenBalance,
      needGasPaymentTokenApproval: false,
      isValid: !overrides.isOutGasTokenBalance,
    },
    gasPaymentParams: {
      gasPaymentTokenAddress: USDC,
      gasPaymentToken: { symbol: "USDC" },
      totalRelayerFeeTokenAmount: 10n,
    },
  } as unknown as ExpressTxnParams;
}

describe("reportMultichainExpressSubmitError", () => {
  beforeEach(() => {
    mocks.toastError.mockReset();
    mocks.metric.mockReset();
  });

  it("does not block wallet submissions whatever the express params are", () => {
    expect(
      reportMultichainExpressSubmitError({
        isGmxAccount: false,
        expressParams: makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true }),
        tokensData: undefined,
        actionName: "Cancel Order",
      })
    ).toBe(false);
    expect(
      reportMultichainExpressSubmitError({
        isGmxAccount: false,
        expressParams: undefined,
        tokensData: undefined,
        actionName: "Cancel Order",
      })
    ).toBe(false);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("shows the GMX Account deposit banner in a sticky toast when the gas token balance is insufficient", () => {
    const expressParams = makeExpressParams({ isGmxAccount: true, isOutGasTokenBalance: true });

    expect(
      reportMultichainExpressSubmitError({
        isGmxAccount: true,
        expressParams,
        tokensData: undefined,
        actionName: "Cancel Order",
        collateral: "USDC",
        metricId: "position:test",
      })
    ).toBe(true);

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    const [content, options] = mocks.toastError.mock.calls[0];

    expect(content.type).toBe(InsufficientGmxAccountGasTokenBalanceMessage);
    expect(content.props.chainId).toBe(expressParams.chainId);
    expect(content.props.gasPaymentTokenAddress).toBe(expressParams.gasPaymentParams.gasPaymentTokenAddress);

    expect(options.autoClose).toBe(false);
    expect(options.tradingErrorInfo.actionName).toBe("Cancel Order");
    expect(options.tradingErrorInfo.collateral).toBe("USDC");
    expect(options.tradingErrorInfo.errorData.hasExpressParams).toBe(true);
    expect(options.tradingErrorInfo.errorData.gasPaymentValidations).toBe(expressParams.gasPaymentValidations);

    expect(mocks.metric).toHaveBeenCalledWith("position:test");
  });

  it("falls back to the Express-unavailable text when there are no express params at all", () => {
    expect(
      reportMultichainExpressSubmitError({
        isGmxAccount: true,
        expressParams: undefined,
        tokensData: undefined,
        actionName: "Cancel Order",
        metricId: "position:test",
      })
    ).toBe(true);

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    const [content, options] = mocks.toastError.mock.calls[0];

    expect(content).toBe("Express is unavailable right now, so this GMX Account action can't be sent.");
    expect(options.autoClose).not.toBe(false);
    expect(options.tradingErrorInfo.errorData.hasExpressParams).toBe(false);
    expect(mocks.metric).toHaveBeenCalledWith("position:test");
  });
});
