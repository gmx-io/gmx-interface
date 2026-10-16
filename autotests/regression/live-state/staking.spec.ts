import { expect } from "@playwright/test";
import { formatUnits } from "viem";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import { inputNumber } from "../fixtures/trade";

test.use({ liveProfile: "staking" });

test("13.12 live staking (staked balance only; APR not checked): portfolio matches the on-chain GMX stake after refresh", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/earn/portfolio");
  const row = page.getByTestId("info-row-staked-gmx");
  const amount = formatBalanceAmount(liveAccount.staking!.gmx, 18, "GMX", { showZero: true });
  await expect(row).toContainText(amount, { timeout: 45_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  await expect(row).toContainText(amount, { timeout: 45_000 });
});

test("live staking: unstake Max and excess validation use the real stake without submitting", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/earn/portfolio");
  await expect(page.getByTestId("info-row-staked-gmx")).toContainText(
    formatBalanceAmount(liveAccount.staking!.gmx, 18, "GMX", { showZero: true }),
    { timeout: 90_000 }
  );
  await page.getByRole("button", { name: "Stake GMX", exact: true }).click();
  const modal = page.locator(".StakeModal .Modal-content");
  await modal.getByRole("button", { name: "Unstake", exact: true }).click();
  await modal.getByRole("button", { name: "Max", exact: true }).click();
  const input = modal.getByRole("textbox");
  await expect.poll(() => inputNumber(input)).toBeCloseTo(Number(formatUnits(liveAccount.staking!.unstakeMax, 18)), 5);
  await input.fill(formatUnits(liveAccount.staking!.gmx + 10n ** 18n, 18));
  const submit = modal.locator("button.primary-action");
  await expect(submit).toHaveText("Max amount exceeded");
  await expect(submit).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});
