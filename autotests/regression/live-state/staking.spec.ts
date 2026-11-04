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
    max: (account: LiveAccount) => account.staking!.unstakeMax,
  },
  {
    ids: "13.18 ",
    profile: "escrow",
    token: "esGMX",
    stakedRow: (page: Page) => page.getByText("Staked esGMX", { exact: true }).locator(".."),
    staked: (account: LiveAccount) => account.staking!.esGmx,
    max: (account: LiveAccount) => account.vesting!.unstakeEsGmxMax,
  },
] as const;

for (const { ids, profile, token, stakedRow, staked, max } of unstakeCases) {
  test.describe(token, () => {
    test.use({ liveProfile: profile });

    test(`${ids}live ${token}: unstake Max, excess and empty input validation use the real stake without submitting`, async ({
      page,
      liveAccount,
      liveWallet,
    }) => {
      await liveWallet.connect(page, "/earn/portfolio");
      await expect(stakedRow(page)).toContainText(
        formatBalanceAmount(staked(liveAccount), 18, token, { showZero: true }),
        { timeout: 90_000 }
      );
      await page.getByRole("button", { name: `Stake ${token}`, exact: true }).click();
      const modal = page.locator(".StakeModal .Modal-content");
      await modal.getByRole("button", { name: "Unstake", exact: true }).click();
      await modal.getByRole("button", { name: "Max", exact: true }).click();
      const input = modal.getByRole("textbox");
      await expect.poll(() => inputNumber(input)).toBeCloseTo(Number(formatUnits(max(liveAccount), 18)), 5);
      await input.fill(formatUnits(staked(liveAccount) + 10n ** 18n, 18));
      await expect(modal.getByRole("button", { name: "Max amount exceeded", exact: true })).toBeDisabled();
      await input.clear();
      await expect(modal.getByRole("button", { name: "Enter an amount", exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    });
  });
}
