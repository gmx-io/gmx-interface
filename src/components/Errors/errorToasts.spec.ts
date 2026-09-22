import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { TxErrorType } from "sdk/utils/errors/transactionsErrors";

import { getDebugErrorMessage, getInsufficientBalanceToastBanner, getTxnErrorToast } from "./errorToasts";
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

const ERC20_BALANCE_REVERT = { errorMessage: "execution reverted: ERC20: transfer amount exceeds balance" };

const WALLET_FEE_BANNER = {
  kind: "fee",
  validationBannerErrorName: ValidationBannerErrorName.insufficientWalletGasTokenBalance,
  gasPaymentTokenAddress: USDC,
};

describe("getInsufficientBalanceToastBanner", () => {
  it("names the collateral token from the revert instead of the configured gas token", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "InsufficientMultichainBalance", contractErrorArgs: [ACCOUNT, WETH, 0n, 1n] },
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toEqual({ kind: "payToken", isGmxAccount: true, tokenAddress: WETH });
  });

  it("keeps the fee banner when the revert names the gas token itself", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "InsufficientMultichainBalance", contractErrorArgs: [ACCOUNT, USDC, 0n, 1n] },
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toEqual({
      kind: "fee",
      validationBannerErrorName: ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance,
      gasPaymentTokenAddress: USDC,
    });
  });

  it("falls back to the configured gas token when the revert names a token outside the token config", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "InsufficientMultichainBalance", contractErrorArgs: [ACCOUNT, GM_TOKEN, 0n, 1n] },
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
      })
    ).toEqual({
      kind: "fee",
      validationBannerErrorName: ValidationBannerErrorName.insufficientGmxAccountCurrentGasTokenBalance,
      gasPaymentTokenAddress: USDC,
    });
  });

  it("blames the gas token for a bare ERC20 revert when the transaction pulls nothing else", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: ERC20_BALANCE_REVERT,
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: false, payTokenAddresses: [USDC] },
      })
    ).toEqual(WALLET_FEE_BANNER);
  });

  it("names the collateral token when its balance is the only one that cannot cover the transaction", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: ERC20_BALANCE_REVERT,
        expressTxn: {
          gasPaymentTokenAddress: WETH,
          isGmxAccount: false,
          payTokenAddresses: [USDC, WETH],
          possiblyInsufficientTokenAddresses: [USDC],
        },
      })
    ).toEqual({ kind: "payToken", isGmxAccount: false, tokenAddress: USDC });
  });

  it("names the gas token when its balance is the only one that cannot cover the transaction", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: ERC20_BALANCE_REVERT,
        expressTxn: {
          gasPaymentTokenAddress: USDC,
          isGmxAccount: false,
          payTokenAddresses: [WETH, USDC],
          possiblyInsufficientTokenAddresses: [USDC],
        },
      })
    ).toEqual(WALLET_FEE_BANNER);
  });

  it("does not guess between the collateral and the gas token when the balances do not settle it", () => {
    const expressTxn = { gasPaymentTokenAddress: WETH, isGmxAccount: false, payTokenAddresses: [USDC, WETH] };

    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: ERC20_BALANCE_REVERT,
        expressTxn: { ...expressTxn, possiblyInsufficientTokenAddresses: [] },
      })
    ).toEqual({ kind: "unknown", isGmxAccount: false, gasPaymentTokenAddress: WETH, payTokenAddresses: [USDC] });

    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: ERC20_BALANCE_REVERT,
        expressTxn: { ...expressTxn, possiblyInsufficientTokenAddresses: [USDC, WETH] },
      })
    ).toEqual({ kind: "unknown", isGmxAccount: false, gasPaymentTokenAddress: WETH, payTokenAddresses: [USDC] });
  });

  it("treats NotEnoughFunds on the Express path as a gas token shortfall, not a native one", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { txErrorType: TxErrorType.NotEnoughFunds },
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: false },
      })
    ).toEqual(WALLET_FEE_BANNER);
  });

  it("leaves NotEnoughFunds to the native banner when the transaction was not Express", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { txErrorType: TxErrorType.NotEnoughFunds },
        expressTxn: undefined,
      })
    ).toBeUndefined();
  });

  it("ignores unrelated contract errors", () => {
    expect(
      getInsufficientBalanceToastBanner({
        chainId: ARBITRUM,
        errorData: { contractError: "OrderNotFound", contractErrorArgs: ["0xkey"] },
        expressTxn: { gasPaymentTokenAddress: USDC, isGmxAccount: true },
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
