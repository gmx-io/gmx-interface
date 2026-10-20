import assert from "node:assert/strict";
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  parseEventLogs,
  parseAbi,
  zeroAddress,
  zeroHash,
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
import { HttpError } from "../../../sdk/src/utils/http/http";
import { hashData, hashString } from "../../../sdk/src/utils/hash";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  estimateExecuteGlvDepositGasLimit,
  estimateExecuteGlvWithdrawalGasLimit,
  getExecutionFee,
} from "../../../sdk/src/utils/fees/executionFee";
import type { FundedAction } from "./journal";
import { dollars, USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually } from "./trading";
import { readFundedData } from "./read";

type Kind = "gm" | "glv";
type GlvInfo = { glv: { glvToken: Address; longToken: Address; shortToken: Address }; markets: Address[] };
const dataStore = getContract(42161, "DataStore");

export async function lpBalance(session: FundedSession, token: Address) {
  return readFundedData("LP balance", () =>
    session.rpc.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [session.address],
    })
  );
}

export async function planLiquidity(session: FundedSession, kind: Kind, policy = session.feePolicy) {
  const quote = await readLiquidityContext(session, kind, false);
  const withdrawal = await readLiquidityContext(session, kind, true);
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
  return readFundedData("Liquidity request keys", () =>
    session.rpc.readContract({
      address: dataStore,
      abi: parseAbi(["function getBytes32ValuesAt(bytes32,uint256,uint256) view returns (bytes32[])"]),
      functionName: "getBytes32ValuesAt",
      args: [key as Hex, 0n, 100n],
    })
  );
}

export async function readLiquidityContext(session: FundedSession, kind: Kind, withdrawal: boolean) {
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
  const gmResult = (await readFundedData("GM token price", () =>
    session.rpc.readContract({
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
    })
  )) as [bigint, unknown];
  let token = getAddress(market.marketToken);
  let tokenPrice = gmResult[0];
  let marketsCount = 0n;
  if (kind === "glv") {
    const infos = (await readFundedData("GLV markets", () =>
      session.rpc.readContract({
        abi: GlvReader as Abi,
        address: getContract(42161, "GlvReader"),
        functionName: "getGlvInfoList",
        args: [dataStore, 0n, 100n],
      })
    )) as GlvInfo[];
    const glv = infos.find(
      (g) =>
        getAddress(g.glv.longToken) === getAddress(state.weth.address) &&
        getAddress(g.glv.shortToken) === getAddress(state.usdc.address) &&
        g.markets.some((m) => getAddress(m) === token)
    );
    assert.ok(glv, "No ETH/USDC GLV supports the selected market");
    token = glv.glv.glvToken;
    marketsCount = BigInt(glv.markets.length);
    const [markets, tickers] = await Promise.all([
      readFundedData("GLV market data", () => session.sdk.fetchMarkets()),
      readFundedData("GLV oracle prices", async () => {
        const response = await fetch(`${getOracleKeeperUrl(42161)}/prices/tickers`, {
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new HttpError(response.status, "GLV oracle unavailable");
        return (await response.json()) as {
          tokenAddress: string;
          timestamp: number;
          minPrice: string;
          maxPrice: string;
        }[];
      }),
    ]);
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
    const result = (await readFundedData("GLV token price", () =>
      session.rpc.readContract({
        abi: GlvReader as Abi,
        address: getContract(42161, "GlvReader"),
        functionName: "getGlvTokenPrice",
        args: [dataStore, glv.markets, indexPrices, prices.longTokenPrice, prices.shortTokenPrice, token, !withdrawal],
      })
    )) as bigint[];
    tokenPrice = result[0];
  }
  assert.ok(tokenPrice > 0n && gmResult[0] > 0n);
  const sdk = new GmxSdk({
    chainId: 42161,
    rpcUrl: session.rpcUrl,
    publicClient: session.rpc,
    account: session.address,
    oracleUrl: getOracleKeeperUrl(42161),
    subsquidUrl: "",
  });
  const limits = await readFundedData("Liquidity gas limits", () => sdk.utils.getGasLimits());
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
    (await readFundedData("Liquidity gas price", () => session.rpc.getGasPrice())) * 2n,
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

export async function liquidityRequestKey(
  session: FundedSession,
  kind: Kind,
  withdrawal: boolean,
  action: FundedAction
) {
  const name = `${kind === "glv" ? "Glv" : ""}${withdrawal ? "Withdrawal" : "Deposit"}Created`;
  assert.ok(action.txHash);
  const receipt = await readFundedData("Liquidity creation receipt", () =>
    session.rpc.getTransactionReceipt({ hash: action.txHash! })
  );
  assert.equal(receipt.status, "success", "Liquidity creation receipt is not successful");
  const events = parseEventLogs({
    abi: EventEmitter as Abi,
    logs: receipt.logs.filter((log) => getAddress(log.address) === getAddress(getContract(42161, "EventEmitter"))),
    strict: false,
  });
  const created = events.filter((e) => (e.args as { eventName?: string }).eventName === name);
  assert.equal(created.length, 1, "Liquidity creation receipt must contain one request");
  const { topic1: key, eventData } = created[0].args as {
    topic1: Hex;
    eventData: {
      addressItems: { items: { key: string; value: string }[] };
      bytes32Items: { items: { key: string; value: string }[] };
    };
  };
  const account = eventData.addressItems.items.find((item) => item.key === "account")?.value;
  assert.ok(
    account && getAddress(account) === getAddress(session.address),
    "Liquidity request belongs to another wallet"
  );
  assert.ok(
    key && key !== zeroHash && eventData.bytes32Items.items.find((item) => item.key === "key")?.value === key,
    "Liquidity creation receipt has no matching request key"
  );
  return key;
}

async function requestPending(session: FundedSession, kind: Kind, withdrawal: boolean, key: Hex) {
  // Request lists avoid decoding version-dependent Reader structs after execution.
  return (await liquidityRequestKeys(session, kind, withdrawal)).some((pendingKey) => pendingKey === key);
}

export async function withdrawLiquidity(session: FundedSession, kind: Kind, recovery = false) {
  const token = session.active.inventory?.[`${kind}Token`] as Address | undefined;
  if (!token) return;
  // A native creation receipt alone does not prove keeper settlement.
  for (const action of session.active.actions.filter(
    (a) => a.state !== "failed" && [`${kind}-withdraw`, `ui:${kind}-deposit`, `ui:${kind}-withdraw`].includes(a.purpose)
  )) {
    const withdrawal = action.purpose.endsWith("withdraw");
    const key = await liquidityRequestKey(session, kind, withdrawal, action);
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
  const ctx = await readLiquidityContext(session, kind, true);
  assert.equal(getAddress(ctx.token), getAddress(token));
  assert.ok((amount * ctx.tokenPrice) / 10n ** 18n <= 2n * USD, "Unexpected LP inventory");
  const gmAmount = kind === "gm" ? amount : (amount * ctx.tokenPrice) / ctx.gmPrice;
  const quote = (await readFundedData("Liquidity withdrawal quote", () =>
    session.rpc.readContract({
      abi: SyntheticsReader as Abi,
      address: getContract(42161, "SyntheticsReader"),
      functionName: "getWithdrawalAmountOut",
      args: [dataStore, ctx.market, ctx.prices, gmAmount, zeroAddress, 4],
    })
  )) as [bigint, bigint];
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
  const key = await liquidityRequestKey(session, kind, true, action);
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
