import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { expandDecimals } from "lib/numbers";
import type { ContractsChainId } from "sdk/configs/chains";

import { KyberSwapRouteResult } from "../kyberSwap";
import { searchAmountInForDesiredOutput } from "../searchAmountInForDesiredOutput";

const baseParams = {
  chainId: ARBITRUM as ContractsChainId,
  tokenInAddress: "0xfrom",
  tokenOutAddress: "0xto",
  desiredAmountOut: expandDecimals(1000, 6), // 1000 USDC
  initialAmountIn: expandDecimals(1, 18), // 1 ETH
  gasPrice: 1n,
};

function makeRoute(amountIn: bigint, outputAmount: bigint): KyberSwapRouteResult {
  return {
    amountIn,
    outputAmount,
    routeSummary: {} as KyberSwapRouteResult["routeSummary"],
    routerAddress: "0xrouter",
  };
}

describe("searchAmountInForDesiredOutput", () => {
  it("converges in one iteration when output already matches desired (within tolerance)", async () => {
    const fetchRoute = vi
      .fn()
      .mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, baseParams.desiredAmountOut));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);

    expect(result?.amountIn).toBe(baseParams.initialAmountIn);
    expect(fetchRoute).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when fetchRoute returns no route", async () => {
    const fetchRoute = vi.fn().mockResolvedValueOnce(undefined);
    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeUndefined();
  });

  it("returns undefined when fetched route has zero output", async () => {
    const fetchRoute = vi.fn().mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, 0n));
    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeUndefined();
  });

  it("first-iteration divergence guard rejects routes with output < 50% of desired", async () => {
    // Output is 40% of desired → guard fires, we don't iterate
    const fetchRoute = vi
      .fn()
      .mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, (baseParams.desiredAmountOut * 40n) / 100n));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeUndefined();
    expect(fetchRoute).toHaveBeenCalledTimes(1);
  });

  it("does NOT trigger divergence guard when output is just above 50%", async () => {
    // Output is 60% of desired → no guard fire, iteration continues. Second call converges.
    const desired = baseParams.desiredAmountOut;
    const fetchRoute = vi
      .fn()
      .mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, (desired * 60n) / 100n))
      // Second call: scaled amountIn produces matching output
      .mockResolvedValueOnce(makeRoute((baseParams.initialAmountIn * 100n) / 60n, desired));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeDefined();
    expect(fetchRoute).toHaveBeenCalledTimes(2);
  });

  it("converges within multiple iterations using secant-like steps", async () => {
    // First call: output is 80% of desired → scale amountIn up by 1/0.8 = 1.25x. Within 3x guard.
    // Second call (with new amountIn): output matches.
    const desired = baseParams.desiredAmountOut;
    const initialOut = (desired * 80n) / 100n;
    const expectedNextAmountIn = (baseParams.initialAmountIn * desired) / initialOut;

    const fetchRoute = vi
      .fn()
      .mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, initialOut))
      .mockResolvedValueOnce(makeRoute(expectedNextAmountIn, desired));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result?.amountIn).toBe(expectedNextAmountIn);
    expect(fetchRoute).toHaveBeenCalledTimes(2);
  });

  it("exponential-growth guard stops iteration when secant step would more than 3x amountIn", async () => {
    // First iteration passes the divergence guard (output >= 50% of desired) — say 51%.
    // Then secant step would scale amountIn by ~1.96x. We need to push it past 3x to trigger.
    // Make output 30% AFTER passing the divergence guard? Impossible — divergence is iteration #0 only.
    // So set output to exactly 51% on iteration #0 — guard passes, step is ~1.96x, no trigger.
    // To trigger guard we need step > 3x → output < 33% of desired AFTER iteration #0.
    // Workaround: feed two iterations where iteration #0 passes (51%), iteration #1 returns < 33%.
    const desired = baseParams.desiredAmountOut;
    const fetchRoute = vi
      .fn()
      .mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, (desired * 51n) / 100n))
      // Second iter returns 30% of desired → next step > 3x → guard fires
      .mockResolvedValueOnce(makeRoute((baseParams.initialAmountIn * 100n) / 51n, (desired * 30n) / 100n));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeUndefined();
    expect(fetchRoute).toHaveBeenCalledTimes(2);
  });

  it("returns undefined after MAX_ITERATIONS without convergence", async () => {
    // Liquidity caps output at 90% of desired regardless of amountIn — secant scales 1.111x each
    // iter (well below 3x guard) but the next route still returns the same capped output.
    const desired = baseParams.desiredAmountOut;
    const cappedOutput = (desired * 90n) / 100n;
    const fetchRoute = vi.fn().mockImplementation(({ amountIn }) => Promise.resolve(makeRoute(amountIn, cappedOutput)));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result).toBeUndefined();
    // MAX_ITERATIONS = 5
    expect(fetchRoute).toHaveBeenCalledTimes(5);
  });

  it("converges when output is just past convergence threshold (50 bps)", async () => {
    // Output = desired * (1 - 50bps) = desired * 9950/10000 → diff is exactly 50bps → converged
    const desired = baseParams.desiredAmountOut;
    const fetchRoute = vi.fn().mockResolvedValueOnce(makeRoute(baseParams.initialAmountIn, (desired * 9950n) / 10000n));

    const result = await searchAmountInForDesiredOutput(baseParams, fetchRoute);
    expect(result?.amountIn).toBe(baseParams.initialAmountIn);
  });
});
