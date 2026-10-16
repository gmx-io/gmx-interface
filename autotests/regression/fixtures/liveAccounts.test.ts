import assert from "node:assert/strict";
import { test } from "node:test";
import { getAddress } from "viem";
import { distributionToken, LiveAccounts } from "./liveAccounts";

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

test("referral discovery rejects transferred ownership and records the verified owner", async () => {
  const accounts = new LiveAccounts(42161);
  const code = `0x${Buffer.from("regression").toString("hex").padEnd(64, "0")}`;
  const rows = candidates.slice(0, 2).map((candidate) => ({ owner: candidate.account, id: code }));
  Object.assign(accounts, {
    query: async () => ({
      squidStatus: { height: 123 },
      referralCodeOwners: rows,
      referralCodeOwnersConnection: { totalCount: 1 },
    }),
  });
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    readContract: async () => candidates[1].account,
  });
  const selected = await accounts.select("referral");
  assert.equal(selected.account, candidates[1].account);
  assert.equal(selected.candidateNumber, 2);
  assert.equal(selected.code, code);
});

test("TP/SL discovery requires the open position the order closes", async () => {
  const accounts = new LiveAccounts(42161);
  const market = getAddress(`0x${"a".repeat(40)}`);
  const collateral = getAddress(`0x${"b".repeat(40)}`);
  Object.assign(accounts, {
    query: async () => ({
      squidStatus: { height: 1 },
      tradeActions: [0, 0, 1].map((i) => ({ account: candidates[i].account })),
    }),
  });
  Object.assign(accounts.rpc, { getCode: async () => undefined });
  Object.assign(accounts.api, {
    fetchJson: async (path: string, options: { query: { address: string } }) => {
      const index = candidates.findIndex((c) => c.account === options.query.address);
      if (path === "/v1/orders")
        return [{ key: candidates[index].id, orderType: 6, isFrozen: false, isLong: true, marketAddress: market }].map(
          (o) => ({ ...o, initialCollateralTokenAddress: collateral })
        );
      return [
        {
          marketAddress: market,
          collateralTokenAddress: collateral,
          isLong: index === 1,
          sizeInUsd: "1",
          positionValueInUsd: "1",
        },
      ];
    },
  });
  const selected = await accounts.select("tpsl");
  assert.equal(selected.account, candidates[1].account);
  assert.equal(selected.candidateNumber, 2);
  assert.equal(selected.key, candidates[1].id);
  assert.equal(selected.order?.orderType, 6);
  assert.equal(selected.position?.isLong, true);
});

test("transfer discovery needs settled cross-chain rows that are distinguishable in the list", async () => {
  const accounts = new LiveAccounts(42161);
  const usdc = getAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831");
  const old = Math.floor(Date.now() / 1000) - 30 * 86_400;
  const transfer = (operation: string, step: string, overrides = {}) => ({
    id: `${operation}-${step}-${Math.random()}`,
    step,
    operation,
    sourceChainId: 8453,
    settlementChainId: 42161,
    sentTimestamp: old,
    sentTxn: `0x${"1".repeat(64)}`,
    sentAmount: "100000000",
    isExecutionError: false,
    token: usdc,
    ...overrides,
  });
  const histories: Record<string, unknown[]> = {
    [candidates[0].account]: [
      transfer("deposit", "executed", { sourceChainId: 0 }),
      transfer("withdrawal", "received"),
    ],
    [candidates[1].account]: [
      transfer("deposit", "executed"),
      transfer("deposit", "executed"),
      transfer("withdrawal", "received", { isExecutionError: true }),
      transfer("withdrawal", "executed", { sentTimestamp: Math.floor(Date.now() / 1000) }),
    ],
    [candidates[2].account]: [
      transfer("deposit", "received"),
      transfer("deposit", "executed", { sentAmount: "200000000" }),
      transfer("withdrawal", "received"),
    ],
  };
  const lookups: string[] = [];
  Object.assign(accounts, {
    query: async (query: string, variables?: { account: string }) => {
      if (query.includes("RegressionTransfers")) {
        lookups.push(variables!.account);
        return { multichainFunding: histories[variables!.account] };
      }
      assert.match(query, /timestamp_lt: \d+/);
      return {
        squidStatus: { height: 1 },
        multichainFundingSendEvents: [0, 0, 1, 2].map((i) => ({ account: candidates[i].account })),
      };
    },
  });
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    getTransactionReceipt: async () => ({ status: "success" }),
  });
  const selected = await accounts.select("transfers");
  assert.equal(selected.account, candidates[2].account);
  assert.deepEqual(lookups, [candidates[0].account, candidates[1].account, candidates[2].account]);
  assert.equal(selected.transfers?.deposit.sentAmount, "200000000");
  assert.equal(selected.transfers?.withdrawal.operation, "withdrawal");
});

test("fee discovery requires an executed open and close on the first history page", async () => {
  const accounts = new LiveAccounts(42161);
  const action = (id: string, orderType: number, overrides = {}) => ({
    id,
    eventName: "OrderExecuted",
    orderType,
    sizeDeltaUsd: "1",
    positionFeeAmount: "1",
    twapGroupId: null,
    ...overrides,
  });
  const histories: Record<string, unknown[]> = {
    [candidates[0].account]: [action("close", 4), action("open", 2, { positionFeeAmount: "0" })],
    [candidates[1].account]: [action("close", 5), action("twap", 2, { twapGroupId: "1" }), action("open", 3)],
  };
  Object.assign(accounts, {
    query: async (query: string, variables?: { account: string }) =>
      query.includes("RegressionTradeFees")
        ? { tradeActions: histories[variables!.account] }
        : {
            squidStatus: { height: 1 },
            tradeActions: candidates
              .slice(0, 2)
              .map((c) => ({ account: c.account, transactionHash: "0x1", timestamp: 1 })),
          },
  });
  Object.assign(accounts.rpc, { getCode: async () => undefined });
  const selected = await accounts.select("fees");
  assert.equal(selected.account, candidates[1].account);
  assert.deepEqual(selected.trades, { open: "open", close: "close" });
});

test("affiliate discovery bounds owned codes and verifies the on-chain owner", async () => {
  const accounts = new LiveAccounts(42161);
  const code = `0x${Buffer.from("regression").toString("hex").padEnd(64, "0")}`;
  const owned: Record<string, number> = {
    [candidates[0].account]: 51,
    [candidates[1].account]: 1,
    [candidates[2].account]: 2,
  };
  Object.assign(accounts, {
    query: async (query: string, variables?: { owner: string }) =>
      query.includes("RegressionAffiliate")
        ? {
            referralCodeOwners: Array.from({ length: owned[variables!.owner] }, () => ({ id: code })),
            affiliateStats: { summary: { volumeUsd: "1" } },
          }
        : {
            squidStatus: { height: 1 },
            affiliateReferralTradeStatsByHours: [0, 1, 1, 2].map((i) => ({ affiliate: candidates[i].account })),
          },
  });
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    readContract: async () => candidates[2].account,
  });
  const selected = await accounts.select("affiliate");
  assert.equal(selected.account, candidates[2].account);
  assert.equal(selected.candidateNumber, 3);
  assert.equal(selected.referralCodeCount, 2);
  assert.equal(selected.code, code);
});

test("distribution discovery needs nameable tokens on the first page and a successful latest transfer", async () => {
  const accounts = new LiveAccounts(42161);
  const usdc = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  const glv = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
  const distribution = (tokens: string[], transactionHash = `0x${"1".repeat(64)}`) => ({
    id: tokens.join("-"),
    typeId: "1100",
    amounts: tokens.map(() => "1"),
    amountsInUsd: tokens.map(() => "1"),
    tokens,
    timestamp: 1,
    transactionHash,
  });
  const histories: Record<string, unknown[]> = {
    [candidates[0].account]: [distribution([usdc, `0x${"c".repeat(40)}`])],
    [candidates[1].account]: [],
    [candidates[2].account]: [distribution([glv], `0x${"2".repeat(64)}`)],
    [candidates[3].account]: [distribution([usdc, glv])],
  };
  Object.assign(accounts, {
    query: async (query: string, variables?: { account: string }) => {
      if (query.includes("RegressionDistributions")) return { distributions: histories[variables!.account] };
      assert.match(query, /typeId_not_in: \["1", "1000", "2"\]/);
      return {
        squidStatus: { height: 1 },
        distributions: [0, 1, 1, 2, 3].map((i) => ({ receiver: candidates[i].account })),
      };
    },
  });
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    getTransactionReceipt: async ({ hash }: { hash: string }) => ({
      status: hash.startsWith("0x2") ? "reverted" : "success",
    }),
  });
  const selected = await accounts.select("distribution");
  assert.equal(selected.account, candidates[3].account);
  assert.equal(selected.candidateNumber, 4);
  assert.deepEqual(selected.distributions?.[0].tokens, [usdc, glv]);
  assert.deepEqual(distributionToken(42161, glv), { symbol: "GLV", decimals: 18, isGm: false });
  assert.equal(distributionToken(42161, usdc)?.symbol, "USDC");
});
