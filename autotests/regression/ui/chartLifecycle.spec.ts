import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { openSettings, openTrade, selectMarket } from "../fixtures/trade";

type DeferredChart = { removed: boolean; releaseReady?: () => void };

test("20.01 chart resumes after page restoration and ignores marker updates during iframe teardown", async ({
  page,
}) => {
  await openTrade(page);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  const legend = chart.getByRole("region", { name: "Chart #1", exact: true }).getByRole("toolbar");
  await expect(legend).toContainText(/C\s*\d/);
  await selectMarket(page, "BTC");
  await expect(legend).toContainText("BTC/USD");
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await selectMarket(page, "ETH");
  await expect(legend).toContainText("ETH/USD");
  const modal = await openSettings(page, "Display");
  // Keep React alive after iframe teardown to reproduce a late data/settings update.
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    document.querySelector('iframe[title="Financial Chart"]')!.remove();
  });
  await modal.getByRole("button", { name: /^(All trades|Current position only|Off)$/ }).click();
  await page.getByText("Off", { exact: true }).click();
  await expect(page.getByText("Something went wrong", { exact: true })).toBeHidden();
  await page.goto("/trade");
  await expect(legend).toContainText(/C\s*\d/);
});

test("20.01 a late readiness callback cannot restore a removed TradingView widget", async ({ page }) => {
  await page.addInitScript(() => {
    type Widget = { onChartReady: (callback: () => void) => void; remove: () => void };
    type Library = { widget: new (...args: unknown[]) => Widget };
    const state: DeferredChart = { removed: false };
    Object.defineProperty(window, "__regressionDeferredChart", { value: state });
    let library: Library;
    let first = true;
    const delayFirstWidget = (constructor: Library["widget"]) =>
      new Proxy(constructor, {
        construct(target, args) {
          const widget: Widget = Reflect.construct(target, args);
          if (!first) return widget;
          first = false;
          const onReady = widget.onChartReady.bind(widget);
          const remove = widget.remove.bind(widget);
          widget.onChartReady = (callback) => onReady(() => (state.releaseReady = callback));
          widget.remove = () => {
            state.removed = true;
            remove();
          };
          return widget;
        },
      });
    Object.defineProperty(window, "TradingView", {
      configurable: true,
      get: () => library,
      set: (value: Library) => {
        library = new Proxy(value, {
          set(target, property, nextValue) {
            return Reflect.set(target, property, property === "widget" ? delayFirstWidget(nextValue) : nextValue);
          },
        });
        if (value.widget) library.widget = value.widget;
      },
    });
  });
  await page.goto("/trade");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as unknown as { __regressionDeferredChart: DeferredChart }).__regressionDeferredChart.releaseReady
        )
      )
    )
    .toBe(true);
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __regressionDeferredChart: DeferredChart }).__regressionDeferredChart.removed
      )
    )
    .toBe(true);
  const chart = page.frameLocator('iframe[title="Financial Chart"]');
  await expect(chart.getByRole("region", { name: "Chart #1", exact: true })).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { __regressionDeferredChart: DeferredChart }).__regressionDeferredChart.releaseReady!()
  );
  const interval = chart.getByRole("radio", { name: "1 hour", exact: true });
  await interval.click();
  await expect(interval).toHaveAttribute("aria-checked", "true");
});
