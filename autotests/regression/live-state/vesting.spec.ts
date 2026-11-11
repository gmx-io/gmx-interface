import { expect } from "@playwright/test";
import { formatBalanceAmount, formatAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "escrow" });

test("13.18 live esGMX: portfolio shows the on-chain staked and wallet balances", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/earn/portfolio");
  for (const [label, balance] of [
    ["Staked esGMX", liveAccount.staking!.esGmx],
    ["Wallet esGMX", liveAccount.vesting!.walletEsGmx],
  ] as const) {
    const row = page.getByText(label, { exact: true }).locator("..");
    await expect(row).toContainText(formatBalanceAmount(balance, 18, "esGMX", { showZero: true }), { timeout: 90_000 });
  }
});

test("13.20 live vesting: the closed GMX vault shows the real vested amount and guards withdraw", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/earn/portfolio");
  await page.getByRole("button", { name: "Vest", exact: true }).click();
  const modal = page.locator(".Modal-content").filter({ has: page.getByText("Vesting", { exact: true }) });
  await modal.locator('[data-qa="vesting-vaults"]').getByRole("button", { name: "GMX vault", exact: true }).click();
  await expect(modal.getByText("Deposits are closed.", { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(modal.getByText("Vesting status", { exact: true }).locator("..")).toContainText(
    `/ ${formatAmount(liveAccount.vesting!.vested, 18, 4, true)}`,
    { timeout: 45_000 }
  );
  await expect(modal.getByRole("textbox")).toHaveCount(0);
  const withdraw = modal.getByRole("button", { name: "Stop vesting & withdraw", exact: true });
  await expect(withdraw).toBeDisabled();
  await modal.getByText("I understand that esGMX withdrawn now can't be vested anywhere", { exact: true }).click();
  await expect(withdraw).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("13.19 live staking: loyalty and staking power share match the live API", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  const powerResponse = page.waitForResponse(
    (r) => r.url().includes("/v1/staking/power") && r.url().includes(liveAccount.account) && r.ok(),
    { timeout: 60_000 }
  );
  await liveWallet.connect(page, "/earn/portfolio");
  const power = await (await powerResponse).json();
  expect(power.loyaltyRatio).not.toBeNull();
  expect(BigInt(power.cumulativePower)).toBeGreaterThan(0n);
  const loyalty = page
    .getByText("Loyalty", { exact: true })
    .locator("xpath=ancestor::div[./div[contains(@class, 'text-right')]][1]");
  await expect(loyalty).toContainText(`${(Math.min(Number(power.loyaltyRatio), 1) * 100).toFixed(1)}%`, {
    timeout: 45_000,
  });
  const share = page
    .getByText("Staking power share", { exact: true })
    .locator("xpath=ancestor::div[./div[contains(@class, 'text-right')]][1]");
  await expect(share).toContainText(`${Number(power.userSharePercent).toFixed(3)}%`);
});
