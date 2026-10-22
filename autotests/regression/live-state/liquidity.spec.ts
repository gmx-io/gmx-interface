import { expect } from "@playwright/test";
import { formatUnits } from "viem";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import { inputNumber } from "../fixtures/trade";

for (const profile of ["gm", "glv"] as const) {
  test.describe(profile.toUpperCase(), () => {
    const symbol = profile === "gm" ? "GM" : "GLV";
    test.use({ liveProfile: profile });

    test(`12.26 live ${symbol}: sell Max uses the real token balance and an excess amount is blocked with an insufficient-balance error`, async ({
      page,
      liveAccount,
      liveWallet,
    }) => {
      await liveWallet.connect(page, `/pools/details?market=${liveAccount.token}`);
      await page.getByRole("button", { name: `Sell ${symbol}`, exact: true }).click();
      // Pools with a single collateral token, such as GLV [USDG-USDG], have no Single/Pair choice.
      const pair = page.getByRole("button", { name: "Pair", exact: true });
      await expect(page.getByTestId("gm-first-token-input")).toBeVisible();
      if (await pair.isVisible()) await pair.click();
      const form = page.locator("form").filter({ has: page.getByTestId("gm-first-token-input") });
      const input = form.getByRole("textbox").last();
      await form
        .getByRole("button", { name: /^Max(?::|$)/ })
        .last()
        .click();
      await expect.poll(() => inputNumber(input)).toBeCloseTo(Number(formatUnits(liveAccount.balance!, 18)), 2);
      await input.fill(formatUnits(liveAccount.balance! * 2n, 18));
      const submit = form.locator('button[type="submit"]');
      await expect(submit).toBeDisabled();
      await expect(submit).toHaveText(/Insufficient .*balance/);
      await input.clear();
      await expect(submit).toHaveText("Enter an amount");
    });

    test(`12.16 13.04 13.05 live ${symbol} (balance only; value, PnL and APY not checked): Pools and Portfolio show the same real token balance, also after refresh`, async ({
      page,
      liveAccount,
      liveWallet,
    }) => {
      await liveWallet.connect(page, "/pools");
      const row = page.getByRole("row").filter({ has: page.locator(`a[href*="market=${liveAccount.token}"]`) });
      const amount = formatBalanceAmount(liveAccount.balance!, 18, symbol, { showZero: true });
      await expect(row).toContainText(amount!, { timeout: 90_000 });
      const details = row.getByRole("link", { name: "Details", exact: true });
      await expect(details).toHaveAttribute("href", new RegExp(`market=${liveAccount.token}`));
      await page.goto("/earn/portfolio");
      const portfolio = page.getByTestId(`info-row-lp-balance-${liveAccount.token}`);
      await expect(portfolio).toContainText(amount!, { timeout: 90_000 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 90_000 });
      await expect(portfolio).toContainText(amount!, { timeout: 90_000 });
    });
  });
}
