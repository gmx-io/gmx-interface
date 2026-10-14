import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, encodeFunctionData, erc20Abi, getAddress, maxUint256 } from "viem";

import { address, usdc, weth } from "../fixtures/fundedQuote";
import { UiWallet, type UiActionPlan } from "./uiWallet";
import type { FundedSession } from "./session";
import type { UiTransaction } from "./uiOrderGuard";
import type { FundedAction } from "./journal";
import { economy } from "./economy";
import { submitUiRelay } from "./uiRelay";
import { getContract } from "../../../sdk/src/configs/contracts";

const hash = `0x${"12".repeat(32)}` as `0x${string}`;
function fixture(plan?: UiActionPlan) {
  const sent: UiTransaction[] = [];
  const session = {
    address,
    rpc: { request: async () => "read-result" },
    sourceRpc: { request: async () => "base-read-result" },
    snapshot: async () => ({ usdc, weth }),
    gate: async () => undefined,
    feePolicy: economy,
    nativeTransaction: async (tx: UiTransaction) => {
      sent.push(tx);
      return { id: "tx", purpose: "ui", feeUsd: "1", state: "settled", txHash: hash } as FundedAction;
    },
  };
  const wallet = new UiWallet(session as unknown as FundedSession);
  Object.assign(wallet, { plan });
  return { wallet, session, sent };
}
const plan: UiActionPlan = { purpose: "open", preflight: () => undefined, inspect: () => ({ extraFeeUsd: 1n }) };
const transaction = { from: address, to: usdc.address, data: "0x12345678", value: "0x0", chainId: "0xa4b1" };

test("UI wallet never sends outside an active UI operation or on another chain", async () => {
  const { wallet, sent } = fixture();
  await assert.rejects(
    wallet.request({ method: "eth_sendTransaction", params: [transaction] }, 42161),
    /No UI transaction/
  );
  assert.equal(await wallet.request({ method: "eth_getBalance", params: [address] }, 8453), "base-read-result");
  await assert.rejects(
    wallet.request({ method: "eth_getBalance", params: [address] }, 1),
    /Unsupported UI wallet chain/
  );
  for (const method of ["eth_sendRawTransaction", "personal_sign", "eth_signTypedData_v4", "wallet_sendCalls"]) {
    await assert.rejects(wallet.request({ method, params: [] }, 42161), /Unsupported|Unexpected UI signature/);
  }
  assert.equal(await wallet.request({ method: "eth_getBalance", params: [address] }, 42161), "read-result");
  assert.equal(sent.length, 0);
});

test("UI wallet validates sender, chain and intent before handing anything to the signer", async () => {
  for (const tx of [
    { ...transaction, from: weth.address },
    { ...transaction, chainId: "0x1" },
    { ...transaction, data: "not-calldata" },
  ]) {
    const { wallet, sent } = fixture(plan);
    await assert.rejects(wallet.request({ method: "eth_sendTransaction", params: [tx] }, 42161));
    assert.equal(sent.length, 0);
  }
  const { wallet, sent } = fixture({
    ...plan,
    inspect: () => {
      throw new Error("unexpected receiver");
    },
  });
  await assert.rejects(
    wallet.request({ method: "eth_sendTransaction", params: [transaction] }, 42161),
    /unexpected receiver/
  );
  assert.equal(sent.length, 0);
});

test("UI wallet applies the finite wallet spending cap instead of signing the UI's unlimited approval", async () => {
  const approval = { token: usdc.address, spender: weth.address, amount: 2_500_000n };
  const { wallet, sent } = fixture({ ...plan, approval });
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [weth.address, maxUint256] });
  assert.equal(
    await wallet.request({ method: "eth_sendTransaction", params: [{ ...transaction, data }] }, 42161),
    hash
  );
  const call = decodeFunctionData({ abi: erc20Abi, data: sent[0].data });
  assert.equal(call.functionName, "approve");
  assert.deepEqual(call.args, [getAddress(weth.address), approval.amount]);
  assert.equal(sent[0].value, 0n);
});

test("UI wallet rejects approvals for another spender, another token, insufficient amount or native value", async () => {
  const approval = { token: usdc.address, spender: weth.address, amount: 2_500_000n };
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [weth.address, maxUint256] });
  for (const tx of [
    { ...transaction, data, to: weth.address },
    { ...transaction, data, value: "0x1" },
    {
      ...transaction,
      data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [address, maxUint256] }),
    },
    { ...transaction, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [weth.address, 1n] }) },
  ]) {
    const { wallet, sent } = fixture({ ...plan, approval });
    await assert.rejects(wallet.request({ method: "eth_sendTransaction", params: [tx] }, 42161));
    assert.equal(sent.length, 0);
  }
});

test("UI wallet preserves inspected application calldata and serializes submissions", async () => {
  const { wallet, session, sent } = fixture(plan);
  let finish!: () => void;
  const waiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const send = session.nativeTransaction;
  session.nativeTransaction = async (tx) => {
    await waiting;
    return send(tx);
  };
  const first = wallet.request({ method: "eth_sendTransaction", params: [transaction] }, 42161);
  await assert.rejects(wallet.request({ method: "eth_sendTransaction", params: [transaction] }, 42161), /Concurrent/);
  finish();
  assert.equal(await first, hash);
  assert.deepEqual(sent, [{ to: getAddress(transaction.to), data: transaction.data, value: 0n }]);
});

test("UI wallet rejects changed inventory and high gas before an approval spends anything", async () => {
  const approval = { token: usdc.address, spender: weth.address, amount: 2_500_000n };
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [weth.address, maxUint256] });
  for (const reason of ["gas", "inventory"]) {
    const guarded = {
      ...plan,
      approval,
      preflight: () => {
        if (reason === "inventory") throw new Error("Unowned position");
      },
    };
    const { wallet, session, sent } = fixture(guarded);
    session.gate = async () => {
      throw new Error("High gas");
    };
    await assert.rejects(
      wallet.request({ method: "eth_sendTransaction", params: [{ ...transaction, data }] }, 42161),
      reason === "gas" ? /High gas/ : /Unowned position/
    );
    assert.equal(sent.length, 0);
  }
});

const origin = "https://selected-preview.invalid";
const relayUrl = "https://arbitrum.gmxapi.io/v1/relay/submit";
const relayPayload = { to: getContract(42161, "SubaccountGelatoRelayRouter"), data: "0x1234" };
type RouteHandler = (route: unknown) => Promise<void>;

async function relayFixture(previous?: FundedAction) {
  const events: string[] = [];
  const fulfilled: unknown[] = [];
  const actions: FundedAction[] = [];
  const session = {
    address,
    active: { actions },
    snapshot: async () => ({ usdc, weth }),
    previousAction: async () => previous,
    gate: async () => undefined,
    save: async () => undefined,
    rpc: {
      waitForTransactionReceipt: async () => {
        events.push("receipt");
        return { status: "success", logs: [] };
      },
    },
  } as unknown as FundedSession;
  Object.assign(session, {
    relayUiTransaction: (...args: Parameters<FundedSession["relayUiTransaction"]>) => {
      const [url, payload, purpose, cleanup, fee, send, uiOrder] = args;
      return submitUiRelay(session, url, payload, purpose, cleanup, fee, "one-click:create", send, uiOrder);
    },
  });
  const wallet = new UiWallet(session);
  const routes: [string | RegExp, RouteHandler][] = [];
  await wallet.protectRelay(
    { route: async (url: string | RegExp, handler: RouteHandler) => routes.push([url, handler]) } as never,
    origin
  );
  Object.assign(wallet, { plan: { ...plan, purpose: "create", inspectRelay: async () => ({ extraFeeUsd: 1n }) } });
  const route = (url: string, response: unknown) => ({
    request: () => ({
      url: () => url,
      method: () => "POST",
      frame: () => ({ parentFrame: () => null, url: () => `${origin}/trade` }),
      postDataJSON: () => relayPayload,
    }),
    fetch: async () => {
      events.push("send");
      return response;
    },
    fulfill: async (options: unknown) => {
      events.push("fulfill");
      fulfilled.push(options);
    },
    fallback: async () => {
      events.push("fallback");
    },
  });
  const results = (wallet as unknown as { results: unknown[] }).results;
  return { routes, route, events, fulfilled, actions, results };
}

function mockRelayStatus(context: unknown, events: string[]) {
  const t = context as { after: (run: () => void) => void };
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async (request) => {
    assert.ok(String(request).endsWith("/v1/relay/status"));
    events.push("status");
    return new Response(JSON.stringify({ taskId: "real-task", status: "executed", txHash: hash }), { status: 200 });
  };
}

test("UI relay passes the relay's real response to the app before reconciling execution", async (context) => {
  const { routes, route, events, fulfilled, actions, results } = await relayFixture();
  mockRelayStatus(context, events);
  const response = { ok: () => true, json: async () => ({ taskId: "real-task", status: "pending" }) };
  await routes[1][1](route(relayUrl, response));
  assert.deepEqual(events, ["send", "fulfill", "status", "receipt"]);
  assert.deepEqual(fulfilled, [{ response }]);
  assert.equal(actions[0].state, "settled");
  assert.equal(actions[0].txHash, hash);
  assert.deepEqual(results, [{ kind: "action", action: actions[0] }]);
});

test("UI relay answers a replayed step with its recorded task and never sends it again", async () => {
  const previous: FundedAction = {
    id: "done",
    purpose: "ui:create",
    feeUsd: "1",
    state: "settled",
    uiRelay: { apiUrl: "https://arbitrum.gmxapi.io", to: relayPayload.to, calldataHash: "hash", taskId: "old-task" },
  };
  const { routes, route, events, fulfilled, results } = await relayFixture(previous);
  await routes[1][1](route(relayUrl, undefined));
  assert.deepEqual(events, ["fulfill"]);
  assert.deepEqual(fulfilled, [{ json: { taskId: "old-task" } }]);
  assert.deepEqual(results, [{ kind: "action", action: previous }]);
});

test("UI relay rejects a refused response without reconciling or answering it as accepted", async () => {
  const { routes, route, events, fulfilled, actions, results } = await relayFixture();
  await routes[1][1](route(relayUrl, { ok: () => false, json: async () => ({}) }));
  assert.deepEqual(events, ["send", "fulfill"]);
  assert.deepEqual(fulfilled, [{ status: 400, json: { error: "Funded UI relay guard rejected the request" } }]);
  assert.equal(actions[0].state, "pending");
  assert.match((results[0] as { error: string }).error, /refused/);
});

test("UI relay leaves the app's status polling to the real relay", async () => {
  const { routes, route, events } = await relayFixture();
  const status = "https://arbitrum.gmxapi.io/v1/relay/status";
  assert.equal((routes[1][0] as RegExp).test(status), false);
  await routes[0][1](route(status, undefined));
  assert.deepEqual(events, ["fallback"]);
});
