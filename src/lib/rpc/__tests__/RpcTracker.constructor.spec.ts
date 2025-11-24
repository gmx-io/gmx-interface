import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { ARBITRUM } from "sdk/configs/chains";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams, testChainId } from "./_utils";

describe("RpcTracker - constructor", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with valid chainId and thresholds", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      expect(tracker.params.chainId).toBe(testChainId);
      expect(tracker.params.blockFromFutureThreshold).toBe(1000);
      expect(tracker.params.blockLaggingThreshold).toBe(50);
    });

    it("should create providersMap from getRpcProviders", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const allProviders = [
        ...rpcConfigModule.getRpcProviders(params.chainId, "default"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "largeAccount"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "fallback"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "express"),
      ]
        .flat()
        .filter((p) => p !== undefined);

      expect(Object.keys(tracker.providersMap).length).toBeGreaterThan(0);

      allProviders.forEach((provider) => {
        if (provider) {
          expect(tracker.providersMap[provider.url]).toBeDefined();
          expect(tracker.providersMap[provider.url].url).toBe(provider.url);
          expect(tracker.providersMap[provider.url].purpose).toBe(provider.purpose);
          expect(tracker.providersMap[provider.url].isPublic).toBe(provider.isPublic);
        }
      });
    });

    it("should filter out undefined providers", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const providerUrls = Object.keys(tracker.providersMap);
      expect(providerUrls.every((url) => url !== undefined)).toBe(true);
    });

    it("should create FallbackTracker with correct configuration", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      expect(tracker.fallbackTracker).toBeDefined();
      expect(tracker.fallbackTracker.params.trackerKey).toMatch(/^RpcTracker:/);
      expect(tracker.fallbackTracker.params.primary).toBeDefined();
      expect(tracker.fallbackTracker.params.secondary).toBeDefined();
      expect(tracker.fallbackTracker.params.endpoints.length).toBeGreaterThan(0);
    });

    it("should set primary and secondary endpoints correctly", () => {
      const params = createMockRpcTrackerParams();
      const tracker = new RpcTracker(params);

      const allProviders = [
        ...rpcConfigModule.getRpcProviders(params.chainId, "default"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "largeAccount"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "fallback"),
        ...rpcConfigModule.getRpcProviders(params.chainId, "express"),
      ]
        .flat()
        .filter((p) => p !== undefined);

      const firstProvider = allProviders[0];
      const secondProvider = allProviders[1] || firstProvider;

      expect(tracker.fallbackTracker.params.primary).toBe(firstProvider?.url);
      expect(tracker.fallbackTracker.params.secondary).toBe(secondProvider?.url);
    });

    it("should handle case when only one provider is available", () => {
      const params = createMockRpcTrackerParams();

      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
        if (purpose === "default") {
          return [{ url: "https://single-provider.com", isPublic: true, purpose: "default" }];
        }
        return [];
      });

      const tracker = new RpcTracker(params);

      expect(tracker.fallbackTracker.params.primary).toBe("https://single-provider.com");
      expect(tracker.fallbackTracker.params.secondary).toBe("https://single-provider.com");
    });

    it("should use correct trackerKey format", () => {
      const params = createMockRpcTrackerParams({ chainId: ARBITRUM });
      const tracker = new RpcTracker(params);

      expect(tracker.fallbackTracker.params.trackerKey).toMatch(/^RpcTracker:/);
    });
  });
});
