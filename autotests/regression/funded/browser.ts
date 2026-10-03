import { expect, type BrowserContext, type Page } from "@playwright/test";
import { formatBalanceAmount, formatUsd } from "../../../sdk/src/utils/numbers/utils";

import { installInjectedWallet } from "../fixtures/injectedWallet";
import type { FundedSession } from "./session";

export async function connectFundedWallet(
  page: Page,
  context: BrowserContext,
  session: Pick<FundedSession, "address"> & { rpc: Pick<FundedSession["rpc"], "request"> }
) {
  await installInjectedWallet(context, {
    address: session.address,
    chainId: 42161,
    request: async ({ method, params }, chainId) => {
      if (
        chainId !== 42161 ||
        !["eth_getBalance", "eth_getCode", "eth_call", "eth_blockNumber", "eth_getTransactionReceipt"].includes(method)
      )
        throw new Error("Funded browser wallet permits Arbitrum reads only");
      try {
        return await session.rpc.request({ method, params } as Parameters<typeof session.rpc.request>[0]);
      } catch {
        throw new Error("Read-only wallet RPC failed");
      }
    },
  });
  const response = await page.goto("/trade");
  if (response && !response.ok())
    throw new Error(`Deployment returned status ${response.status()}; check REGRESSION_BASE_URL before retrying`);
  if (await page.getByRole("heading", { name: "Nothing is here yet", exact: true }).isVisible())
    throw new Error("Deployment is not available yet; check REGRESSION_BASE_URL before retrying");
  await page.getByRole("button", { name: "Connect wallet", exact: true }).first().click();
  await page
    .getByRole("button", { name: /MetaMask/i })
    .first()
    .click();
  await expect(page.getByTestId("user-address")).toContainText(
    new RegExp(`${session.address.slice(0, 6)}.*${session.address.slice(-4)}`),
    { timeout: 15_000 }
  );
  await page.reload();
  await expect(page.getByTestId("user-address")).toContainText(
    new RegExp(`${session.address.slice(0, 6)}.*${session.address.slice(-4)}`),
    { timeout: 15_000 }
  );
  await expect(page.getByRole("banner").getByRole("button", { name: "Arbitrum", exact: true })).toBeVisible();
  await checkTradeUiReady(page);
}

function tradeTab(page: Page, name: "Positions" | "Orders") {
  return page.getByTestId("exchange-list-tabs").getByRole("button", { name: new RegExp(`^${name}(?:\\s*\\d+)?$`) });
}

export async function checkTradeUiReady(page: Page) {
  await tradeTab(page, "Orders").click();
  await tradeTab(page, "Positions").click();
  await waitForPositionTable(page);
}

async function waitForConnectedWallet(page: Page) {
  await expect(
    page.getByTestId("user-address"),
    "Wallet must finish restoring before checking account state"
  ).toBeVisible({ timeout: 45_000 });
}

async function waitForPositionTable(page: Page) {
  await waitForConnectedWallet(page);
  const table = page.getByTestId("trade-table-large");
  await expect(table.getByRole("columnheader", { name: "SIZE", exact: true })).toBeVisible();
  await expect(table.getByText("Loading...", { exact: true }), "Position data must finish loading").toBeHidden({
    timeout: 45_000,
  });
  return table;
}

export async function checkPosition(page: Page, size?: bigint, isLong = true) {
  await page.goto("/trade");
  await tradeTab(page, "Positions").click();
  const table = await waitForPositionTable(page);
  if (size === 0n) {
    await expect(table.getByText("No open positions", { exact: true })).toBeVisible();
    await expect(table.getByRole("row").filter({ has: page.getByRole("cell") })).toHaveCount(0);
    return;
  }
  const row = table.getByRole("row").filter({
    has: page.getByRole("cell", { name: new RegExp(`ETH/USD.*${isLong ? "Long" : "Short"}`) }),
  });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("ETH");
  if (size !== undefined) await expect(row.getByRole("cell").nth(1)).toContainText(formatUsd(size)!);
  await page.reload();
  await waitForPositionTable(page);
  await expect(row).toHaveCount(1);
  if (size !== undefined) await expect(row.getByRole("cell").nth(1)).toContainText(formatUsd(size)!);
}

export async function checkOrder(page: Page, key: string, visible = true) {
  await page.goto("/trade");
  await waitForConnectedWallet(page);
  await tradeTab(page, "Orders").click();
  const table = page.getByTestId("trade-table-large");
  await expect(table.getByRole("columnheader", { name: "TRIGGER PRICE", exact: true })).toBeVisible();
  await expect(table.getByText("Loading...", { exact: true })).toBeHidden({ timeout: 45_000 });
  const row = page.getByTestId(`order-${key}`);
  if (visible) {
    await expect(row).toBeVisible();
    await expect(row).toContainText("ETH");
    await page.reload();
    await waitForConnectedWallet(page);
    await expect(table.getByText("Loading...", { exact: true })).toBeHidden({ timeout: 45_000 });
    await expect(row).toBeVisible();
  } else await expect(row).toHaveCount(0);
}

export async function checkAccount(page: Page, positive: boolean) {
  await page.goto("/trade");
  await waitForConnectedWallet(page);
  await page.getByTestId("user-address").click();
  const balance = page.getByTestId("gmx-account-balance");
  await expect(balance).toBeVisible();
  if (positive)
    await expect
      .poll(async () => Number((await balance.innerText()).match(/\$\s*([0-9,.]+)/)?.[1].replaceAll(",", "") ?? "0"))
      .toBeGreaterThan(0);
  else await expect(balance).toContainText(formatUsd(0n)!);
}

export async function checkLp(page: Page, token: string, kind: "GM" | "GLV", amount: bigint) {
  await page.goto("/earn/portfolio");
  const balance = page.getByTestId(`info-row-lp-balance-${token}`);
  await expect(balance).toBeVisible();
  await expect(balance).toContainText(kind);
  await expect(balance).toContainText(formatBalanceAmount(amount, 18, kind, { showZero: true }));
  await page.reload();
  await expect(balance).toContainText(formatBalanceAmount(amount, 18, kind, { showZero: true }));
}

export async function checkStake(page: Page, amount: bigint) {
  await page.goto("/earn/portfolio");
  const balance = page.getByTestId("info-row-staked-gmx");
  await expect(balance).toContainText("GMX");
  await expect(balance).toContainText(formatBalanceAmount(amount, 18, "GMX", { showZero: true }));
  await page.reload();
  await expect(balance).toContainText(formatBalanceAmount(amount, 18, "GMX", { showZero: true }));
}
