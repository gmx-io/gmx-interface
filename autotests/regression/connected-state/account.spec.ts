import { expect } from "@playwright/test";
import { getAddress } from "viem";

import { test } from "../fixtures/accountState";

test.beforeEach(async ({ page, accountState }) => {
  await accountState.connect(page);
  await page.getByTestId("user-address").click();
  await expect(page.getByRole("button", { name: "PnL Analysis", exact: true })).toBeVisible();
});

test("4.01 account panel exposes only the balance actions supported on the selected network", async ({
  page,
  chainId,
}) => {
  if (chainId === 42161) {
    await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
    await expect(page.getByRole("button", { name: "Deposit to GMX Account", exact: true })).toBeVisible();
  } else {
    await expect(page.getByTestId("gmx-account-balance")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Deposit to GMX Account", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Withdraw", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeVisible();
  }
});

test("4.08 partial: the account panel has no PnL value of its own; its PnL Analysis entry opens the connected address's PnL summary", async ({
  page,
  accountState,
}) => {
  const USD = 10n ** 30n;
  await page.route("**/*", async (route) => {
    let body: { query?: string; variables?: { account?: string } } | undefined;
    try {
      body = route.request().method() === "POST" ? route.request().postDataJSON() : undefined;
    } catch {
      return route.fallback();
    }
    if (
      !body?.query?.includes("accountPnlSummaryStats") ||
      !body.variables?.account ||
      getAddress(body.variables.account) !== accountState.address
    )
      return route.fallback();
    const buckets = ["today", "yesterday", "week", "month", "year", "all"];
    await route.fulfill({
      json: {
        data: {
          accountPnlSummaryStats: buckets.map((bucketLabel, index) => ({
            bucketLabel,
            wins: index + 1,
            losses: 1,
            pnlBps: String(100 * (index + 1)),
            pnlUsd: (BigInt(111 * (index + 1)) * USD).toString(),
            volume: (BigInt(1000 * (index + 1)) * USD).toString(),
            winsLossesRatioBps: "5000",
            usedCapitalUsd: (10_000n * USD).toString(),
          })),
        },
      },
    });
  });
  const panel = page.locator(".Modal-content").filter({ has: page.getByRole("button", { name: "PnL Analysis" }) });
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText(/PnL(?! Analysis)/);
  await page.getByRole("button", { name: "PnL Analysis", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/traders/${accountState.address}`));
  await expect(page.getByRole("heading", { name: "Trader Profile", exact: true })).toBeVisible();
  await expect(page.getByTestId("gmx-account-balance")).toBeHidden();
  const allTime = page.getByRole("row").filter({ has: page.getByText("All time", { exact: true }) });
  await expect(allTime).toHaveText(/^All time\s*\$\s*6,000\.00\s*\$\s*666\.00\s*\+\s*6\.00%\s*6 \/ 1$/);
  const today = page.getByRole("row").filter({ has: page.getByText("Today", { exact: true }) });
  await expect(today).toHaveText(/^Today\s*\$\s*1,000\.00\s*\$\s*111\.00\s*\+\s*1\.00%\s*1 \/ 1$/);
});

test("4.10 19.01 settings open from the account panel, the top-bar gear and the left-panel gear", async ({ page }) => {
  const modal = page.getByTestId("settings-modal");
  const close = async () => {
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  };
  await page.getByRole("button", { name: "Settings", exact: true }).last().click();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Trading settings", exact: true })).toBeVisible();
  await close();
  await page.getByRole("banner").getByRole("button", { name: "", exact: true }).click();
  await expect(modal.getByRole("button", { name: "Trading settings", exact: true })).toBeVisible();
  await close();
  await page.locator("nav, aside").getByRole("button", { name: "Settings", exact: true }).click();
  await expect(modal.getByRole("button", { name: "Trading settings", exact: true })).toBeVisible();
});

test("4.09 account panel opens GMX alerts covering trade confirmations, liquidation risk and price alerts", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  const alerts = page
    .locator(".Modal-content")
    .filter({ has: page.locator(".Modal-title").getByText("GMX alerts", { exact: true }) });
  for (const topic of ["Trade confirmations", "Liquidation risk alerts", "Trading pair price alerts"]) {
    await expect(alerts.getByText(topic, { exact: true })).toBeVisible();
  }
  await expect(alerts.getByRole("link", { name: /Discover GMX alerts/ })).toHaveAttribute(
    "href",
    "https://gmx.notifi.network"
  );
  await expect(page.getByRole("button", { name: "PnL Analysis", exact: true })).toBeHidden();
});
