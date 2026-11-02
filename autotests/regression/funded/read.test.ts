import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { HttpRequestError } from "viem";

import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { USD } from "./economy";
import { fundedErrorMessage } from "./errors";
import { readJournal, writeJournal } from "./journal";
import { readFundedData } from "./read";
import { testJournal, testSession } from "./testSession";

const endpoint = "https://user:password@example.test/secret";
const unavailable = () => new HttpRequestError({ url: endpoint, status: 503, body: { signature: "secret" } });

test("reads stop after two retries and retain the operation without request credentials", async () => {
  let attempts = 0;
  await assert.rejects(
    readFundedData("On-chain positions", async () => {
      attempts++;
      throw new Error(endpoint, { cause: unavailable() });
    }),
    (error: Error) => {
      assert.equal(
        fundedErrorMessage(error),
        "On-chain positions failed after 3 attempt(s): RPC request failed (status 503). Request details omitted."
      );
      return true;
    }
  );
  assert.equal(attempts, 3);
});

type RuntimeTestContext = {
  after: (run: () => Promise<void>) => void;
  mock: { method: (object: object, name: string, implementation: (...args: any[]) => unknown) => void };
};

async function fixture(context: unknown) {
  const t = context as RuntimeTestContext;
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-read-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const session = testSession();
  Object.defineProperty(session, "directory", { value: directory });
  const forbidden = async () => {
    throw new Error("Offline cleanup must not sign, submit or call the network");
  };
  session.execute = session.nativeTransaction = session.allowance = forbidden;
  session.rpc.request = session.sourceRpc.request = forbidden;
  session.sdk.ctx.api.fetchJson = session.sdk.ctx.api.postJson = forbidden;
  const usdc = getTokenBySymbol(42161, "USDC");
  const weth = getTokenBySymbol(42161, "WETH");
  session.sdk.fetchMarkets = async () =>
    [{ symbol: "ETH/USD [WETH-USDC]", isListed: true }] as Awaited<ReturnType<typeof session.sdk.fetchMarkets>>;
  session.sdk.fetchTokensData = async () => [usdc, weth] as Awaited<ReturnType<typeof session.sdk.fetchTokensData>>;
  session.sdk.fetchPositionsInfo = session.sdk.fetchOrders = async () => [];
  session.rpc.getChainId = async () => 42161;
  t.mock.method(session.rpc, "getBlock", async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000)) }));
  session.rpc.getBalance = async () => 25_000_000_000_000_000n;
  t.mock.method(
    session.rpc,
    "readContract",
    async ({ functionName, address }: { functionName: string; address: string }) => {
      if (functionName === "getAccountPositions" || functionName === "getAccountOrders") return [];
      if (functionName === "balanceOf") return address === usdc.address ? 50_000_000n : 0n;
      throw new Error("Unexpected contract read");
    }
  );
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify(
          [usdc, weth].map((token) => ({
            tokenAddress: token.address,
            timestamp: Math.floor(Date.now() / 1000),
            minPrice: token === usdc ? "1000000000000000000000000" : "2000000000000000",
            maxPrice: token === usdc ? "1000000000000000000000000" : "2000000000000000",
          }))
        )
      )
  );
  const journal = testJournal(session.address, {
    marketAddress: weth.address,
    actions: [{ id: "close", purpose: "close", feeUsd: USD.toString(), state: "settled" }],
    inventory: {},
  });
  await writeJournal(directory, journal);
  await session.resume("run");
  return { session, directory, journal };
}

for (const persistent of [false, true]) {
  test(`${persistent ? "persistent" : "two transient"} RPC failures after scenario cleanup ${persistent ? "leave final cleanup unfinished until reads recover" : "do not stop final cleanup"}, without another transaction`, async (t) => {
    const { session, directory, journal } = await fixture(t);
    await session.step("smoke-refresh:cleanup", () => session.cleanup(true, false));
    assert.equal((await readJournal(directory))!.completed, false);
    const read = session.rpc.readContract.bind(session.rpc);
    let failures = 0;
    session.rpc.readContract = async (params) => {
      if (params.functionName === "getAccountOrders" && (persistent || failures < 2)) {
        failures++;
        throw unavailable();
      }
      return read(params);
    };
    if (persistent) {
      await assert.rejects(session.cleanup(true), /On-chain orders failed after 3 attempt/);
      assert.equal(failures, 3);
      assert.equal((await readJournal(directory))!.completed, false);
      assert.deepEqual((await readJournal(directory))!.actions, journal.actions);
      session.rpc.readContract = read;
    }
    const result = await session.cleanup(true);
    assert.equal(result.completed, true);
    assert.equal(result.reservedFeesUsd, "1");
    const saved = (await readJournal(directory))!;
    assert.equal(saved.completed, true);
    assert.deepEqual(saved.actions, journal.actions);
  });
}

test("read retries do not bypass a wrong-chain validation or mark cleanup complete", async (t) => {
  const { session, directory } = await fixture(t);
  let reads = 0;
  session.rpc.getChainId = async () => {
    reads++;
    return 8453;
  };
  await assert.rejects(session.cleanup(true), /Wrong-chain or stale RPC/);
  assert.equal(reads, 1);
  assert.equal((await readJournal(directory))!.completed, false);
});

test("slow balance reads cannot return oracle prices that expired while waiting", async (context) => {
  const { session, directory } = await fixture(context);
  const now = Date.now();
  const read = session.rpc.getBalance.bind(session.rpc);
  session.rpc.getBalance = async () => {
    const amount = await read({ address: session.address });
    (context as unknown as RuntimeTestContext).mock.method(Date, "now", () => now + 65_000);
    return amount;
  };
  await assert.rejects(session.cleanup(true), /Missing or stale token prices/);
  assert.equal((await readJournal(directory))!.completed, false);
});
