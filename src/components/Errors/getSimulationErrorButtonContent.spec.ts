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

import { getSimulationErrorButtonContent } from "./getSimulationErrorButtonContent";

// relay estimation errors reach the multichain buttons as CustomError built by fallbackCustomError
const relayError = (name: string, args?: Record<string, unknown>) =>
  new CustomError({ name, message: JSON.stringify({ name, args }), args });

describe("getSimulationErrorButtonContent PRO-4168", () => {
  beforeEach(() => {
    i18n.load("en", {});
    i18n.activate("en");
  });

  afterEach(cleanup);

  it("shows the mapped cause without extra diagnostics", () => {
    expect(
      getSimulationErrorButtonContent({
        chainId: ARBITRUM,
        error: relayError(CustomErrorName.DisabledMarket, { market: zeroAddress }),
        fallbackText: "Error simulating withdrawal",
      })
    ).toEqual({ text: "Market temporarily disabled" });
  });

  it.each([
    ["an unmapped error", relayError("EmptyWithdrawalAmount")],
    [
      "a wrapped unmapped error",
      relayError(CustomErrorName.ExternalCallFailed, {
        data: encodeErrorResult({ abi: abis.CustomErrors, errorName: "EmptyWithdrawalAmount" }),
      }),
    ],
  ])("falls back to the flow text for %s and keeps it under Show error", (_, error) => {
    const { text, errorDescription } = getSimulationErrorButtonContent({
      chainId: ARBITRUM,
      error,
      fallbackText: "Error simulating withdrawal",
    });

    const { container, getByText } = render(createElement(I18nProvider, { i18n }, errorDescription));

    expect(text).toBe("Error simulating withdrawal");

    fireEvent.click(getByText("Show error"));

    expect(container.textContent).toContain(error.name);
  });
});
