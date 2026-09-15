import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { TxErrorType } from "sdk/utils/errors/transactionsErrors";

import { getDebugErrorMessage, getInsufficientFeeToastBanner, getTxnErrorToast } from "./errorToasts";
import { InsufficientNativeTokenBalanceMessage, InsufficientSourceChainNativeTokenBalanceMessage } from "./gasErrors";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const GM_TOKEN = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";

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

  it("is unchanged when no task is involved", () => {
    expect(getDebugErrorMessage({ errorMessage: "boom" })).toBe("boom");
    expect(getDebugErrorMessage(undefined)).toBeUndefined();
  });
});

describe("getInsufficientFeeToastBanner", () => {
  it("names the token from the revert over the configured gas token and picks the GMX Account banner", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "InsufficientMultichainBalance", contractErrorArgs: [ACCOUNT, WETH, 0n, 1n] },
        expressFee: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toEqual({
      validationBannerErrorName: ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance,
      gasPaymentTokenAddress: WETH,
    });
  });

  it("falls back to the configured gas token when the revert names a token outside the token config", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "InsufficientMultichainBalance", contractErrorArgs: [ACCOUNT, GM_TOKEN, 0n, 1n] },
        expressFee: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toEqual({
      validationBannerErrorName: ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance,
      gasPaymentTokenAddress: USDC,
    });
  });

  it("falls back to the configured gas token for a bare ERC20 balance revert paid from the wallet", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { errorMessage: "execution reverted: ERC20: transfer amount exceeds balance" },
        expressFee: { gasPaymentTokenAddress: USDC, isGmxAccount: false },
      })
    ).toEqual({
      validationBannerErrorName: ValidationBannerErrorName.insufficientWalletGasTokenBalance,
      gasPaymentTokenAddress: USDC,
    });
  });

  it("treats NotEnoughFunds on the Express path as a gas token shortfall, not a native one", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { txErrorType: TxErrorType.NotEnoughFunds },
        expressFee: { gasPaymentTokenAddress: USDC, isGmxAccount: false },
      })
    ).toEqual({
      validationBannerErrorName: ValidationBannerErrorName.insufficientWalletGasTokenBalance,
      gasPaymentTokenAddress: USDC,
    });
  });

  it("leaves NotEnoughFunds to the native banner when the transaction was not Express", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { txErrorType: TxErrorType.NotEnoughFunds },
        expressFee: undefined,
      })
    ).toBeUndefined();
  });

  it("ignores unrelated contract errors", () => {
    expect(
      getInsufficientFeeToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "OrderNotFound", contractErrorArgs: ["0xkey"] },
        expressFee: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toBeUndefined();
  });
});

describe("getTxnErrorToast NotEnoughFunds", () => {
  it("renders the native banner for a settlement chain", () => {
    const { errorContent } = getTxnErrorToast(ARBITRUM, { txErrorType: TxErrorType.NotEnoughFunds }, {});

    expect(isValidElement(errorContent) && errorContent.type).toBe(InsufficientNativeTokenBalanceMessage);
  });

  it("renders the source chain banner instead of the native one for a source chain id", () => {
    const { errorContent } = getTxnErrorToast(SOURCE_BASE_MAINNET, { txErrorType: TxErrorType.NotEnoughFunds }, {});

    expect(isValidElement(errorContent) && errorContent.type).toBe(InsufficientSourceChainNativeTokenBalanceMessage);
  });
});
