import { ethers } from "ethers";
import { describe, expect, it } from "vitest";

import { parseError } from "lib/errors";

describe("ethers errors", () => {
  it("should handle user rejected transaction", () => {
    const error = ethers.makeError("User denied transaction signature", "ACTION_REJECTED", {
      action: "sendTransaction",
      reason: "rejected",
    });

    const result = parseError(error);

    expect(result).toEqual(
      expect.objectContaining({
        errorMessage: expect.stringContaining("User denied transaction"),
        isUserRejectedError: true,
        isUserError: true,
        errorDepth: 0,
      })
    );
  });

  it("should handle insufficient funds", () => {
    const error = ethers.makeError("insufficient funds for gas", "INSUFFICIENT_FUNDS", {
      transaction: {
        to: ethers.ZeroAddress,
        data: "0x",
        value: 100n,
      },
    });

    const result = parseError(error);

    expect(result).toEqual(
      expect.objectContaining({
        errorMessage: expect.stringContaining("insufficient funds"),
        isUserError: true,
        errorGroup: "Txn Error: NOT_ENOUGH_FUNDS",
        isUserRejectedError: false,
        errorDepth: 0,
      })
    );
  });

  it("should handle contract execution errors", () => {
    const error = ethers.makeError("execution reverted (unknown custom error)", "CALL_EXCEPTION", {
      transaction: {
        to: ethers.ZeroAddress,
        data: "0x",
      },
      data: "0x5dac504d0000000000000000000000000000000000000000000000000096d37eb9edae200000000000000000000000000000000000000000000000000096c6d0c2c84380",
      action: "call",
      reason: null,
      invocation: null,
      revert: null,
    });

    const result = parseError(error);

    expect(result).toEqual(
      expect.objectContaining({
        errorMessage: expect.stringContaining("execution reverted"),
        contractError: "InsufficientExecutionFee",
        contractErrorArgs: [42453787745300000n, 42439846430000000n],
        isUserError: false,
        errorDepth: 0,
      })
    );
  });
});
