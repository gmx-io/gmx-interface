import {
  CallExecutionError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  HttpRequestError,
  InternalRpcError,
  RpcRequestError,
  decodeFunctionResult,
  type Abi,
  type Hex,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import type { CurrentRpcEndpoints } from "lib/rpc/RpcTracker";
import responses from "sdk/abis/__tests__/fixtures/arbitrumSepoliaReaders.json";
import { getContract } from "sdk/configs/contracts";

import { Multicall } from "./Multicall";

vi.mock("config/rpc", () => ({ getProviderNameFromUrl: () => "test" }));
vi.mock("lib/metrics/emitMetricEvent", () => ({
  emitMetricCounter: vi.fn(),
  emitMetricEvent: vi.fn(),
  emitMetricTiming: vi.fn(),
}));
vi.mock("lib/FallbackTracker/events", () => ({ emitReportEndpointFailure: vi.fn() }));
vi.mock("./_debug", () => ({ _debugMulticall: undefined }));

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

describe("Sepolia position multicalls", () => {
  it.each([false, true])("decodes deployed reader responses with standalone=%s", async (standalone) => {
    const clientMulticall = vi.fn(async ({ contracts }: { contracts: { abi: Abi; functionName: string }[] }) =>
      contracts.map(({ abi, functionName }) => ({
        status: "success" as const,
        result: decodeFunctionResult({
          abi,
          functionName,
          data: responses[functionName as keyof typeof responses] as Hex,
        }),
      }))
    );
    vi.spyOn(Multicall, "getViemClient").mockReturnValue({
      multicall: clientMulticall,
    } as unknown as ReturnType<typeof Multicall.getViemClient>);

    const result = await new Multicall(ARBITRUM_SEPOLIA, {}).call(
      { primary: "https://rpc.example.com", fallbacks: [], trackerKey: "test", endpointsStats: [] },
      {
        reader: {
          contractAddress: getContract(ARBITRUM_SEPOLIA, "SyntheticsReader"),
          abiId: "SyntheticsReader",
          calls: {
            positions: { methodName: "getAccountPositions", params: [], standalone },
            details: { methodName: "getPositionInfoList", params: [], standalone },
          },
        },
      },
      false
    );

    expect(result.success).toBe(true);
    expect(result.data.reader.positions.returnValues).toMatchObject([
      { numbers: { collateralAmount: 1997603n, increasedAtTime: 1789995567n }, flags: { isLong: false } },
    ]);
    expect(result.data.reader.details.returnValues).toMatchObject([
      { position: { numbers: { increasedAtTime: 1789995567n } }, fees: { positionFeeAmount: 5n } },
    ]);
  });
});
