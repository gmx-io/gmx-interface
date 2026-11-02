import assert from "node:assert/strict";
import { test } from "node:test";
import type { BrowserContext, Route } from "@playwright/test";
import {
  decodeFunctionResult,
  encodeFunctionData,
  encodeFunctionResult,
  erc20Abi,
  multicall3Abi,
  type Hex,
} from "viem";

import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { mockWalletBalances } from "./walletBalances";

const chainId = 42161;
const account = "0x1111111111111111111111111111111111111111";
const otherAccount = "0x2222222222222222222222222222222222222222";
const reader = getContract(chainId, "SyntheticsReader");
const multicall = getContract(chainId, "Multicall");
const usdc = getTokenBySymbol(chainId, "USDC").address;

type RpcResult = { id: number; result?: Hex; error?: { code: number; message: string } };
type Upstream = (options: { postData: unknown; timeout: number }) => Promise<unknown>;

const noRpc: Upstream = async () => {
  throw new Error("This fixture check must not contact a real RPC");
};

async function routeFixture(upstream = noRpc, sourceChainBalances?: Map<number, Map<string, bigint>>) {
  let handler: (route: Route) => Promise<void>;
  const context = {
    route: async (_pattern: string, callback: typeof handler) => {
      handler = callback;
    },
  } as unknown as BrowserContext;
  await mockWalletBalances(
    context,
    account,
    new Map([[usdc, 123n]]),
    chainId,
    new Map(),
    new Map(),
    undefined,
    undefined,
    sourceChainBalances
  );
  return async (body: unknown, url = "https://arb1.arbitrum.io/rpc") => {
    let json: unknown;
    let fallback = false;
    await handler({
      request: () => ({ method: () => "POST", url: () => url, postDataJSON: () => body }),
      fulfill: async (response: { json: unknown }) => {
        json = response.json;
      },
      fallback: async () => {
        fallback = true;
      },
      fetch: upstream,
    } as unknown as Route);
    return { json, fallback };
  };
}

const ethCall = (data: Hex, to: string, id = 1) => ({
  jsonrpc: "2.0",
  id,
  method: "eth_call",
  params: [{ to, data }, "latest"],
});
const aggregate = (data: Hex) => decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data });
const decodeBalance = (data: Hex) => decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data });
const balanceOf = (owner = account) => ({
  target: usdc,
  allowFailure: true,
  callData: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
});

function inventoryCall(functionName: "getAccountPositions" | "getAccountOrders", address = account) {
  return encodeFunctionData({
    abi: SyntheticsReader,
    functionName,
    args: [getContract(chainId, "DataStore"), address, 0n, 100n],
  });
}

for (const method of ["getAccountPositions", "getAccountOrders"] as const) {
  test(`API account fixture rejects contradictory RPC ${method} data`, async () => {
    const request = await routeFixture();
    const { json, fallback } = await request(ethCall(inventoryCall(method), reader));
    const result = json as RpcResult;
    assert.equal(fallback, false);
    assert.equal(result.error?.code, -32000);
    assert.match(result.error!.message, /API only/);
    assert.equal(result.result, undefined);
  });
}

test("other accounts keep their real inventory RPC", async () => {
  const request = await routeFixture();
  assert.equal((await request(ethCall(inventoryCall("getAccountPositions", otherAccount), reader))).fallback, true);
});

test("a rejected inventory read does not replace successful sibling multicall balances", async () => {
  const request = await routeFixture();
  const call = encodeFunctionData({
    abi: multicall3Abi,
    functionName: "aggregate3",
    args: [[{ target: reader, allowFailure: true, callData: inventoryCall("getAccountOrders") }, balanceOf()]],
  });
  const { json } = await request(ethCall(call, multicall));
  const calls = aggregate((json as RpcResult).result!);
  assert.deepEqual(calls[0], { success: false, returnData: "0x" });
  assert.equal(calls[1].success, true);
  assert.equal(decodeBalance(calls[1].returnData), 123n);
});

const nested = encodeFunctionData({
  abi: multicall3Abi,
  functionName: "aggregate3",
  args: [[balanceOf(), balanceOf(otherAccount)]],
});
const accountBatch = [
  ethCall(
    encodeFunctionData({
      abi: multicall3Abi,
      functionName: "aggregate3",
      args: [
        [
          balanceOf(),
          {
            target: usdc,
            allowFailure: true,
            callData: encodeFunctionData({ abi: erc20Abi, functionName: "allowance", args: [account, otherAccount] }),
          },
          {
            target: usdc,
            allowFailure: true,
            callData: encodeFunctionData({ abi: erc20Abi, functionName: "totalSupply" }),
          },
          { target: multicall, allowFailure: true, callData: nested },
        ],
      ],
    }),
    multicall
  ),
  { jsonrpc: "2.0", id: 2, method: "eth_getBalance", params: [account, "latest"] },
  { jsonrpc: "2.0", id: 3, method: "eth_blockNumber", params: [] },
];
type HexData = `0x${string}`;
const liveSupply = encodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", result: 999n }) as HexData;
const liveOtherBalance = encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 77n }) as HexData;
const liveZeroBalance = encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 0n }) as HexData;
const liveMulticall = encodeFunctionResult({
  abi: multicall3Abi,
  functionName: "aggregate3",
  result: [
    { success: true, returnData: liveZeroBalance },
    {
      success: true,
      returnData: encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: 5n }) as HexData,
    },
    { success: true, returnData: liveSupply },
    {
      success: true,
      returnData: encodeFunctionResult({
        abi: multicall3Abi,
        functionName: "aggregate3",
        result: [
          { success: true, returnData: liveZeroBalance },
          { success: true, returnData: liveOtherBalance },
        ],
      }) as HexData,
    },
  ],
});
const respond = (postData: unknown, item: (id: number) => object) => ({
  ok: () => true,
  json: async () => (postData as { id: number }[]).map(({ id }) => ({ jsonrpc: "2.0", id, ...item(id) })),
});
const liveReads = (id: number) => ({ result: id === 1 ? liveMulticall : "0x2a" });
const failed = { success: false, returnData: "0x" };

type LiveReadCase = {
  name: string;
  upstream: (postData, attempt) => Promise<unknown>;
  attempts: number;
  live?: boolean;
  blockNumber: string | RegExp;
};
const liveReadCases: LiveReadCase[] = [
  {
    name: "a timeout",
    upstream: async () => {
      throw new Error("RPC timeout");
    },
    attempts: 3,
    blockNumber: /Live RPC data unavailable/,
  },
  {
    name: "an HTTP error",
    upstream: async () => ({ ok: () => false }),
    attempts: 3,
    blockNumber: /Live RPC data unavailable/,
  },
  {
    name: "an RPC error",
    upstream: async (postData) => respond(postData, () => ({ error: { code: -32000, message: "upstream failed" } })),
    attempts: 1,
    blockNumber: /upstream failed/,
  },
  {
    name: "invalid JSON",
    upstream: async () => ({
      ok: () => true,
      json: async () => {
        throw new SyntaxError("Invalid upstream JSON");
      },
    }),
    attempts: 3,
    blockNumber: /Live RPC data unavailable/,
  },
  {
    name: "an empty response",
    upstream: async () => ({ ok: () => true, json: async () => null }),
    attempts: 3,
    blockNumber: /Live RPC data unavailable/,
  },
  {
    name: "a 429 followed by CORS-style network failures",
    upstream: async (_postData, attempt) => {
      if (attempt === 1) return { ok: () => false, status: () => 429 };
      throw new TypeError("Failed to fetch");
    },
    attempts: 3,
    blockNumber: /Live RPC data unavailable/,
  },
  {
    name: "a malformed multicall result",
    upstream: async (postData) => respond(postData, (id) => ({ result: id === 1 ? "0x" : "0x2a" })),
    attempts: 1,
    blockNumber: "0x2a",
  },
  {
    name: "a rate limit, then live data",
    upstream: async (postData, attempt) =>
      respond(postData, attempt === 1 ? () => ({ error: { code: 429, message: "Too Many Requests" } }) : liveReads),
    attempts: 2,
    live: true,
    blockNumber: "0x2a",
  },
  {
    name: "live data",
    upstream: async (postData) => respond(postData, liveReads),
    attempts: 1,
    live: true,
    blockNumber: "0x2a",
  },
];

for (const { name, upstream, attempts, live = false, blockNumber } of liveReadCases) {
  test(`mocked balances survive ${name}, and only live data fills the other reads`, async () => {
    const sent: { id: number }[][] = [];
    const request = await routeFixture(async ({ postData }) => {
      sent.push(postData as { id: number }[]);
      return upstream(postData, sent.length);
    });
    const { json } = await request(accountBatch);
    const [multicallResult, nativeBalance, blockNumberResult] = json as RpcResult[];
    assert.equal(sent.length, attempts);
    assert.deepEqual(
      sent[0].map(({ id }) => id),
      [1, 3]
    );
    const [balance, allowance, supply, nestedResult] = aggregate(multicallResult.result!);
    assert.equal(decodeBalance(balance.returnData), 123n);
    assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "allowance", data: allowance.returnData }), 0n);
    assert.deepEqual(supply, live ? { success: true, returnData: liveSupply } : failed);
    const [nestedBalance, otherBalance] = aggregate(nestedResult.returnData);
    assert.equal(decodeBalance(nestedBalance.returnData), 123n);
    assert.deepEqual(otherBalance, live ? { success: true, returnData: liveOtherBalance } : failed);
    assert.equal(nativeBalance.result, "0x0");
    if (typeof blockNumber === "string") assert.equal(blockNumberResult.result, blockNumber);
    else assert.match(blockNumberResult.error!.message, blockNumber);
  });
}

test("a source chain with its own balances reads only them; other chains keep the shared balances", async () => {
  const request = await routeFixture(
    noRpc,
    new Map([
      [8453, new Map([[usdc, 8453n]])],
      [56, new Map()],
      [1, new Map([[usdc, 1n]])],
    ])
  );
  for (const [url, expected] of [
    ["https://mainnet.base.org", 8453n],
    ["https://base-mainnet.g.alchemy.com/v2/key", 8453n],
    ["https://bsc-dataseed.bnbchain.org", 0n],
    ["https://1rpc.io/bnb", 0n],
    ["https://rpc.ankr.com/eth", 1n],
    ["https://ethereum.publicnode.com", 1n],
    ["https://arb1.arbitrum.io/rpc", 123n],
    ["https://arb-mainnet.g.alchemy.com/v2/key", 123n],
    ["https://megaeth-mainnet.g.alchemy.com/v2/key", 123n],
    ["https://sepolia.drpc.org", 123n],
  ] as const) {
    const { json } = await request([ethCall(balanceOf().callData, usdc)], url);
    assert.equal(decodeBalance((json as RpcResult[])[0].result!), expected, url);
  }
});
