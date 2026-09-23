import { afterEach, describe, expect, it, vi } from "vitest";

import { getSolanaRpcClient, sendSolanaRpcRequest, solanaWebsocketEndpoint } from "./rpc";

describe("solanaWebsocketEndpoint", () => {
  it("keeps the local proxy port", () => {
    expect(solanaWebsocketEndpoint("http://localhost:9010/")).toBe("ws://localhost:9010/");
  });

  it("uses wss for an https endpoint", () => {
    expect(solanaWebsocketEndpoint("https://rpc-1.gmtrade.xyz/")).toBe("wss://rpc-1.gmtrade.xyz/");
  });
});

describe("getSolanaRpcClient", () => {
  it("reuses the same Connection for the same endpoint", () => {
    const first = getSolanaRpcClient("http://localhost:9010/");
    const second = getSolanaRpcClient("http://localhost:9010/");

    expect(first).toBe(second);
  });

  it("creates a distinct Connection for a different endpoint", () => {
    const first = getSolanaRpcClient("http://localhost:9010/");
    const second = getSolanaRpcClient("https://rpc-1.gmtrade.xyz/");

    expect(first).not.toBe(second);
  });
});

describe("sendSolanaRpcRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the JSON-RPC result for a successful request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jsonrpc: "2.0", id: 1, result: 123 }),
      })
    );

    await expect(sendSolanaRpcRequest("getSlot", [], "http://localhost:9010/")).resolves.toBe(123);
  });

  it("throws when the HTTP request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      })
    );

    await expect(sendSolanaRpcRequest("getSlot", [], "http://localhost:9010/")).rejects.toThrow(
      "Solana RPC request failed: 502 Bad Gateway"
    );
  });

  it("throws when the JSON-RPC payload contains an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32600, message: "Invalid request" },
        }),
      })
    );

    await expect(sendSolanaRpcRequest("getSlot", [], "http://localhost:9010/")).rejects.toThrow("Invalid request");
  });

  it("throws when fetch itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    await expect(sendSolanaRpcRequest("getSlot", [], "http://localhost:9010/")).rejects.toThrow(
      "Solana RPC request failed: connect ECONNREFUSED"
    );
  });
});
