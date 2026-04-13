import { EstimateGasExecutionError, ExecutionRevertedError, RpcRequestError } from "viem";
import { describe, expect, it } from "vitest";

import { CustomErrorName } from "sdk/utils/errors";
import { CustomError } from "sdk/utils/errors/parseError";

import { isMaybeSlippageError } from "../useMaybeSlippageError";

// ExternalCallFailed(Error("Return amount is not enough"))
const EXTERNAL_CALL_FAILED_SLIPPAGE_DATA =
  "0x59afd6c60000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006408c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001b52657475726e20616d6f756e74206973206e6f7420656e6f756768000000000000000000000000000000000000000000000000000000000000000000";

// Inner bytes: Error("Return amount is not enough") ABI-encoded
const INNER_SLIPPAGE_ERROR_DATA =
  "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001b52657475726e20616d6f756e74206973206e6f7420656e6f756768000000000000000000000000000000000000000000000000000000000000000000";

// Inner bytes: Error("some other reason") ABI-encoded
const INNER_OTHER_REASON_DATA =
  "0x08c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000011736f6d65206f7468657220726561736f6e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

function buildEstimateGasError(data: string) {
  return new EstimateGasExecutionError(
    new ExecutionRevertedError({
      cause: new RpcRequestError({
        body: {},
        url: "https://rpc.example.com",
        error: {
          code: -32000,
          message: "execution reverted",
          data,
        },
      }),
      message: "Execution reverted for an unknown reason.",
    }),
    {
      account: { address: "0x0000000000000000000000000000000000000000", type: "json-rpc" },
      docsPath: undefined,
    }
  );
}

describe("isMaybeSlippageError", () => {
  it("returns true for ExternalCallFailed with 'Return amount is not enough'", () => {
    const error = buildEstimateGasError(EXTERNAL_CALL_FAILED_SLIPPAGE_DATA);
    expect(isMaybeSlippageError(error)).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(isMaybeSlippageError(undefined)).toBe(false);
  });

  it("returns false for a generic Error", () => {
    expect(isMaybeSlippageError(new Error("something else"))).toBe(false);
  });

  it("returns false for a different revert reason", () => {
    // Error("some other reason") — not "Return amount is not enough"
    const otherReasonData =
      "0x59afd6c60000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006408c379a000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000011736f6d65206f7468657220726561736f6e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    const error = buildEstimateGasError(otherReasonData);
    expect(isMaybeSlippageError(error)).toBe(false);
  });

  describe("CustomError path", () => {
    it("returns true for CustomError with ExternalCallFailed and 'Return amount is not enough'", () => {
      const error = new CustomError({
        name: CustomErrorName.ExternalCallFailed,
        message: "ExternalCallFailed",
        args: { data: INNER_SLIPPAGE_ERROR_DATA },
      });
      expect(isMaybeSlippageError(error)).toBe(true);
    });

    it("returns false for CustomError with ExternalCallFailed and a different reason", () => {
      const error = new CustomError({
        name: CustomErrorName.ExternalCallFailed,
        message: "ExternalCallFailed",
        args: { data: INNER_OTHER_REASON_DATA },
      });
      expect(isMaybeSlippageError(error)).toBe(false);
    });

    it("returns false for CustomError with a different error name", () => {
      const error = new CustomError({
        name: "SomeOtherError",
        message: "SomeOtherError",
        args: { data: INNER_SLIPPAGE_ERROR_DATA },
      });
      expect(isMaybeSlippageError(error)).toBe(false);
    });

    it("returns false for CustomError with ExternalCallFailed but no data", () => {
      const error = new CustomError({
        name: CustomErrorName.ExternalCallFailed,
        message: "ExternalCallFailed",
        args: {},
      });
      expect(isMaybeSlippageError(error)).toBe(false);
    });
  });
});
