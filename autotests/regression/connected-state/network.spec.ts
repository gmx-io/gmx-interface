import { expect } from "@playwright/test";

import { test } from "../fixtures/accountState";
import { openSettings } from "../fixtures/trade";

const chainName = (chainId: number) => (chainId === 42161 ? "Arbitrum" : "Avalanche");

test("3.08 22.10 switching to the other settlement network, MegaETH and back preserves the account and its order's market, size and trigger price", async ({
  page,
  accountState,
  chainId,
}) => {
  const order = accountState.data.order(3);
  accountState.orders = [order];
  await accountState.connect(page);
  const names = [chainName(chainId), chainName(chainId === 42161 ? 43114 : 42161), "MegaETH", chainName(chainId)];
  for (const [index, to] of names.slice(1).entries()) {
    await page.getByRole("banner").getByRole("button", { name: names[index], exact: true }).click();
    await page.getByTestId(`networks-dropdown-${to}`).click();
    await expect(page.getByRole("banner").getByRole("button", { name: to, exact: true })).toBeVisible();
    await expect(page.getByTestId("user-address")).toContainText(accountState.address.slice(0, 6));
  }
  await page
    .getByTestId("trade-table-large")
    .getByRole("button", { name: /^Orders/ })
    .click();
  const row = page.getByTestId(`order-${order.key}`);
  await expect(row).toContainText(/ETH\/USD\s*Long/);
  await expect(row).toContainText(/\$\s*1,000\.00/);
  await expect(row).toContainText(/2,000\.00/);
});

test("3.09 a network change emitted by the wallet updates the selected network", async ({
  page,
  accountState,
  chainId,
}) => {
  await accountState.connect(page);
  const other = chainId === 42161 ? 43114 : 42161;
  await page.evaluate(async (chainId) => {
    const provider = (window as unknown as { ethereum: { request: (request: unknown) => Promise<unknown> } }).ethereum;
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  }, other);
  await expect(page.getByRole("banner").getByRole("button", { name: chainName(other), exact: true })).toBeVisible();
  await expect(page.getByTestId("user-address")).toContainText(accountState.address.slice(0, 6));
});

test("21.06 a fresh account defaults to Express and can select Classic without signing", async ({
  page,
  accountState,
}) => {
  await accountState.connect(page);
  const settings = await openSettings(page);
  const express = settings.getByText("Express", { exact: true });
  await expect(express.locator("xpath=ancestor::div[contains(@class, 'grid')][1]")).toHaveClass(
    /(?:^|\s)border-slate-100(?:\s|$)/
  );
  await expect(settings.getByText("Optimal", { exact: true })).toBeVisible();
  await settings.getByText("Classic", { exact: true }).click();
  await page.keyboard.press("Escape");
  await accountState.refresh(page);
  await openSettings(page);
  await expect(settings.getByText("Max network fee buffer", { exact: true })).toBeVisible();
});
