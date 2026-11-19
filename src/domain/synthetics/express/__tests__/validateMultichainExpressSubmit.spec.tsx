import { zeroAddress } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { ExpressTxnParams } from "domain/synthetics/express";
import { TokensData } from "domain/tokens";

import { InsufficientGmxAccountGasTokenBalanceMessage } from "components/Errors/gasErrors";

import {
  getExpressTokenPermitBlockReason,
  getGasPaymentTokenToApprove,
  getNetworkFeeGasPaymentParams,
  reportMultichainExpressSubmitError,
} from "../validateMultichainExpressSubmit";

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

function makeExpressParams(overrides: {
  isGmxAccount: boolean;
  isOutGasTokenBalance: boolean;
  needGasPaymentTokenApproval?: boolean;
  isGasPaymentTokenBalanceLoaded?: boolean;
}): ExpressTxnParams {
  return {
    chainId: ARBITRUM,
    isGmxAccount: overrides.isGmxAccount,
    gasPaymentValidations: {
      isGasPaymentTokenBalanceLoaded: overrides.isGasPaymentTokenBalanceLoaded ?? true,
      isOutGasTokenBalance: overrides.isOutGasTokenBalance,
      needGasPaymentTokenApproval: overrides.needGasPaymentTokenApproval ?? false,
      isValid: !overrides.isOutGasTokenBalance && !overrides.needGasPaymentTokenApproval,
    },
    gasPaymentParams: {
      gasPaymentTokenAddress: USDC,
      gasPaymentToken: { symbol: "USDC" },
      gasPaymentTokenAmount: 5n,
      totalRelayerFeeTokenAmount: 10n,
    },
  } as unknown as ExpressTxnParams;
}

describe("getExpressTokenPermitBlockReason", () => {
  it.each([
    { name: "no express params", expressParams: undefined, expected: "noExpressParams" },
    {
      name: "a relayed order",
      expressParams: makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: false }),
      expected: undefined,
    },
    {
      name: "a relay blocked only by the gas payment token approval",
      expressParams: makeExpressParams({
        isGmxAccount: false,
        isOutGasTokenBalance: false,
        needGasPaymentTokenApproval: true,
      }),
      expected: undefined,
    },
    {
      name: "a gas payment token balance that is still loading",
      expressParams: makeExpressParams({
        isGmxAccount: false,
        isOutGasTokenBalance: true,
        isGasPaymentTokenBalanceLoaded: false,
        needGasPaymentTokenApproval: true,
      }),
      expected: undefined,
    },
    {
      name: "a Classic transaction fallback",
      expressParams: makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true }),
      expected: "notEnoughGasToken",
    },
    {
      name: "a GMX Account relay",
      expressParams: makeExpressParams({ isGmxAccount: true, isOutGasTokenBalance: false }),
      expected: "gmxAccount",
    },
  ])("$name -> $expected", ({ expressParams, expected }) => {
    expect(getExpressTokenPermitBlockReason(expressParams)).toBe(expected);
  });
});

describe("getGasPaymentTokenToApprove", () => {
  it("approves the fee amount of a relayed order", () => {
    const expressParams = makeExpressParams({
      isGmxAccount: false,
      isOutGasTokenBalance: false,
      needGasPaymentTokenApproval: true,
    });

    expect(getGasPaymentTokenToApprove(expressParams)).toEqual({ tokenAddress: USDC, amount: 5n });
  });

  it("keeps the fee while the gas payment token balance is still loading", () => {
    const expressParams = makeExpressParams({
      isGmxAccount: false,
      isOutGasTokenBalance: true,
      isGasPaymentTokenBalanceLoaded: false,
    });

    expect(getGasPaymentTokenToApprove(expressParams)).toEqual({ tokenAddress: USDC, amount: 5n });
  });

  it("asks for nothing when a wallet short of the gas payment token falls back to Classic", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true });

    expect(getGasPaymentTokenToApprove(expressParams)).toBeUndefined();
    expect(getGasPaymentTokenToApprove(undefined)).toBeUndefined();
  });
});

describe("getNetworkFeeGasPaymentParams", () => {
  const walletWithEth = { [zeroAddress]: { walletBalance: 100n } } as unknown as TokensData;
  const walletWithoutEth = { [zeroAddress]: { walletBalance: 0n } } as unknown as TokensData;

  it("quotes the gas payment token while the wallet can pay the Express fee", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: false });

    expect(getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth })).toBe(
      expressParams.gasPaymentParams
    );
  });

  it("drops the gas payment token when a wallet short of it falls back to a Classic transaction in ETH", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true });

    expect(getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth })).toBeUndefined();
  });

  it("keeps the gas payment token when a Classic fallback isn't allowed, matching the insufficient state that names it", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true });

    expect(
      getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth, canFallBackToClassic: false })
    ).toBe(expressParams.gasPaymentParams);
  });

  it("keeps the gas payment token when the wallet has no ETH either, matching the insufficient state that names it", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: true });

    expect(getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithoutEth })).toBe(
      expressParams.gasPaymentParams
    );
  });

  it("keeps the gas payment token awaiting an approval on a surface that has the approve step", () => {
    const expressParams = makeExpressParams({
      isGmxAccount: false,
      isOutGasTokenBalance: false,
      needGasPaymentTokenApproval: true,
    });

    expect(getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth })).toBe(
      expressParams.gasPaymentParams
    );
  });

  it("drops the gas payment token awaiting an approval on a surface without the approve step, which sends a Classic transaction", () => {
    const expressParams = makeExpressParams({
      isGmxAccount: false,
      isOutGasTokenBalance: false,
      needGasPaymentTokenApproval: true,
    });

    expect(
      getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth, canApproveGasPaymentToken: false })
    ).toBeUndefined();
  });

  it("quotes an approved and funded gas payment token on a surface without the approve step", () => {
    const expressParams = makeExpressParams({ isGmxAccount: false, isOutGasTokenBalance: false });

    expect(
      getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth, canApproveGasPaymentToken: false })
    ).toBe(expressParams.gasPaymentParams);
  });

  it("keeps the gas payment token for the GMX Account, which has no Classic fallback", () => {
    const expressParams = makeExpressParams({ isGmxAccount: true, isOutGasTokenBalance: true });

    expect(getNetworkFeeGasPaymentParams({ expressParams, tokensData: walletWithEth })).toBe(
      expressParams.gasPaymentParams
    );
  });
});

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

    expect(content).toBe("Express is unavailable right now, so this GMX Account action can't be sent");
    expect(options.autoClose).not.toBe(false);
    expect(options.tradingErrorInfo.errorData.hasExpressParams).toBe(false);
    expect(mocks.metric).toHaveBeenCalledWith("position:test");
  });
});
