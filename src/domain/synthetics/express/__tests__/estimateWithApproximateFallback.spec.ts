import { describe, expect, it, vi } from "vitest";

import type { ExpressTxnParams } from "domain/synthetics/express";

import { estimateWithApproximateFallback } from "../expressOrderUtils";

const SIMULATED = { estimationMethod: "estimateGas" } as ExpressTxnParams;
const APPROXIMATE = { estimationMethod: "approximate" } as ExpressTxnParams;

describe("estimateWithApproximateFallback", () => {
  it("uses the simulated estimate when it succeeds", async () => {
    const estimate = vi.fn(async (method: string) => (method === "estimateGas" ? SIMULATED : APPROXIMATE));

    await expect(estimateWithApproximateFallback(estimate)).resolves.toBe(SIMULATED);
    expect(estimate).toHaveBeenCalledTimes(1);
  });

  it("falls back to the approximate estimate when the simulation returns nothing", async () => {
    const estimate = vi.fn(async (method: string) => (method === "estimateGas" ? undefined : APPROXIMATE));

    await expect(estimateWithApproximateFallback(estimate)).resolves.toBe(APPROXIMATE);
    expect(estimate.mock.calls.map(([method]) => method)).toEqual(["estimateGas", "approximate"]);
  });

  it("falls back to the approximate estimate when the simulation throws", async () => {
    const estimate = vi.fn(async (method: string) => {
      if (method === "estimateGas") {
        throw new Error("rpc failed");
      }

      return APPROXIMATE;
    });

    await expect(estimateWithApproximateFallback(estimate)).resolves.toBe(APPROXIMATE);
  });
});
