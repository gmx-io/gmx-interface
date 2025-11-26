import { decodeFunctionResult } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { abis } from "sdk/abis";
import * as marketsModule from "sdk/configs/markets";
import * as prebuiltModule from "sdk/prebuilt";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams, createMockBlockAndAggregateResponse } from "./_utils";
import * as fetchEthCallModule from "../fetchEthCall";

describe("RpcTracker - checkRpc", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("successful probe", () => {
    it("should successfully probe public provider for non-large account", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const blockNumber = 1000000;
      const sampleFieldValue = 1000000000000000000000n;

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockResolvedValue(
        createMockBlockAndAggregateResponse(blockNumber, sampleFieldValue)
      );

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.blockNumber).toBe(blockNumber);
    });

    it("should correctly parse blockAndAggregate response with viem", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const blockNumber = 1000000;
      const sampleFieldValue = 1000000000000000000000n;

      const mockResponse = createMockBlockAndAggregateResponse(blockNumber, sampleFieldValue);

      const decoded = decodeFunctionResult({
        abi: abis.Multicall,
        functionName: "blockAndAggregate",
        data: mockResponse.result as `0x${string}`,
      });

      const [_decodedBlockNumber, _, multicallResult] = decoded as [
        bigint,
        string,
        Array<{ success: boolean; returnData: string }>,
      ];

      expect(Number(_decodedBlockNumber)).toBe(blockNumber);
      expect(multicallResult[0].success).toBe(true);

      const dataStoreDecoded = decodeFunctionResult({
        abi: abis.DataStore,
        functionName: "getUint",
        data: multicallResult[0].returnData as `0x${string}`,
      });

      expect(dataStoreDecoded).toBe(sampleFieldValue);

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockResolvedValue(mockResponse);

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.blockNumber).toBe(blockNumber);
    });

    it("should use real example response format for parsing", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const realExampleResponse =
        "0x00000000000000000000000000000000000000000000000000000000016c3220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000001027e72f1f12813088000000";

      const decoded = decodeFunctionResult({
        abi: abis.Multicall,
        functionName: "blockAndAggregate",
        data: realExampleResponse as `0x${string}`,
      });

      const [decodedBlockNumber, _, multicallResult] = decoded as [
        bigint,
        string,
        Array<{ success: boolean; returnData: string }>,
      ];

      expect(Number(decodedBlockNumber)).toBeGreaterThan(0);
      expect(multicallResult[0].success).toBe(true);

      const dataStoreDecoded = decodeFunctionResult({
        abi: abis.DataStore,
        functionName: "getUint",
        data: multicallResult[0].returnData as `0x${string}`,
      });

      expect(typeof dataStoreDecoded).toBe("bigint");
      expect(dataStoreDecoded).toBeGreaterThan(0n);

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockResolvedValue({
        result: realExampleResponse,
      });

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.blockNumber).toBeGreaterThan(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    it("should skip private provider for non-large account", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const privateProviders = rpcConfigModule.getRpcProviders(params.chainId, "fallback").filter((p) => !p?.isPublic);
      const privateProvider = privateProviders[0];

      await expect(tracker.checkRpc(privateProvider!.url, new AbortController().signal)).rejects.toThrow(
        "Skip private provider"
      );
    });

    it("should allow private provider for large account", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      tracker.getIsLargeAccount = () => true;

      const privateProviders = rpcConfigModule
        .getRpcProviders(params.chainId, "largeAccount")
        .filter((p) => !p?.isPublic);
      const privateProvider = privateProviders[0];

      const blockNumber = 1000000;
      const sampleFieldValue = 1000000000000000000000n;

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockResolvedValue(
        createMockBlockAndAggregateResponse(blockNumber, sampleFieldValue)
      );

      const result = await tracker.checkRpc(privateProvider!.url, new AbortController().signal);

      expect(result.blockNumber).toBe(blockNumber);
    });

    it("should handle missing probeMarketAddress", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      vi.spyOn(marketsModule, "getMarketsByChainId").mockReturnValue({} as any);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle missing probeFieldKey", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      vi.spyOn(prebuiltModule, "HASHED_MARKET_CONFIG_KEYS", "get").mockReturnValue({});

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle network errors from fetchEthCall", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockRejectedValue(new Error("Network error"));

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle invalid sampleFieldValue (<= 0)", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const blockNumber = 1000000;
      const invalidSampleFieldValue = 0n;

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockResolvedValue(
        createMockBlockAndAggregateResponse(blockNumber, invalidSampleFieldValue)
      );

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle AbortSignal correctly", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const abortController = new AbortController();
      abortController.abort();

      vi.spyOn(fetchEthCallModule, "fetchEthCall").mockImplementation(async ({ signal }) => {
        if (signal?.aborted) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          throw abortError;
        }
        return createMockBlockAndAggregateResponse(1000000, 1000000000000000000000n);
      });

      await expect(tracker.checkRpc(publicProvider!.url, abortController.signal)).rejects.toThrow();
    });
  });
});
