import { expect } from "@playwright/test";
import { formatUnits } from "viem";
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

test("13.20 live vesting: vault capacity and deposit validation reflect the real vested amount", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/earn/portfolio");
  await page.getByRole("button", { name: "Vest", exact: true }).click();
  const modal = page.locator(".Modal-content").filter({ has: page.getByText("Vesting", { exact: true }) });
  const { vested, maxVestable, walletEsGmx } = liveAccount.vesting!;
  const capacity = modal.getByText("Vault capacity", { exact: true }).locator("..");
  await expect(capacity).toContainText(
    `${formatAmount(vested, 18, 4, true)} / ${formatAmount(maxVestable, 18, 4, true)}`,
    { timeout: 45_000 }
  );
  await expect(modal.getByText("Vesting status", { exact: true }).locator("..")).toContainText(
    `/ ${formatAmount(vested, 18, 4, true)}`
  );
  await modal.getByRole("textbox").fill(formatUnits(walletEsGmx + maxVestable + 10n ** 18n, 18));
  await expect(modal.getByRole("button", { name: "Max amount exceeded", exact: true })).toBeDisabled();
  await modal.getByRole("textbox").clear();
  await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled();
  await modal.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(modal.getByRole("textbox")).toBeDisabled();
  await expect(modal.getByRole("button", { name: "Withdraw and unreserve GMX", exact: true })).toBeEnabled();
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
