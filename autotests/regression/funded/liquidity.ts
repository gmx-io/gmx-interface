import assert from "node:assert/strict";
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  parseEventLogs,
  parseAbi,
  zeroAddress,
  type Abi,
  type Address,
  type Hex,
} from "viem";

import EventEmitter from "../../../sdk/src/abis/EventEmitter";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import GlvReader from "../../../sdk/src/abis/GlvReader";
import GlvRouter from "../../../sdk/src/abis/GlvRouter";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { GmxSdk } from "../../../sdk/src/clients/v1";
import { getContract } from "../../../sdk/src/configs/contracts";
import {
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
} from "../../../sdk/src/configs/dataStore";
import { getOracleKeeperUrl } from "../../../sdk/src/configs/oracleKeeper";
import { hashData, hashString } from "../../../sdk/src/utils/hash";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  estimateExecuteGlvDepositGasLimit,
  estimateExecuteGlvWithdrawalGasLimit,
  getExecutionFee,
} from "../../../sdk/src/utils/fees/executionFee";
import type { FundedAction } from "./journal";
import { checkFeeBudget, dollars, economy, USD } from "./economy";
import { chargedFees } from "./journal";
import type { FundedSession } from "./session";
import { eventually } from "./trading";

type Kind = "gm" | "glv";
type GlvInfo = { glv: { glvToken: Address; longToken: Address; shortToken: Address }; markets: Address[] };
const dataStore = getContract(42161, "DataStore");

export async function lpBalance(session: FundedSession, token: Address) {
  return session.rpc.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [session.address],
  });
}

export async function planLiquidity(session: FundedSession, kind: Kind, policy = session.feePolicy) {
  const quote = await context(session, kind, false);
  const withdrawal = await context(session, kind, true);
  return {
    kind,
    token: quote.token,
    depositUsd: "1",
    depositKeeperFeeUsd: dollars(quote.fee.feeUsd),
    withdrawalKeeperFeeUsd: dollars(withdrawal.fee.feeUsd),
    actionFeeLimitUsd: dollars(policy.actionFeeLimitUsd),
    withinKeeperBudget:
      quote.fee.feeUsd + USD / 20n < policy.actionFeeLimitUsd &&
      withdrawal.fee.feeUsd + USD / 20n < policy.actionFeeLimitUsd,
  };
}

export async function liquidityRequestKeys(session: FundedSession, kind: Kind, withdrawal: boolean) {
  const label = `ACCOUNT_${kind === "glv" ? "GLV_" : ""}${withdrawal ? "WITHDRAWAL" : "DEPOSIT"}_LIST`;
  const key = hashData(["bytes32", "address"], [hashString(label), session.address]);
  return session.rpc.readContract({
    address: dataStore,
    abi: parseAbi(["function getBytes32ValuesAt(bytes32,uint256,uint256) view returns (bytes32[])"]),
    functionName: "getBytes32ValuesAt",
    args: [key as Hex, 0n, 100n],
  });
}

async function context(session: FundedSession, kind: Kind, withdrawal: boolean) {
  const state = await session.snapshot();
  const market = {
    marketToken: state.market.marketTokenAddress,
    indexToken: state.weth.address,
    longToken: state.weth.address,
    shortToken: state.usdc.address,
  };
  const price = (token: typeof state.weth) => ({
    min: token.prices.minPrice / 10n ** BigInt(token.decimals),
    max: token.prices.maxPrice / 10n ** BigInt(token.decimals),
  });
  const prices = {
    indexTokenPrice: price(state.weth),
    longTokenPrice: price(state.weth),
    shortTokenPrice: price(state.usdc),
  };
  const gmResult = (await session.rpc.readContract({
    abi: SyntheticsReader as Abi,
    address: getContract(42161, "SyntheticsReader"),
    functionName: "getMarketTokenPrice",
    args: [
      dataStore,
      market,
      prices.indexTokenPrice,
      prices.longTokenPrice,
      prices.shortTokenPrice,
      withdrawal ? MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY : MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
      !withdrawal,
    ],
  })) as [bigint, unknown];
  let token = getAddress(market.marketToken);
  let tokenPrice = gmResult[0];
  let marketsCount = 0n;
  if (kind === "glv") {
    const infos = (await session.rpc.readContract({
      abi: GlvReader as Abi,
      address: getContract(42161, "GlvReader"),
      functionName: "getGlvInfoList",
      args: [dataStore, 0n, 100n],
    })) as GlvInfo[];
    const glv = infos.find(
      (g) =>
        getAddress(g.glv.longToken) === getAddress(state.weth.address) &&
        getAddress(g.glv.shortToken) === getAddress(state.usdc.address) &&
        g.markets.some((m) => getAddress(m) === token)
    );
    assert.ok(glv, "No ETH/USDC GLV supports the selected market");
    token = glv.glv.glvToken;
    marketsCount = BigInt(glv.markets.length);
    const [markets, response] = await Promise.all([
      session.sdk.fetchMarkets(),
      fetch(`${getOracleKeeperUrl(42161)}/prices/tickers`, { signal: AbortSignal.timeout(15_000) }),
    ]);
    if (!response.ok) throw new Error("GLV oracle unavailable");
    const tickers = (await response.json()) as {
      tokenAddress: string;
      timestamp: number;
      minPrice: string;
      maxPrice: string;
    }[];
    const indexPrices = glv.markets.map((address) => {
      const item = markets.find((m) => getAddress(m.marketTokenAddress) === getAddress(address));
      assert.ok(item, "Missing GLV market");
      const ticker = tickers.find((t) => getAddress(t.tokenAddress) === getAddress(item.indexTokenAddress));
      assert.ok(
        ticker && Date.now() / 1000 - ticker.timestamp <= 60 && ticker.timestamp - Date.now() / 1000 <= 30,
        "Missing or stale GLV oracle price"
      );
      return { min: BigInt(ticker.minPrice), max: BigInt(ticker.maxPrice) };
    });
    const result = (await session.rpc.readContract({
      abi: GlvReader as Abi,
      address: getContract(42161, "GlvReader"),
      functionName: "getGlvTokenPrice",
      args: [dataStore, glv.markets, indexPrices, prices.longTokenPrice, prices.shortTokenPrice, token, !withdrawal],
    })) as bigint[];
    tokenPrice = result[0];
  }
  assert.ok(tokenPrice > 0n && gmResult[0] > 0n);
  const sdk = new GmxSdk({
    chainId: 42161,
    rpcUrl: session.rpcUrl,
    account: session.address,
    oracleUrl: getOracleKeeperUrl(42161),
    subsquidUrl: "",
  });
  const limits = await sdk.utils.getGasLimits();
  const gasLimit =
    kind === "gm"
      ? withdrawal
        ? estimateExecuteWithdrawalGasLimit(limits, {})
        : estimateExecuteDepositGasLimit(limits, {})
      : withdrawal
        ? estimateExecuteGlvWithdrawalGasLimit(limits, { marketsCount, swapsCount: 0n })
        : estimateExecuteGlvDepositGasLimit(limits, { marketsCount, isMarketTokenDeposit: false, swapsCount: 0n });
  const native = { ...state.weth, address: zeroAddress };
  const fee = getExecutionFee(
    42161,
    limits,
    { [zeroAddress]: native },
    gasLimit,
    (await session.rpc.getGasPrice()) * 2n,
    kind === "gm" ? 3n : marketsCount + 2n
  );
  assert.ok(fee && fee.feeUsd > 0n, "Missing liquidity execution fee quote");
  return {
    state,
    token,
    tokenPrice,
    gmPrice: gmResult[0],
    market,
    prices,
    fee,
    router: getContract(42161, kind === "gm" ? "ExchangeRouter" : "GlvRouter"),
    abi: (kind === "gm" ? ExchangeRouter : GlvRouter) as Abi,
  };
}

function multicall(abi: Abi, calls: { functionName: string; args: unknown[] }[]) {
  return encodeFunctionData({
    abi,
    functionName: "multicall",
    args: [calls.map((call) => encodeFunctionData({ abi, ...call }))],
  });
}

async function requestKey(session: FundedSession, kind: Kind, withdrawal: boolean, action: FundedAction) {
  const name = `${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}Created`;
  assert.ok(action.txHash);
  const receipt = await session.rpc.getTransactionReceipt({ hash: action.txHash });
  const events = parseEventLogs({
    abi: EventEmitter as Abi,
    logs: receipt.logs.filter((log) => getAddress(log.address) === getAddress(getContract(42161, "EventEmitter"))),
    strict: false,
  });
  const event = events.find((e) => (e.args as { eventName?: string }).eventName === name);
  const key = (event?.args as { topic1?: Hex } | undefined)?.topic1;
  assert.ok(key, "Liquidity creation receipt has no request key");
  return key;
}

async function requestPending(session: FundedSession, kind: Kind, withdrawal: boolean, key: Hex) {
  const request = (await session.rpc.readContract({
    address: getContract(42161, kind === "gm" ? "SyntheticsReader" : "GlvReader"),
    abi: (kind === "gm" ? SyntheticsReader : GlvReader) as Abi,
    functionName: `get${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}`,
    args: [dataStore, key],
  })) as { addresses: { account: string } };
  if (getAddress(request.addresses.account) === zeroAddress) return false;
  assert.equal(getAddress(request.addresses.account), session.address);
  return true;
}

export async function depositLiquidity(session: FundedSession, kind: Kind) {
  const ctx = await context(session, kind, false);
  if (!(await session.previousAction(`${kind}-deposit`))) {
    const exitQuote = await context(session, kind, true);
    checkFeeBudget(chargedFees(session.active), ctx.fee.feeUsd + USD / 20n, false, session.feePolicy);
    checkFeeBudget(
      chargedFees(session.active) + ctx.fee.feeUsd + USD / 20n,
      exitQuote.fee.feeUsd + USD / 20n,
      true,
      session.feePolicy
    );
  }
  const inventory = (session.active.inventory ??= {});
  if (!inventory[`${kind}Token`]) {
    for (const withdrawal of [false, true]) {
      assert.deepEqual(
        await liquidityRequestKeys(session, kind, withdrawal),
        [],
        "Existing liquidity requests must settle before regression"
      );
    }
    assert.equal(await lpBalance(session, ctx.token), 0n, "Existing LP tokens must not be swept");
    inventory[`${kind}Token`] = ctx.token;
    await session.save();
  }
  if (ctx.state.stableUsd - USD < economy.stableReserveUsd + economy.cleanupReserveUsd)
    throw new Error("Liquidity deposit would consume reserves");
  const amount = 1_000_000n;
  const minimum = await session.remember(
    "minimum-mint",
    async () => (USD * 10n ** 18n * 9_950n) / ctx.tokenPrice / 10_000n
  );
  await session.allowance(ctx.state.usdc, amount, false);
  const vault = getContract(42161, kind === "gm" ? "DepositVault" : "GlvVault");
  const addresses = {
    receiver: session.address,
    callbackContract: zeroAddress,
    uiFeeReceiver: zeroAddress,
    market: ctx.market.marketToken,
    initialLongToken: ctx.state.weth.address,
    initialShortToken: ctx.state.usdc.address,
    longTokenSwapPath: [],
    shortTokenSwapPath: [],
    ...(kind === "glv" ? { glv: ctx.token } : {}),
  };
  const params = {
    addresses,
    executionFee: ctx.fee.feeTokenAmount,
    callbackGasLimit: 0n,
    shouldUnwrapNativeToken: false,
    dataList: [],
    ...(kind === "gm" ? { minMarketTokens: minimum } : { minGlvTokens: minimum, isMarketTokenDeposit: false }),
  };
  const data = multicall(ctx.abi, [
    { functionName: "sendWnt", args: [vault, ctx.fee.feeTokenAmount] },
    { functionName: "sendTokens", args: [ctx.state.usdc.address, vault, amount] },
    { functionName: kind === "gm" ? "createDeposit" : "createGlvDeposit", args: [params] },
  ]);
  const action = await session.nativeTransaction(
    { to: ctx.router, data, value: ctx.fee.feeTokenAmount },
    `${kind}-deposit`,
    false,
    (ctx.fee.feeTokenAmount * ctx.state.weth.prices.maxPrice) / 10n ** 18n + USD / 100n
  );
  const key = await requestKey(session, kind, false, action);
  await eventually(
    () => requestPending(session, kind, false, key),
    (pending) => !pending,
    180_000
  );
  const balance = await lpBalance(session, ctx.token);
  assert.ok(balance >= minimum, "Liquidity deposit was cancelled or did not mint the minimum LP tokens");
  return { token: ctx.token, amount: balance };
}

export async function withdrawLiquidity(session: FundedSession, kind: Kind, recovery = false) {
  const token = session.active.inventory?.[`${kind}Token`] as Address | undefined;
  if (!token) return;
  // A native creation receipt alone does not prove keeper settlement.
  for (const action of session.active.actions.filter(
    (a) => a.state !== "failed" && (a.purpose === `${kind}-deposit` || a.purpose === `${kind}-withdraw`)
  )) {
    const withdrawal = action.purpose.endsWith("withdraw");
    const key = await requestKey(session, kind, withdrawal, action);
    if (await requestPending(session, kind, withdrawal, key)) {
      if (!recovery) throw new Error("Liquidity request remains pending");
      const abi = (kind === "gm" ? ExchangeRouter : GlvRouter) as Abi;
      const functionName = `cancel${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}`;
      await session.nativeTransaction(
        {
          to: getContract(42161, kind === "gm" ? "ExchangeRouter" : "GlvRouter"),
          value: 0n,
          data: encodeFunctionData({ abi, functionName, args: [key] }),
        },
        `${kind}-cancel:${key}`,
        true
      );
      await eventually(
        () => requestPending(session, kind, withdrawal, key),
        (pending) => !pending
      );
    }
  }
  const amount = await lpBalance(session, token);
  if (!amount) {
    if (!recovery) await verifyWithdrawalOutputs(session, kind);
    return;
  }
  const ctx = await context(session, kind, true);
  assert.equal(getAddress(ctx.token), getAddress(token));
  assert.ok((amount * ctx.tokenPrice) / 10n ** 18n <= 2n * USD, "Unexpected LP inventory");
  const gmAmount = kind === "gm" ? amount : (amount * ctx.tokenPrice) / ctx.gmPrice;
  const quote = (await session.rpc.readContract({
    abi: SyntheticsReader as Abi,
    address: getContract(42161, "SyntheticsReader"),
    functionName: "getWithdrawalAmountOut",
    args: [dataStore, ctx.market, ctx.prices, gmAmount, zeroAddress, 4],
  })) as [bigint, bigint];
  const minLongTokenAmount = (quote[0] * 9_950n) / 10_000n;
  const minShortTokenAmount = (quote[1] * 9_950n) / 10_000n;
  assert.ok(minLongTokenAmount + minShortTokenAmount > 0n, "Empty withdrawal quote");
  const lpValue = (amount * ctx.tokenPrice) / 10n ** 18n;
  const minimumOutputValue =
    (minLongTokenAmount * ctx.state.weth.prices.minPrice) / 10n ** 18n +
    (minShortTokenAmount * ctx.state.usdc.prices.minPrice) / 10n ** BigInt(ctx.state.usdc.decimals);
  const withdrawalCost = lpValue > minimumOutputValue ? lpValue - minimumOutputValue : 0n;
  await session.allowance({ address: token }, amount, true);
  const vault = getContract(42161, kind === "gm" ? "WithdrawalVault" : "GlvVault");
  const params = {
    addresses: {
      receiver: session.address,
      callbackContract: zeroAddress,
      uiFeeReceiver: zeroAddress,
      market: ctx.market.marketToken,
      longTokenSwapPath: [],
      shortTokenSwapPath: [],
      ...(kind === "glv" ? { glv: token } : {}),
    },
    minLongTokenAmount,
    minShortTokenAmount,
    executionFee: ctx.fee.feeTokenAmount,
    callbackGasLimit: 0n,
    shouldUnwrapNativeToken: false,
    dataList: [],
  };
  const data = multicall(ctx.abi, [
    { functionName: "sendWnt", args: [vault, ctx.fee.feeTokenAmount] },
    { functionName: "sendTokens", args: [token, vault, amount] },
    { functionName: kind === "gm" ? "createWithdrawal" : "createGlvWithdrawal", args: [params] },
  ]);
  session.active.inventory![`${kind}WithdrawalOutputs`] = JSON.stringify({
    wrappedAmount: (ctx.state.wrappedAmount + minLongTokenAmount).toString(),
    stableAmount: (ctx.state.stableAmount + minShortTokenAmount).toString(),
  });
  await session.save();
  const action = await session.nativeTransaction(
    { to: ctx.router, value: ctx.fee.feeTokenAmount, data },
    `${kind}-withdraw`,
    true,
    (ctx.fee.feeTokenAmount * ctx.state.weth.prices.maxPrice) / 10n ** 18n + withdrawalCost + USD / 100n
  );
  const key = await requestKey(session, kind, true, action);
  await eventually(
    () => requestPending(session, kind, true, key),
    (pending) => !pending,
    180_000
  );
  assert.equal(await lpBalance(session, token), 0n, "LP withdrawal was cancelled");
  await verifyWithdrawalOutputs(session, kind);
}

async function verifyWithdrawalOutputs(session: FundedSession, kind: Kind) {
  const saved = session.active.inventory?.[`${kind}WithdrawalOutputs`];
  if (!saved) return;
  const expected = JSON.parse(saved) as { wrappedAmount: string; stableAmount: string };
  const after = await session.snapshot();
  assert.ok(
    after.wrappedAmount >= BigInt(expected.wrappedAmount) && after.stableAmount >= BigInt(expected.stableAmount),
    "Withdrawal outputs did not reach the wallet"
  );
}
