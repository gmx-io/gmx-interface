import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { inputNumber, openTrade, selectMarket } from "../fixtures/trade";

test("2.01 20.01 20.03 TradingView renders on /trade and every supported timeframe can be selected", async ({
  page,
}) => {
  await openTrade(page);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  await expect(chart.getByRole("region", { name: "Chart #1", exact: true })).toBeVisible();
  for (const interval of ["1 minute", "5 minutes", "15 minutes", "1 hour", "4 hours", "1 day", "1 week", "1 month"]) {
    const control = chart.getByRole("radio", { name: interval, exact: true });
    await control.click();
    await expect(control).toHaveAttribute("aria-checked", "true");
  }
});

test("20.05 chart drawing is restored after refresh and its deletion is persisted", async ({ page }) => {
  await openTrade(page);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  const canvas = chart.locator(".chart-gui-wrapper canvas").last();
  await expect(canvas).toBeVisible();
  await chart.getByRole("button", { name: "Show Drawings Toolbar", exact: true }).click();
  const trend = chart.getByRole("button", { name: "Trend Line", exact: true });
  await trend.click({ delay: 100 });
  await expect(trend).toHaveAttribute("aria-pressed", "true");
  // TradingView needs a nonzero pointer press for canvas drawing gestures.
  await canvas.click({ position: { x: 100, y: 100 }, delay: 100 });
  await canvas.click({ position: { x: 220, y: 180 }, delay: 100 });
  const remove = chart.getByRole("button", { name: "Remove 1 drawing", exact: true });
  await expect(remove).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("tv-save-load-charts")?.includes("LineToolTrendLine")))
    .toBe(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(chart.getByRole("button", { name: "Remove 0 drawings", exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("tv-save-load-charts")?.includes("LineToolTrendLine")))
    .toBe(false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(chart.getByRole("button", { name: "Remove 0 drawings", exact: true })).toBeVisible();
});

test("20.12 chart context menu fills a trigger order at the clicked price", async ({ page }) => {
  await openTrade(page);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  await expect(chart.getByRole("region", { name: "Chart #1", exact: true }).getByRole("toolbar")).toContainText(
    /C\s*\d/
  );
  const canvas = chart.locator(".chart-gui-wrapper canvas").last();
  const bounds = (await canvas.boundingBox())!;
  // The empty right margin avoids TradingView's candle-series menu.
  await canvas.click({ button: "right", position: { x: bounds.width - 40, y: bounds.height * 0.35 }, delay: 100 });
  const action = chart.getByRole("cell", { name: /^Set long (Limit|Stop Market) @/ });
  await expect(action).toBeVisible();
  const label = (await action.textContent())!;
  const price = Number(label.split("@")[1].replace(/[^\d.]/g, ""));
  expect(price).toBeGreaterThan(0);
  await action.click();
  await expect.poll(() => inputNumber(page.getByTestId("trigger-price-input"))).toBeCloseTo(price, 2);
  await expect(page.getByTestId("trade-mode")).toContainText(label.includes("Stop Market") ? "Stop Market" : "Limit");
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});

test("20.02 20.11 changing market updates the chart symbol and its current price stays near the mark", async ({
  page,
}) => {
  await openTrade(page);
  await selectMarket(page, "ETH");
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  const legend = chart.getByRole("region", { name: "Chart #1", exact: true }).getByRole("toolbar");
  await expect(legend).toContainText("ETH/USD");
  await expect
    .poll(async () => {
      const close = (await legend.innerText()).match(/C\s*([\d,]+(?:\.\d+)?)/)?.[1];
      const mark = displayedNumber(await page.getByRole("banner").locator(".numbers").first().innerText());
      if (!close || !mark) return Infinity;
      return Math.abs(Number(close.replaceAll(",", "")) / mark - 1);
    })
    .toBeLessThan(0.01);
});

test("20.04 Price, Depth and Net rate charts switch without losing the selected market", async ({ page }) => {
  await openTrade(page);
  await selectMarket(page, "ETH");
  for (const tab of ["Depth", "Net rate", "Price"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(page.getByRole("banner").getByRole("button", { name: /ETH\/USD/ })).toBeVisible();
    if (tab === "Price") await expect(page.locator('iframe[title="Financial Chart"]')).toBeVisible();
    else await expect(page.locator('iframe[title="Financial Chart"]')).toBeHidden();
  }
});
