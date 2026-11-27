import { ContractFunctionExecutionError, ContractFunctionRevertedError, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { getIsStargateRouteUnavailableError } from "domain/multichain/stargateErrors";

const quoteOftRevert = (data: Hex) =>
  new ContractFunctionExecutionError(new ContractFunctionRevertedError({ abi: [], data, functionName: "quoteOFT" }), {
    abi: [],
    functionName: "quoteOFT",
  });

describe("getIsStargateRouteUnavailableError", () => {
  it("detects a route Stargate switched off from the quote revert TRD-168", () => {
    const cases: [unknown, boolean][] = [
      [quoteOftRevert("0x1dd77766"), true], // FeeLib_Paused(), seen on the Ethereum and BNB USDT pools
      [quoteOftRevert("0xdb22c33c"), true], // Stargate_Paused()
      [quoteOftRevert("0x8b6fecb7"), true], // Messaging_Unavailable(), seen on quoteSend from the Arbitrum USDT pool
      [quoteOftRevert("0x3442dd95"), false], // Stargate_InvalidAmount()
      [new Error("HTTP request failed"), false],
      [undefined, false],
    ];

    for (const [error, expected] of cases) {
      expect(getIsStargateRouteUnavailableError(error)).toBe(expected);
    }
  });
});
