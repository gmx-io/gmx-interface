/** @vitest-environment node */

import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { resolveLocalRpcProxyConfig } from "./config";
import { startLocalRpcProxy } from "./createLocalRpcProxy";

const startedServers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  while (startedServers.length > 0) {
    const server = startedServers.pop();
    await server?.close();
  }
});

function listen(handler: http.RequestListener): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer(handler);

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        close: () =>
          new Promise<void>((closeResolve, closeReject) => {
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }

              closeResolve();
            });
          }),
      });
    });
  });
}

describe("resolveLocalRpcProxyConfig", () => {
  it("uses the GMTrade RPC endpoint with the nightly Origin", () => {
    expect(resolveLocalRpcProxyConfig({})).toEqual({
      port: 9010,
      target: "https://rpc-1.gmtrade.xyz",
      env: "nightly",
      simulatedOrigin: "https://nightly.gmtrade.xyz",
      simulatedReferer: "https://nightly.gmtrade.xyz/",
    });
  });
});

describe("startLocalRpcProxy", () => {
  it("returns health details for the nightly origin", async () => {
    const proxy = await startLocalRpcProxy({
      PORT: "0",
      RPC_PROXY_TARGET: "http://127.0.0.1:1",
    });
    startedServers.push(proxy);

    const response = await fetch(`${proxy.url}__health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      target: "http://127.0.0.1:1",
      env: "nightly",
      simulatedOrigin: "https://nightly.gmtrade.xyz",
    });
  });

  it("handles CORS preflight requests", async () => {
    const proxy = await startLocalRpcProxy({
      PORT: "0",
      RPC_PROXY_TARGET: "http://127.0.0.1:1",
    });
    startedServers.push(proxy);

    const response = await fetch(proxy.url, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3010",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3010");
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, HEAD, POST, PUT, OPTIONS");
    expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type, Authorization, solana-client");
  });

  it("returns a 502 JSON error when the upstream request fails", async () => {
    const proxy = await startLocalRpcProxy({
      PORT: "0",
      RPC_PROXY_TARGET: "http://127.0.0.1:1",
    });
    startedServers.push(proxy);

    const response = await fetch(proxy.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
    });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("Bad Gateway");
    expect(body.target).toBe("http://127.0.0.1:1");
    expect(typeof body.message).toBe("string");
    expect(body.message.length).toBeGreaterThan(0);
  });

  it("forwards JSON-RPC requests to the configured upstream", async () => {
    const upstream = await listen((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: 42 }));
    });
    startedServers.push(upstream);

    const proxy = await startLocalRpcProxy({
      PORT: "0",
      RPC_PROXY_TARGET: `http://127.0.0.1:${upstream.port}`,
    });
    startedServers.push(proxy);

    const response = await fetch(proxy.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot", params: [] }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ jsonrpc: "2.0", id: 1, result: 42 });
  });
});
