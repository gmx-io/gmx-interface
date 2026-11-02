import assert from "node:assert/strict";
import { test } from "node:test";
import { getAddress } from "viem";
import { LiveAccounts } from "./liveAccounts";
import {
  CLAIMABLE_COLLATERAL_DELAY_KEY,
  CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY,
} from "../../../sdk/src/configs/dataStore";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import snapshot from "./markets/arbitrum.json";

const candidates = Array.from({ length: 20 }, (_, i) => ({
  account: getAddress(`0x${String(i + 1).padStart(40, "0")}`),
  txHash: `0x${"1".repeat(64)}`,
  timestamp: 1,
}));
const token = getTokenBySymbol(42161, "USDC").address;
const market = { ...snapshot.config[0], ...snapshot.values[0], name: "ETH/USD [WETH-USDC]", isDisabled: false };

test("financial discovery fails after at most twelve unusable accounts without a mock fallback", async () => {
  const accounts = new LiveAccounts(42161);
  Object.assign(accounts, {
    query: async () => ({ squidStatus: { height: 123 }, multichainSamechainFundingEvents: candidates }),
  });
  let reads = 0;
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    readContract: async () => {
      reads++;
      return 0n;
    },
  });
  await assert.rejects(accounts.select("account"), /LIVE_DATA_UNAVAILABLE.*12 candidates/);
  assert.equal(reads, 12);
});

test("rebate discovery excludes immature amounts and subtracts prior reductions using protocol timing", async () => {
  const accounts = new LiveAccounts(42161);
  const now = Math.floor(Date.now() / 1000);
  const precision = 10n ** 30n;
  const row = {
    account: candidates[0].account,
    marketAddress: market.marketTokenAddress,
    tokenAddress: token,
    value: "1000000",
    timeKey: Math.floor(now / 60) - 1000,
    factor: "0",
    factorByTime: "0",
    reductionFactor: "0",
  };
  const rebates = [
    row,
    { ...row, timeKey: Math.floor(now / 60) },
    { ...row, factorByTime: String(precision / 2n), reductionFactor: String(precision / 4n) },
    { ...row, reductionFactor: String(precision) },
  ];
  let discoveryQuery = "";
  Object.assign(accounts, {
    query: async (query: string) => {
      if (query.includes("squidStatus")) {
        discoveryQuery = query;
        return { squidStatus: { height: 123 }, claimableCollaterals: [row] };
      }
      return { claimableCollaterals: rebates };
    },
  });
  Object.assign(accounts.api, { fetchJson: async () => [market] });
  Object.assign(accounts.rpc, {
    getCode: async () => undefined,
    readContract: async ({ args }: { args: string[] }) =>
      args[0] === CLAIMABLE_COLLATERAL_TIME_DIVISOR_KEY ? 60n : args[0] === CLAIMABLE_COLLATERAL_DELAY_KEY ? 3600n : 0n,
  });
  const selected = await accounts.select("rebate");
  assert.equal(selected.financial?.amount, 1_250_000n);
  assert.match(discoveryQuery, new RegExp(`timeKey_lt:${Math.floor((now - 7200) / 60)}`));
});
