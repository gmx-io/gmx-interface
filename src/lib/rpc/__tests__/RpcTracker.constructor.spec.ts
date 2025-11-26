import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams } from "./_utils";

describe("RpcTracker - constructor", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
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

      Object.values(tracker.providersMap).forEach((provider, index) => {
        expect(provider).toBeDefined();
        const allProvider = allProviders[index];
        expect(allProvider).toBeDefined();
        expect(provider.url).toBe(allProvider!.url);
        expect(provider.purpose).toBe(allProvider!.purpose);
      });
    });

    it("should filter out undefined providers", () => {
      const params = createMockRpcTrackerParams();

      // Mock getRpcProviders to return arrays with undefined values
      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation((chainId: number, purpose: string) => {
        if (purpose === "default") {
          return [{ url: "https://default-1.com", isPublic: true, purpose: "default" }] as any;
        }
        if (purpose === "fallback") {
          return [{ url: "https://fallback-1.com", isPublic: false, purpose: "fallback" }] as any;
        }
        return [undefined];
      });

      const tracker = new RpcTracker(params);

      // Verify that undefined providers were filtered out
      const providerUrls = Object.keys(tracker.providersMap);
      expect(providerUrls.length).toBe(2);
      expect(providerUrls).toContain("https://default-1.com");
      expect(providerUrls).toContain("https://fallback-1.com");
      expect(providerUrls).not.toContain(undefined);
      expect(providerUrls.every((url) => url !== undefined)).toBe(true);
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
  });
});
