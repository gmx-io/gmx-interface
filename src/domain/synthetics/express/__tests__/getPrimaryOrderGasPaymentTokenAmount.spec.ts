import { describe, expect, it } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";

import { getPrimaryOrderGasPaymentTokenAmount } from "../expressOrderUtils";

const WNT_UNIT = 10n ** 12n;

function buildExpressParams({
  gasPaymentTokenAmount,
  relayerFeeAmount,
  executionFeeAmount,
}: {
  gasPaymentTokenAmount: bigint;
  relayerFeeAmount: bigint;
  executionFeeAmount: bigint;
}): Pick<ExpressTxnParams, "gasPaymentParams" | "executionFeeAmount"> {
  return {
    executionFeeAmount,
    gasPaymentParams: {
      gasPaymentTokenAmount,
      relayerFeeAmount,
    } as ExpressTxnParams["gasPaymentParams"],
  };
}

describe("getPrimaryOrderGasPaymentTokenAmount", () => {
  it("excludes TP/SL sidecar execution fees from the batch gas payment amount", () => {
    // Batch total fee 1.0 (0.1 relayer + 0.9 execution), of which the primary order's
    // execution fee is 0.494562 → the primary share is 0.594562 of the total.
    const expressParams = buildExpressParams({
      gasPaymentTokenAmount: 1_000_000n, // 1 USDC covers the whole batch
      relayerFeeAmount: 100_000n * WNT_UNIT,
      executionFeeAmount: 900_000n * WNT_UNIT,
    });

    const amount = getPrimaryOrderGasPaymentTokenAmount({
      expressParams,
      primaryExecutionFeeAmount: 494_562n * WNT_UNIT,
    });

    expect(amount).toBe(594_562n);
  });

  it("returns the stored amount when the primary execution fee is unknown", () => {
    const expressParams = buildExpressParams({
      gasPaymentTokenAmount: 1_000_000n,
      relayerFeeAmount: 100_000n * WNT_UNIT,
      executionFeeAmount: 900_000n * WNT_UNIT,
    });

    const amount = getPrimaryOrderGasPaymentTokenAmount({
      expressParams,
      primaryExecutionFeeAmount: undefined,
    });

    expect(amount).toBe(1_000_000n);
  });

  it("never scales above the stored amount when express params are stale", () => {
    const expressParams = buildExpressParams({
      gasPaymentTokenAmount: 594_562n,
      relayerFeeAmount: 100_000n * WNT_UNIT,
      executionFeeAmount: 494_562n * WNT_UNIT,
    });

    const amount = getPrimaryOrderGasPaymentTokenAmount({
      expressParams,
      primaryExecutionFeeAmount: 600_000n * WNT_UNIT,
    });

    expect(amount).toBe(594_562n);
  });
});
