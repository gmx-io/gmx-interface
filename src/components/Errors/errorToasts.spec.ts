import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render } from "@testing-library/react";
import { makeError } from "ethers";
import { ReactNode, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { SOURCE_BSC_MAINNET, SOURCE_ETHEREUM_MAINNET } from "config/chains";
import { parseError } from "lib/errors";

import { getDebugErrorMessage, getTxnErrorToast } from "./errorToasts";

const SEND_TRANSACTION_PAYLOAD = { id: 3, jsonrpc: "2.0", method: "eth_sendTransaction", params: [] };

function renderText(content: ReactNode) {
  const { container } = render(createElement(MemoryRouter, null, createElement(I18nProvider, { i18n }, content)));

  return container.textContent;
}

describe("getTxnErrorToast", () => {
  beforeAll(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

  it("explains a wallet request that expired before it was confirmed PRO-3577", () => {
    const walletError = makeError("could not coalesce error", "UNKNOWN_ERROR", {
      error: { message: "Request expired. Please try again." },
      payload: SEND_TRANSACTION_PAYLOAD,
    });

    const { errorContent } = getTxnErrorToast(SOURCE_ETHEREUM_MAINNET, parseError(walletError), {
      defaultMessage: "Deposit failed",
    });

    expect(errorContent).toBe("Wallet request expired. Try again and confirm in your wallet");
  });

  it("names the source chain's gas token when the wallet lacks gas for a deposit PRO-3577", () => {
    const walletError = makeError("insufficient funds for intrinsic transaction cost", "INSUFFICIENT_FUNDS", {
      transaction: {},
      info: { error: { code: -32000, message: "insufficient funds for gas * price + value" } },
    });

    const { errorContent } = getTxnErrorToast(SOURCE_BSC_MAINNET, parseError(walletError), {
      defaultMessage: "Deposit failed",
    });

    expect(renderText(errorContent)).toContain("Insufficient BNB for gas on BNB");
  });
});

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
