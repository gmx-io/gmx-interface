import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";

test("3.01 3.06 3.14 injected account connects through Privy and reconnects", async ({
  page,
  accountState,
  chainId,
}) => {
  const { address } = accountState;
  await accountState.connect(page);
  await expect(
    page.getByRole("banner").getByRole("button", { name: chainId === 42161 ? "Arbitrum" : "Avalanche", exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).not.toHaveText("Connect wallet");
  const shown = page.getByTestId("user-address");
  await expect(shown).toContainText(new RegExp(`${address.slice(0, 6)}.+${address.slice(-4)}`));
  await expect(shown).not.toContainText(address);
});

test("3.13 disconnect resets the trade form and survives reload", async ({ page, accountState }) => {
  const { address } = accountState;
  await accountState.connect(page);
  await page
    .getByRole("banner")
    .getByText(new RegExp(`${address.slice(0, 6)}.*${address.slice(-4)}`))
    .click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});
