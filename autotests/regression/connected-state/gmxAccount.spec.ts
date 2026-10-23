import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";

test.beforeEach(async ({ page, accountState }) => {
  await accountState.connect(page);
  await page.getByTestId("user-address").click();
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
});

test("4.01 4.02 4.58 empty GMX Account displays zero balance and an empty transfer history", async ({ page }) => {
  await expect(page.getByTestId("gmx-account-balance")).toContainText(/\$\s*0\.00/);
  await page.getByRole("button", { name: "Transfer history", exact: true }).click();
  await expect(page.getByText("No transfer history", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeHidden();
  await expect(page.getByTestId("margin-input")).toBeVisible();
});

test("4.63 empty wallet deposit form explains that there are no available funds", async ({ page }) => {
  await page.getByRole("button", { name: "Deposit to GMX Account", exact: true }).click();
  await expect(page.getByText(/No funds available (?:for GMX Account deposit|to deposit from)/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Receive to wallet", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change network", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("gmx-account-balance")).toBeVisible();
});

test("4.05 4.06 account asset filters and search distinguish empty Wallet and GMX Account", async ({ page }) => {
  await page.getByTestId("gmx-account-balance").getByRole("button").click();
  await expect(page.getByText("No assets in your GMX Account", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Wallet", exact: true }).click();
  await expect(page.getByText("No assets in your wallet", { exact: true })).toBeVisible();
  const search = page.getByPlaceholder("Search", { exact: true });
  await search.fill("no-such-asset");
  await expect(page.getByText("No assets found", { exact: true })).toBeVisible();
  await search.clear();
  await expect(page.getByText("No assets in your wallet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "GMX Account", exact: true }).click();
  await expect(page.getByText("No assets in your GMX Account", { exact: true })).toBeVisible();
});
