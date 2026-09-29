import { randomUUID } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  keccak256,
  parseAbi,
  parseGwei,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum } from "viem/chains";

import { GmxApiSdk } from "../../../sdk/src/clients/v2";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getOracleKeeperUrl } from "../../../sdk/src/configs/oracleKeeper";
import type { PrepareOrderRequest, PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import { PrivateKeySigner } from "../../../sdk/src/utils/signer/privateKeySigner";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { convertToUsd, parseContractPrice } from "../../../sdk/src/utils/tokens/utils";

import { affordablePosition, ceilDiv, checkFeeBudget, dollars, economy, rebalancePlan, USD } from "./economy";
import { checkGasPrice } from "./gasGuard";
import {
  chargedFees,
  readJournal,
  walletDirectory,
  writeJournal,
  type FundedAction,
  type FundedJournal,
} from "./journal";
import { inspectPreparedOrder, type OrderIntent } from "./preparedOrder";

const symbol = "ETH/USD [WETH-USDC]";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class FundedSession {
  readonly sdk = new GmxApiSdk({ chainId: 42161 });
  private readonly account;
  readonly address: Address;
  readonly directory: string;
  readonly rpcUrl =
    process.env.REGRESSION_RPC_URL ||
    process.env.REGRESSION_ARBITRUM_RPC_URL ||
    process.env.GMX_TEST_RPC_URL ||
    "https://arb1.arbitrum.io/rpc";
  readonly rpc = createPublicClient({
    chain: arbitrum,
    transport: http(this.rpcUrl, { timeout: 15_000, retryCount: 0 }),
  });
  private readonly signer;
  private journal?: FundedJournal;

  constructor() {
    const raw = (process.env.REGRESSION_PRIVATE_KEY || process.env.GMX_TEST_PRIVATE_KEY || "").trim();
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(raw)) throw new Error("Missing or invalid regression wallet key");
    const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
    this.account = privateKeyToAccount(key);
    this.signer = new PrivateKeySigner(key);
    this.address = this.account.address;
    this.directory = walletDirectory(this.address);
  }

  async snapshot() {
    const [markets, tokens, positions, orders, chainId, block, tickers] = await Promise.all([
      this.sdk.fetchMarkets(),
      this.sdk.fetchTokensData(),
      this.sdk.fetchPositionsInfo({ address: this.address }),
      this.sdk.fetchOrders({ address: this.address }),
      this.rpc.getChainId(),
      this.rpc.getBlock(),
      fetch(`${getOracleKeeperUrl(42161)}/prices/tickers`, { signal: AbortSignal.timeout(15_000) }).then(
        async (response) => {
          if (!response.ok) throw new Error("Oracle ticker request failed");
          const tickers: unknown = await response.json();
          if (!Array.isArray(tickers)) throw new Error("Invalid oracle tickers");
          return tickers as { tokenAddress: string; timestamp: number; minPrice: string; maxPrice: string }[];
        }
      ),
    ]);
    const age = Date.now() / 1000 - Number(block.timestamp);
    if (chainId !== 42161 || age > 120 || age < -30) throw new Error("Wrong-chain or stale RPC");
    const market = markets.find((m) => m.symbol === symbol && m.isListed);
    const usdc = tokens.find((t) => t.symbol === "USDC");
    const weth = tokens.find((t) => t.symbol === "WETH");
    if (!market || !usdc || !weth) throw new Error("Economy market or tokens unavailable");
    for (const token of [usdc, weth]) {
      const ticker = tickers.find((t) => getAddress(t.tokenAddress) === getAddress(token.address));
      const timestamp = Number(ticker?.timestamp);
      const priceAge = Date.now() / 1000 - timestamp;
      if (!ticker || !Number.isFinite(timestamp) || priceAge > 60 || priceAge < -30) {
        throw new Error("Missing or stale token prices");
      }
      token.prices = {
        minPrice: parseContractPrice(BigInt(ticker.minPrice), token.decimals),
        maxPrice: parseContractPrice(BigInt(ticker.maxPrice), token.decimals),
      };
      if (token.prices.minPrice <= 0n || token.prices.maxPrice < token.prices.minPrice)
        throw new Error("Invalid oracle price range");
    }
    const [nativeAmount, stableAmount, wrappedAmount, onchainPositions, onchainOrders] = await Promise.all([
      this.rpc.getBalance({ address: this.address }),
      this.rpc.readContract({
        abi: erc20Abi,
        address: usdc.address as Address,
        functionName: "balanceOf",
        args: [this.address],
      }),
      this.rpc.readContract({
        abi: erc20Abi,
        address: weth.address as Address,
        functionName: "balanceOf",
        args: [this.address],
      }),
      this.rpc.readContract({
        abi: SyntheticsReader as Abi,
        address: getContract(42161, "SyntheticsReader"),
        functionName: "getAccountPositions",
        args: [getContract(42161, "DataStore"), this.address, 0n, 100n],
      }),
      this.rpc.readContract({
        abi: SyntheticsReader as Abi,
        address: getContract(42161, "SyntheticsReader"),
        functionName: "getAccountOrders",
        args: [getContract(42161, "DataStore"), this.address, 0n, 100n],
      }),
    ]);
    if (!Array.isArray(onchainPositions) || !Array.isArray(onchainOrders)) throw new Error("Invalid reader inventory");
    return {
      market,
      usdc,
      weth,
      positions,
      orders,
      nativeAmount,
      stableAmount,
      wrappedAmount,
      onchainPositionCount: onchainPositions.length,
      onchainOrderCount: onchainOrders.length,
      nativeUsd: convertToUsd(nativeAmount, 18, weth.prices.minPrice)!,
      stableUsd: convertToUsd(stableAmount, usdc.decimals, usdc.prices.minPrice)!,
    };
  }

  async plan() {
    const state = await this.snapshot();
    const sizing = await this.quoteIncrease(state, true);
    return {
      chainId: 42161,
      wallet: this.address,
      balancesUsd: { USDC: dollars(state.stableUsd), ETH: dollars(state.nativeUsd) },
      positions: state.positions.length,
      orders: state.orders.length,
      sizing: {
        sizeUsd: dollars(sizing.sizeUsd),
        collateralUsd: dollars(sizing.collateralUsd),
        openingFeeCeilingUsd: dollars(sizing.feeUsd),
      },
      budgetsUsd: { run: "5", cleanupReserved: "2", action: "1", collateral: "5", notional: "10" },
      gasCeilingConfigured: !!this.maxGasGwei,
      executionEnabled: process.env.REGRESSION_FUNDED_EXECUTE === "1",
    };
  }

  private get maxGasGwei() {
    return process.env.REGRESSION_MAX_GAS_GWEI || process.env.REGRESSION_ARBITRUM_MAX_GAS_GWEI;
  }

  async begin() {
    const previous = await readJournal(this.directory);
    if (previous && !previous.completed)
      throw new Error("Unfinished funded run; run funded cleanup before starting another run");
    const state = await this.snapshot();
    if (
      state.positions.length ||
      state.orders.length ||
      state.onchainPositionCount ||
      state.onchainOrderCount ||
      state.wrappedAmount > 0n
    ) {
      throw new Error("Economy runs require no existing positions, orders or WETH; existing inventory is not swept");
    }
    const planned = await this.quoteIncrease(state, true);
    if (
      state.stableUsd < economy.stableReserveUsd + planned.collateralUsd + economy.runFeeLimitUsd ||
      state.nativeUsd < economy.nativeReserveUsd
    ) {
      throw new Error("Insufficient reserves for the planned collateral, full fee budget and native gas reserve");
    }
    this.journal = {
      version: 1,
      id: randomUUID(),
      chainId: 42161,
      address: this.address,
      createdAt: new Date().toISOString(),
      initialNativeUsd: state.nativeUsd.toString(),
      initialStableUsd: state.stableUsd.toString(),
      marketAddress: state.market.marketTokenAddress,
      ownedPositionKeys: [],
      ownedOrderKeys: [],
      actions: [],
      completed: false,
    };
    await this.save();
    return this.journal.id;
  }

  async resume(expectedRunId?: string) {
    this.journal = await readJournal(this.directory);
    if (
      !this.journal ||
      this.journal.address !== this.address ||
      (expectedRunId && expectedRunId !== this.journal.id)
    ) {
      throw new Error("No matching funded run journal");
    }
    return this.journal;
  }

  private get active() {
    if (!this.journal || this.journal.completed) throw new Error("No active funded run");
    return this.journal;
  }

  private async save() {
    await writeJournal(this.directory, this.journal!);
  }

  private async gate(feeUsd: bigint, cleanup: boolean) {
    if (process.env.REGRESSION_FUNDED_EXECUTE !== "1") throw new Error("Funded execution is disabled");
    if (this.active.actions.some((a) => a.state === "pending"))
      throw new Error("Unresolved prior submission; do not resend");
    if (!cleanup && this.active.actions.some((a) => a.state === "created"))
      throw new Error("An existing order must settle or be cancelled before another action");
    checkFeeBudget(chargedFees(this.active), feeUsd, cleanup);
    const gas = await checkGasPrice({ chainId: 42161, rpcUrl: this.rpcUrl, maxGasGwei: this.maxGasGwei });
    if (!gas.allowed) throw new Error(`BLOCKED: ${gas.reason}`);
  }

  private async quoteIncrease(state: Awaited<ReturnType<FundedSession["snapshot"]>>, isLong: boolean) {
    let costs = USD / 2n;
    for (let attempt = 0; attempt < 3; attempt++) {
      const sizing = affordablePosition({ ...state.market, openingCostsUsd: costs });
      const collateralAmount = ceilDiv(
        sizing.collateralUsd * 10n ** BigInt(state.usdc.decimals),
        state.usdc.prices.minPrice
      );
      const intent: OrderIntent = { kind: "increase", isLong, sizeUsd: sizing.sizeUsd, collateralAmount };
      const prepared = await this.sdk.prepareOrder({
        kind: "increase",
        symbol,
        direction: isLong ? "long" : "short",
        orderType: "market",
        size: sizing.sizeUsd,
        collateralToken: "USDC",
        gasPaymentToken: state.usdc.address,
        collateralToPay: { amount: collateralAmount, token: "USDC" },
        mode: "express",
        from: this.address,
        slippage: economy.slippageBps,
      });
      const quote = inspectPreparedOrder({
        prepared,
        intent,
        address: this.address,
        marketAddress: state.market.marketTokenAddress,
        ...state,
      });
      if (quote.feeUsd <= costs) return { ...sizing, ...quote, collateralAmount, prepared, intent };
      costs = quote.feeUsd;
    }
    throw new Error("Unstable opening quote; no order submitted");
  }

  async openSmallPosition(isLong: boolean) {
    await this.reconcile();
    const state = await this.snapshot();
    const previousOpen = this.active.actions.find((a) => a.purpose === "open");
    if (previousOpen) {
      const existing = state.positions.find(
        (p) => this.active.ownedPositionKeys.includes(p.key) && p.isLong === isLong
      );
      if (
        previousOpen.state === "settled" &&
        existing &&
        state.positions.length === 1 &&
        state.onchainPositionCount === 1 &&
        !state.orders.length &&
        !state.onchainOrderCount
      ) {
        return { sizeUsd: existing.sizeInUsd, collateralUsd: existing.collateralUsd };
      }
      throw new Error("Previous opening cannot be reused; a retry must not create another paid position");
    }
    if (state.positions.length || state.orders.length || state.onchainPositionCount || state.onchainOrderCount)
      throw new Error("Only one funded exposure at a time");
    const quote = await this.quoteIncrease(state, isLong);
    // Check the complete lifecycle budget before an approval can spend anything.
    checkFeeBudget(chargedFees(this.active), quote.feeUsd + USD / 20n, false);
    await this.allowance(
      state.usdc,
      ceilDiv(
        (economy.collateralLimitUsd + economy.runFeeLimitUsd) * 10n ** BigInt(state.usdc.decimals),
        state.usdc.prices.minPrice
      ),
      false
    );
    const fresh = await this.snapshot();
    const currentQuote = await this.quoteIncrease(fresh, isLong);
    if (
      fresh.stableUsd - currentQuote.collateralUsd - currentQuote.feeUsd <
      economy.stableReserveUsd + economy.cleanupReserveUsd
    ) {
      throw new Error("Opening would consume stablecoin and cleanup reserves");
    }
    await this.execute(currentQuote.prepared, currentQuote.intent, "open", false);
    return currentQuote;
  }

  private async execute(prepared: PrepareOrderResponse, intent: OrderIntent, purpose: string, cleanup: boolean) {
    let state = await this.snapshot();
    let quote = inspectPreparedOrder({
      prepared,
      intent,
      address: this.address,
      marketAddress: state.market.marketTokenAddress,
      ...state,
    });
    checkFeeBudget(chargedFees(this.active), quote.feeUsd, cleanup);
    if (
      getAddress(quote.feeToken.address) === getAddress(state.weth.address) &&
      state.wrappedAmount < quote.feeAmount
    ) {
      if (intent.kind !== "cancel" || !cleanup)
        throw new Error("Wrapped fees are only permitted for cleanup cancellation");
      await this.nativeTransaction(
        {
          to: state.weth.address as Address,
          data: encodeFunctionData({ abi: parseAbi(["function deposit() payable"]), functionName: "deposit" }),
          value: quote.feeAmount - state.wrappedAmount,
        },
        "wrap-cancel-fee",
        true
      );
    }
    await this.allowance(quote.feeToken, quote.feeAmount, cleanup);
    state = await this.snapshot();
    quote = inspectPreparedOrder({
      prepared,
      intent,
      address: this.address,
      marketAddress: state.market.marketTokenAddress,
      ...state,
    });
    if (state.nativeUsd < economy.nativeReserveUsd || state.stableUsd - quote.feeUsd < economy.stableReserveUsd) {
      throw new Error("Wallet reserves are insufficient for the action");
    }
    await this.gate(quote.feeUsd, cleanup);
    const action: FundedAction = {
      id: randomUUID(),
      purpose,
      feeUsd: quote.feeUsd.toString(),
      requestId: prepared.requestId,
      state: "pending",
    };
    this.active.actions.push(action);
    await this.save();
    // An exception after this point is ambiguous; reconciliation never resubmits it.
    const signature = await this.sdk.signOrder(prepared, this.signer);
    await this.sdk.submitOrder({
      mode: "express",
      requestId: prepared.requestId,
      idempotencyKey: prepared.idempotencyKey,
      signature,
      from: this.address,
      eip712Data: { batchParams: prepared.payload.batchParams, relayParams: prepared.payload.relayParams },
    });
    await this.reconcile(cleanup);
    if ((action.state as string) !== "settled") throw new Error("Funded action did not execute successfully");
  }

  async reconcile(allowCreatedOrders = false) {
    for (const action of this.active.actions.filter((a) => a.state === "pending" || a.state === "created")) {
      if (action.txHash) {
        const receipt = await this.rpc.waitForTransactionReceipt({ hash: action.txHash, timeout: 120_000 });
        action.state = receipt.status === "success" ? "settled" : "failed";
        await this.save();
        continue;
      }
      if (!action.requestId) throw new Error("Unresolved action without a transaction or request ID");
      for (let attempt = 0; attempt < 40; attempt++) {
        const status = await this.sdk.fetchOrderStatus({ requestId: action.requestId });
        if (status.orderKeys?.length) {
          action.orderKeys = status.orderKeys;
          for (const key of status.orderKeys)
            if (!this.active.ownedOrderKeys.includes(key)) this.active.ownedOrderKeys.push(key);
          await this.save();
        }
        // Cancellation has no keeper execution; a successful relay receipt is its settlement.
        const cancelled = action.purpose === "cancel" && ["created", "cancelled"].includes(status.status);
        if (cancelled || ["executed", "cancelled", "relay_failed", "relay_reverted"].includes(status.status)) {
          const hash = status.executionTxnHash || status.createdTxnHash || status.txHash;
          if (status.status === "executed" || cancelled) {
            if (!hash) throw new Error("Executed response has no receipt evidence");
            const receipt = await this.rpc.waitForTransactionReceipt({ hash: hash as Hex, timeout: 30_000 });
            if (receipt.status !== "success") throw new Error("Execution receipt is not successful");
          }
          if (action.purpose === "open" && status.status === "executed") {
            let positions = await this.sdk.fetchPositionsInfo({ address: this.address });
            for (let poll = 0; !positions.length && poll < 20; poll++) {
              await wait(1_000);
              positions = await this.sdk.fetchPositionsInfo({ address: this.address });
            }
            if (positions.length !== 1) throw new Error("Executed opening is not reflected in account state");
            for (const position of positions) {
              if (
                getAddress(position.marketAddress) !== getAddress(this.active.marketAddress) ||
                position.sizeInUsd > economy.positionLimitUsd
              ) {
                throw new Error("Unexpected position; ownership must be resolved manually");
              }
              if (!this.active.ownedPositionKeys.includes(position.key))
                this.active.ownedPositionKeys.push(position.key);
            }
          }
          action.state = status.status === "executed" || cancelled ? "settled" : "failed";
          await this.save();
          break;
        }
        if (
          allowCreatedOrders &&
          action.purpose === "open" &&
          status.status === "created" &&
          action.orderKeys?.length
        ) {
          const hash = status.createdTxnHash || status.txHash;
          if (!hash) throw new Error("Created order has no receipt evidence");
          const receipt = await this.rpc.waitForTransactionReceipt({ hash: hash as Hex, timeout: 30_000 });
          if (receipt.status !== "success") throw new Error("Order creation receipt is not successful");
          action.state = "created";
          await this.save();
          break;
        }
        await wait(3_000);
      }
      if (action.state === "pending" || (!allowCreatedOrders && action.state === "created"))
        throw new Error("Submission remains unresolved; no retry or new exposure is allowed");
    }
  }

  private async allowance(token: TokenData, amount: bigint, cleanup: boolean) {
    const spender = getContract(42161, "SyntheticsRouter") as Address;
    const current = await this.rpc.readContract({
      abi: erc20Abi,
      address: token.address as Address,
      functionName: "allowance",
      args: [this.address, spender],
    });
    if (current >= amount) return;
    await this.nativeTransaction(
      {
        to: token.address as Address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }),
        value: 0n,
      },
      "approve",
      cleanup
    );
  }

  private async nativeTransaction(tx: { to: Address; data: Hex; value: bigint }, purpose: string, cleanup: boolean) {
    const state = await this.snapshot();
    const wallet = createWalletClient({
      account: this.account,
      chain: arbitrum,
      transport: http(this.rpcUrl, { timeout: 15_000, retryCount: 0 }),
    });
    const prepared = await wallet.prepareTransactionRequest({
      ...tx,
      account: this.account,
      chain: arbitrum,
      type: "eip1559",
    });
    if (!prepared.gas || !prepared.maxFeePerGas) throw new Error("Missing transaction fee estimate");
    const gas = prepared.gas * 2n;
    if (!this.maxGasGwei) throw new Error("Missing explicit gas ceiling");
    const ceiling = parseGwei(this.maxGasGwei);
    const bufferedPrice = prepared.maxFeePerGas * 2n;
    const maxFeePerGas = bufferedPrice < ceiling ? bufferedPrice : ceiling;
    const feeUsd = convertToUsd(gas * maxFeePerGas, 18, state.weth.prices.maxPrice)!;
    if (
      state.nativeAmount - tx.value - gas * maxFeePerGas <
      ceilDiv(economy.nativeReserveUsd * 10n ** 18n, state.weth.prices.minPrice)
    ) {
      throw new Error("Transaction would consume native gas reserves");
    }
    await this.gate(feeUsd, cleanup);
    const signed = await wallet.signTransaction({ ...prepared, account: this.account, gas, maxFeePerGas });
    const action: FundedAction = {
      id: randomUUID(),
      purpose,
      feeUsd: feeUsd.toString(),
      txHash: keccak256(signed) as `0x${string}`,
      state: "pending",
    };
    this.active.actions.push(action);
    await this.save();
    await this.rpc.sendRawTransaction({ serializedTransaction: signed });
    await this.reconcile(cleanup);
    if ((action.state as string) !== "settled") throw new Error("Native transaction failed");
  }

  async cleanup(execute: boolean) {
    const journal = await this.resume();
    if (journal.completed) return { completed: true, alreadyClean: true };
    if (execute) await this.reconcile(true);
    let state = await this.snapshot();
    const unknownPositions = state.positions.filter((p) => !journal.ownedPositionKeys.includes(p.key));
    const unknownOrders = state.orders.filter((o) => !journal.ownedOrderKeys.includes(o.key));
    if (unknownPositions.length || unknownOrders.length)
      throw new Error("Unowned exposure found; cleanup will not touch it");
    const summary = {
      positions: state.positions.length,
      orders: state.orders.length,
      reservedFeesUsd: dollars(chargedFees(journal)),
      completed: false,
    };
    if (!execute) return summary;
    if (state.orders.length) {
      const keys = state.orders.map((o) => o.key);
      const prepared = await this.sdk.prepareCancelOrder({ orderIds: keys, mode: "express", from: this.address });
      await this.execute(prepared, { kind: "cancel", keys }, "cancel", true);
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      state = await this.snapshot();
      if (!state.orders.length && !state.onchainOrderCount) break;
      await wait(1_000);
    }
    if (state.orders.length || state.onchainOrderCount)
      throw new Error("Orders remain pending; no close or rebalance attempted");
    await this.reconcile();
    state = await this.snapshot();
    for (const position of state.positions) {
      if (!journal.ownedPositionKeys.includes(position.key) || position.sizeInUsd > economy.positionLimitUsd)
        throw new Error("Unexpected position during cleanup");
      const request: PrepareOrderRequest = {
        kind: "decrease",
        symbol: position.marketAddress,
        direction: position.isLong ? "long" : "short",
        orderType: "market",
        size: position.sizeInUsd,
        collateralToken: position.collateralTokenAddress,
        receiveToken: "USDC",
        gasPaymentToken: state.usdc.address,
        mode: "express",
        from: this.address,
        slippage: economy.slippageBps,
      };
      await this.execute(
        await this.sdk.prepareOrder(request),
        { kind: "close", isLong: position.isLong, sizeUsd: position.sizeInUsd },
        "close",
        true
      );
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      state = await this.snapshot();
      if (!state.positions.length && !state.orders.length && !state.onchainPositionCount && !state.onchainOrderCount)
        break;
      await wait(1_000);
    }
    if (state.positions.length || state.orders.length || state.onchainPositionCount || state.onchainOrderCount)
      throw new Error("Cleanup settlement incomplete; rebalance blocked");
    if (state.wrappedAmount > 0n) {
      await this.nativeTransaction(
        {
          to: state.weth.address as Address,
          data: encodeFunctionData({
            abi: parseAbi(["function withdraw(uint256)"]),
            functionName: "withdraw",
            args: [state.wrappedAmount],
          }),
          value: 0n,
        },
        "unwrap",
        true
      );
      state = await this.snapshot();
    }
    const plan = rebalancePlan({
      ...state,
      initialNativeUsd: BigInt(journal.initialNativeUsd),
      initialStableUsd: BigInt(journal.initialStableUsd),
    });
    if (plan.direction !== "none") {
      const buying = plan.direction === "buy-native";
      const token = buying ? state.usdc : state.weth;
      const receive = buying ? state.weth : state.usdc;
      const amount = (plan.amountUsd * 10n ** BigInt(token.decimals)) / token.prices.maxPrice;
      const minOutputAmount =
        (plan.amountUsd * 10n ** BigInt(receive.decimals) * 9_950n) / receive.prices.maxPrice / 10_000n;
      if (!buying) {
        await this.nativeTransaction(
          {
            to: state.weth.address as Address,
            data: encodeFunctionData({ abi: parseAbi(["function deposit() payable"]), functionName: "deposit" }),
            value: amount,
          },
          "wrap",
          true
        );
      }
      await this.allowance(token, amount + (buying ? 1_000_000n : 0n), true);
      const prepared = await this.sdk.prepareOrder({
        kind: "swap",
        orderType: "market",
        collateralToPay: { amount, token: token.address },
        receiveToken: buying ? "ETH" : "USDC",
        gasPaymentToken: state.usdc.address,
        mode: "express",
        from: this.address,
        slippage: economy.slippageBps,
      });
      await this.execute(
        prepared,
        { kind: "swap", tokenIn: token.address, amount, minOutputAmount, unwrapNative: buying },
        "rebalance",
        true
      );
    }
    state = await this.snapshot();
    const finalPlan = rebalancePlan({
      ...state,
      initialNativeUsd: BigInt(journal.initialNativeUsd),
      initialStableUsd: BigInt(journal.initialStableUsd),
    });
    if (
      state.orders.length ||
      state.positions.length ||
      state.onchainOrderCount !== 0 ||
      state.onchainPositionCount !== 0 ||
      state.wrappedAmount > 0n ||
      finalPlan.direction !== "none"
    ) {
      throw new Error("Final inventory is not clean or within the rebalance tolerance");
    }
    journal.completed = true;
    await this.save();
    return {
      ...summary,
      completed: true,
      reservedFeesUsd: dollars(chargedFees(journal)),
      nativeUsd: dollars(state.nativeUsd),
      stableUsd: dollars(state.stableUsd),
      ratioDriftBps: finalPlan.driftBps.toString(),
    };
  }
}
