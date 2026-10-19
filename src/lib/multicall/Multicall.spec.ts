import { decodeFunctionResult, type Abi, type Hex } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM_SEPOLIA } from "config/chains";
import responses from "sdk/abis/__tests__/fixtures/arbitrumSepoliaReaders.json";
import { getContract } from "sdk/configs/contracts";

import { Multicall } from "./Multicall";

vi.mock("config/rpc", () => ({ getProviderNameFromUrl: () => "test" }));
vi.mock("lib/metrics/emitMetricEvent", () => ({
  emitMetricCounter: vi.fn(),
  emitMetricEvent: vi.fn(),
  emitMetricTiming: vi.fn(),
}));
vi.mock("./_debug", () => ({ _debugMulticall: undefined }));

describe("Sepolia position multicalls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
