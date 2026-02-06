import {
  CallExecutionError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  HttpRequestError,
  InsufficientFundsError,
  InvalidInputRpcError,
  RpcRequestError,
  TimeoutError,
  WebSocketRequestError,
} from "viem";
import { describe, expect, it } from "vitest";

import { isInsufficientFundsError, isTemporaryError } from "../simulation";

describe("simulation", () => {
  describe("isTemporaryError", () => {
    it("should return true for RpcRequestError with header not found message", () => {
      const error = new ContractFunctionExecutionError(
        new CallExecutionError(
          new RpcRequestError({
            url: "https://example.com",
            body: {},
            error: {
              code: -32000,
              message: "header not found",
            },
          }),
          {}
        ),
        {
          abi: [],
          functionName: "test_function",
        }
      );

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for HttpRequestError", () => {
      const error = new HttpRequestError({
        body: {},
        details: "failed to fetch",
        headers: new Headers(),
        status: 500,
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for TimeoutError", () => {
      const error = new TimeoutError({
        body: {},
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for WebSocketRequestError", () => {
      const error = new WebSocketRequestError({
        body: {},
        url: "wss://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return true for RpcRequestError with temporary error codes", () => {
      const error = new RpcRequestError({
        body: {},
        error: {
          code: -32001,
          message: "Resource not found",
        },
        url: "https://example.com",
      });

      expect(isTemporaryError(error)).toBe(true);
    });

    it("should return false for ContractFunctionRevertedError", () => {
      const error = new ContractFunctionRevertedError({
        abi: [],
        functionName: "test",
        data: "0x1234",
      });

      expect(isTemporaryError(error)).toBe(false);
    });

    it("should return false for non-viem errors", () => {
      const error = new Error("Some error");

      expect(isTemporaryError(error)).toBe(false);
    });
  });

  describe("isInsufficientFundsError", () => {
    it("should return true for ContractFunctionExecutionError wrapping InsufficientFundsError", () => {
      const error = new ContractFunctionExecutionError(
        new CallExecutionError(
          new InsufficientFundsError({
            cause: new InvalidInputRpcError(
              new InvalidInputRpcError(
                new RpcRequestError({
                  error: {
                    message:
                      "err: insufficient funds for gas * price + value: address 0x6f9f3106F0209dc560A53C6808f8BF32E38468C3 have 4174472651641805 want 10000000000000000000 (supplied gas 1100000000)",
                    code: -32000,
                  },
                  body: {},
                  url: "https://example.com",
                })
              )
            ),
          }),
          {}
        ),
        {
          abi: [],
          functionName: "test_function",
        }
      );

      expect(isInsufficientFundsError(error)).toBe(true);
    });

    it("should return false for base Error", () => {
      const error = new Error("Some error");

      expect(isInsufficientFundsError(error)).toBe(false);
    });
  });
});
