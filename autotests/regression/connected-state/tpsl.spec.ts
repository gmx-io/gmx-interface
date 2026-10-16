import { expect, type Locator } from "@playwright/test";
import { zeroAddress } from "viem";

import { test } from "../fixtures/accountState";
import { displayedNumbers, infoRow, inputNumber, labelledInput } from "../fixtures/trade";
import { configureClassicTrading, fillPositionOrder, fundedPositionRow } from "../fixtures/tradingForms";

test.describe(() => {
  test.use({ unsignedReviewMode: true });

  for (const isLong of [true, false]) {
    const direction = isLong ? "Long" : "Short";
    test(`7.01 7.02 7.03 ${direction} order-form TP/SL percentages convert to prices as entry × (1 ± % / leverage)`, async ({
      page,
      accountState,
    }) => {
      accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
      accountState.balances.set(zeroAddress, 10n ** 18n);
      await accountState.connect(page);
      await configureClassicTrading(page);
      await fillPositionOrder(page, { isLong, collateral: "100", size: "1000" });
      const tradebox = page.getByTestId("tradebox");
      await tradebox.getByRole("button", { name: "Take-Profit / Stop-Loss", exact: true }).click();
      const tp = tradebox.getByPlaceholder("TP price", { exact: true });
      const sl = tradebox.getByPlaceholder("SL price", { exact: true });
      const gain = tradebox.getByPlaceholder("Gain", { exact: true });
      await gain.fill("20");
      await tradebox.getByPlaceholder("Loss", { exact: true }).fill("10");
      await expect.poll(() => inputNumber(tp)).toBeGreaterThan(0);
      await expect.poll(() => inputNumber(sl)).toBeGreaterThan(0);
      // Entry is the $1,000 size over its shown token amount; leverage is shown after opening fees.
      const entry = 1000 / (await displayedNumbers(tradebox.getByText(/^≈[\d.,]+\sETH$/)))[0];
      const leverage = (await displayedNumbers(tradebox.getByText(/^\d+(?:\.\d+)?\s*x$/).first()))[0];
      const sign = isLong ? 1 : -1;
      expect(Math.abs((await inputNumber(tp)) / (entry * (1 + (sign * 0.2) / leverage)) - 1)).toBeLessThan(0.0002);
      expect(Math.abs((await inputNumber(sl)) / (entry * (1 - (sign * 0.1) / leverage)) - 1)).toBeLessThan(0.0002);
      const [tpPnl, slPnl] = [0, 1].map((index) =>
        tradebox.getByText("Est. PnL", { exact: true }).nth(index).locator("xpath=..")
      );
      await expect(tpPnl).toContainText(/\+\$.*\(\+[\d.]+%\)/);
      await expect(slPnl).toContainText(/-\$.*\(-[\d.]+%\)/);
      const [tpUsd, tpPercentage] = await displayedNumbers(tpPnl);
      const [slUsd, slPercentage] = await displayedNumbers(slPnl);
      // Percentages are recomputed from the cent-rounded trigger prices.
      expect(tpPercentage).toBeCloseTo(20, 1);
      expect(slPercentage).toBeCloseTo(10, 1);
      expect(Math.abs(tpUsd - (0.2 * 1000) / leverage)).toBeLessThan(0.02);
      expect(Math.abs(slUsd - (0.1 * 1000) / leverage)).toBeLessThan(0.02);

      await tp.fill((entry * (1 + (sign * 0.3) / leverage)).toFixed(2));
      await expect.poll(() => inputNumber(gain)).toBeCloseTo(30, 0);
      await expect(page.getByTestId("confirm-trade-button")).toBeEnabled();
      await expect(tradebox).not.toContainText(/NaN|Infinity|undefined/);
    });
  }

  for (const isLong of [true, false]) {
    const direction = isLong ? "Long" : "Short";
    test(`7.04 ${direction} TP/SL gain, loss and estimated PnL agree with the entry and trigger prices`, async ({
      page,
      accountState,
    }) => {
      // Mocked position: 0.4 ETH at $2,500 entry with $250 margin, so $1 of price is $0.40 of PnL.
      accountState.positions = [accountState.data.position(isLong)];
      await accountState.connect(page);
      await fundedPositionRow(page, isLong).getByRole("button", { name: "Set", exact: true }).click();
      await page.getByRole("button", { name: "Add TP/SL", exact: true }).last().click();
      const modal = page
        .locator(".Modal-content")
        .filter({ has: page.getByText(new RegExp(`^(TP/SL|TP|SL): Close ETH/USD ${direction}$`)) });
      const tp = labelledInput(modal, "TP price");
      const sl = labelledInput(modal, "SL price");
      const gain = labelledInput(modal, "Gain");
      const loss = labelledInput(modal, "Loss");
      const [tpPnl, slPnl] = [0, 1].map((index) =>
        modal.getByText("Est. PnL", { exact: true }).nth(index).locator("xpath=..")
      );
      await tp.fill(isLong ? "3000" : "2000");
      await sl.fill(isLong ? "2250" : "2750");
      await expect.poll(() => inputNumber(gain)).toBe(80);
      await expect.poll(() => inputNumber(loss)).toBe(40);
      await expect(tpPnl).toContainText("+$");
      await expect(slPnl).toContainText("-$");
      const [tpUsd, tpPercentage] = await displayedNumbers(tpPnl);
      const [slUsd, slPercentage] = await displayedNumbers(slPnl);
      expect(tpUsd).toBeCloseTo(200, 1);
      expect(tpPercentage).toBeCloseTo(80, 0);
      expect(slUsd).toBeCloseTo(100, 1);
      expect(slPercentage).toBeCloseTo(40, 0);
      // Reward/risk follows the price distances from entry: 500 / 250.
      expect(tpUsd / slUsd).toBeCloseTo(2, 2);

      for (const field of [gain, loss]) {
        await field.locator("xpath=ancestor::div[contains(@class, 'rounded-8')][1]").getByRole("button").click();
        await page.locator("[id^='headlessui-popover-panel']").getByRole("button", { name: "$", exact: true }).click();
      }
      await expect.poll(() => inputNumber(gain)).toBe(200);
      await expect.poll(() => inputNumber(loss)).toBe(100);
      await gain.fill("100");
      await expect.poll(() => inputNumber(tp)).toBe(isLong ? 2750 : 2250);
      await loss.fill("50");
      await expect.poll(() => inputNumber(sl)).toBe(isLong ? 2375 : 2625);
      await expect(modal).not.toContainText(/NaN|Infinity|undefined/);
    });
  }

  for (const isLong of [true, false]) {
    test(`7.09 partial: ${isLong ? "Long" : "Short"} limit increase warns when the SL is past the liquidation price; a TP there is rejected`, async ({
      page,
      accountState,
    }) => {
      accountState.balances.set(accountState.data.collateral.address, 1000n * 10n ** 6n);
      accountState.balances.set(zeroAddress, 10n ** 18n);
      await accountState.connect(page);
      await configureClassicTrading(page);
      await fillPositionOrder(page, {
        isLong,
        collateral: "100",
        size: "2500",
        mode: "Limit",
        trigger: isLong ? "1000" : "5000",
      });
      const tradebox = page.getByTestId("tradebox");
      const liquidation = infoRow(tradebox, "Liquidation price");
      await expect.poll(async () => (await displayedNumbers(liquidation)).length).toBe(1);
      const [liqPrice] = await displayedNumbers(liquidation);
      expect(Math.abs(liqPrice - (isLong ? 1000 : 5000))).toBeLessThan(isLong ? 50 : 250);
      await tradebox.getByRole("button", { name: "Take-Profit / Stop-Loss", exact: true }).click();
      const tp = tradebox.getByPlaceholder("TP price", { exact: true });
      const sl = tradebox.getByPlaceholder("SL price", { exact: true });
      const box = (input: Locator) => input.locator("xpath=ancestor::div[contains(@class, 'rounded-4')][1]");
      const tooltip = page.locator(".Tooltip-popup");
      const beyond = (offset: number) => String(Math.round(liqPrice + (isLong ? -offset : offset)));

      await sl.fill(beyond(-10));
      await expect(box(sl)).not.toHaveClass(/border-(yellow-300|red-500)/);
      await sl.fill(beyond(10));
      await expect(box(sl)).toHaveClass(/border-yellow-300/);
      await expect(tradebox.getByText("Est. PnL", { exact: true }).nth(1).locator("xpath=..")).toContainText(
        "(-100.00%)"
      );
      await sl.hover();
      await expect(
        tooltip.filter({
          hasText:
            "This trigger price is beyond the current liquidation price. Your position may be liquidated before this TP/SL order can execute.",
        })
      ).toBeVisible();

      await tp.fill(beyond(10));
      await expect(box(tp)).toHaveClass(/border-red-500/);
      await tp.hover();
      await expect(
        tooltip.filter({ hasText: isLong ? "Set TP price above limit price" : "Set TP price below limit price" })
      ).toBeVisible();
      await tp.fill(isLong ? "1100" : "4500");
      await expect(box(tp)).not.toHaveClass(/border-(yellow-300|red-500)/);
    });
  }
});
