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
import { getSourceChainIdByRpcUrl, mockWalletBalances } from "./walletBalances";

const chainId = 42161;
const account = "0x1111111111111111111111111111111111111111";
const otherAccount = "0x2222222222222222222222222222222222222222";
const reader = getContract(chainId, "SyntheticsReader");
const usdc = getTokenBySymbol(chainId, "USDC").address;

async function rpcFixture(apiOnly = true, fetchResponse?: () => Promise<unknown>) {
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
    apiOnly
  );
  return async (data: Hex, to = reader) => {
    let result: { result?: Hex; error?: { code: number; message: string } } | undefined;
    let fallback = false;
    await handler({
      request: () => ({
        method: () => "POST",
        postDataJSON: () => ({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
      }),
      fulfill: async ({ json }: { json: typeof result }) => {
        result = json;
      },
      fallback: async () => {
        fallback = true;
      },
      fetch:
        fetchResponse ??
        (async () => {
          throw new Error("This fixture check must not contact a real RPC");
        }),
    } as unknown as Route);
    return { result, fallback };
  };
}

function inventoryCall(functionName: "getAccountPositions" | "getAccountOrders", address = account) {
  return encodeFunctionData({
    abi: SyntheticsReader,
    functionName,
    args: [getContract(chainId, "DataStore"), address, 0n, 100n],
  });
}

for (const method of ["getAccountPositions", "getAccountOrders"] as const) {
  test(`API account fixture rejects contradictory RPC ${method} data`, async () => {
    const request = await rpcFixture();
    const { result, fallback } = await request(inventoryCall(method));
    assert.equal(fallback, false);
    assert.equal(result?.error?.code, -32000);
    assert.match(result!.error!.message, /API only/);
    assert.equal(result?.result, undefined);
  });
}

test("other accounts and normal wallet fixtures keep their real inventory RPC", async () => {
  const apiOnly = await rpcFixture();
  assert.equal((await apiOnly(inventoryCall("getAccountPositions", otherAccount))).fallback, true);
  const normal = await rpcFixture(false);
  assert.equal((await normal(inventoryCall("getAccountPositions"))).fallback, true);
});

for (const failure of ["timeout", "http", "rpc", "invalid-json", "empty-response"] as const) {
  test(`mixed multicall keeps only mocked balances when the live RPC has a ${failure} failure`, async () => {
    const request = await rpcFixture(true, async () => {
      if (failure === "timeout") throw new Error("RPC timeout");
      return {
        ok: () => failure !== "http",
        json: async () => {
          if (failure === "invalid-json") throw new SyntaxError("Invalid upstream JSON");
          if (failure === "empty-response") return null;
          return { id: 1, error: { code: -32000, message: "upstream failed" } };
        },
      };
    });
    const balance = (owner: string) => ({
      target: usdc,
      allowFailure: true,
      callData: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    });
    const inner = encodeFunctionData({
      abi: multicall3Abi,
      functionName: "aggregate3",
      args: [[balance(account), balance(otherAccount)]],
    });
    const outer = encodeFunctionData({
      abi: multicall3Abi,
      functionName: "aggregate3",
      args: [
        [{ target: getContract(chainId, "Multicall"), allowFailure: true, callData: inner }, balance(otherAccount)],
      ],
    });
    const { result } = await request(outer, getContract(chainId, "Multicall"));
    const decoded = decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data: result!.result! });
    const nested = decodeFunctionResult({
      abi: multicall3Abi,
      functionName: "aggregate3",
      data: decoded[0].returnData,
    });
    assert.equal(nested[0].success, true);
    assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: nested[0].returnData }), 123n);
    assert.deepEqual(nested[1], { success: false, returnData: "0x" });
    assert.deepEqual(decoded[1], { success: false, returnData: "0x" });
  });
}

test("mixed multicall preserves successful live data beside a mocked balance", async () => {
  const live = encodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", result: 999n }) as `0x${string}`;
  const request = await rpcFixture(true, async () => ({
    ok: () => true,
    json: async () => ({
      id: 1,
      result: encodeFunctionResult({
        abi: multicall3Abi,
        functionName: "aggregate3",
        result: [
          {
            success: true,
            returnData: encodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", result: 0n }) as `0x${string}`,
          },
          { success: true, returnData: live },
        ],
      }),
    }),
  }));
  const call = encodeFunctionData({
    abi: multicall3Abi,
    functionName: "aggregate3",
    args: [
      [
        {
          target: usdc,
          allowFailure: true,
          callData: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [account] }),
        },
        {
          target: usdc,
          allowFailure: true,
          callData: encodeFunctionData({ abi: erc20Abi, functionName: "totalSupply" }),
        },
      ],
    ],
  });
  const { result } = await request(call, getContract(chainId, "Multicall"));
  const decoded = decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data: result!.result! });
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: decoded[0].returnData }), 123n);
  assert.deepEqual(decoded[1], { success: true, returnData: live });
});

test("a rejected inventory read does not replace successful sibling multicall balances", async () => {
  const request = await rpcFixture();
  const call = encodeFunctionData({
    abi: multicall3Abi,
    functionName: "aggregate3",
    args: [
      [
        { target: reader, allowFailure: true, callData: inventoryCall("getAccountOrders") },
        {
          target: usdc,
          allowFailure: true,
          callData: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [account] }),
        },
      ],
    ],
  });
  const { result } = await request(call, getContract(chainId, "Multicall"));
  const calls = decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data: result!.result! });
  assert.deepEqual(calls[0], { success: false, returnData: "0x" });
  assert.equal(calls[1].success, true);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: calls[1].returnData }), 123n);
});

type Upstream = (options: { postData: unknown; timeout: number }) => Promise<unknown>;

async function routeFixture(upstream: Upstream, sourceChainBalances?: Map<number, Map<string, bigint>>) {
  let handler: (route: Route) => Promise<void>;
  const context = {
    route: async (_pattern: string, callback: typeof handler) => {
      handler = callback;
    },
  } as unknown as BrowserContext;
  const balances = new Map([[usdc, 123n]]);
  await mockWalletBalances(
    context,
    account,
    balances,
    chainId,
    new Map(),
    new Map(),
    undefined,
    true,
    undefined,
    sourceChainBalances
  );
  return async (body: unknown, url = "https://arb1.arbitrum.io/rpc") => {
    let json: unknown;
    await handler({
      request: () => ({ method: () => "POST", url: () => url, postDataJSON: () => body }),
      fulfill: async (response: { json: unknown }) => {
        json = response.json;
      },
      fallback: async () => {
        throw new Error("Mocked account reads must be answered by the fixture");
      },
      fetch: upstream,
    } as unknown as Route);
    return json as { id: number; result?: Hex; error?: { message: string } }[];
  };
}

const erc20Call = (functionName: "balanceOf" | "allowance" | "totalSupply", target = usdc) => ({
  target,
  allowFailure: true,
  callData:
    functionName === "totalSupply"
      ? encodeFunctionData({ abi: erc20Abi, functionName })
      : functionName === "balanceOf"
        ? encodeFunctionData({ abi: erc20Abi, functionName, args: [account] })
        : encodeFunctionData({ abi: erc20Abi, functionName, args: [account, otherAccount] }),
});
const multicall = getContract(chainId, "Multicall");
const accountBatch = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [
      {
        to: multicall,
        data: encodeFunctionData({
          abi: multicall3Abi,
          functionName: "aggregate3",
          args: [[erc20Call("balanceOf"), erc20Call("allowance"), erc20Call("totalSupply")]],
        }),
      },
      "latest",
    ],
  },
  { jsonrpc: "2.0", id: 2, method: "eth_getBalance", params: [account, "latest"] },
  { jsonrpc: "2.0", id: 3, method: "eth_blockNumber", params: [] },
];
const aggregate = (data: Hex) => decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data });

test("mocked balance and allowance reads survive an upstream 429 followed by CORS-style network failures", async () => {
  const attempts: unknown[] = [];
  const request = await routeFixture(async ({ postData }) => {
    attempts.push(postData);
    if (attempts.length === 1) return { ok: () => false, status: () => 429 };
    throw new TypeError("Failed to fetch");
  });
  const [multicallResult, nativeBalance, blockNumber] = await request(accountBatch);
  assert.equal(attempts.length, 3);
  assert.deepEqual(
    (attempts[0] as { id: number }[]).map((item) => item.id),
    [1, 3]
  );
  const [balance, allowance, supply] = aggregate(multicallResult.result!);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: balance.returnData }), 123n);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "allowance", data: allowance.returnData }), 0n);
  assert.deepEqual(supply, { success: false, returnData: "0x" });
  assert.equal(nativeBalance.result, "0x0");
  assert.match(blockNumber.error!.message, /Live RPC data unavailable/);
});

test("rate-limited live reads are retried, so their data returns beside the mocked reads", async () => {
  const live = encodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", result: 999n }) as `0x${string}`;
  const liveResult = encodeFunctionResult({
    abi: multicall3Abi,
    functionName: "aggregate3",
    result: [
      { success: true, returnData: "0x" as `0x${string}` },
      { success: true, returnData: "0x" as `0x${string}` },
      { success: true, returnData: live },
    ],
  });
  let attempt = 0;
  const request = await routeFixture(async ({ postData }) => {
    attempt++;
    const items = postData as { id: number }[];
    return {
      ok: () => true,
      json: async () =>
        items.map(({ id }) =>
          attempt === 1
            ? { jsonrpc: "2.0", id, error: { code: 429, message: "Too Many Requests" } }
            : {
                jsonrpc: "2.0",
                id,
                result: id === 1 ? liveResult : "0x2a",
              }
        ),
    };
  });
  const [multicallResult, , blockNumber] = await request(accountBatch);
  assert.equal(attempt, 2);
  const [balance, , supply] = aggregate(multicallResult.result!);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: balance.returnData }), 123n);
  assert.deepEqual(supply, { success: true, returnData: live });
  assert.equal(blockNumber.result, "0x2a");
});

test("a malformed live multicall result still returns the mocked reads", async () => {
  const request = await routeFixture(async ({ postData }) => ({
    ok: () => true,
    json: async () => (postData as { id: number }[]).map(({ id }) => ({ jsonrpc: "2.0", id, result: "0x" })),
  }));
  const [multicallResult] = await request(accountBatch);
  const [balance, allowance, supply] = aggregate(multicallResult.result!);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: balance.returnData }), 123n);
  assert.equal(allowance.success, true);
  assert.deepEqual(supply, { success: false, returnData: "0x" });
});

test("allowances the fixture did not grant are answered as zero without a public RPC read", async () => {
  const request = await routeFixture(async () => {
    throw new Error("This fixture check must not contact a real RPC");
  });
  const [result] = await request([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: usdc, data: erc20Call("allowance").callData }, "latest"],
    },
  ]);
  assert.equal(decodeFunctionResult({ abi: erc20Abi, functionName: "allowance", data: result.result! }), 0n);
});

test("source-chain RPC hosts map to their chains and settlement or testnet hosts do not", () => {
  const expected: [string, number | undefined][] = [
    ["https://mainnet.base.org", 8453],
    ["https://base-rpc.publicnode.com", 8453],
    ["https://base.drpc.org", 8453],
    ["https://base-mainnet.g.alchemy.com/v2/key", 8453],
    ["https://bsc-dataseed.bnbchain.org", 56],
    ["https://1rpc.io/bnb", 56],
    ["https://bsc.drpc.org", 56],
    ["https://bsc-rpc.publicnode.com", 56],
    ["https://bnb-mainnet.g.alchemy.com/v2/key", 56],
    ["https://rpc.ankr.com/eth", 1],
    ["https://eth.drpc.org", 1],
    ["https://ethereum.publicnode.com", 1],
    ["https://eth-mainnet.g.alchemy.com/v2/key", 1],
    ["https://arb1.arbitrum.io/rpc", undefined],
    ["https://arbitrum-one-rpc.publicnode.com", undefined],
    ["https://arb-mainnet.g.alchemy.com/v2/key", undefined],
    ["https://api.avax.network/ext/bc/C/rpc", undefined],
    ["https://mainnet.megaeth.com/rpc", undefined],
    ["https://megaeth-mainnet.g.alchemy.com/v2/key", undefined],
    ["https://sepolia.drpc.org", undefined],
    ["https://optimism-sepolia.drpc.org", undefined],
  ];
  for (const [url, chain] of expected) assert.equal(getSourceChainIdByRpcUrl(url), chain, url);
});

test("a source chain with its own balances reads only them; other chains keep the shared balances", async () => {
  const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const request = await routeFixture(
    async () => {
      throw new Error("This fixture check must not contact a real RPC");
    },
    new Map([
      [8453, new Map([[baseUsdc, 7n]])],
      [56, new Map()],
    ])
  );
  const balanceOf = async (token: string, url: string) => {
    const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [account] });
    const [result] = await request([{ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: token, data }] }], url);
    return decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: result.result! });
  };
  assert.equal(await balanceOf(baseUsdc, "https://mainnet.base.org"), 7n);
  assert.equal(await balanceOf(usdc, "https://mainnet.base.org"), 0n);
  assert.equal(await balanceOf(usdc, "https://bsc-dataseed.bnbchain.org"), 0n);
  assert.equal(await balanceOf(usdc, "https://rpc.ankr.com/eth"), 123n);
  assert.equal(await balanceOf(usdc, "https://arb1.arbitrum.io/rpc"), 123n);
});
