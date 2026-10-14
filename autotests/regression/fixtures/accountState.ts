import { expect, type Page } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { PrivateKeyAccount } from "viem";
import { randomBytes } from "node:crypto";

import { test as browserTest } from "./browser";
import { connectInjectedWallet, installInjectedWallet, type WalletRequest, type WalletHandler } from "./injectedWallet";
import { accountData, serializeAccountData } from "./accountData";
import type { ApiPositionInfo } from "../../../sdk/src/utils/positions/types";
import type { ApiOrderInfo } from "../../../sdk/src/utils/orders/types";
import { mockWalletBalances, type WalletAllowances } from "./walletBalances";
import { zeroAddress, toHex, getAddress, type Hex } from "viem";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";

import { unsignedTransactionReview } from "./unsignedTransactions";
import { mockTradingMarket } from "./tradingMarket";

export type AccountState = {
  address: string;
  rehearsalSigner?: PrivateKeyAccount;
  positions: ApiPositionInfo[];
  orders: ApiOrderInfo[];
  balances: Map<string, bigint>;
  gmxBalances: Map<string, bigint>;
  sourceChainBalances: Map<number, Map<string, bigint>>;
  allowances: WalletAllowances;
  data: ReturnType<typeof accountData>;
  walletRequest?: WalletHandler;
  contractRead?: (target: string, data: Hex) => Hex | undefined;
  rejectChainSwitch?: boolean;
  connect: (page: Page, path?: string) => Promise<void>;
  refresh: (page: Page) => Promise<void>;
};

export const test = browserTest.extend<{
  accountState: AccountState;
  walletReviewMode: boolean;
  signableRehearsal: boolean;
  unsignedReviewMode: boolean;
  walletReviews: WalletRequest[];
  walletChainId: number | undefined;
}>({
  signableRehearsal: [false, { option: true }],
  walletChainId: [undefined, { option: true }],
  walletReviewMode: [false, { option: true }],
  unsignedReviewMode: [false, { option: true }],
  walletReviews: async ({}, use) => use([]),
  accountState: async (
    { context, chainId, walletReviewMode, unsignedReviewMode, walletReviews, signableRehearsal, walletChainId },
    use,
    testInfo
  ) => {
    const rehearsalSigner = signableRehearsal ? privateKeyToAccount(generatePrivateKey()) : undefined;
    const address = rehearsalSigner?.address ?? getAddress(`0x${randomBytes(20).toString("hex")}`);
    const data = accountData(chainId, address);
    const forbiddenRequests: string[] = [];
    const flags = {
      ...Object.fromEntries(
        [
          "apiMarkets",
          "apiPositions",
          "apiOrders",
          "api100",
          "isExpressAvailable",
          "isV2JitLiquidityInfoEnabled",
          "referralCodeUpdates.enabled",
        ].map((name) => [name, { enabled: true }])
      ),
      forceGelatoFallback: { enabled: false },
    };
    await context.addInitScript(
      ({ chainId, flags }) => {
        if (window.top !== window || !/^https?:$/.test(location.protocol)) return;
        localStorage.setItem(`api-ui-flags-cache-v2-${chainId}`, JSON.stringify(flags));
      },
      { chainId, flags }
    );
    await context.route(/\/ui-flags\/v2(?:\?|$)/, async (route) => {
      await route.fulfill({ json: flags });
    });
    const state: AccountState = {
      address,
      rehearsalSigner,
      data,
      positions: [],
      orders: [],
      balances: new Map(),
      gmxBalances: new Map(),
      sourceChainBalances: new Map(),
      allowances: new Map(),
      connect: async (page, path = "/trade") => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await connectInjectedWallet(page, address);
      },
      refresh: async (page) => {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(
          page.getByTestId("user-address"),
          "Mock wallet must restore before account assertions"
        ).toContainText(new RegExp(`${address.slice(0, 6)}.*${address.slice(-4)}`), { timeout: 45_000 });
      },
    };
    const review = unsignedReviewMode ? unsignedTransactionReview(chainId as ContractsChainId, address) : undefined;
    if (unsignedReviewMode) await mockTradingMarket(context, chainId);
    await mockWalletBalances(
      context,
      address,
      state.balances,
      chainId as ContractsChainId,
      state.gmxBalances,
      state.allowances,
      review,
      true,
      (target, callData) => state.contractRead?.(target, callData),
      state.sourceChainBalances
    );
    await context.route(/\/v1\/(positions|orders)(?:\?|$)/, async (route) => {
      const url = new URL(route.request().url());
      const requestedAddress = url.searchParams.get("address");
      if (!requestedAddress || getAddress(requestedAddress) !== address) return route.fallback();
      await route.fulfill({
        contentType: "application/json",
        body: serializeAccountData(url.pathname.endsWith("/positions") ? state.positions : state.orders),
      });
    });
    await context.routeWebSocket(/^wss:\/\//, (socket) => {
      socket.onMessage((message) => {
        const request = JSON.parse(String(message));
        const result =
          request.method === "eth_subscribe"
            ? "0x1"
            : request.method === "eth_unsubscribe"
              ? true
              : request.method === "eth_chainId"
                ? `0x${chainId.toString(16)}`
                : undefined;
        socket.send(
          JSON.stringify(
            result === undefined
              ? { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Unmocked subscription" } }
              : { jsonrpc: "2.0", id: request.id, result }
          )
        );
      });
    });
    const provider = await installInjectedWallet(context, {
      address,
      chainId: walletChainId ?? chainId,
      onSwitchChain: () => {
        if (state.rejectChainSwitch) throw Object.assign(new Error("User rejected the request."), { code: 4001 });
      },
      request: async (request, chainId) => {
        if (state.walletRequest) return state.walletRequest(request, chainId);
        const { method } = request;
        if (/^(eth_send|eth_sign|personal_sign|wallet_send)/.test(method)) {
          forbiddenRequests.push(method);
          walletReviews.push(request);
          throw Object.assign(new Error("State fixture cannot sign or send"), { code: 4001 });
        }
        if (method === "eth_getCode") return "0x";
        if (method === "eth_getBalance") return toHex(state.balances.get(zeroAddress) ?? 0n);
        if (walletReviewMode && method === "eth_estimateGas") return toHex(3_000_000n);
        throw Object.assign(new Error(`Unsupported state wallet request: ${method}`), { code: 4200 });
      },
    });
    await use(state);
    await context.unrouteAll({ behavior: "ignoreErrors" });
    await testInfo.attach("account-state-fixture", {
      body: serializeAccountData({
        positions: state.positions,
        orders: state.orders,
        wallet: provider.getState(),
        inventorySource: "API fixture only; account inventory RPC reads are unavailable to prevent conflicting data",
      }),
      contentType: "application/json",
    });
    if (review)
      await testInfo.attach("unsigned-simulation-fixture", {
        body: JSON.stringify({
          note: `Market/price snapshot, gas estimates and execution simulation are mocked. Wallet requests are ${state.walletRequest ? "handled by a transaction simulator" : "always rejected"}. No live availability or execution is certified.`,
          calls: review.calls,
        }),
        contentType: "application/json",
      });
    if (!walletReviewMode) expect(forbiddenRequests, "State fixtures must never sign or submit").toEqual([]);
    else
      await testInfo.attach("rejected-wallet-requests", {
        body: serializeAccountData(walletReviews),
        contentType: "application/json",
      });
  },
});
