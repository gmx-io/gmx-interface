import type { BrowserContext, Route } from "@playwright/test";
import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionResult,
  erc20Abi,
  getAddress,
  multicall3Abi,
  toHex,
  zeroAddress,
  type Hex,
} from "viem";

import DataStore from "../../../sdk/src/abis/DataStore";
import Reader from "../../../sdk/src/abis/Reader";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import { multichainBalanceKey } from "../../../sdk/src/configs/dataStore";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { getV2Tokens } from "../../../sdk/src/configs/tokens";

import type { RpcRequest, unsignedTransactionReview } from "./unsignedTransactions";

export type WalletAllowances = Map<string, Map<string, bigint>>;
type RpcResponse = { jsonrpc?: string; id: number | string; result?: Hex; error?: unknown };
type PatchResult = ((original: Hex | undefined) => Hex) & {
  standalone?: boolean;
  recoverable?: boolean;
  rejection?: string;
};

const SOURCE_CHAIN_RPC_HOSTS: [RegExp, number][] = [
  [/(^|[./-])base([./-]|$)/, 8453],
  [/(^|[./-])(bsc|bnb)([./-]|$)/, 56],
  [/(^|[./-])(eth|ethereum)([./-]|$)/, 1],
];

function getSourceChainIdByRpcUrl(url: string) {
  const { host, pathname } = new URL(url);
  return SOURCE_CHAIN_RPC_HOSTS.find(([pattern]) => pattern.test(`${host}${pathname}`))?.[1];
}

const ALCHEMY_NETWORKS: Record<number, string> = { 1: "eth-mainnet", 56: "bnb-mainnet", 8453: "base-mainnet" };

// Public source-chain RPCs rate-limit parallel and CI runs; REGRESSION_ALCHEMY_KEY moves those reads to Alchemy.
function dedicatedRpcUrlFor(route: Route) {
  const key = process.env.REGRESSION_ALCHEMY_KEY;
  const chainId = key ? getSourceChainIdByRpcUrl(route.request().url()) : undefined;
  return chainId ? `https://${ALCHEMY_NETWORKS[chainId]}.g.alchemy.com/v2/${key}` : undefined;
}

// Node fetch rather than route.fetch: Playwright traces record route.fetch URLs, which would expose the key.
async function fetchRpc(route: Route, postData: unknown, timeout: number) {
  const dedicated = dedicatedRpcUrlFor(route);
  if (!dedicated) {
    const response = await route.fetch({ postData, timeout });
    return { ok: response.ok(), json: () => response.json() };
  }
  const response = await fetch(dedicated, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(postData),
    signal: AbortSignal.timeout(timeout),
  });
  return { ok: response.ok, json: () => response.json() };
}

// Requests the fixture does not change still go to the dedicated RPC when there is one.
async function passThrough(route: Route, body: RpcRequest | RpcRequest[]) {
  const isRpc = (Array.isArray(body) ? body : [body]).every((item) => typeof item?.method === "string");
  const dedicated = isRpc ? dedicatedRpcUrlFor(route) : undefined;
  if (!dedicated) return route.fallback();
  try {
    const response = await fetch(dedicated, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: await response.text(),
    });
  } catch {
    await route.abort("failed").catch(() => undefined);
  }
}

function tryDecode<T>(decode: () => T) {
  try {
    return decode();
  } catch {
    return undefined;
  }
}

const LIVE_RPC_UNAVAILABLE = { code: -32000, message: "Live RPC data unavailable in account fixture" };

function isRateLimited(item: RpcResponse) {
  const error = item.error as { code?: number; message?: string } | undefined;
  return Boolean(
    error && (error.code === 429 || error.code === -32005 || /rate.?limit|too many requests/i.test(error.message ?? ""))
  );
}

// Parallel test sessions get public RPCs rate-limited; retry reads within the app's 20s multicall timeout.
async function fetchLiveResults(route: Route, isBatch: boolean, requests: RpcRequest[]) {
  const results = new Map<number | string, RpcResponse>();
  const deadline = Date.now() + 15_000;
  const canRetry = requests.every((request) => !request.method.startsWith("eth_send"));
  let pending = requests;
  for (let attempt = 0; pending.length && attempt < (canRetry ? 3 : 1); attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    const timeout = Math.min(10_000, deadline - Date.now());
    if (timeout < 1_000) break;
    try {
      const response = await fetchRpc(route, isBatch ? pending : pending[0], timeout);
      if (!response.ok) continue;
      const json = await response.json();
      for (const item of Array.isArray(json) ? json : [json]) {
        const isResponse = item && typeof item === "object" && ["number", "string"].includes(typeof item.id);
        if (isResponse && !isRateLimited(item)) results.set(item.id, item);
      }
    } catch {
      // Transport, CORS-equivalent and malformed-body failures are retried like rate limits.
    }
    pending = pending.filter((request) => !results.has(request.id));
  }
  return results;
}

// Change only this account's balance reads; prices, pool state and fees remain live.
export async function mockWalletBalances(
  context: BrowserContext,
  account: string,
  balances: Map<string, bigint>,
  chainId: ContractsChainId,
  gmxBalances: Map<string, bigint>,
  allowances: WalletAllowances,
  review?: ReturnType<typeof unsignedTransactionReview>,
  contractRead?: (target: string, data: Hex) => Hex | undefined,
  // A source chain listed here reads only its own map instead of the shared wallet balances.
  sourceChainBalances?: Map<number, Map<string, bigint>>
) {
  const tokens = [...getV2Tokens(chainId).map((token) => token.address), ...Object.keys(MARKETS[chainId])];
  const accountKeys = new Map(tokens.map((token) => [multichainBalanceKey(account, token), getAddress(token)]));
  function patchCall(target: string, callData: Hex, walletBalances: Map<string, bigint>): PatchResult | undefined {
    const overridden = contractRead?.(getAddress(target), callData);
    if (overridden !== undefined) return Object.assign(() => overridden, { standalone: true });
    const isContract = (name: Parameters<typeof getContract>[1]) =>
      getAddress(target) === getAddress(getContract(chainId, name));
    if (isContract("SyntheticsReader")) {
      const call = tryDecode(() => decodeFunctionData({ abi: SyntheticsReader, data: callData }));
      if (
        (call?.functionName === "getAccountPositions" || call?.functionName === "getAccountOrders") &&
        getAddress(call.args[1]) === account
      ) {
        // A real RPC would erase the API fixture with the random account's empty inventory.
        return Object.assign((): Hex => "0x", {
          standalone: true,
          rejection: "Account-state fixture supplies positions and orders through the API only",
        });
      }
    }
    if (isContract("Reader")) {
      const call = tryDecode(() => decodeFunctionData({ abi: Reader, data: callData }));
      if (call?.functionName === "getTokenBalancesWithSupplies" && getAddress(call.args[0]) === account) {
        return (original) => {
          if (!original) throw new Error("Cannot mock staking wallet balances without token supplies");
          const values = decodeFunctionResult({
            abi: Reader,
            functionName: "getTokenBalancesWithSupplies",
            data: original,
          });
          return encodeFunctionResult({
            abi: Reader,
            functionName: "getTokenBalancesWithSupplies",
            result: values.map((value, index) =>
              index % 2 === 0 ? walletBalances.get(getAddress(call.args[1][index / 2])) ?? 0n : value
            ),
          });
        };
      }
    }
    if (isContract("DataStore")) {
      const call = tryDecode(() => decodeFunctionData({ abi: DataStore, data: callData }));
      if (call?.functionName === "getUint" && accountKeys.has(call.args[0])) {
        const token = accountKeys.get(call.args[0])!;
        return Object.assign(
          () => encodeFunctionResult({ abi: DataStore, functionName: "getUint", result: gmxBalances.get(token) ?? 0n }),
          { standalone: true }
        );
      }
    }
    const erc20Call = tryDecode(() => decodeFunctionData({ abi: erc20Abi, data: callData }));
    if (erc20Call?.functionName === "allowance" && getAddress(erc20Call.args[0]) === account) {
      // The fixture account is new, so an approval it was not given is zero on chain too.
      const amount = allowances.get(getAddress(target))?.get(getAddress(erc20Call.args[1])) ?? 0n;
      return Object.assign(() => encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: amount }), {
        standalone: true,
      });
    }
    if (erc20Call?.functionName === "balanceOf" && getAddress(erc20Call.args[0]) === account) {
      return Object.assign(
        () =>
          encodeFunctionResult({
            abi: erc20Abi,
            functionName: "balanceOf",
            result: walletBalances.get(getAddress(target)) ?? 0n,
          }),
        { standalone: true }
      );
    }
    const call = tryDecode(() => decodeFunctionData({ abi: multicall3Abi, data: callData }));
    if (call?.functionName === "getEthBalance" && getAddress(call.args[0]) === account) {
      return Object.assign(
        () =>
          encodeFunctionResult({
            abi: multicall3Abi,
            functionName: "getEthBalance",
            result: walletBalances.get(zeroAddress) ?? 0n,
          }),
        { standalone: true }
      );
    }
    if (call?.functionName !== "aggregate3") return;
    const patches = call.args[0].map((item) => patchCall(item.target, item.callData, walletBalances));
    if (!patches.some(Boolean)) return;
    const standalone = patches.every((patch) => patch?.standalone);
    return Object.assign(
      (original: Hex | undefined) => {
        const results = original
          ? decodeFunctionResult({ abi: multicall3Abi, functionName: "aggregate3", data: original })
          : patches.map(() => ({ success: false, returnData: "0x" }));
        return encodeFunctionResult({
          abi: multicall3Abi,
          functionName: "aggregate3",
          result: results.map((result, index) => {
            const patch = patches[index];
            if (!patch) return result as { success: boolean; returnData: `0x${string}` };
            if (!patch.standalone && !patch.recoverable && !result.success)
              return { success: false, returnData: "0x" as const };
            return {
              success: !patch.rejection,
              returnData: patch(result.success ? result.returnData : undefined) as `0x${string}`,
            };
          }),
        });
      },
      { standalone, recoverable: true }
    );
  }

  await context.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    let body: RpcRequest | RpcRequest[];
    try {
      body = route.request().postDataJSON();
    } catch {
      return route.fallback();
    }
    if (!body || typeof body !== "object") return route.fallback();
    const requests = Array.isArray(body) ? body : [body];
    const walletBalances =
      (sourceChainBalances?.size && sourceChainBalances.get(getSourceChainIdByRpcUrl(route.request().url()) ?? 0)) ||
      balances;
    const patches = new Map<number | string, PatchResult>();
    const reviewed = new Map(requests.map((request) => [request.id, review?.respond(request)]));
    for (const request of requests) {
      if (
        request.method === "eth_getBalance" &&
        typeof request.params?.[0] === "string" &&
        getAddress(request.params[0]) === account
      ) {
        patches.set(
          request.id,
          Object.assign(() => toHex(walletBalances.get(zeroAddress) ?? 0n), { standalone: true })
        );
      } else if (request.method === "eth_call") {
        const call = request.params?.[0] as { to?: string; data?: Hex } | undefined;
        if (!call?.to || !call.data) continue;
        const patch = patchCall(call.to, call.data, walletBalances);
        if (patch) patches.set(request.id, patch);
      }
    }
    if (!patches.size && ![...reviewed.values()].some(Boolean)) return passThrough(route, body);
    const remaining = requests.filter((request) => !patches.get(request.id)?.standalone && !reviewed.get(request.id));
    // Mocked reads survive upstream failures; missing public reads remain explicit errors.
    const results = remaining.length ? await fetchLiveResults(route, Array.isArray(body), remaining) : new Map();
    const patchResponse = (item: RpcResponse) => {
      const patch = patches.get(item.id);
      if (item.error && !patch?.recoverable) return item;
      if (patch?.rejection) return { jsonrpc: "2.0", id: item.id, error: { code: -32000, message: patch.rejection } };
      if (!patch) return item;
      try {
        return { jsonrpc: "2.0", id: item.id, result: patch(item.result) };
      } catch {
        // A malformed live result must not take the mocked reads in the same multicall down with it.
        return patch.recoverable
          ? { jsonrpc: "2.0", id: item.id, result: patch(undefined) }
          : { jsonrpc: "2.0", id: item.id, error: LIVE_RPC_UNAVAILABLE };
      }
    };
    const patched = requests.map(
      (request) =>
        reviewed.get(request.id) ??
        patchResponse(
          results.get(request.id) ?? {
            jsonrpc: "2.0",
            id: request.id,
            ...(!patches.get(request.id)?.standalone ? { error: LIVE_RPC_UNAVAILABLE } : {}),
          }
        )
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: Array.isArray(body) ? patched : patched[0],
    });
  });
}
