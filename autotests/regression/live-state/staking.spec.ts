import { expect, type Page } from "@playwright/test";
import { formatUnits } from "viem";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount } from "../fixtures/liveAccounts";
import { inputNumber } from "../fixtures/trade";

const unstakeCases = [
  {
    ids: "",
    profile: "staking",
    token: "GMX",
    stakedRow: (page: Page) => page.getByTestId("info-row-staked-gmx"),
    staked: (account: LiveAccount) => account.staking!.gmx,
  },
  {
    ids: "13.18 ",
    profile: "escrow",
    token: "esGMX",
    stakedRow: (page: Page) => page.getByText("Staked esGMX", { exact: true }).locator(".."),
    staked: (account: LiveAccount) => account.staking!.esGmx,
  },
] as const;

for (const { ids, profile, token, stakedRow, staked } of unstakeCases) {
  test.describe(token, () => {
    test.use({ liveProfile: profile });

    test(`${ids}live ${token}: unstake Max, excess and empty input validation use the real stake without submitting`, async ({
      page,
      liveAccount,
      liveWallet,
    }) => {
      const max = liveAccount.staking!.unstakeMax;
      await liveWallet.connect(page, "/earn/portfolio");
      await expect(stakedRow(page)).toContainText(
        formatBalanceAmount(staked(liveAccount), 18, token, { showZero: true }),
        { timeout: 90_000 }
      );
      const modal = page.locator(".StakeModal .Modal-content");
      const input = modal.getByRole("textbox");
      // The asset list drops back to its loader once shortly after it first renders, closing a modal opened before (app bug).
      await expect(async () => {
        if (!(await modal.isVisible())) await page.getByRole("button", { name: `Stake ${token}`, exact: true }).click();
        await modal.getByRole("button", { name: "Unstake", exact: true }).click({ timeout: 2_000 });
        await modal.getByRole("button", { name: "Max", exact: true }).click({ timeout: 2_000 });
        await expect.poll(() => inputNumber(input), { timeout: 5_000 }).toBeCloseTo(Number(formatUnits(max, 18)), 5);
        await input.fill(formatUnits(max + 10n ** 18n, 18), { timeout: 2_000 });
        await expect(modal.getByRole("button", { name: "Max amount exceeded", exact: true })).toBeDisabled({
          timeout: 5_000,
        });
        await input.clear({ timeout: 2_000 });
        await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled({
          timeout: 5_000,
        });
      }).toPass({ timeout: 60_000 });
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    });
  });
}
