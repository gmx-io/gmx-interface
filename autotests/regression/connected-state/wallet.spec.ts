import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/connectedWallet";

async function connect(page: Page, address: string) {
  await page.goto("/trade");
  await page.getByRole("button", { name: "Connect wallet", exact: true }).first().click();
  await page
    .getByRole("button", { name: /MetaMask/i })
    .first()
    .click();
  await expect(
    page.getByRole("banner").getByText(new RegExp(`${address.slice(0, 6)}.*${address.slice(-4)}`))
  ).toBeVisible();
}

test("RR-03-05 RR-03-06 RR-03-13 injected account connects through Privy and reconnects", async ({
  page,
  wallet,
  chainId,
}) => {
  await connect(page, wallet.address);
  await expect(
    page.getByRole("banner").getByRole("button", { name: chainId === 42161 ? "Arbitrum" : "Avalanche", exact: true })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).not.toHaveText("Connect wallet");
  await expect(
    page.getByRole("banner").getByText(new RegExp(`${wallet.address.slice(0, 6)}.*${wallet.address.slice(-4)}`))
  ).toBeVisible();
});

test("connected empty account shows no positions or orders", async ({ page, wallet }) => {
  await connect(page, wallet.address);
  await expect(page.getByText("No open positions", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Orders", exact: true }).click();
  await expect(page.getByText("No open orders", { exact: true })).toBeVisible();
});

test("zero-balance account cannot submit a market trade", async ({ page, wallet }) => {
  await connect(page, wallet.address);
  await page.getByTestId("margin-input").fill("100");
  await page.getByTestId("position-size-input").fill("200");
  const submit = page.getByTestId("confirm-trade-button");
  await expect(submit).toHaveText(/Insufficient .*balance/);
  await expect(submit).toBeDisabled();
});

test("RR-03-12 disconnect resets the trade form and survives reload", async ({ page, wallet }) => {
  await connect(page, wallet.address);
  await page
    .getByRole("banner")
    .getByText(new RegExp(`${wallet.address.slice(0, 6)}.*${wallet.address.slice(-4)}`))
    .click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  await page.reload();
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});
