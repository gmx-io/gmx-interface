import {
  CallExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  HttpRequestError,
  InternalRpcError,
  RpcRequestError,
} from "viem";
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

  const chunkProviderError = () =>
    new ContractFunctionRevertedError({
      abi: [],
      functionName: "aggregate3",
      message: "Internal JSON-RPC error.",
      cause: new CallExecutionError(
        new InternalRpcError(
          new RpcRequestError({ body: {}, error: { code: -32603, message: "internal error" }, url: endpoints.primary })
        ),
        {}
      ),
    });

  const success = { status: "success", result: 1n };
  const failure = (error: Error) => ({ status: "failure", error });

  it.each([
    ["transport", () => Promise.reject(new Error("network unavailable"))],
    ["all reads", async () => [failure(new Error("RPC failure")), failure(new Error("RPC failure"))]],
    [
      "one chunk's transport",
      async () => [success, failure(new HttpRequestError({ url: endpoints.primary, status: 429 }))],
    ],
    ["one chunk's provider error", async () => [success, failure(chunkProviderError())]],
  ])("still tries the fallback after %s fail", async (_, primary) => {
    const call = vi.fn().mockImplementationOnce(primary);
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
});
