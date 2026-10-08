import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { makeError } from "ethers";
import { ReactNode, createElement, isValidElement } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET, SOURCE_ETHEREUM_MAINNET } from "config/chains";
import { ValidationBannerErrorName } from "domain/synthetics/trade/utils/validation";
import { parseError } from "lib/errors";
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

describe("getTxnErrorToast wallet errors", () => {
  const sendTransactionError = (error: { code?: number; message: string }) =>
    makeError("could not coalesce error", "UNKNOWN_ERROR", {
      error,
      payload: { id: 3, jsonrpc: "2.0", method: "eth_sendTransaction", params: [] },
    });

  const renderText = (content: ReactNode) =>
    render(createElement(I18nProvider, { i18n }, content)).container.textContent;

  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

  it("explains a wallet request that expired before it was confirmed PRO-3577", () => {
    const walletError = sendTransactionError({ message: "Request expired. Please try again." });

    const { errorContent } = getTxnErrorToast(SOURCE_ETHEREUM_MAINNET, parseError(walletError), {
      defaultMessage: "Deposit failed",
    });

    expect(errorContent).toBe("Wallet request expired. Try again and confirm in your wallet");
  });

  it.each([
    {
      name: "MetaMask revert on gas estimation",
      error: makeError("missing revert data", "CALL_EXCEPTION", {
        action: "estimateGas",
        data: null,
        reason: null,
        transaction: { to: null, data: "0x" },
        invocation: null,
        revert: null,
        info: {
          error: {
            code: -32603,
            message: "Internal JSON-RPC error.",
            data: { code: 3, message: "execution reverted" },
          },
        },
      }),
      setIsSettingsVisible: undefined,
      shows: "Deposit failed",
      hides: "RPC error",
    },
    {
      name: "node revert in a flow with settings",
      error: sendTransactionError({ code: -32000, message: "execution reverted" }),
      setIsSettingsVisible: vi.fn(),
      shows: "Deposit failed",
      hides: "RPC error",
    },
    {
      name: "Besu revert, capitalized",
      error: sendTransactionError({ code: -32000, message: "Execution reverted" }),
      setIsSettingsVisible: undefined,
      shows: "Deposit failed",
      hides: "RPC error",
    },
    {
      name: "wallet RPC failure in a flow without settings",
      error: sendTransactionError({ code: -32603, message: "Internal JSON-RPC error." }),
      setIsSettingsVisible: undefined,
      shows: "Update your wallet's RPC via chainlist.org",
      hides: "Express Trading",
    },
    {
      name: "wallet RPC failure in a flow with settings",
      error: sendTransactionError({ code: -32603, message: "Internal JSON-RPC error." }),
      setIsSettingsVisible: vi.fn(),
      shows: "Express Trading",
      hides: "Deposit failed",
    },
  ])("tells a contract revert from an RPC failure: $name PRO-3577", ({ error, setIsSettingsVisible, shows, hides }) => {
    const { errorContent } = getTxnErrorToast(SOURCE_ETHEREUM_MAINNET, parseError(error), {
      defaultMessage: "Deposit failed",
      setIsSettingsVisible,
    });

    const text = renderText(errorContent);

    expect(text).toContain(shows);
    expect(text).not.toContain(hides);
  });
});
