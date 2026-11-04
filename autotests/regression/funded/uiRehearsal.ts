import assert from "node:assert/strict";
import { expect, type BrowserContext } from "@playwright/test";
import { decodeFunctionData, erc20Abi, getAddress, toHex, zeroAddress, type Hex, type TransactionReceipt } from "viem";

import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { parseContractPrice } from "../../../sdk/src/utils/tokens/utils";
import type { AccountState } from "../fixtures/accountState";
import { fundedOrderReceipt } from "./fundedReceipt";
import marketFixture from "../fixtures/markets/arbitrum.json";
import { USD } from "./economy";
import { multichainBalanceKey } from "../../../sdk/src/configs/dataStore";
import { uiBridgeRehearsal } from "./uiBridgeRehearsal";
import { baseUsdc, basePool } from "./uiBridgeGuard";
import { GMX_SIMULATION_ORIGIN } from "../../../sdk/src/configs/dataStore";
import { uiOneClickRehearsal } from "./uiOneClickRehearsal";
import type { UiRelayPayload } from "./uiRelay";
import { uiLiquidityRehearsal } from "./uiLiquidityRehearsal";
import { uiEarnRehearsal } from "./uiEarnRehearsal";
import type { FundedAction, FundedJournal } from "./journal";
import { FundedSession } from "./session";
import { registerUiOrderReceipt } from "./uiOrderReceipt";
import { UiWallet } from "./uiWallet";

export async function createUiRehearsal(context: BrowserContext, state: AccountState) {
  const receipts = new Map<Hex, TransactionReceipt>();
  const trades: { orderKey: string; account: string; eventName: string; transactionHash: Hex }[] = [];
  state.balances.set(state.data.collateral.address, 50_000_000n);
  state.balances.set(zeroAddress, 10n ** 18n);
  const spender = getAddress(getContract(42161, "SyntheticsRouter"));
  // Start with no allowance to exercise the approval UI and finite wallet cap too.
  state.allowances.set(state.data.collateral.address, new Map([[spender, 0n]]));
  const token = (symbol: string): TokenData => {
    const config = getTokenBySymbol(42161, symbol);
    const ticker = marketFixture.tickers.find((t) => getAddress(t.tokenAddress) === getAddress(config.address))!;
    return {
      ...config,
      prices: {
        minPrice: parseContractPrice(BigInt(ticker.minPrice), config.decimals),
        maxPrice: parseContractPrice(BigInt(ticker.maxPrice), config.decimals),
      },
    } as TokenData;
  };
  const usdc = token("USDC"),
    weth = token("WETH");
  const earn = uiEarnRehearsal(state, weth.address);
  await context.route(/\/v1\/staking\/power(?:\?|$)/, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(earn.power(), (_, value) => (typeof value === "bigint" ? value.toString() : value)),
    })
  );
  const bridge = uiBridgeRehearsal(state, usdc.address);
  const oneClick = uiOneClickRehearsal(state);
  const lp = uiLiquidityRehearsal(state, usdc, weth);
  state.contractRead = (target, data) =>
    bridge.contractRead(target, data) ??
    oneClick.contractRead(target, data) ??
    lp.contractRead(target, data) ??
    earn.contractRead(target, data);
  await context.route(/\/prices\/tickers(?:\?|$)/, (route) =>
    route.fulfill({
      json: marketFixture.tickers.map((ticker) => ({
        ...ticker,
        timestamp: Math.floor(Date.now() / 1000),
        ...(lp.tokens.includes(getAddress(ticker.tokenAddress))
          ? { minPrice: "2000000000000", maxPrice: "2000000000000" }
          : {}),
      })),
    })
  );
  const journal: FundedJournal = {
    version: 1,
    id: "rehearsal",
    chainId: 42161,
    address: state.address,
    createdAt: new Date().toISOString(),
    initialNativeUsd: (50n * USD).toString(),
    initialStableUsd: (50n * USD).toString(),
    targetNativeBps: "5000",
    marketAddress: state.data.market.marketTokenAddress,
    ownedPositionKeys: [],
    ownedOrderKeys: [],
    actions: [],
    completed: false,
  };
  // Do not instantiate FundedSession: rehearsals must never load the funded wallet.
  const session = Object.create(FundedSession.prototype) as FundedSession;
  Object.assign(session, {
    address: state.address,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    journal,
    save: async () => undefined,
    signUiMessage: async (message: Hex) => {
      const signature = await state.rehearsalSigner!.signMessage({ message: { raw: message as `0x${string}` } });
      oneClick.generated(signature);
      return signature;
    },
    signUiTypedData: (data: never) => state.rehearsalSigner!.signTypedData(data),
    relayUiTransaction: async (
      url: string,
      payload: UiRelayPayload,
      purpose: string,
      cleanup: boolean,
      fee: bigint,
      // Never called: it would hit the real relayer.
      _send: unknown,
      uiOrder: FundedAction["uiOrder"]
    ) => {
      let action: FundedAction;
      if (getAddress(payload.to) === getAddress(getContract(42161, "MultichainTransferRouter"))) {
        bridge.relay(payload);
        const hash = toHex(journal.actions.length + 1, { size: 32 }) as `0x${string}`;
        action = {
          id: hash,
          txHash: hash,
          purpose,
          feeUsd: fee.toString(),
          state: "settled",
          step: (session as unknown as { currentStep: string }).currentStep,
          startedAt: new Date().toISOString(),
        };
        journal.actions.push(action);
        receipts.set(hash, { status: "success", logs: [] } as unknown as TransactionReceipt);
      } else {
        const tx = oneClick.relay(payload);
        action = await session.nativeTransaction(tx, purpose, cleanup, fee, 42161, uiOrder);
      }
      action.uiRelay = {
        apiUrl: new URL(url).origin,
        to: payload.to,
        calldataHash: "simulated",
        taskId: `rehearsal-${action.id}`,
      };
      return { action };
    },
    reconcile: async () => undefined,
    gate: async () => undefined,
    snapshot: async () => ({
      market: { marketTokenAddress: journal.marketAddress, minCollateralUsd: USD, minPositionSizeUsd: 2n * USD },
      usdc,
      weth,
      positions: state.positions,
      orders: state.orders,
      onchainPositionCount: state.positions.length,
      onchainOrderCount: state.orders.length,
      stableAmount: state.balances.get(usdc.address)!,
      wrappedAmount: state.balances.get(weth.address) ?? 0n,
      stableUsd: (state.balances.get(usdc.address)! * USD) / 10n ** 6n,
      nativeUsd: 50n * USD,
    }),
    sdk: {
      fetchStakingPower: async () => earn.power(),
      fetchMarkets: async () => [state.data.market],
      fetchTrades: async () => ({ trades }),
      fetchTokensData: async () => [
        usdc,
        weth,
        { ...getTokenBySymbol(42161, "GMX"), prices: { minPrice: 10n * USD, maxPrice: 10n * USD } },
      ],
    },
    sourceRpc: {
      readContract: async ({ functionName, address }: { functionName: string; address: string }) => {
        assert.equal(functionName, "balanceOf");
        assert.equal(getAddress(address), baseUsdc);
        return state.balances.get(baseUsdc)!;
      },
      request: async ({ method }: { method: string }) => {
        if (method === "eth_getCode") return "0x";
        if (method === "eth_getBalance") return toHex(10n ** 18n);
        if (method === "eth_estimateGas") return toHex(500_000n);
        throw new Error(`No real Base RPC in rehearsal wallet: ${method}`);
      },
    },
    rpc: {
      getGasPrice: async () => 10_000_000n,
      multicall: async ({ contracts }: { contracts: { args: unknown[] }[] }) =>
        contracts.map((_, i) => ({ status: "success", result: [9, 13].includes(i) ? USD : 1_000_000n })),
      request: async ({ method }: { method: string }) => {
        if (method === "eth_getCode") return "0x";
        if (method === "eth_getBalance") return toHex(10n ** 18n);
        if (method === "eth_estimateGas") return toHex(3_000_000n);
        throw new Error(`No real RPC allowed in rehearsal wallet: ${method}`);
      },
      readContract: async ({
        functionName,
        args,
        address,
      }: {
        functionName: string;
        args: unknown[];
        address: string;
      }) => {
        const sub = oneClick.read(functionName, args);
        if (sub !== undefined) return sub;
        const liquidity = lp.read(functionName, args);
        if (liquidity !== undefined) return liquidity;
        const earned = earn.read(functionName, address);
        if (earned !== undefined) return earned;
        if (functionName === "balanceOf" && args[0] === state.address)
          return state.balances.get(getAddress(address)) ?? 0n;
        if (functionName === "getUint")
          for (const token of [usdc, weth])
            if (args[0] === multichainBalanceKey(state.address, token.address))
              return state.gmxBalances.get(token.address) ?? 0n;
        if (functionName === "getOrder") {
          const order = state.orders.find((o) => o.key === args[1]);
          if (!order) throw new Error("No such simulated order");
          return {
            numbers: {
              triggerPrice: order.triggerPrice,
              acceptablePrice: order.acceptablePrice,
              sizeDeltaUsd: order.sizeDeltaUsd,
            },
          };
        }
        throw new Error(`No simulated read: ${functionName}`);
      },
      getTransactionReceipt: async ({ hash }: { hash: Hex }) => receipts.get(hash),
    },
    nativeTransaction: async (...args: Parameters<FundedSession["nativeTransaction"]>) => {
      const [tx, purpose, , , , uiOrder] = args;
      const hash = toHex(journal.actions.length + 1, { size: 32 }) as `0x${string}`;
      let receipt = { status: "success", logs: [] } as unknown as TransactionReceipt;
      const approval = [getAddress(usdc.address), getAddress(weth.address), earn.gmx, baseUsdc, ...lp.tokens].includes(
        tx.to
      )
        ? decodeFunctionData({ abi: erc20Abi, data: tx.data })
        : undefined;
      if (approval?.functionName === "approve") {
        expect(approval.args[1]).toBeGreaterThan(0n);
        state.allowances.set(tx.to, new Map([[getAddress(approval.args[0]), approval.args[1]]]));
      } else if (getAddress(tx.to) === basePool) {
        bridge.deposit(tx);
      } else if (getAddress(tx.to) === getAddress(getContract(42161, "SubaccountRouter"))) {
        oneClick.remove(tx.data);
      } else if (getAddress(tx.to) === getAddress(getContract(42161, "RewardRouter"))) {
        earn.transact(tx.data);
      } else if (getAddress(tx.to) === getAddress(getContract(42161, "MultichainTransferRouter"))) {
        const root = decodeFunctionData({ abi: MultichainTransferRouter, data: tx.data });
        if (root.functionName === "multicall") {
          const transfer = decodeFunctionData({ abi: MultichainTransferRouter, data: root.args[0][0] });
          if (transfer.functionName !== "sendTokens" && transfer.functionName !== "sendWnt")
            throw new Error("Expected UI account transfer");
          const native = transfer.functionName === "sendWnt";
          const token = native ? weth.address : getAddress(transfer.args[0]);
          const amount = native ? (transfer.args[1] as bigint) : transfer.args[2]!;
          if (!native) expect(state.allowances.get(token)!.get(spender)).toBeGreaterThanOrEqual(amount);
          const walletToken = native ? zeroAddress : token;
          state.balances.set(walletToken, state.balances.get(walletToken)! - amount);
          state.gmxBalances.set(token, (state.gmxBalances.get(token) ?? 0n) + amount);
        } else if (root.functionName === "transferOut") {
          const { amount, token } = root.args[0];
          expect(state.gmxBalances.get(token)).toBeGreaterThanOrEqual(amount);
          state.gmxBalances.set(token, state.gmxBalances.get(token)! - amount);
          state.balances.set(token, (state.balances.get(token) ?? 0n) + amount);
        } else throw new Error("Unsupported simulated account operation");
      } else {
        const liquidityReceipt = lp.transact(tx, hash);
        if (liquidityReceipt) receipt = liquidityReceipt;
        else {
          const root = decodeFunctionData({ abi: ExchangeRouter, data: tx.data });
          if (root.functionName !== "multicall") throw new Error("Expected UI multicall");
          const calls = root.args[0].map((data) => decodeFunctionData({ abi: ExchangeRouter, data }));
          const logs: TransactionReceipt["logs"] = [];
          let ordinal = 0;
          for (const call of calls) {
            if (call.functionName === "sendTokens" || call.functionName === "sendWnt") continue;
            if (call.functionName === "updateOrder") {
              const [key, size, acceptable, trigger, minOutput, validFrom, autoCancel] = call.args;
              const order = state.orders.find((o) => o.key === key)!;
              expect(order).toBeDefined();
              Object.assign(order, {
                sizeDeltaUsd: size,
                acceptablePrice: acceptable,
                triggerPrice: trigger,
                minOutputAmount: minOutput,
                validFromTime: validFrom,
                autoCancel,
              });
              continue;
            }
            if (call.functionName === "cancelOrder") {
              const order = state.orders.find((o) => o.key === call.args[0])!;
              expect(order).toBeDefined();
              if ([3, 8].includes(order.orderType))
                state.balances.set(
                  usdc.address,
                  state.balances.get(usdc.address)! + order.initialCollateralDeltaAmount
                );
              state.orders = state.orders.filter((o) => o.key !== order.key);
              logs.push(
                ...fundedOrderReceipt({
                  account: state.address,
                  market: journal.marketAddress,
                  keys: [order.key],
                  eventName: "OrderCancelled",
                }).logs
              );
              continue;
            }
            if (call.functionName !== "createOrder")
              throw new Error(`Unsupported simulated operation: ${call.functionName}`);
            const order = call.args[0];
            const key = toHex(journal.actions.length * 10 + 100 + ordinal++, { size: 32 });
            const increasing = [2, 3, 8].includes(order.orderType);
            const collateral = order.numbers.initialCollateralDeltaAmount;
            if (increasing || order.orderType === 0) {
              const token = getAddress(order.addresses.initialCollateralToken);
              expect(state.allowances.get(token)!.get(spender)!).toBeGreaterThanOrEqual(collateral);
              state.allowances.get(token)!.set(spender, state.allowances.get(token)!.get(spender)! - collateral);
              state.balances.set(token, state.balances.get(token)! - collateral);
            }
            logs.push(
              ...fundedOrderReceipt({ account: state.address, market: order.addresses.market, keys: [key] }).logs
            );
            const executes =
              [0, 2, 4].includes(order.orderType) ||
              (order.orderType === 3 &&
                order.numbers.validFromTime > 0n &&
                order.numbers.validFromTime <= BigInt(Math.floor(Date.now() / 1000) + 5));
            if (!executes) {
              const pending = {
                ...state.data.order(order.orderType, order.isLong),
                key,
                ...order.numbers,
                marketAddress: order.addresses.market,
                initialCollateralTokenAddress: order.addresses.initialCollateralToken,
                uiFeeReceiver: order.addresses.uiFeeReceiver,
                swapPath: [...order.addresses.swapPath],
                dataList: [...order.dataList],
                autoCancel: order.autoCancel,
                decreasePositionSwapType: order.decreasePositionSwapType,
                updatedAtTime: BigInt(Math.floor(Date.now() / 1000)),
              };
              state.orders.push(pending);
              continue;
            }
            if (order.orderType === 0) {
              const input =
                getAddress(order.addresses.initialCollateralToken) === getAddress(usdc.address) ? usdc : weth;
              const output = input === usdc ? weth : usdc;
              const received =
                (collateral * input.prices.minPrice * 10n ** BigInt(output.decimals) * 9_990n) /
                (10n ** BigInt(input.decimals) * output.prices.maxPrice * 10_000n);
              expect(received).toBeGreaterThanOrEqual(order.numbers.minOutputAmount);
              state.balances.set(output.address, (state.balances.get(output.address) ?? 0n) + received);
            } else {
              const p = state.positions[0] ?? state.data.position(order.isLong);
              const beforeSize = state.positions[0]?.sizeInUsd ?? 0n;
              const beforeCollateral = state.positions[0]?.collateralAmount ?? 0n;
              const delta = order.numbers.sizeDeltaUsd;
              const withdrawn = increasing ? 0n : delta > 0n ? (beforeCollateral * delta) / beforeSize : collateral;
              p.sizeInUsd = beforeSize + (increasing ? delta : -delta);
              p.collateralAmount = beforeCollateral + (increasing ? collateral : -withdrawn);
              if (!increasing) state.balances.set(usdc.address, state.balances.get(usdc.address)! + withdrawn);
              p.collateralUsd = (p.collateralAmount * USD) / 10n ** 6n;
              p.remainingCollateralUsd = p.netValue = p.netValueAfterAllFees = p.collateralUsd;
              p.remainingCollateralAmount = p.collateralAmount;
              p.markPrice = p.entryPrice = weth.prices.minPrice;
              p.sizeInTokens = (p.sizeInUsd * 10n ** 18n) / p.entryPrice;
              p.leverage =
                p.leverageWithPnl =
                p.leverageWithoutPnl =
                  p.collateralUsd ? (p.sizeInUsd * 10_000n) / p.collateralUsd : 0n;
              state.positions = p.sizeInUsd ? [p] : [];
            }
            const executionHash = toHex(journal.actions.length * 10 + 1000 + ordinal, { size: 32 });
            receipts.set(
              executionHash,
              fundedOrderReceipt({
                account: state.address,
                market: order.addresses.market,
                keys: [key],
                eventName: "OrderExecuted",
              })
            );
            trades.push({
              account: state.address,
              eventName: "OrderExecuted",
              orderKey: key,
              transactionHash: executionHash,
            });
          }
          receipt = { status: "success", logs } as TransactionReceipt;
        }
      }
      const action: FundedAction = {
        id: hash,
        txHash: hash,
        purpose,
        uiOrder,
        feeUsd: "0",
        state: "settled",
        step: (session as unknown as { currentStep: string }).currentStep,
        startedAt: new Date().toISOString(),
      };
      if (uiOrder) registerUiOrderReceipt(journal, action, receipt);
      journal.actions.push(action);
      receipts.set(hash, receipt);
      return action;
    },
  });
  const wallet = new UiWallet(session);
  await wallet.protectRelay(context, process.env.REGRESSION_BASE_URL || "https://test.gmx-interface.pages.dev");
  state.walletRequest = (request, chain) => wallet.request(request, chain);
  await context.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    let body;
    try {
      body = route.request().postDataJSON();
    } catch {
      return route.fallback();
    }
    if (new URL(route.request().url()).pathname === "/v1/relay/status") {
      const action = journal.actions.find((a) => a.uiRelay?.taskId === body.taskId);
      if (action) return route.fulfill({ json: { taskId: body.taskId, status: "executed", txHash: action.txHash } });
    }
    wallet.observeRpcRequest(body);
    const requests = Array.isArray(body) ? body : [body];
    if (requests.every((r) => r?.method === "eth_getCode" && getAddress(r.params[0]) === state.address)) {
      const results = requests.map((r) => ({ jsonrpc: "2.0", id: r.id, result: "0x" }));
      return route.fulfill({ json: Array.isArray(body) ? results : results[0] });
    }
    const simulatedGas = requests.every((r) => {
      if (r?.method === "eth_chainId") return true;
      const tx = r?.params?.[0];
      if (!["eth_estimateGas", "eth_call"].includes(r?.method) || !tx?.to) return false;
      const to = getAddress(tx.to);
      return (
        (r.method === "eth_estimateGas" &&
          (to === getAddress(getContract(42161, "LayerZeroProvider")) || to === basePool)) ||
        ([
          getAddress(getContract(42161, "SubaccountGelatoRelayRouter")),
          getAddress(getContract(42161, "MultichainTransferRouter")),
        ].includes(to) &&
          !!tx.from &&
          getAddress(tx.from) === getAddress(GMX_SIMULATION_ORIGIN))
      );
    });
    if (simulatedGas && requests.some((r) => r.method !== "eth_chainId")) {
      const simulatedChain = requests.some((r) => r.params?.[0]?.to && getAddress(r.params[0].to) === basePool)
        ? 8453
        : 42161;
      const results = requests.map((r) => ({
        jsonrpc: "2.0",
        id: r.id,
        result:
          r.method === "eth_chainId" ? toHex(simulatedChain) : r.method === "eth_estimateGas" ? toHex(500_000n) : "0x",
      }));
      return route.fulfill({ json: Array.isArray(body) ? results : results[0] });
    }

    if (!requests.every((r) => r?.method === "eth_getTransactionReceipt" && receipts.has(r.params[0])))
      return route.fallback();
    const results = requests.map((r) => ({
      jsonrpc: "2.0",
      id: r.id,
      result: {
        ...receipts.get(r.params[0]),
        transactionHash: r.params[0],
        blockHash: toHex(500, { size: 32 }),
        blockNumber: "0x100",
        transactionIndex: "0x0",
        status: "0x1",
        gasUsed: "0x1",
        cumulativeGasUsed: "0x1",
        effectiveGasPrice: "0x1",
        from: state.address,
        to: getContract(42161, "ExchangeRouter"),
        contractAddress: null,
        logsBloom: `0x${"00".repeat(256)}`,
        logs: [],
        type: "0x2",
      },
    }));
    await route.fulfill({ json: Array.isArray(body) ? results : results[0] });
  });
  return { session, wallet, journal };
}
