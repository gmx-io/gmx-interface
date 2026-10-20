import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  maxUint256,
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
import { address, marketAddress, preparedOrder, rebuildTypedData, usdc, weth } from "./fundedQuote";
import { fundedCases } from "./catalog";
import { USD } from "./economy";
import { readJournal, writeJournal, type FundedAction } from "./journal";
import { fundedReadiness, requireFundedReadiness } from "./readiness";
import { FundedSession } from "./session";
import { runFundedCases } from "./runner";
import { withdrawLiquidity } from "./liquidity";
import { testJournal } from "./testSession";

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
  session.sdk.fetchStakingPower = async () =>
    ({ currentStaked: 0n, cumulativePower: 0n, projectedRewardShare: 0n }) as never;
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

test("TWAP preflight blocks a fee quote above the action limit before any paid operation", async (t) => {
  const { session } = await fixture(t);
  const prepare = session.sdk.prepareOrder;
  session.sdk.prepareOrder = async (request) => {
    const prepared = await prepare(request);
    prepared.payload.relayParams.fee.feeAmount = 2_000_000n;
    rebuildTypedData(prepared);
    return prepared;
  };
  const report = await fundedReadiness(
    session,
    fundedCases.filter((c) => c.id === "twap")
  );
  assert.equal(report.ready, false);
  assert.match(report.checks.find((c) => !c.ok)!.detail, /Action fee exceeds \$1 \(estimated \$2\.061\)/);
  assert.equal(await readJournal(session.directory), undefined);
});

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

test("swap intent and the exact signed minimum are persisted before signing or submission", async (t) => {
  const { session } = await fixture(t);
  await writeJournal(session.directory, testJournal(address, { id: "swap-intent" }));
  await session.resume("swap-intent");
  session.save = FundedSession.prototype.save;
  session.execute = FundedSession.prototype.execute;
  session.allowance = async () => {};
  session.gate = async () => {};
  const quote = await session.quoteSwap(await session.snapshot(), 1_000_000n, true, false);
  const minimum = quote.intent.minOutputAmount + 1n;
  quote.prepared.payload.batchParams.createOrderParams[0].orderPayload.numbers.minOutputAmount = minimum;
  rebuildTypedData(quote.prepared);
  session.sdk.signOrder = async () => {
    const saved = await readJournal(session.directory);
    assert.deepEqual(saved!.actions[0].swap, {
      tokenIn: usdc.address,
      amount: "1000000",
      minOutputAmount: minimum.toString(),
      feeAmount: quote.prepared.payload.relayParams.fee.feeAmount.toString(),
      unwrapNative: false,
    });
    throw new Error("Stopped before signing");
  };
  session.sdk.submitOrder = async () => {
    throw new Error("Must not submit");
  };
  await assert.rejects(session.execute(quote.prepared, quote.intent, "swap", false), /Stopped before signing/);
});

test("unfinished journal blocks every case and is preserved", async (t) => {
  const { session } = await fixture(t);
  await writeJournal(session.directory, testJournal(address, { id: "unfinished" }));
  const report = await fundedReadiness(session, fundedCases, (c) => (c.id === "glv" ? "glv" : "economy"));
  assert.ok(report.cases.every((c) => c.status === "blocked"));
  assert.ok(report.checks.some((c) => c.check === "previous run" && !c.ok));
});

function creationLog(name: string, key: `0x${string}`, account: string = address) {
  const event = (EventEmitter as Abi).find((e) => e.type === "event" && e.name === "EventLog1") as AbiEvent;
  const data = Object.fromEntries(
    ["addressItems", "uintItems", "intItems", "boolItems", "bytes32Items", "bytesItems", "stringItems"].map((name) => [
      name,
      {
        items:
          name === "addressItems"
            ? [{ key: "account", value: account }]
            : name === "bytes32Items"
              ? [{ key: "key", value: key }]
              : [],
        arrayItems: [],
      },
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
  for (const withdrawal of [false, true]) {
    test(`${kind} ${withdrawal ? "withdrawal" : "deposit"}: a pending request blocks normal withdrawal and a deposit can be recovered without Reader decoding`, async (t) => {
      const { session } = await fixture(t);
      const key = `0x${"9".repeat(64)}` as const;
      const hash = `0x${"8".repeat(64)}` as const;
      await writeJournal(
        session.directory,
        testJournal(address, {
          id: "pending-liquidity",
          inventory: { [`${kind}Token`]: kind === "gm" ? marketAddress : address },
          actions: [
            {
              id: "request",
              purpose: withdrawal ? `${kind}-withdraw` : `ui:${kind}-deposit`,
              txHash: hash,
              state: "settled",
              feeUsd: "1",
            },
          ],
        })
      );
      await session.resume("pending-liquidity");
      const eventName = `${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}Created`;
      const receipt = { status: "success", logs: [creationLog(eventName, key)] };
      session.rpc.getTransactionReceipt = async () => receipt as never;
      const read = session.rpc.readContract;
      let pending = true;
      session.rpc.readContract = async (args) => {
        if (args.functionName === "getBytes32ValuesAt") return (pending ? [key] : []) as never;
        if (args.functionName === "balanceOf") return 0n as never;
        return read(args);
      };
      await assert.rejects(withdrawLiquidity(session, kind), /Liquidity request remains pending/);
      if (withdrawal) return;
      let cancellations = 0;
      session.nativeTransaction = async (tx, purpose, cleanup) => {
        assert.equal(purpose, `${kind}-cancel:${key}`);
        assert.equal(cleanup, true);
        const decoded = decodeFunctionData({ abi: (kind === "gm" ? ExchangeRouter : GlvRouter) as Abi, data: tx.data });
        assert.equal(decoded.functionName, kind === "gm" ? "cancelDeposit" : "cancelGlvDeposit");
        assert.deepEqual(decoded.args, [key]);
        pending = false;
        cancellations++;
        return {} as FundedAction;
      };
      await withdrawLiquidity(session, kind, true);
      assert.equal(cancellations, 1);
    });
  }
}

for (const invalid of ["reverted", "wrong wallet", "wrong emitter", "mismatched key", "duplicate events"] as const) {
  test(`GLV cleanup rejects a ${invalid} creation receipt before any wallet action`, async (t) => {
    const { session } = await fixture(t);
    const key = `0x${"9".repeat(64)}` as const;
    await writeJournal(
      session.directory,
      testJournal(address, {
        id: "receipt-liquidity",
        inventory: { glvToken: address },
        actions: [
          { id: "deposit", purpose: "ui:glv-deposit", txHash: `0x${"8".repeat(64)}`, state: "settled", feeUsd: "1" },
        ],
      })
    );
    await session.resume("receipt-liquidity");
    const log = creationLog("GlvDepositCreated", key, invalid === "wrong wallet" ? marketAddress : address);
    if (invalid === "wrong emitter") log.address = marketAddress;
    if (invalid === "mismatched key") log.topics[2] = `0x${"7".repeat(64)}`;
    session.rpc.getTransactionReceipt = async () =>
      ({
        status: invalid === "reverted" ? "reverted" : "success",
        logs: invalid === "duplicate events" ? [log, log] : [log],
      }) as never;
    await assert.rejects(withdrawLiquidity(session, "glv", true), /Liquidity (?:creation receipt|request belongs)/);
    assert.equal(session.active.actions.length, 1);
  });
}

for (const kind of ["gm", "glv"] as const) {
  test(`${kind}: withdrawal/UI failure resumes without repeating the transaction`, async (t) => {
    const { session, state } = await fixture(t);
    const token = kind === "gm" ? marketAddress : address;
    await writeJournal(
      session.directory,
      testJournal(address, {
        id: "liquidity",
        feeProfile: kind === "glv" ? "glv" : "economy",
        inventory: { [`${kind}Token`]: token },
      })
    );
    await session.resume("liquidity");
    session.save = FundedSession.prototype.save;
    session.allowance = async () => {};
    let lp = 10n ** 18n;
    const reader = session.rpc.readContract;
    session.rpc.readContract = async (args) => {
      if (args.functionName === "balanceOf" && args.address === token) return lp as never;
      if (["getDeposit", "getWithdrawal", "getGlvDeposit", "getGlvWithdrawal"].includes(args.functionName))
        throw new Error("Reader struct ABI cannot decode the deployed response");
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
      assert.equal(purpose, `${kind}-withdraw`);
      assert.equal(calls[2].functionName, kind === "gm" ? "createWithdrawal" : "createGlvWithdrawal");
      assert.equal(calls[1].args![2], 10n ** 18n);
      const hash = `0x${String(++submissions).repeat(64)}` as const;
      const key = `0x${"9".repeat(64)}` as const;
      receipts.set(hash, {
        status: "success",
        logs: [creationLog(`${kind === "glv" ? "Glv" : ""}WithdrawalCreated`, key)],
      });
      lp = 0n;
      state.wrappedAmount += 250_000_000_000_000n;
      state.stableAmount += 500_000n;
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
    let failUI = true;
    const run = () =>
      session.step(`${kind}:withdraw`, async () => {
        await withdrawLiquidity(session, kind);
        if (failUI) throw new Error("UI delayed after settlement");
      });
    await assert.rejects(run(), /UI delayed/);
    await session.resume("liquidity");
    failUI = false;
    await run();
    assert.equal(lp, 0n);
    assert.equal(submissions, 1);
    assert.equal((await readJournal(session.directory))!.actions.length, 1);
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
  const files = (await readdir(session.directory)).filter((name) => name.startsWith("preflight-"));
  assert.equal(files.length, 1);
  const report = JSON.parse(await readFile(join(session.directory, files[0]), "utf8"));
  assert.equal(report.preflight.ready, false);
  assert.ok(report.preflight.checks.some((c: { scope: string; ok: boolean }) => c.scope === "staking" && !c.ok));
  assert.match(report.error, /preflight blocked before spending/);
});
