import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { headerPriceValue, infoRowValue, openExecutionDetails, openTooltip } from "../fixtures/marketData";
import {
  inputNumber,
  labelledInput,
  openTrade,
  selectMarket,
  selectTradeDirection,
  selectTradeMode,
} from "../fixtures/trade";

test.beforeEach(async ({ page }) => {
  await openTrade(page);
  await selectMarket(page, "ETH");
});

for (const direction of ["Long", "Short"] as const) {
  test(`5.11 5.14 ${direction}: the ${direction} configuration is active, margin and size update in both directions and clear together`, async ({
    page,
  }) => {
    await selectTradeDirection(page, direction);
    const tab = page.getByTestId("trade-direction").getByRole("button", { name: direction, exact: true });
    await expect(tab).toHaveClass(direction === "Long" ? /bg-green-900/ : /bg-red-900/);
    const margin = page.getByTestId("margin-input");
    const size = page.getByTestId("position-size-input");
    await margin.fill("100");
    await expect.poll(() => inputNumber(size)).toBeGreaterThan(180);
    await expect.poll(() => inputNumber(size)).toBeLessThanOrEqual(200);
    await size.fill("300");
    await expect.poll(() => inputNumber(margin)).toBeGreaterThan(140);
    await expect.poll(() => inputNumber(margin)).toBeLessThan(165);
    await margin.fill("");
    await expect(size).toHaveValue("");
    await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
    await selectTradeMode(page, "TWAP");
    await size.fill("1000");
    await expect(page.getByTestId("tradebox")).toContainText(`${direction.toLowerCase()} increase orders of`);
  });

  test(`6.01 ${direction}: limit and stop prices accept input and reset when returning to Market`, async ({ page }) => {
    await selectTradeDirection(page, direction);
    for (const mode of ["Limit", "Stop Market"] as const) {
      await selectTradeMode(page, mode);
      const trigger = page.getByTestId("trigger-price-input");
      await trigger.fill("2000");
      await expect.poll(() => inputNumber(trigger)).toBe(2000);
      await page.getByTestId("margin-input").fill("100");
      await expect.poll(() => inputNumber(page.getByTestId("position-size-input"))).toBeGreaterThan(0);
      await selectTradeMode(page, "Market");
      await expect(trigger).toHaveCount(0);
      await selectTradeMode(page, mode);
      await expect(trigger).toHaveValue("");
      await expect.poll(() => inputNumber(page.getByTestId("margin-input"))).toBe(100);
    }
  });
}

test("5.14 switching position size units preserves its USD value", async ({ page }) => {
  const size = page.getByTestId("position-size-input");
  await size.fill("1000");
  const margin = await inputNumber(page.getByTestId("margin-input"));
  await page.getByTestId("position-size-display-mode-button").click();
  await page.getByRole("cell", { name: "ETH", exact: true }).click();
  await expect.poll(() => inputNumber(size)).toBeGreaterThan(0);
  await expect.poll(() => inputNumber(size)).toBeLessThan(10);
  await expect.poll(() => inputNumber(page.getByTestId("margin-input"))).toBeCloseTo(margin, 1);
  await page.getByTestId("position-size-display-mode-button").click();
  await page.getByRole("cell", { name: "USD", exact: true }).click();
  await expect.poll(() => inputNumber(size)).toBeCloseTo(1000, 0);
});

test("6.16 TWAP form calculates size per part and enforces the minimum parts", async ({ page }) => {
  await selectTradeMode(page, "TWAP");
  await page.getByTestId("position-size-input").fill("1000");
  const box = page.getByTestId("tradebox");
  const parts = labelledInput(box, "Number of parts");
  await parts.fill("5");
  await parts.press("Tab");
  await expect(box).toContainText(/5 long increase orders of \$\s*200\.00/);
  await expect(box.getByText("Frequency", { exact: true })).toBeVisible();
  await parts.fill("1");
  await parts.press("Tab");
  await expect(parts).toHaveValue("2");
  await expect(box).toContainText(/2 long increase orders of \$\s*500\.00/);
});

test(
  "5.16 5.17 Long execution details show a positive open fee, zero increase price impact, network fee and a liquidation price below mark",
  { tag: "@avalanche" },
  async ({ page }) => {
    await page.getByTestId("margin-input").fill("100");
    const box = await openExecutionDetails(page);
    await expect(box).not.toContainText(/NaN|Infinity|undefined/);
    const fees = infoRowValue(box, /^Fees/);
    await expect.poll(async () => displayedNumber(await fees.innerText())).toBeLessThan(0);
    const breakdown = await openTooltip(page, fees.locator(".Tooltip-handle"));
    const openFee = /Open fee:\s*\(([\d.]+)% of position size\)\s*([^\n]+)/.exec(await breakdown.innerText());
    expect(Number(openFee?.[1])).toBeGreaterThan(0);
    expect(displayedNumber(openFee?.[2] ?? "")).toBeLessThan(0);
    await page.mouse.move(0, 0);
    // Increases execute at mark price, so the impact half of the row stays at zero.
    const [impact, totalFee] = (await infoRowValue(box, /^Price impact/).innerText()).split("/").map(displayedNumber);
    expect(impact).toBe(0);
    expect(totalFee).toBeLessThan(0);
    expect(Math.abs(totalFee)).toBeLessThanOrEqual(Number(openFee![1]) + 0.001);
    // The network fee row fills in after the gas estimate arrives.
    await expect
      .poll(async () =>
        displayedNumber(/\$\s*([\d.]+)/.exec(await infoRowValue(box, "Network fee").innerText())?.[1] ?? "")
      )
      .toBeGreaterThan(0);
    const liquidation = displayedNumber(await infoRowValue(box, "Liquidation price").innerText());
    expect(liquidation).toBeGreaterThan(0);
    expect(liquidation).toBeLessThan(await headerPriceValue(page));
    await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  }
);
