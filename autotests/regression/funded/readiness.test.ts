import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  maxUint256,
  parseAbi,
  zeroAddress,
  type Abi,
  type AbiEvent,
} from "viem";
import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import GlvRouter from "../../../sdk/src/abis/GlvRouter";

import { Utils } from "../../../sdk/src/clients/v1/modules/utils/utils";
import { GmxApiSdk } from "../../../sdk/src/clients/v2";
import { getContract } from "../../../sdk/src/configs/contracts";
import { address, marketAddress, preparedOrder, rebuildTypedData, usdc, weth } from "../fixtures/fundedQuote";
import { fundedCases } from "./catalog";
import { USD } from "./economy";
import { readJournal, writeJournal, type FundedAction } from "./journal";
import { fundedReadiness, requireFundedReadiness } from "./readiness";
import { FundedSession } from "./session";
import { runFundedCases } from "./runner";
import { createTrigger, twap } from "./trading";
import { depositAccount, withdrawAccount } from "./account";
import { stake, unstake, claimRewards } from "./earn";
import { depositLiquidity, withdrawLiquidity } from "./liquidity";

type RuntimeTestContext = {
  after(callback: () => unknown): void;
  mock: { method(target: object, name: string, implementation: (...args: never[]) => unknown): void };
};

async function fixture(context: unknown) {
  const t = context as RuntimeTestContext;
  const directory = await mkdtemp(join(tmpdir(), "gmx-readiness-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        JSON.stringify([
          {
            tokenAddress: weth.address,
            timestamp: Date.now() / 1000,
            minPrice: (2000n * 10n ** 12n).toString(),
            maxPrice: (2000n * 10n ** 12n).toString(),
          },
        ])
      )
  );
  t.mock.method(Utils.prototype, "getGasLimits", async () => ({
    estimatedGasFeeBaseAmount: 100000n,
    estimatedGasFeePerOraclePrice: 10000n,
    estimatedFeeMultiplierFactor: USD,
    depositToken: 1000000n,
    withdrawalMultiToken: 1000000n,
    singleSwap: 100000n,
    glvPerMarketGasLimit: 1000000n,
    glvDepositGasLimit: 1000000n,
    glvWithdrawalGasLimit: 1000000n,
  }));
  const env = ["REGRESSION_BASE_URL", "REGRESSION_MAX_GAS_GWEI", "REGRESSION_BASE_MAX_GAS_GWEI"];
  const original = env.map((name) => process.env[name]);
  process.env.REGRESSION_BASE_URL = "https://preview.example.com";
  process.env.REGRESSION_MAX_GAS_GWEI = "0.03";
  process.env.REGRESSION_BASE_MAX_GAS_GWEI = "0.01";
  t.after(() =>
    env.forEach((name, i) => {
      if (original[i] === undefined) delete process.env[name];
      else process.env[name] = original[i];
    })
  );
  const balances = { gmx: 10n ** 16n, baseStable: 3_000_000n, baseNative: 10n ** 16n, rewards: 10n ** 14n };
  const market = {
    marketTokenAddress: marketAddress,
    indexTokenAddress: weth.address,
    minPositionSizeUsd: USD,
    minCollateralUsd: USD,
  };
  const state = {
    market,
    usdc,
    weth,
    positions: [],
    orders: [],
    onchainPositionCount: 0,
    onchainOrderCount: 0,
    nativeUsd: 50n * USD,
    stableUsd: 50n * USD,
    wrappedAmount: 0n,
    stableAmount: 50_000_000n,
    nativeAmount: 25n * 10n ** 15n,
  };
  const session = Object.create(FundedSession.prototype) as FundedSession;
  Object.assign(session, {
    directory,
    address,
    requestedFeeProfile: "economy",
    rpcUrl: "https://rpc.example.com",
    sourceRpcUrl: "https://base.example.com",
    sdk: new GmxApiSdk({ chainId: 42161 }),
  });
  const forbidden = async () => {
    throw new Error("Unexpected paid operation in readiness");
  };
  session.execute = forbidden;
  session.nativeTransaction = forbidden;
  session.allowance = forbidden;
  session.save = forbidden;
  session.sdk.signOrder = forbidden;
  session.sdk.signCrossChainWithdraw = forbidden;
  session.sdk.fetchTokensData = async () => [{ symbol: "GMX", prices: { maxPrice: 10n * USD } }] as never;
  session.sdk.fetchMarkets = async () => [market] as never;
  session.sdk.prepareCrossChainDeposit = async () => ({ composeGas: 1000000n }) as never;
  const readContract = async ({ functionName, address: token }: { functionName: string; address: string }) => {
    if (functionName === "balanceOf") return token === getContract(42161, "GMX") ? balances.gmx : 0n;
    if (functionName === "getUint" || functionName === "depositBalances") return 0n;
    if (functionName === "claimable") return balances.rewards;
    if (functionName === "getBytes32ValuesAt") return [];
    if (functionName === "getMarketTokenPrice" || functionName === "getGlvTokenPrice") return [USD, {}];
    if (functionName === "getGlvInfoList")
      return [
        { glv: { glvToken: address, longToken: weth.address, shortToken: usdc.address }, markets: [marketAddress] },
      ];
    throw new Error(`Unexpected read: ${functionName}`);
  };
  Object.assign(session, {
    rpc: {
      getChainId: async () => 42161,
      getGasPrice: async () => 20_000_000n,
      getBlock: async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000)) }),
      readContract,
    },
    sourceRpc: {
      getChainId: async () => 8453,
      getGasPrice: async () => 6_000_000n,
      getBlock: async () => ({ timestamp: BigInt(Math.floor(Date.now() / 1000)) }),
      getBalance: async () => balances.baseNative,
      readContract: async () => balances.baseStable,
    },
  });
  session.snapshot = async () => state as never;
  session.sdk.prepareOrder = async (request) => {
    const p = preparedOrder();
    const o = p.payload.batchParams.createOrderParams[0].orderPayload;
    o.isLong = request.direction !== "short";
    o.numbers.sizeDeltaUsd = request.size ?? 0n;
    o.numbers.initialCollateralDeltaAmount = request.collateralToPay?.amount ?? 0n;
    o.numbers.acceptablePrice = (o.isLong ? 2006n : 1994n) * 10n ** 12n;
    o.orderType =
      request.orderType === "limit" || request.orderType === "twap" ? 3 : request.orderType === "stop-market" ? 8 : 2;
    o.numbers.triggerPrice = (request.triggerPrice ?? 0n) / 10n ** 18n;
    if (request.orderType === "twap") {
      o.numbers.triggerPrice = maxUint256;
      o.numbers.validFromTime = BigInt(Math.floor(Date.now() / 1000));
      o.numbers.sizeDeltaUsd /= 2n;
      o.numbers.initialCollateralDeltaAmount /= 2n;
      const second = structuredClone(o);
      second.numbers.validFromTime += 600n;
      p.payload.batchParams.createOrderParams.push({ orderPayload: second });
    }
    if (request.kind === "swap") {
      const buying = request.collateralToPay?.token === usdc.address;
      o.orderType = 0;
      o.addresses.market = zeroAddress;
      o.addresses.initialCollateralToken = buying ? usdc.address : weth.address;
      o.addresses.swapPath = [marketAddress];
      o.numbers.sizeDeltaUsd = 0n;
      o.numbers.acceptablePrice = 0n;
      const input = buying ? usdc : weth;
      const output = buying ? weth : usdc;
      const value = (o.numbers.initialCollateralDeltaAmount * input.prices.minPrice) / 10n ** BigInt(input.decimals);
      o.numbers.minOutputAmount = (value * 9950n * 10n ** BigInt(output.decimals)) / output.prices.maxPrice / 10000n;
    }
    rebuildTypedData(p);
    return p;
  };
  return { session, balances, state };
}

for (const scenario of fundedCases) {
  test(`${scenario.id}: prerequisite path checks the scenario without signing, approval or journal writes`, async (t) => {
    const { session } = await fixture(t);
    const report = await fundedReadiness(session, [scenario], (c) => (c.id === "glv" ? "glv" : "economy"));
    assert.equal(report.ready, true, JSON.stringify(report.checks.filter((c) => !c.ok)));
    assert.doesNotThrow(() => requireFundedReadiness(report));
    assert.equal(report.transactionsSubmitted, 0);
  });
}

test("all-case preflight collects every missing asset before the first case can spend", async (t) => {
  const { session, balances } = await fixture(t);
  balances.gmx = balances.baseStable = balances.baseNative = balances.rewards = 0n;
  const report = await fundedReadiness(session, fundedCases, (c) => (c.id === "glv" ? "glv" : "economy"));
  assert.deepEqual(
    report.checks.filter((c) => !c.ok).map((c) => c.scope),
    ["bridge", "staking", "claims"]
  );
  assert.throws(() => requireFundedReadiness(report), /before spending/);
});

test("unfinished journal blocks every case and is preserved", async (t) => {
  const { session } = await fixture(t);
  const journal = {
    version: 1,
    id: "unfinished",
    chainId: 42161,
    address,
    createdAt: "now",
    initialNativeUsd: "0",
    initialStableUsd: "0",
    marketAddress,
    ownedPositionKeys: [],
    ownedOrderKeys: [],
    actions: [],
    completed: false,
  } as const;
  await writeJournal(session.directory, structuredClone(journal) as never);
  const report = await fundedReadiness(session, fundedCases, (c) => (c.id === "glv" ? "glv" : "economy"));
  assert.ok(report.cases.every((c) => c.status === "blocked"));
  assert.ok(report.checks.some((c) => c.check === "previous run" && !c.ok));
});

for (const kind of ["limit", "stop-market", "twap"] as const) {
  test(`${kind}: an invalid quote is rejected before approval or any native transaction`, async (t) => {
    const { session } = await fixture(t);
    session.previousAction = async () => undefined;
    session.sdk.prepareOrder = async () => {
      throw new Error("invalid quote");
    };
    await assert.rejects(kind === "twap" ? twap(session) : createTrigger(session, true, kind), /invalid quote/);
  });
}

function creationLog(name: string, key: `0x${string}`) {
  const event = (EventEmitter as Abi).find((e) => e.type === "event" && e.name === "EventLog1") as AbiEvent;
  const data = Object.fromEntries(
    ["addressItems", "uintItems", "intItems", "boolItems", "bytes32Items", "bytesItems", "stringItems"].map((name) => [
      name,
      { items: [], arrayItems: [] },
    ])
  );
  return {
    address: getContract(42161, "EventEmitter"),
    topics: encodeEventTopics({ abi: [event], eventName: "EventLog1", args: { eventNameHash: name, topic1: key } }),
    data: encodeAbiParameters(
      event.inputs.filter((i) => !i.indexed),
      [address, name, data]
    ),
  };
}

for (const kind of ["gm", "glv"] as const) {
  test(`${kind}: deposit/UI failure and withdrawal/UI failure resume without repeating either transaction`, async (t) => {
    const { session, state } = await fixture(t);
    const token = kind === "gm" ? marketAddress : address;
    const journal = {
      version: 1,
      id: "liquidity",
      chainId: 42161,
      address,
      createdAt: "now",
      initialNativeUsd: state.nativeUsd.toString(),
      initialStableUsd: state.stableUsd.toString(),
      marketAddress,
      ownedPositionKeys: [],
      ownedOrderKeys: [],
      actions: [],
      completed: false,
      feeProfile: kind === "glv" ? "glv" : "economy",
    } as const;
    await writeJournal(session.directory, structuredClone(journal) as never);
    await session.resume("liquidity");
    session.save = FundedSession.prototype.save;
    session.allowance = async () => {};
    let lp = 0n;
    const reader = session.rpc.readContract;
    session.rpc.readContract = async (args) => {
      if (args.functionName === "balanceOf" && args.address === token) return lp as never;
      if (["getDeposit", "getWithdrawal", "getGlvDeposit", "getGlvWithdrawal"].includes(args.functionName))
        return { addresses: { account: zeroAddress } } as never;
      if (args.functionName === "getWithdrawalAmountOut") return [250_000_000_000_000n, 500_000n] as never;
      return reader(args);
    };
    const receipts = new Map<string, unknown>();
    session.rpc.getTransactionReceipt = async ({ hash }) => receipts.get(hash) as never;
    let submissions = 0;
    session.nativeTransaction = async (tx, purpose) => {
      const previous = await session.previousAction(purpose);
      if (previous) return previous;
      const abi = (kind === "gm" ? ExchangeRouter : GlvRouter) as Abi;
      const batch = decodeFunctionData({ abi, data: tx.data });
      assert.equal(batch.functionName, "multicall");
      const calls = (batch.args![0] as `0x${string}`[]).map((data) => decodeFunctionData({ abi, data }));
      const withdrawal = purpose.endsWith("withdraw");
      assert.equal(
        calls[2].functionName,
        kind === "gm"
          ? withdrawal
            ? "createWithdrawal"
            : "createDeposit"
          : withdrawal
            ? "createGlvWithdrawal"
            : "createGlvDeposit"
      );
      assert.equal(calls[1].args![2], withdrawal ? 10n ** 18n : 1_000_000n);
      const hash = `0x${String(++submissions).repeat(64)}` as const;
      const key = `0x${"9".repeat(64)}` as const;
      const event = `${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}Created`;
      receipts.set(hash, { logs: [creationLog(event, key)] });
      if (withdrawal) {
        lp = 0n;
        state.wrappedAmount += 250_000_000_000_000n;
        state.stableAmount += 500_000n;
      } else {
        lp = 10n ** 18n;
        state.stableAmount -= 1_000_000n;
      }
      const action: FundedAction = {
        id: String(submissions),
        purpose,
        txHash: hash,
        state: "settled",
        feeUsd: "0",
        step: (session as unknown as { currentStep: string }).currentStep,
      };
      session.active.actions.push(action);
      await session.save();
      return action;
    };
    for (const phase of ["deposit", "withdraw"] as const) {
      let failUI = true;
      const run = () =>
        session.step(`${kind}:${phase}`, async () => {
          if (phase === "deposit") await depositLiquidity(session, kind);
          else await withdrawLiquidity(session, kind);
          if (failUI) throw new Error("UI delayed after settlement");
        });
      await assert.rejects(run(), /UI delayed/);
      await session.resume("liquidity");
      failUI = false;
      await run();
    }
    assert.equal(lp, 0n);
    assert.equal(submissions, 2);
    assert.equal((await readJournal(session.directory))!.actions.length, 2);
  });
}

for (const kind of ["account", "staking", "claims"] as const) {
  test(`${kind}: completed transfers survive a restart and an assertion retry without paying twice`, async (t) => {
    const { session, state, balances } = await fixture(t);
    await writeJournal(session.directory, {
      version: 1,
      id: "roundtrip",
      chainId: 42161,
      address,
      createdAt: "now",
      initialNativeUsd: state.nativeUsd.toString(),
      initialStableUsd: state.stableUsd.toString(),
      marketAddress,
      ownedPositionKeys: [],
      ownedOrderKeys: [],
      actions: [],
      completed: false,
    });
    await session.resume("roundtrip");
    session.save = FundedSession.prototype.save;
    session.allowance = async () => {};
    let account = 0n;
    let staked = 0n;
    const gmxBefore = balances.gmx;
    const reader = session.rpc.readContract;
    session.rpc.readContract = async (args) => {
      if (args.functionName === "getUint") return account as never;
      if (args.functionName === "depositBalances") return staked as never;
      return reader(args);
    };
    const abi = parseAbi([
      "function stakeGmx(uint256)",
      "function unstakeGmx(uint256)",
      "function handleRewards(bool,bool,bool,bool,bool,bool,bool)",
    ]);
    let submissions = 0;
    session.nativeTransaction = async (tx, purpose) => {
      const previous = await session.previousAction(purpose);
      if (previous) return previous;
      if (purpose === "account-deposit") {
        account += 1_000_000n;
        state.stableAmount -= 1_000_000n;
      } else if (purpose === "account-withdraw") {
        state.stableAmount += account;
        account = 0n;
      } else if (purpose === "stake" || purpose === "unstake") {
        const decoded = decodeFunctionData({ abi, data: tx.data });
        assert.equal(decoded.functionName, purpose === "stake" ? "stakeGmx" : "unstakeGmx");
        assert.equal(decoded.args[0], gmxBefore);
        if (purpose === "stake") {
          staked = gmxBefore;
          balances.gmx = 0n;
        } else {
          staked = 0n;
          balances.gmx = gmxBefore;
        }
      } else {
        const decoded = decodeFunctionData({ abi, data: tx.data });
        assert.equal(decoded.functionName, "handleRewards");
        assert.deepEqual(decoded.args, [false, false, false, false, false, true, false]);
        state.wrappedAmount += balances.rewards * 2n;
        balances.rewards = 0n;
      }
      const action: FundedAction = {
        id: String(++submissions),
        purpose,
        state: "settled",
        feeUsd: "0",
        step: (session as unknown as { currentStep: string }).currentStep,
      };
      session.active.actions.push(action);
      await session.save();
      return action;
    };
    const operations =
      kind === "account" ? [depositAccount, withdrawAccount] : kind === "staking" ? [stake, unstake] : [claimRewards];
    for (let i = 0; i < operations.length; i++) {
      let failUI = true;
      const run = () =>
        session.step(`${kind}:${i}`, async () => {
          await operations[i](session);
          if (failUI) throw new Error("UI assertion failed after settlement");
        });
      await assert.rejects(run(), /UI assertion failed/);
      await session.resume("roundtrip");
      failUI = false;
      await run();
    }
    assert.equal(submissions, operations.length);
    assert.equal(account, 0n);
    assert.equal(staked, 0n);
    assert.equal(balances.gmx, gmxBefore);
  });
}

test("runner refuses missing case prerequisites before starting Playwright or creating a journal", async (t) => {
  const { session, balances } = await fixture(t);
  balances.gmx = 0n;
  session.begin = async () => {
    throw new Error("Must not create a funded run");
  };
  await assert.rejects(
    runFundedCases(
      session,
      fundedCases.filter((c) => c.id === "staking")
    ),
    /preflight blocked before spending/
  );
  assert.equal(await readJournal(session.directory), undefined);
});
