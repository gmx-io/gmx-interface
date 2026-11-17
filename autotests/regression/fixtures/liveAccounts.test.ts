import assert from "node:assert/strict";
import { test } from "node:test";
import { getAddress } from "viem";
import { LiveAccounts } from "./liveAccounts";

const candidates = Array.from({ length: 20 }, (_, i) => ({
  account: getAddress(`0x${String(i + 1).padStart(40, "0")}`),
  id: `order-${i}`,
}));

function discoveryFixture(rows = candidates) {
  const accounts = new LiveAccounts(42161);
  const calls = { query: 0, rpc: 0, api: 0 };
  Object.assign(accounts, {
    query: async () => {
      calls.query++;
      return { squidStatus: { height: 123 }, orders: rows };
    },
  });
  Object.assign(accounts.rpc, {
    getCode: async () => {
      calls.rpc++;
      return undefined;
    },
  });
  return { accounts, calls };
}

test("discovery skips a closed order and revalidates cached candidates before each test", async () => {
  const { accounts, calls } = discoveryFixture(candidates.slice(0, 2));
  let stillOpen = true;
  Object.assign(accounts.api, {
    fetchJson: async (_path: string, options: { query: { address: string } }) => {
      calls.api++;
      if (options.query.address === candidates[1].account && stillOpen)
        return [{ key: candidates[1].id, orderType: 3, isFrozen: false }];
      return [];
    },
  });
  const first = await accounts.select("order");
  assert.equal(first.account, candidates[1].account);
  assert.equal(first.candidateNumber, 2);
  assert.equal(first.indexerHeight, 123);
  stillOpen = false;
  await assert.rejects(accounts.select("order"), /LIVE_DATA_UNAVAILABLE.*no current order.*no mock fallback/);
  assert.equal(calls.query, 1);
  assert.equal(calls.api, 4);
});

test("discovery stops at its bound when no candidate meets the prerequisite", async () => {
  const { accounts, calls } = discoveryFixture();
  Object.assign(accounts.api, { fetchJson: async () => [] });
  await assert.rejects(accounts.select("order"), /LIVE_DATA_UNAVAILABLE.*12 checked/);
  assert.equal(calls.rpc, 12);
});

test("discovery surfaces a service error instead of silently selecting a different account", async () => {
  const { accounts, calls } = discoveryFixture();
  Object.assign(accounts.api, {
    fetchJson: async () => {
      calls.api++;
      throw new Error("upstream HTTP 503");
    },
  });
  await assert.rejects(accounts.select("order"), /upstream HTTP 503/);
  assert.equal(calls.api, 1);
});
