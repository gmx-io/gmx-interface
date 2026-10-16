import { expect } from "@playwright/test";
import { zeroAddress } from "viem";

import { accountData } from "../fixtures/accountData";
import { test } from "../fixtures/accountState";
import { inputNumber } from "../fixtures/trade";
import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";

test.beforeEach(async ({ page, accountState, chainId }) => {
  accountState.balances.set(accountState.data.collateral.address, 100n * 10n ** 6n);
  // A wallet-only and a GMX Account-only token, neither of them a multichain withdrawal token.
  accountState.balances.set(getTokenBySymbol(chainId, "LINK").address, 5n * 10n ** 18n);
  accountState.gmxBalances.set(accountData(chainId, accountState.address, "BTC").market.longTokenAddress, 10n ** 6n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  accountState.gmxBalances.set(accountState.data.collateral.address, 250n * 10n ** 6n);
  await accountState.connect(page);
  await page.getByTestId("user-address").click();
  // Rate-limited public RPC reads are retried for up to the app's 20s multicall timeout.
  await expect(page.getByTestId("gmx-account-balance")).toContainText(/\$\s*\d/, { timeout: 45_000 });
});

test("4.02 4.03 4.05 4.06 GMX Account and Wallet asset lists show their own mocked USDC balances", async ({ page }) => {
  await page.getByTestId("gmx-account-balance").getByRole("button").click();
  const search = page.getByPlaceholder("Search", { exact: true });
  await search.fill("USDC");
  const modal = page.locator(".Modal-content").filter({ has: search });
  await expect(modal.getByText("USDC", { exact: true })).toBeVisible();
  await expect(modal.getByText("250.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await expect(modal.getByText("100.00", { exact: true })).toBeVisible();
  await expect(modal.getByText("250.00", { exact: true })).toHaveCount(0);
  await search.fill("no-such-asset");
  await expect(modal.getByText("No assets found", { exact: true })).toBeVisible();
  await search.fill("USDC");
  await expect(modal.getByText("100.00", { exact: true })).toBeVisible();
});

test("4.07 GMX Account and Wallet asset rows carry their own chain badge", async ({ page }) => {
  await page.getByTestId("gmx-account-balance").getByRole("button").click();
  const modal = page.locator(".Modal-content").filter({ has: page.getByPlaceholder("Search", { exact: true }) });
  const badges = modal.getByTestId("token-icon").locator("xpath=following-sibling::img");
  await expect(badges).toHaveCount(2);
  for (const badge of await badges.all()) await expect(badge).toHaveAttribute("src", /ic_gmx[-.]/);
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await expect(badges).toHaveCount(3);
  for (const badge of await badges.all()) await expect(badge).toHaveAttribute("src", /ic_arbitrum[-.]/);
});

test("4.34 4.35 4.38 4.65 withdrawal lists GMX Account tokens only, blocks exceeding the balance and Max restores it", async ({
  page,
  chainId,
}) => {
  await page.getByTestId("gmx-account-balance").getByRole("button").click();
  const search = page.getByPlaceholder("Search", { exact: true });
  const assets = page.locator(".Modal-content").filter({ has: search });
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await search.fill("LINK");
  await expect(assets.getByText("5.0000", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(search).toBeHidden();
  await page.getByTestId("user-address").click();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  const modal = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Withdraw from GMX Account", { exact: true }) });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Select token", exact: true }).click();
  await expect(page.getByRole("option", { name: /^BTC / })).toBeVisible();
  await expect(page.getByRole("option", { name: /^LINK / })).toHaveCount(0);
  await page.getByRole("option", { name: /USDC/ }).click();
  await modal.getByRole("button", { name: "Select network", exact: true }).click();
  await page.getByRole("option", { name: chainId === 42161 ? /^Arbitrum/ : /^Avalanche/ }).click();
  await expect(modal.getByRole("button", { name: /^Available:.*250\.00.*USDC/ })).toBeVisible();
  const amount = modal.getByPlaceholder("0.00", { exact: true });
  await amount.fill("251");
  await expect(modal.getByRole("button", { name: /Insufficient.*balance/ })).toBeDisabled();
  await modal.getByRole("button", { name: /^Available:/ }).click();
  await expect.poll(() => inputNumber(amount)).toBe(250);
  await amount.fill("1");
  await expect.poll(() => inputNumber(amount)).toBe(1);
  await expect(modal).not.toContainText(/NaN|Infinity|undefined/);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
});
