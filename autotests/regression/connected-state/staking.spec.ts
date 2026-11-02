import { expect } from "@playwright/test";
import { getAddress, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { test } from "../fixtures/accountState";
import { inputNumber } from "../fixtures/trade";

test.beforeEach(async ({ accountState, chainId, page }) => {
  accountState.balances.set(getAddress(getContract(chainId as ContractsChainId, "GMX")), 10n ** 18n);
  accountState.balances.set(zeroAddress, 10n ** 18n);
  await accountState.connect(page, "/earn/portfolio");
  await page.getByRole("button", { name: "Stake GMX", exact: true }).click();
  await expect(page.locator(".StakeModal .Modal-content")).toBeVisible();
});

test("13.14 stake form checks the mocked GMX balance, Max and excessive amounts before approval", async ({ page }) => {
  const modal = page.locator(".StakeModal .Modal-content");
  const amount = modal.getByRole("textbox");
  await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled();
  await amount.fill("2");
  await expect(modal.getByRole("button", { name: "Max amount exceeded", exact: true })).toBeDisabled();
  await modal.getByRole("button", { name: "Max", exact: true }).click();
  await expect.poll(() => inputNumber(amount)).toBe(1);
  await expect(modal.getByRole("button", { name: "Approve GMX", exact: true })).toBeEnabled();
  await amount.clear();
  await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled();
});

test("13.16 unstake form prevents withdrawing an empty staking balance", async ({ page }) => {
  const modal = page.locator(".StakeModal .Modal-content");
  await modal.getByRole("button", { name: "Unstake", exact: true }).click();
  await modal.getByRole("textbox").fill("1");
  await expect(modal.getByRole("button", { name: "Max amount exceeded", exact: true })).toBeDisabled();
  await modal.getByRole("button", { name: "Stake", exact: true }).click();
  await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled();
});
