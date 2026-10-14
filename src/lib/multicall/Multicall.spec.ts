import { ContractFunctionZeroDataError, HttpRequestError } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CurrentRpcEndpoints } from "lib/rpc/RpcTracker";

import { Multicall } from "./Multicall";

vi.mock("lib/metrics/emitMetricEvent", () => ({
  emitMetricCounter: vi.fn(),
  emitMetricEvent: vi.fn(),
  emitMetricTiming: vi.fn(),
}));
vi.mock("lib/FallbackTracker/events", () => ({ emitReportEndpointFailure: vi.fn() }));

const endpoints = {
  primary: "https://primary.invalid",
  fallbacks: ["https://fallback.invalid"],
  trackerKey: "test",
} as CurrentRpcEndpoints;
const request = {
  balance: {
    abiId: "Token" as const,
    contractAddress: "0x1111111111111111111111111111111111111111",
    calls: {
      amount: { methodName: "balanceOf", params: ["0x2222222222222222222222222222222222222222"] },
      supply: { methodName: "totalSupply", params: [] },
    },
  },
};

afterEach(() => vi.restoreAllMocks());

describe("multicall result isolation", () => {
  it("retains a valid balance when another contract read reverts", async () => {
    const call = vi.fn().mockResolvedValue([
      { status: "success", result: 50_000_000n },
      { status: "failure", error: new ContractFunctionZeroDataError({ functionName: "totalSupply" }) },
    ]);
    vi.spyOn(Multicall, "getViemClient").mockReturnValue({ multicall: call } as unknown as ReturnType<
      typeof Multicall.getViemClient
    >);
    const result = await new Multicall(42161, {}).call(endpoints, request, false);
    expect(result.success).toBe(false);
    expect(result.data.balance.amount).toMatchObject({ success: true, returnValues: [50_000_000n] });
    expect(result.data.balance.supply).toMatchObject({
      success: false,
      returnValues: [],
      error: expect.stringContaining("totalSupply"),
    });
    expect(result.errors.balance.supply).toBeDefined();
    expect(call).toHaveBeenCalledTimes(1);
  });

  for (const failure of ["transport", "all reads", "one chunk's transport"] as const) {
    it(`still tries the fallback after ${failure} fail`, async () => {
      const call = vi.fn();
      if (failure === "transport") call.mockRejectedValueOnce(new Error("network unavailable"));
      else if (failure === "all reads")
        call.mockResolvedValueOnce([
          { status: "failure", error: new Error("RPC failure") },
          { status: "failure", error: new Error("RPC failure") },
        ]);
      else
        call.mockResolvedValueOnce([
          { status: "success", result: 1n },
          { status: "failure", error: new HttpRequestError({ url: endpoints.primary, status: 429 }) },
        ]);
      call.mockResolvedValueOnce([
        { status: "success", result: 50_000_000n },
        { status: "success", result: 100_000_000n },
      ]);
      vi.spyOn(Multicall, "getViemClient").mockReturnValue({ multicall: call } as unknown as ReturnType<
        typeof Multicall.getViemClient
      >);
      const result = await new Multicall(42161, {}).call(endpoints, request, false);
      expect(result.success).toBe(true);
      expect(result.data.balance.amount.returnValues).toEqual([50_000_000n]);
      expect(call).toHaveBeenCalledTimes(2);
    });
  }
});
