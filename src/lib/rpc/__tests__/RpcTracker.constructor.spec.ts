import { beforeEach, describe, expect, it, vi } from "vitest";

import * as rpcConfigModule from "config/rpc";
import { getChainName } from "config/rpc";
import { suppressConsole } from "lib/__testUtils__/_utils";
import { ARBITRUM } from "sdk/configs/chains";

import { RpcTracker } from "../RpcTracker";
import { createMockRpcTrackerParams } from "./_utils";

describe("RpcTracker - constructor", () => {
  suppressConsole();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
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

  describe("trackerKey validation", () => {
    it("should generate trackerKey in correct format: RpcTracker.{chainName}", () => {
      const params = createMockRpcTrackerParams({ chainId: ARBITRUM });

      vi.spyOn(rpcConfigModule, "getRpcProviders").mockImplementation(() => {
        return [{ url: "https://test-rpc.com", isPublic: true, purpose: "default" }];
      });

      const tracker = new RpcTracker(params);
      const expectedChainName = getChainName(ARBITRUM);
      const expectedTrackerKey = `RpcTracker.${expectedChainName}`;

      expect(tracker.trackerKey).toBe(expectedTrackerKey);
    });
  });
});
