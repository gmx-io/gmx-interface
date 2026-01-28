import { decodeFunctionResult } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as chainsModule from "config/chains";
import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { abis } from "sdk/abis";
import { SOURCE_SEPOLIA } from "sdk/configs/chains";
import * as marketsModule from "sdk/configs/markets";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams, createMockBlockAndAggregateResponse } from "./_utils";
import * as fetchRpcModule from "../fetchRpc";

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

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockResolvedValue(
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

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockResolvedValue(mockResponse);

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

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockResolvedValue({
        result: realExampleResponse,
      });

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.blockNumber).toBeGreaterThan(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("checkRpcForSourceChain", () => {
    beforeEach(() => {
      vi.spyOn(chainsModule, "isContractsChain").mockReturnValue(false);
    });

    it("should successfully fetch block number for source chain", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const blockNumber = 5000000;

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockResolvedValue({
        blockNumber,
      });

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.blockNumber).toBe(blockNumber);
      expect(fetchRpcModule.fetchBlockNumber).toHaveBeenCalledWith({
        url: publicProvider!.url,
        signal: expect.any(AbortSignal),
        priority: "low",
      });
    });

    it("should skip private provider for non-large account on source chain", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const privateProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "fallback").filter((p) => !p?.isPublic);
      const privateProvider = privateProviders[0];

      await expect(tracker.checkRpc(privateProvider!.url, new AbortController().signal)).rejects.toThrow(
        "Skip private provider"
      );
    });

    it("should allow private provider for large account on source chain", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });

      const mockPrivateProvider = {
        url: "https://private-large-account-rpc.com",
        isPublic: false,
        purpose: "largeAccount" as const,
      };

      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
        if (chainId === SOURCE_SEPOLIA && purpose === "largeAccount") {
          return [mockPrivateProvider];
        }
        if (chainId === SOURCE_SEPOLIA && purpose === "default") {
          return [{ url: "https://public-rpc.com", isPublic: true, purpose: "default" as const }];
        }
        return [];
      });

      const tracker = new RpcTracker(params);
      tracker.getIsLargeAccount = () => true;

      const blockNumber = 5000000;

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockResolvedValue({
        blockNumber,
      });

      const result = await tracker.checkRpc(mockPrivateProvider.url, new AbortController().signal);

      expect(result.blockNumber).toBe(blockNumber);
      expect(fetchRpcModule.fetchBlockNumber).toHaveBeenCalledWith({
        url: mockPrivateProvider.url,
        signal: expect.any(AbortSignal),
        priority: "low",
      });
    });

    it("should handle network errors from fetchBlockNumber", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockRejectedValue(new Error("Network error"));

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle invalid response (no result) from fetchBlockNumber", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockRejectedValue(new Error("No result in JSON-RPC response"));

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle AbortSignal correctly for source chain", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const abortController = new AbortController();
      abortController.abort();

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockImplementation(async ({ signal }) => {
        if (signal?.aborted) {
          const abortError = new Error("Aborted");
          abortError.name = "AbortError";
          throw abortError;
        }
        return { blockNumber: 5000000 };
      });

      await expect(tracker.checkRpc(publicProvider!.url, abortController.signal)).rejects.toThrow();
    });

    it("should correctly parse hex block number from eth_blockNumber response", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const hexBlockNumber = "0x4c4b40"; // 5000000 in decimal
      const expectedBlockNumber = Number(BigInt(hexBlockNumber));

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockResolvedValue({
        blockNumber: expectedBlockNumber,
      });

      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);

      expect(result.blockNumber).toBe(expectedBlockNumber);
    });

    it("should measure response time correctly for source chain", async () => {
      const params = createMockRpcTrackerParams({ chainId: SOURCE_SEPOLIA as any });
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(SOURCE_SEPOLIA, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      vi.spyOn(fetchRpcModule, "fetchBlockNumber").mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { blockNumber: 5000000 };
      });

      const startTime = Date.now();
      const result = await tracker.checkRpc(publicProvider!.url, new AbortController().signal);
      const endTime = Date.now();

      expect(result.responseTime).toBeGreaterThanOrEqual(40);
      expect(result.responseTime).toBeLessThanOrEqual(endTime - startTime + 10);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      vi.spyOn(chainsModule, "isContractsChain").mockReturnValue(true);
    });

    it("should skip private provider for non-large account", async () => {
      const params = createMockRpcTrackerParams();

      const mockPrivateProvider = {
        url: "https://private-fallback-rpc.com",
        isPublic: false,
        purpose: "fallback" as const,
      };

      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
        if (chainId === params.chainId && purpose === "fallback") {
          return [mockPrivateProvider];
        }
        if (chainId === params.chainId && purpose === "default") {
          return [{ url: "https://public-rpc.com", isPublic: true, purpose: "default" as const }];
        }
        return [];
      });

      const tracker = new RpcTracker(params);

      await expect(tracker.checkRpc(mockPrivateProvider.url, new AbortController().signal)).rejects.toThrow(
        "Skip private provider"
      );
    });

    it("should allow private provider for large account", async () => {
      const params = createMockRpcTrackerParams();

      const mockPrivateProvider = {
        url: "https://private-large-account-rpc.com",
        isPublic: false,
        purpose: "largeAccount" as const,
      };

      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
        if (chainId === params.chainId && purpose === "largeAccount") {
          return [mockPrivateProvider];
        }
        if (chainId === params.chainId && purpose === "default") {
          return [{ url: "https://public-rpc.com", isPublic: true, purpose: "default" as const }];
        }
        return [];
      });

      const tracker = new RpcTracker(params);
      tracker.getIsLargeAccount = () => true;

      const blockNumber = 1000000;
      const sampleFieldValue = 1000000000000000000000n;

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockResolvedValue(
        createMockBlockAndAggregateResponse(blockNumber, sampleFieldValue)
      );

      const result = await tracker.checkRpc(mockPrivateProvider.url, new AbortController().signal);

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

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle network errors from fetchEthCall", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockRejectedValue(new Error("Network error"));

      await expect(tracker.checkRpc(publicProvider!.url, new AbortController().signal)).rejects.toThrow();
    });

    it("should handle invalid sampleFieldValue (<= 0)", async () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const publicProviders = rpcConfigModule.getRpcProviders(params.chainId, "default").filter((p) => p?.isPublic);
      const publicProvider = publicProviders[0];

      const blockNumber = 1000000;
      const invalidSampleFieldValue = 0n;

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockResolvedValue(
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

      vi.spyOn(fetchRpcModule, "fetchEthCall").mockImplementation(async ({ signal }) => {
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
