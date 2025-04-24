import { describe, expect, it } from "vitest";

import { parseError, ErrorLike } from "utils/errors";
import { TxErrorType } from "utils/errors/transactionsErrors";

describe("parseError", () => {
  describe("general errors", () => {
    it("should handle basic Error objects", () => {
      const error = new Error("Something went wrong");
      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Something went wrong",
          errorName: "Error",
          errorGroup: "Something went wrong",
          errorStack: error.stack,
          errorStackHash: expect.any(String),
          errorDepth: 0,
        })
      );
    });

    it("should handle string errors", () => {
      const result = parseError("API request failed");

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "API request failed",
          errorGroup: "API request failed",
          errorStackGroup: "Unknown stack group",
          errorDepth: 0,
        })
      );
    });

    it("should handle nested errors with context", () => {
      const error = {
        message: "Order execution failed",
        errorContext: "simulation" as const,
        info: {
          error: {
            message: "Price impact too high",
            name: "ValidationError",
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Price impact too high",
          errorName: "ValidationError",
          errorContext: "simulation",
          errorDepth: 0,
        })
      );
    });

    it("should handle undefined errors", () => {
      const result = parseError(undefined);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "undefined",
          errorGroup: "undefined",
          errorDepth: 0,
        })
      );
    });

    describe("error masking", () => {
      it("should mask URLs in error groups", () => {
        const error = new Error("Failed to fetch data from https://api.example.com:8080/v1/data?param=123");
        const result = parseError(error);

        expect(result).toEqual(
          expect.objectContaining({
            errorMessage: "Failed to fetch data from https://api.example.com:8080/v1/data?param=123",
            errorGroup: "Failed to fetch data from https://api.example.com:",
            errorDepth: 0,
          })
        );
      });

      it("should mask numbers in error groups", () => {
        const error = new Error("Transaction failed with gas 123456 at block 789012");
        const result = parseError(error);

        expect(result).toEqual(
          expect.objectContaining({
            errorMessage: "Transaction failed with gas 123456 at block 789012",
            errorGroup: "Transaction failed with gas XXX at block XXX",
            errorDepth: 0,
          })
        );
      });

      it("should mask both URLs and numbers in error groups", () => {
        const error = new Error("Failed  https://api.example.com/v1/tx/123456 with status 404 and error code E123");
        const result = parseError(error);

        expect(result).toEqual(
          expect.objectContaining({
            errorMessage: "Failed  https://api.example.com/v1/tx/123456 with status 404 and error code E123",
            errorGroup: "Failed  https://api.example.com with status XXX an",
            errorDepth: 0,
          })
        );
      });

      it("should mask URLs in stack traces", () => {
        const error = new Error("Processing failed");
        // Simulate a stack trace with URLs
        error.stack = `Error: Processing failed
            at processData (https://app.example.com/static/js/main.123456.js:12:34)
            at handleRequest (https://app.example.com/static/js/vendor.789012.js:56:78)`;

        const result = parseError(error);

        expect(result?.errorStackGroup).toBe(`Error: Processing failed
            at processData (https://app.example.com)
            at handleRequest (https://app.example.com)`);
      });
    });
  });

  describe("transaction errors", () => {
    it("should handle ethers v6 user rejected error", () => {
      const error: ErrorLike = {
        info: {
          error: {
            code: "ACTION_REJECTED",
            message: "User denied transaction signature",
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "User denied transaction signature",
          txErrorType: TxErrorType.UserDenied,
          isUserError: true,
          isUserRejectedError: true,
          errorGroup: "Txn Error: USER_DENIED",
        })
      );
    });

    it("should handle ethers v6 insufficient funds error", () => {
      const error: ErrorLike = {
        info: {
          error: {
            message: "insufficient funds for gas",
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "insufficient funds for gas",
          txErrorType: TxErrorType.NotEnoughFunds,
          isUserError: true,
          isUserRejectedError: false,
          errorGroup: "Txn Error: NOT_ENOUGH_FUNDS",
        })
      );
    });

    it("should handle RPC errors with code", () => {
      const error: ErrorLike = {
        info: {
          error: {
            code: -32603,
            message: "Internal JSON-RPC error",
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Internal JSON-RPC error",
          txErrorType: TxErrorType.RpcError,
          isUserError: false,
          isUserRejectedError: false,
          errorGroup: "Txn Error: RPC_ERROR",
        })
      );
    });

    it("should handle nested error in error.body", () => {
      const error: ErrorLike = {
        info: {
          error: {
            message: JSON.stringify({
              error: {
                code: -32000,
                message: "Invalid input parameters",
              },
            }),
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: JSON.stringify({
            error: {
              code: -32000,
              message: "Invalid input parameters",
            },
          }),
          errorGroup: '{"error":{"code":-XXX,"message":"Invalid input par',
          errorStackGroup: "Unknown stack group",
          errorDepth: 0,
          isUserError: false,
          isUserRejectedError: false,
        })
      );
    });

    it("should handle contract errors with data", () => {
      const error: ErrorLike = {
        message: "execution reverted",
        data: "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001a4f726465724e6f7446756c66696c6c61626c6541744c696d697400000000000000",
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "execution reverted",
          errorGroup: "execution reverted",
          errorStackGroup: "Unknown stack group",
          txErrorData:
            "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001a4f726465724e6f7446756c66696c6c61626c6541744c696d697400000000000000",
          isUserError: false,
          isUserRejectedError: false,
        })
      );
    });

    it("should handle parent errors", () => {
      const error: ErrorLike = {
        message: "Failed to execute transaction",
        parentError: {
          message: "User denied transaction signature",
          info: {
            error: {
              code: "ACTION_REJECTED",
            },
          },
        },
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Failed to execute transaction",
          errorGroup: "Failed to execute transaction",
          errorStackGroup: "Unknown stack group",
          isUserError: false,
          isUserRejectedError: false,
          parentError: expect.objectContaining({
            errorMessage: undefined,
            errorGroup: "Unknown group",
            errorStackGroup: "Unknown stack group",
            errorDepth: 1,
            isUserError: false,
            isUserRejectedError: false,
          }),
        })
      );
    });

    it("should handle slippage errors", () => {
      const error: ErrorLike = {
        message: "Router: mark price lower than limit",
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Router: mark price lower than limit",
          txErrorType: TxErrorType.Slippage,
          isUserError: false,
          errorGroup: "Txn Error: SLIPPAGE",
        })
      );
    });

    it("should handle network change errors", () => {
      const error: ErrorLike = {
        message: "network changed",
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "network changed",
          txErrorType: TxErrorType.NetworkChanged,
          isUserError: true,
          errorGroup: "Txn Error: NETWORK_CHANGED",
        })
      );
    });

    it("should handle additional validation info", () => {
      const error: ErrorLike = {
        message: "Transaction failed",
        errorSource: "getCallStaticError",
        isAdditionalValidationPassed: false,
        additionalValidationType: "tryCallStatic",
      };

      const result = parseError(error);

      expect(result).toEqual(
        expect.objectContaining({
          errorMessage: "Transaction failed",
          errorSource: "getCallStaticError",
          isAdditionalValidationPassed: false,
          additionalValidationType: "tryCallStatic",
        })
      );
    });
  });
});
