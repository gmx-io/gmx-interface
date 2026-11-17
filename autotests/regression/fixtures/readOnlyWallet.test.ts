import assert from "node:assert/strict";
import { test } from "node:test";
import type { BrowserContext, Route } from "@playwright/test";
import { blockLiveSubmissions, readOnlyWalletHandler } from "./readOnlyWallet";

test("read-only wallet forwards reads unchanged and denies every signing or write method", async () => {
  const rejected: string[] = [];
  const requests: unknown[] = [];
  const handler = readOnlyWalletHandler(async (request, chain) => {
    requests.push({ request, chain });
    return "0x42";
  }, rejected);
  const read = {
    method: "eth_call",
    params: [{ to: "0x1111111111111111111111111111111111111111", data: "0x" }, "latest"],
  };
  assert.equal(await handler(read, 42161), "0x42");
  assert.deepEqual(requests, [{ request: read, chain: 42161 }]);
  for (const method of ["eth_sendTransaction", "unknown_method"]) {
    await assert.rejects(handler({ method, params: [] }, 42161), { code: 4001 });
    assert.equal(rejected.at(-1), method);
  }
  assert.equal(requests.length, 1);
});

test("network guard blocks raw transactions in a batch and relay submissions while allowing public reads", async () => {
  let handler!: (route: Route) => Promise<void>;
  const rejected: string[] = [];
  await blockLiveSubmissions(
    {
      route: async (_url: string, callback: typeof handler) => {
        handler = callback;
      },
    } as unknown as BrowserContext,
    rejected
  );
  async function request(path: string, body?: unknown) {
    let result = "";
    await handler({
      request: () => ({
        method: () => "POST",
        url: () => `https://public.example${path}`,
        postDataJSON: () => {
          if (body === undefined) throw new Error("invalid JSON");
          return body;
        },
      }),
      fallback: async () => {
        result = "forwarded";
      },
      abort: async () => {
        result = "blocked";
      },
    } as unknown as Route);
    return result;
  }
  assert.equal(
    await request("/rpc", [{ method: "eth_call" }, { method: "eth_sendRawTransaction", params: ["0x123"] }]),
    "blocked"
  );
  assert.equal(await request("/v1/relay/submit"), "blocked");
  assert.equal(await request("/relays/v2/call-with-sync-fee", { chainId: 42161 }), "blocked");
  assert.equal(await request("/rpc", [{ method: "eth_call" }, { method: "eth_getBalance" }]), "forwarded");
  assert.equal(await request("/api/graphql", { query: "{ squidStatus { height } }" }), "forwarded");
  assert.equal(await request("/v1/relay/status", { taskId: "public-task" }), "forwarded");
  assert.equal(rejected.length, 3);
});
