import { expect, type Page } from "@playwright/test";
import { getAddress, toHex, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test, type AccountState } from "../fixtures/accountState";
import type { WalletRequest } from "../fixtures/injectedWallet";
import { openSettings, setSettingsToggle } from "../fixtures/trade";
import { configureClassicTrading, fillPositionOrder } from "../fixtures/tradingForms";

function fund(accountState: AccountState, chainId: number) {
  accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  accountState.allowances.set(
    getAddress(accountState.data.collateral.address),
    new Map([[getAddress(getContract(chainId as ContractsChainId, "SyntheticsRouter")), 1000n * 10n ** 6n]])
  );
}

// Answers the reads a funded wallet would; `onWrite` decides what happens to signatures and transactions.
function walletWith(accountState: AccountState, onWrite: (request: WalletRequest) => Promise<unknown>) {
  const writes: WalletRequest[] = [];
  accountState.walletRequest = async (request) => {
    if (request.method === "eth_getCode") return "0x";
    if (request.method === "eth_getBalance") return toHex(accountState.balances.get(zeroAddress) ?? 0n);
    if (request.method === "eth_estimateGas") return toHex(3_000_000n);
    if (/^(eth_send|eth_sign|personal_sign|wallet_send)/.test(request.method)) {
      writes.push(request);
      return onWrite(request);
    }
    throw Object.assign(new Error(`Unsupported wallet request: ${request.method}`), { code: 4200 });
  };
  return writes;
}

function toast(page: Page) {
  return page.locator(".Toastify__toast");
}

// Toasts auto-close after 7s; keep their text so a failed wait can say what the app showed instead.
async function recordToasts(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = ((window as unknown as { __toasts: string[] }).__toasts = []);
    new MutationObserver(() => {
      for (const element of Array.from(document.querySelectorAll(".Toastify__toast"))) {
        const text = (element as HTMLElement).innerText.slice(0, 300);
        if (!seen.includes(text)) seen.push(text);
      }
    }).observe(document, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
}

test.describe("wallet RPC failure", () => {
  test.use({ unsignedReviewMode: true });

  test("26.03 a wallet RPC error on submit shows the RPC error toast with recovery options and keeps the order form", async ({
    page,
    accountState,
    chainId,
  }) => {
    fund(accountState, chainId);
    const writes = walletWith(accountState, async () => {
      throw Object.assign(new Error("Internal JSON-RPC error."), { code: -32603 });
    });
    const toasts = await recordToasts(page);
    await accountState.connect(page);
    await expect(page.getByTestId("margin")).toContainText("1,000.00");
    await configureClassicTrading(page);
    const button = await fillPositionOrder(page, { isLong: true, collateral: "2.5", size: "2.01" });
    await expect(button).toBeEnabled();
    await button.click();
    await expect
      .poll(async () => (writes.length ? writes.map((request) => request.method) : await toasts()), { timeout: 60_000 })
      .toEqual(["eth_sendTransaction"]);

    const error = toast(page).filter({ hasText: "RPC error." });
    await expect(error).toBeVisible();
    await expect(error).toContainText("for better reliability");
    await expect(error.getByRole("link", { name: "chainlist.org" })).toHaveAttribute("href", "https://chainlist.org");
    await expect(button).toBeEnabled();
    await expect(page.getByTestId("margin-input")).toHaveValue("2.5");
    await expect(page.getByTestId("position-size-input")).toHaveValue("2.01");
    await expect(page.getByTestId("trade-table-large")).toContainText("No open positions");
    await error.getByRole("button", { name: "Express Trading" }).click();
    await expect(page.getByText("Express + One-Click", { exact: true })).toBeVisible();
  });
});

test.describe("relayer down", () => {
  test.use({ unsignedReviewMode: true, signableRehearsal: true });

  test("26.04 an Express order signed locally fails with an error toast when the relay returns 503, and the form stays usable", async ({
    page,
    context,
    accountState,
    chainId,
  }) => {
    // With the recorded Avalanche market snapshot the Express fee estimate never settles; live simulation is too flaky to replace it.
    test.skip(chainId !== 42161, "Express relay failure is exercised on Arbitrum");
    test.setTimeout(150_000);
    fund(accountState, chainId);
    const signer = accountState.rehearsalSigner!;
    const writes = walletWith(accountState, async (request) => {
      if (request.method !== "eth_signTypedData_v4") throw Object.assign(new Error("Rejected"), { code: 4001 });
      const data = request.params![1];
      return signer.signTypedData((typeof data === "string" ? JSON.parse(data) : data) as never);
    });
    const relay: string[] = [];
    await context.route(/\/v1\/relay\//, async (route) => {
      relay.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.fulfill({ status: 503, contentType: "text/plain", body: "Service Unavailable" });
    });
    // Nothing may reach a real chain or third-party relayer.
    await context.route(
      (url) => /gelato/i.test(url.hostname),
      (route) => route.abort()
    );
    await context.route("**/*", async (route) => {
      if (/eth_sendRawTransaction/.test(route.request().postData() ?? "")) return route.abort();
      await route.fallback();
    });

    const toasts = await recordToasts(page);
    await accountState.connect(page);
    await expect(page.getByTestId("margin")).toContainText("1,000.00");
    const settings = await openSettings(page);
    const express = settings
      .getByText("Express", { exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'grid')][1]");
    // A funded wallet defaults to Express once the gas payment balance has loaded.
    await expect(express).toHaveClass(/(?:^|\s)border-slate-100(?:\s|$)/);
    await settings.getByRole("button", { name: "Display settings", exact: true }).click();
    await setSettingsToggle(settings, "Manual leverage", false);
    await page.keyboard.press("Escape");
    const button = await fillPositionOrder(page, { isLong: true, collateral: "2.5", size: "2.01" });
    await page.getByText("Execution details", { exact: true }).click();
    const fee = page
      .getByText("Network fee", { exact: true })
      .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
    // The Express relay fee must be estimated before the order can be signed.
    await expect(fee).toContainText(/-[\d.]+\s*USDC/, { timeout: 60_000 });
    await expect(button).toBeEnabled();
    await button.click();
    await expect
      .poll(async () => (writes.length ? writes.map((request) => request.method) : await toasts()), {
        message: "the order is signed locally",
        timeout: 60_000,
      })
      .toEqual(["eth_signTypedData_v4"]);
    await expect.poll(() => relay.length, { message: "the signed order is sent to the relay" }).toBeGreaterThan(0);

    const error = toast(page).filter({ hasText: "Transaction failed" });
    await expect(error).toBeVisible({ timeout: 30_000 });
    await error.getByText("Show error", { exact: true }).click();
    await expect(error).toContainText("GMX Relay /v1/relay/submit failed");
    expect(writes.map((request) => request.method)).toEqual(["eth_signTypedData_v4"]);
    // A 5xx is transient: one attempt plus three retries, and no status polling without a task id.
    expect(relay).toEqual(Array(4).fill("POST /v1/relay/submit"));
    await expect(button).toBeEnabled();
    await expect(page.getByTestId("margin-input")).toHaveValue("2.5");
    await expect(page.getByTestId("trade-table-large")).toContainText("No open positions");
  });
});

test("26.05 partial: when the event WebSocket drops, the app reconnects and restores its position and order event subscriptions (no user notification exists)", async ({
  page,
  accountState,
  chainId,
}) => {
  const connections: { url: string; active: Map<string, string>; close: () => Promise<void> }[] = [];
  // Position/order event filters are fixed per account; token-transfer filters follow the loaded market list.
  const eventEmitter = getContract(chainId as ContractsChainId, "EventEmitter");
  const active = (index: number) =>
    [...(connections[index]?.active.values() ?? [])].filter((params) => params.includes(eventEmitter)).sort();
  let subscriptionCount = 0;
  // Takes precedence over the fixture's context-level socket mock; ids stay unique per subscription.
  await page.routeWebSocket(/^wss:\/\//, (socket) => {
    const connection = {
      url: socket.url(),
      active: new Map<string, string>(),
      close: () => socket.close({ code: 1011 }),
    };
    connections.push(connection);
    socket.onMessage((message) => {
      const request = JSON.parse(String(message));
      let result: unknown;
      if (request.method === "eth_subscribe") {
        result = toHex(++subscriptionCount);
        connection.active.set(result as string, JSON.stringify(request.params));
      } else if (request.method === "eth_unsubscribe") {
        connection.active.delete(request.params[0]);
        result = true;
      } else if (request.method === "eth_chainId") result = toHex(chainId);
      socket.send(
        JSON.stringify(
          result === undefined
            ? { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Unmocked socket request" } }
            : { jsonrpc: "2.0", id: request.id, result }
        )
      );
    });
  });
  await accountState.connect(page);
  await expect.poll(() => active(0).length).toBeGreaterThanOrEqual(2);
  const before = active(0);
  // Topics are hex-encoded, so the account filter is matched case-insensitively.
  expect(before.join()).toMatch(new RegExp(accountState.address.slice(2), "i"));
  await connections[0].close();
  await expect.poll(() => connections.length, { message: "a new socket is opened" }).toBe(2);
  expect(connections[1].url).toBe(connections[0].url);
  await expect.poll(() => active(1)).toEqual(expect.arrayContaining(before));
  await expect(page.getByTestId("user-address")).toBeVisible();
});
