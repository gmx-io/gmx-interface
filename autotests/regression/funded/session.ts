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
import { arbitrum, base } from "viem/chains";

import { GmxApiSdk } from "../../../sdk/src/clients/v2";
import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import { getContract } from "../../../sdk/src/configs/contracts";
import { subaccountListKey } from "../../../sdk/src/configs/dataStore";
import { getOracleKeeperUrl } from "../../../sdk/src/configs/oracleKeeper";
import type { BridgeOutParams } from "../../../sdk/src/utils/multichain/api";
import type { PrepareOrderRequest, PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import { PrivateKeySigner } from "../../../sdk/src/utils/signer/privateKeySigner";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { convertToUsd, parseContractPrice } from "../../../sdk/src/utils/tokens/utils";

import { accountBalance } from "./account";
import { inspectBridgeWithdrawal, reconcileBridge } from "./bridge";
import {
  affordablePosition,
  ceilDiv,
  checkFeeBudget,
  dollars,
  economy,
  feePolicy,
  rebalancePlan,
  rebalanceTarget,
  startingReserves,
  USD,
  type FeeProfile,
} from "./economy";
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
import { cleanupResources } from "./resources";
import { registerTwapReceipt } from "./trading";

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
  readonly sourceRpcUrl =
    process.env.REGRESSION_BASE_RPC_URL || process.env.GMX_TEST_SOURCE_RPC_URL || "https://mainnet.base.org";
  readonly sourceRpc = createPublicClient({
    chain: base,
    transport: http(this.sourceRpcUrl, { timeout: 15_000, retryCount: 0 }),
  });
  private readonly signer;
  private journal?: FundedJournal;
  private currentStep?: string;

  constructor(private readonly requestedFeeProfile: FeeProfile = "economy") {
    const raw = (process.env.REGRESSION_PRIVATE_KEY || process.env.GMX_TEST_PRIVATE_KEY || "").trim();
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(raw)) throw new Error("Missing or invalid regression wallet key");
    const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
    this.account = privateKeyToAccount(key);
    this.signer = new PrivateKeySigner(key);
    this.address = this.account.address;
    this.directory = walletDirectory(this.address);
  }

  get feeProfile(): FeeProfile {
    return this.journal ? this.journal.feeProfile ?? "economy" : this.requestedFeeProfile;
  }

  get feePolicy() {
    return feePolicy(this.feeProfile);
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
    const reserves = startingReserves({
      ...state,
      collateralUsd: sizing.collateralUsd,
      profile: this.requestedFeeProfile,
    });
    const allocation = rebalanceTarget({
      ...state,
      initialNativeUsd: state.nativeUsd,
      initialStableUsd: state.stableUsd,
      targetNativeBps: economy.targetNativeBps,
    });
    return {
      chainId: 42161,
      wallet: this.address,
      balancesUsd: { USDC: dollars(state.stableUsd), ETH: dollars(state.nativeUsd) },
      startingReserves: {
        sufficient: reserves.sufficient,
        requiredUsd: { USDC: dollars(reserves.requiredUsd.USDC), ETH: dollars(reserves.requiredUsd.ETH) },
        shortfallUsd: { USDC: dollars(reserves.shortfallUsd.USDC), ETH: dollars(reserves.shortfallUsd.ETH) },
      },
      allocation: {
        chainId: 42161,
        targetPercent: {
          ETH: Number(economy.targetNativeBps) / 100,
          USDC: 100 - Number(economy.targetNativeBps) / 100,
        },
        targetUsd: { ETH: dollars(allocation.targetUsd.ETH), USDC: dollars(allocation.targetUsd.USDC) },
        withinTolerance: allocation.direction === "none",
        adjustment: { direction: allocation.direction, amountUsd: dollars(allocation.amountUsd) },
        toleranceBps: Number(economy.rebalanceToleranceBps),
      },
      positions: state.positions.length,
      orders: state.orders.length,
      sizing: {
        sizeUsd: dollars(sizing.sizeUsd),
        collateralUsd: dollars(sizing.collateralUsd),
        openingFeeCeilingUsd: dollars(sizing.feeUsd),
      },
      feeProfile: this.requestedFeeProfile,
      budgetsUsd: {
        run: dollars(this.feePolicy.runFeeLimitUsd),
        cleanupReserved: dollars(this.feePolicy.cleanupReserveUsd),
        action: dollars(this.feePolicy.actionFeeLimitUsd),
        collateral: "5",
        notional: "10",
      },
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
    this.journal = undefined;
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
    const planned = this.requestedFeeProfile === "glv" ? { collateralUsd: USD } : await this.quoteIncrease(state, true);
    const reserves = startingReserves({
      ...state,
      collateralUsd: planned.collateralUsd,
      profile: this.requestedFeeProfile,
    });
    if (!reserves.sufficient) {
      const balances = { USDC: state.stableUsd, ETH: state.nativeUsd };
      const missing = (["USDC", "ETH"] as const)
        .filter((token) => reserves.shortfallUsd[token] > 0n)
        .map((token) => {
          // Round requirements up and available funds down; never display a zero shortfall.
          const cent = USD / 100n;
          const available = dollars((balances[token] / cent) * cent);
          const required = dollars(ceilDiv(reserves.requiredUsd[token], cent) * cent);
          const shortfall = dollars(ceilDiv(reserves.shortfallUsd[token], cent) * cent);
          return `${token}: available $${available}, required $${required}, short by $${shortfall}`;
        });
      throw new Error(
        `Insufficient starting reserves (USD values rounded conservatively). ${missing.join("; ")}. Run funded:plan for exact values.`
      );
    }
    const allocation = rebalanceTarget({
      ...state,
      initialNativeUsd: state.nativeUsd,
      initialStableUsd: state.stableUsd,
      targetNativeBps: economy.targetNativeBps,
    });
    if (allocation.direction !== "none")
      throw new Error(
        "Prepare the Arbitrum wallet at approximately 50/50 ETH/USDC by USD value before starting. Run funded:plan for the adjustment; initial allocation is not performed by cleanup."
      );
    this.journal = {
      version: 1,
      id: randomUUID(),
      chainId: 42161,
      address: this.address,
      createdAt: new Date().toISOString(),
      initialNativeUsd: state.nativeUsd.toString(),
      initialStableUsd: state.stableUsd.toString(),
      targetNativeBps: economy.targetNativeBps.toString(),
      marketAddress: state.market.marketTokenAddress,
      ownedPositionKeys: [],
      ownedOrderKeys: [],
      actions: [],
      completed: false,
      feeProfile: this.requestedFeeProfile,
      inventory: {
        initialNativeAmount: state.nativeAmount.toString(),
        initialStableAmount: state.stableAmount.toString(),
      },
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

  get active() {
    if (!this.journal || this.journal.completed) throw new Error("No active funded run");
    return this.journal;
  }

  async save() {
    await writeJournal(this.directory, this.journal!);
  }

  async step<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const checkpoints = (this.active.checkpoints ??= {});
    if (checkpoints[id]?.finishedAt) {
      return JSON.parse(checkpoints[id].result!, (_, value) =>
        value && typeof value === "object" && "$bigint" in value ? BigInt(value.$bigint) : value
      ) as T;
    }
    checkpoints[id] ??= { startedAt: new Date().toISOString() };
    await this.save();
    const previousStep = this.currentStep;
    this.currentStep = id;
    try {
      await this.reconcile(true);
      const result = await operation();
      checkpoints[id].result = JSON.stringify(result ?? null, (_, value) =>
        typeof value === "bigint" ? { $bigint: value.toString() } : value
      );
      checkpoints[id].finishedAt = new Date().toISOString();
      await this.save();
      return result;
    } finally {
      this.currentStep = previousStep;
    }
  }

  async remember<T>(name: string, read: () => Promise<T>): Promise<T> {
    if (!this.currentStep) return read();
    const key = `${this.currentStep}/${name}`;
    const inventory = (this.active.inventory ??= {});
    if (inventory[key] === undefined) {
      inventory[key] = JSON.stringify(await read(), (_, value) =>
        typeof value === "bigint" ? { $bigint: value.toString() } : value
      );
      await this.save();
    }
    return JSON.parse(inventory[key], (_, value) =>
      value && typeof value === "object" && "$bigint" in value ? BigInt(value.$bigint) : value
    ) as T;
  }

  async previousAction(purpose: string) {
    if (!this.currentStep) return undefined;
    const previous = this.active.actions.find((a) => a.step === this.currentStep && a.purpose === purpose);
    if (!previous) return undefined;
    await this.reconcile(true);
    if (previous.state !== "settled" && !(previous.state === "created" && previous.settlement === "creation"))
      throw new Error("Previous step has not settled; a retry cannot submit it again");
    return previous;
  }

  async gate(feeUsd: bigint, cleanup: boolean, chainId: 42161 | 8453 = 42161) {
    if (process.env.REGRESSION_FUNDED_EXECUTE !== "1") throw new Error("Funded execution is disabled");
    if (this.active.actions.some((a) => a.state === "pending"))
      throw new Error("Unresolved prior submission; do not resend");
    if (!cleanup && this.active.actions.some((a) => a.state === "created" && a.settlement !== "creation"))
      throw new Error("An existing order must settle or be cancelled before another action");
    checkFeeBudget(chargedFees(this.active), feeUsd, cleanup, this.feePolicy);
    const gas = await checkGasPrice({
      chainId,
      rpcUrl: chainId === 42161 ? this.rpcUrl : this.sourceRpcUrl,
      maxGasGwei: chainId === 42161 ? this.maxGasGwei : process.env.REGRESSION_BASE_MAX_GAS_GWEI,
    });
    if (!gas.allowed) throw new Error(`BLOCKED: ${gas.reason}`);
  }

  async quoteIncrease(state: Awaited<ReturnType<FundedSession["snapshot"]>>, isLong: boolean, remainingParts = 1) {
    let costs = USD / 2n;
    for (let attempt = 0; attempt < 3; attempt++) {
      const sizing = affordablePosition({ ...state.market, openingCostsUsd: costs, remainingParts });
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
        subaccountApproval: this.sdk.subaccountApprovalMessage,
        ...state,
      });
      if (quote.feeUsd <= costs) return { ...sizing, ...quote, collateralAmount, prepared, intent };
      costs = quote.feeUsd;
    }
    throw new Error("Unstable opening quote; no order submitted");
  }

  async openSmallPosition(isLong: boolean, remainingParts = 1) {
    await this.reconcile();
    const state = await this.snapshot();
    const previousOpen = this.active.actions.find((a) => a.purpose === "open" && a.step === this.currentStep);
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
    const quote = await this.quoteIncrease(state, isLong, remainingParts);
    // Check the complete lifecycle budget before an approval can spend anything.
    checkFeeBudget(chargedFees(this.active), quote.feeUsd + USD / 20n, false, this.feePolicy);
    await this.allowance(
      state.usdc,
      ceilDiv(
        (economy.collateralLimitUsd + this.feePolicy.runFeeLimitUsd) * 10n ** BigInt(state.usdc.decimals),
        state.usdc.prices.minPrice
      ),
      false
    );
    const fresh = await this.snapshot();
    const currentQuote = await this.quoteIncrease(fresh, isLong, remainingParts);
    if (
      fresh.stableUsd - currentQuote.collateralUsd - currentQuote.feeUsd <
      economy.stableReserveUsd + this.feePolicy.cleanupReserveUsd
    ) {
      throw new Error("Opening would consume stablecoin and cleanup reserves");
    }
    await this.execute(currentQuote.prepared, currentQuote.intent, "open", false);
    return currentQuote;
  }

  async quoteSwap(
    state: Awaited<ReturnType<FundedSession["snapshot"]>>,
    amount: bigint,
    buying: boolean,
    unwrapNative: boolean
  ) {
    const token = buying ? state.usdc : state.weth;
    const receive = buying ? state.weth : state.usdc;
    const valueUsd = convertToUsd(amount, token.decimals, token.prices.minPrice)!;
    if (amount <= 0n || convertToUsd(amount, token.decimals, token.prices.maxPrice)! > economy.rebalanceLimitUsd)
      throw new Error("Swap exceeds the cleanup limit");
    if (unwrapNative && !buying) throw new Error("Only an ETH output can be unwrapped");
    const intent: Extract<OrderIntent, { kind: "swap" }> = {
      kind: "swap",
      tokenIn: token.address,
      amount,
      minOutputAmount: (valueUsd * 10n ** BigInt(receive.decimals) * 9_950n) / receive.prices.maxPrice / 10_000n,
      unwrapNative,
    };
    const prepared = await this.sdk.prepareOrder({
      kind: "swap",
      orderType: "market",
      collateralToPay: { amount, token: token.address },
      receiveToken: unwrapNative ? "ETH" : receive.address,
      manualSwapPath: [state.market.marketTokenAddress],
      gasPaymentToken: state.usdc.address,
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
    return { prepared, intent, feeUsd: quote.feeUsd };
  }

  async execute(
    prepared: PrepareOrderResponse,
    intent: OrderIntent,
    purpose: string,
    cleanup: boolean,
    settlement: FundedAction["settlement"] = "execution"
  ) {
    const previous = await this.previousAction(purpose);
    if (previous) return previous;
    let state = await this.snapshot();
    let quote = inspectPreparedOrder({
      prepared,
      intent,
      address: this.address,
      marketAddress: state.market.marketTokenAddress,
      subaccountApproval: this.sdk.subaccountApprovalMessage,
      ...state,
    });
    checkFeeBudget(chargedFees(this.active), quote.feeUsd, cleanup, this.feePolicy);
    if (
      getAddress(quote.feeToken.address) === getAddress(state.weth.address) &&
      state.wrappedAmount < quote.feeAmount
    ) {
      if (intent.kind !== "cancel" && intent.kind !== "edit")
        throw new Error("Wrapped fees are only permitted for order cancellation and editing");
      await this.nativeTransaction(
        {
          to: state.weth.address as Address,
          data: encodeFunctionData({ abi: parseAbi(["function deposit() payable"]), functionName: "deposit" }),
          value: quote.feeAmount - state.wrappedAmount,
        },
        "wrap-cancel-fee",
        cleanup
      );
    }
    await this.allowance(quote.feeToken, quote.feeAmount, cleanup);
    state = await this.snapshot();
    quote = inspectPreparedOrder({
      prepared,
      intent,
      address: this.address,
      marketAddress: state.market.marketTokenAddress,
      subaccountApproval: this.sdk.subaccountApprovalMessage,
      ...state,
    });
    if (state.nativeUsd < economy.nativeReserveUsd || state.stableUsd - quote.feeUsd < economy.stableReserveUsd) {
      throw new Error("Wallet reserves are insufficient for the action");
    }
    if (
      intent.kind === "increase" &&
      state.stableUsd -
        quote.feeUsd -
        (convertToUsd(intent.collateralAmount, state.usdc.decimals, state.usdc.prices.maxPrice) ?? 0n) <
        economy.stableReserveUsd + this.feePolicy.cleanupReserveUsd
    ) {
      throw new Error("Collateral would consume stablecoin and cleanup reserves");
    }
    await this.gate(quote.feeUsd, cleanup);
    const action: FundedAction = {
      id: randomUUID(),
      purpose,
      feeUsd: quote.feeUsd.toString(),
      requestId: prepared.requestId,
      state: "pending",
      step: this.currentStep,
      settlement,
      startedAt: new Date().toISOString(),
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
    await this.reconcile(cleanup || settlement === "creation" || settlement === "receipt");
    if ((action.state as string) !== "settled" && !(action.state === "created" && settlement === "creation"))
      throw new Error("Funded action did not execute successfully");
    return action;
  }

  async activateOneClick() {
    const inventory = (this.active.inventory ??= {});
    if (
      this.active.actions.some((a) => a.step === "one-click:cancel" && a.purpose === "cancel" && a.state === "settled")
    ) {
      this.sdk.clearSubaccount();
      return inventory.subaccount;
    }
    const subaccount = await this.sdk.generateSubaccount(this.signer);
    if (!inventory.subaccount) {
      if (await this.subaccountActive(subaccount)) throw new Error("Existing 1CT authorization must not be modified");
      inventory.subaccount = subaccount;
      await this.save();
    }
    if (inventory.subaccount !== subaccount) throw new Error("1CT address changed between attempts");
    const status = await this.sdk.refreshSubaccountState(this.address);
    if (!status?.active) {
      if (this.active.actions.some((a) => a.requestId && a.step?.startsWith("one-click:")))
        throw new Error("1CT authorization expired after a submitted action; do not reactivate on retry");
      await this.sdk.activateSubaccount(this.signer, {
        expiresInSeconds: 600,
        maxAllowedCount: (status?.currentActionsCount ?? 0n) + 2n,
      });
    }
    return subaccount;
  }

  async subaccountActive(subaccount: string) {
    return this.rpc.readContract({
      address: getContract(42161, "DataStore"),
      abi: parseAbi(["function containsAddress(bytes32,address) view returns (bool)"]),
      functionName: "containsAddress",
      args: [subaccountListKey(this.address) as Hex, subaccount as Address],
    });
  }

  async revokeOneClick() {
    const subaccount = this.active.inventory?.subaccount;
    this.sdk.clearSubaccount();
    if (!subaccount || !(await this.subaccountActive(subaccount))) return;
    await this.nativeTransaction(
      {
        to: getContract(42161, "SubaccountRouter"),
        value: 0n,
        data: encodeFunctionData({
          abi: parseAbi(["function removeSubaccount(address)"]),
          functionName: "removeSubaccount",
          args: [subaccount as Address],
        }),
      },
      "revoke-one-click",
      true
    );
    if (await this.subaccountActive(subaccount)) throw new Error("1CT authorization remains active after revocation");
  }

  async reconcile(allowCreatedOrders = false) {
    for (const action of this.active.actions.filter((a) => a.state === "pending" || a.state === "created")) {
      if (action.txHash) {
        const rpc = action.chainId === 8453 ? this.sourceRpc : this.rpc;
        const receipt = await rpc.waitForTransactionReceipt({ hash: action.txHash, timeout: 120_000 });
        if (action.purpose === "twap" && receipt.status === "success") {
          registerTwapReceipt(this, action, receipt);
        }
        action.state = receipt.status === "success" ? "settled" : "failed";
        if (receipt.gasUsed !== undefined && receipt.effectiveGasPrice !== undefined) {
          const paid =
            receipt.gasUsed * receipt.effectiveGasPrice + ((receipt as unknown as { l1Fee?: bigint }).l1Fee ?? 0n);
          action.gasPaidWei = paid.toString();
          if (action.nativePriceUsd)
            action.gasPaidUsd = ((paid * BigInt(action.nativePriceUsd)) / 10n ** 18n).toString();
        }
        action.finishedAt = new Date().toISOString();
        await this.save();
        continue;
      }
      if (!action.requestId) throw new Error("Unresolved action without a transaction or request ID");
      if (action.requestKind === "bridge") {
        await reconcileBridge(this, action);
        continue;
      }
      for (let attempt = 0; attempt < 40; attempt++) {
        const status = await this.sdk.fetchOrderStatus({ requestId: action.requestId });
        if (status.orderKeys?.length) {
          action.orderKeys = status.orderKeys;
          for (const key of status.orderKeys)
            if (!this.active.ownedOrderKeys.includes(key)) this.active.ownedOrderKeys.push(key);
          await this.save();
        }
        // Cancellation has no keeper execution; a successful relay receipt is its settlement.
        const cancelled =
          (action.purpose === "cancel" || action.settlement === "receipt") &&
          ["created", "cancelled"].includes(status.status);
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
          action.finishedAt = new Date().toISOString();
          await this.save();
          break;
        }
        if (
          allowCreatedOrders &&
          (action.purpose === "open" || action.settlement === "creation") &&
          status.status === "created" &&
          action.orderKeys?.length
        ) {
          const hash = status.createdTxnHash || status.txHash;
          if (!hash) throw new Error("Created order has no receipt evidence");
          const receipt = await this.rpc.waitForTransactionReceipt({ hash: hash as Hex, timeout: 30_000 });
          if (receipt.status !== "success") throw new Error("Order creation receipt is not successful");
          action.state = "created";
          action.finishedAt = new Date().toISOString();
          await this.save();
          break;
        }
        await wait(3_000);
      }
      if (action.state === "pending" || (!allowCreatedOrders && action.state === "created"))
        throw new Error("Submission remains unresolved; no retry or new exposure is allowed");
    }
  }

  async allowance(
    token: Pick<TokenData, "address">,
    amount: bigint,
    cleanup: boolean,
    spender = getContract(42161, "SyntheticsRouter") as Address
  ) {
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
      `approve:${token.address}:${spender}`,
      cleanup
    );
  }

  async nativeTransaction(
    tx: { to: Address; data: Hex; value: bigint },
    purpose: string,
    cleanup: boolean,
    extraFeeUsd = 0n,
    chainId: 42161 | 8453 = 42161
  ) {
    const previous = await this.previousAction(purpose);
    if (previous) return previous;
    const state = await this.snapshot();
    const chain = chainId === 42161 ? arbitrum : base;
    const rpc = chainId === 42161 ? this.rpc : this.sourceRpc;
    const rpcUrl = chainId === 42161 ? this.rpcUrl : this.sourceRpcUrl;
    const maxGasGwei = chainId === 42161 ? this.maxGasGwei : process.env.REGRESSION_BASE_MAX_GAS_GWEI;
    const wallet = createWalletClient({
      account: this.account,
      chain,
      transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }),
    });
    const prepared = await wallet.prepareTransactionRequest({
      ...tx,
      account: this.account,
      chain,
      type: "eip1559",
    });
    if (!prepared.gas || !prepared.maxFeePerGas) throw new Error("Missing transaction fee estimate");
    const gas = prepared.gas * 2n;
    if (!maxGasGwei) throw new Error("Missing explicit gas ceiling");
    const ceiling = parseGwei(maxGasGwei);
    const bufferedPrice = prepared.maxFeePerGas * 2n;
    const maxFeePerGas = bufferedPrice < ceiling ? bufferedPrice : ceiling;
    const l1Fee =
      chainId === 8453
        ? await this.sourceRpc.readContract({
            address: "0x420000000000000000000000000000000000000F",
            abi: parseAbi(["function getL1FeeUpperBound(uint256) view returns (uint256)"]),
            functionName: "getL1FeeUpperBound",
            args: [BigInt(tx.data.length / 2 + 250)],
          })
        : 0n;
    const feeUsd = convertToUsd(gas * maxFeePerGas + l1Fee, 18, state.weth.prices.maxPrice)! + extraFeeUsd;
    if (
      (await rpc.getBalance({ address: this.address })) - tx.value - gas * maxFeePerGas - l1Fee <
      ceilDiv((chainId === 42161 ? economy.nativeReserveUsd : USD) * 10n ** 18n, state.weth.prices.minPrice)
    ) {
      throw new Error("Transaction would consume native gas reserves");
    }
    await this.gate(feeUsd, cleanup, chainId);
    if (prepared.nonce === undefined) throw new Error("Missing transaction nonce");
    const priority = prepared.maxPriorityFeePerGas ?? 0n;
    const signed = await this.account.signTransaction({
      ...tx,
      chainId,
      nonce: prepared.nonce,
      gas,
      maxFeePerGas,
      maxPriorityFeePerGas: priority < maxFeePerGas ? priority : maxFeePerGas,
      type: "eip1559",
    });
    const action: FundedAction = {
      id: randomUUID(),
      purpose,
      feeUsd: feeUsd.toString(),
      txHash: keccak256(signed) as `0x${string}`,
      state: "pending",
      step: this.currentStep,
      startedAt: new Date().toISOString(),
      chainId,
      nativePriceUsd: state.weth.prices.maxPrice.toString(),
    };
    this.active.actions.push(action);
    await this.save();
    await rpc.sendRawTransaction({ serializedTransaction: signed });
    await this.reconcile(true);
    if ((action.state as string) !== "settled") throw new Error("Native transaction failed");
    return action;
  }

  async bridgeWithdrawal(params: BridgeOutParams) {
    const previous = await this.previousAction("bridge-withdraw");
    if (previous) return previous;
    const state = await this.snapshot();
    const prepared = await this.sdk.prepareCrossChainWithdraw({
      srcChainId: 8453,
      account: this.address,
      bridgeOutParams: params,
      gasPaymentToken: state.usdc.address,
    });
    const feeUsd = inspectBridgeWithdrawal(prepared, params, state);
    if (
      params.amount + prepared.payload.gasPaymentParams.gasPaymentTokenAmount >
      (await accountBalance(this, state.usdc.address))
    )
      throw new Error("Bridge return would exceed test-owned account funds");
    await this.gate(feeUsd, true);
    const action: FundedAction = {
      id: randomUUID(),
      purpose: "bridge-withdraw",
      feeUsd: feeUsd.toString(),
      requestId: prepared.requestId,
      requestKind: "bridge",
      state: "pending",
      step: this.currentStep,
      startedAt: new Date().toISOString(),
    };
    this.active.actions.push(action);
    await this.save();
    const signature = await this.sdk.signCrossChainWithdraw(prepared, this.signer);
    await this.sdk.submitCrossChainWithdraw({
      srcChainId: 8453,
      account: this.address,
      signature,
      requestId: prepared.requestId,
      bridgeOutParams: params,
      relayParamsPayload: prepared.payload.relayParams,
      relayerFeeTokenAddress: prepared.payload.gasPaymentParams.relayerFeeTokenAddress,
      relayerFeeAmount: prepared.payload.gasPaymentParams.relayerFeeAmount,
    });
    await this.reconcile(true);
    if ((action.state as string) !== "settled") throw new Error("Bridge withdrawal did not settle");
    return action;
  }

  async cleanup(execute: boolean, finalize = true) {
    const journal = finalize ? await this.resume() : this.active;
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
    this.sdk.clearSubaccount();
    if (journal.inventory) {
      await cleanupResources(this);
    }
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
        {
          kind: "close",
          isLong: position.isLong,
          sizeUsd: position.sizeInUsd,
          collateralAmount: position.collateralAmount,
        },
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
    journal.balanceCleanupId ??= `${this.currentStep ?? "cleanup"}:${randomUUID()}`;
    await this.save();
    const balanceCleanupId = journal.balanceCleanupId;
    await this.step(`${balanceCleanupId}:rebalance`, async () => {
      if (await this.previousAction("rebalance")) return;
      state = await this.snapshot();
      const planned = await this.remember("swap", async () => {
        const wrappedUsd =
          state.wrappedAmount > 0n
            ? convertToUsd(state.wrappedAmount, state.weth.decimals, state.weth.prices.minPrice)!
            : 0n;
        const plan = rebalancePlan({
          ...state,
          nativeUsd: state.nativeUsd + wrappedUsd,
          initialNativeUsd: BigInt(journal.initialNativeUsd),
          initialStableUsd: BigInt(journal.initialStableUsd),
          targetNativeBps: journal.targetNativeBps === undefined ? undefined : BigInt(journal.targetNativeBps),
        });
        if (plan.direction === "none") return null;
        const buying = plan.direction === "buy-native";
        const token = buying ? state.usdc : state.weth;
        return { buying, amount: (plan.amountUsd * 10n ** BigInt(token.decimals)) / token.prices.maxPrice };
      });
      if (!planned) return;
      const { buying, amount } = planned;
      // Reject a quote before wrapping ETH or spending approval gas.
      const quote = await this.quoteSwap(state, amount, buying, buying);
      checkFeeBudget(chargedFees(journal), quote.feeUsd + USD / 20n, true, this.feePolicy);
      if (!buying && state.wrappedAmount < amount) {
        await this.nativeTransaction(
          {
            to: state.weth.address as Address,
            data: encodeFunctionData({ abi: parseAbi(["function deposit() payable"]), functionName: "deposit" }),
            value: amount - state.wrappedAmount,
          },
          "wrap",
          true
        );
        state = await this.snapshot();
        if (state.wrappedAmount < amount) throw new Error("Rebalance wrapping did not produce the required WETH");
      }
      await this.allowance(buying ? state.usdc : state.weth, amount + (buying ? 1_000_000n : 0n), true);
      await this.execute(quote.prepared, quote.intent, "rebalance", true);
    });
    await this.step(`${balanceCleanupId}:unwrap`, async () => {
      state = await this.snapshot();
      if (state.wrappedAmount === 0n) return;
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
      if ((await this.snapshot()).wrappedAmount > 0n) throw new Error("Cleanup unwrap left WETH in the wallet");
    });
    state = await this.snapshot();
    const finalPlan = rebalancePlan({
      ...state,
      initialNativeUsd: BigInt(journal.initialNativeUsd),
      initialStableUsd: BigInt(journal.initialStableUsd),
      targetNativeBps: journal.targetNativeBps === undefined ? undefined : BigInt(journal.targetNativeBps),
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
    journal.completed = finalize;
    delete journal.balanceCleanupId;
    await this.save();
    return {
      positionsBefore: summary.positions,
      ordersBefore: summary.orders,
      positions: state.positions.length,
      orders: state.orders.length,
      completed: finalize,
      reservedFeesUsd: dollars(chargedFees(journal)),
      nativeUsd: dollars(state.nativeUsd),
      stableUsd: dollars(state.stableUsd),
      ratioDriftBps: finalPlan.driftBps.toString(),
    };
  }
}
