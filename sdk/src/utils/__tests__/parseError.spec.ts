import { describe, expect, it } from "vitest";

import { parseError } from "utils/errors";

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
});
