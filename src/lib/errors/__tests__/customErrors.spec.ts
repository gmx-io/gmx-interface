import { type Abi, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";

import { extractRelayTaskError } from "context/SyntheticsEvents/utils";
import { parseError } from "lib/errors";
import { getInsufficientFeeError } from "lib/errors/customErrors";
import { abis } from "sdk/abis";
import { StatusCode } from "sdk/utils/gelatoRelay";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

function encodeCustomError(errorName: string, args: unknown[]) {
  return encodeErrorResult({ abi: abis.CustomErrors as Abi, errorName, args });
}

function parseRevert(errorName: string, args: unknown[]) {
  return parseError(new Error(`data="${encodeCustomError(errorName, args)}"`));
}

describe("getInsufficientFeeError", () => {
  it("matches InsufficientMultichainBalance and reads the token from the second argument", () => {
    expect(
      getInsufficientFeeError(parseRevert("InsufficientMultichainBalance", [ACCOUNT, USDC, 0n, 10n ** 6n]))
    ).toEqual({ isErrorMatched: true, tokenAddress: USDC });
  });

  it("matches InsufficientFunds and reads the token from its only argument", () => {
    expect(getInsufficientFeeError(parseRevert("InsufficientFunds", [USDC]))).toEqual({
      isErrorMatched: true,
      tokenAddress: USDC,
    });
  });

  it("matches InsufficientRelayFee without a token", () => {
    expect(getInsufficientFeeError(parseRevert("InsufficientRelayFee", [10n, 1n]))).toEqual({
      isErrorMatched: true,
      tokenAddress: undefined,
    });
  });

  it("matches the ERC20 balance revert in the error message", () => {
    expect(
      getInsufficientFeeError(parseError(new Error("execution reverted: ERC20: transfer amount exceeds balance")))
    ).toEqual({ isErrorMatched: true, tokenAddress: undefined });
  });

  it("matches the ERC20 balance revert carried as a relay task reason", () => {
    // a reason without a custom error or bytecode becomes "Relay task cancelled, unknown reason" with the reason in data.message
    const relayError = extractRelayTaskError({
      taskId: "0xtask",
      message: "ERC20: transfer amount exceeds balance",
      statusCode: StatusCode.Reverted,
    });

    expect(getInsufficientFeeError(parseError(relayError))).toEqual({ isErrorMatched: true, tokenAddress: undefined });
  });

  it("leaves other errors alone", () => {
    expect(
      getInsufficientFeeError(parseError(new Error("execution reverted: ERC20: transfer amount exceeds allowance")))
    ).toEqual({ isErrorMatched: false });
    expect(getInsufficientFeeError(parseRevert("OrderNotFound", ["0x" + "22".repeat(32)]))).toEqual({
      isErrorMatched: false,
    });
    expect(getInsufficientFeeError(parseError(new Error("User rejected the request.")))).toEqual({
      isErrorMatched: false,
    });
    expect(getInsufficientFeeError(undefined)).toEqual({ isErrorMatched: false });
  });
});
