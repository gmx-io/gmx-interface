import type { Locator } from "@playwright/experimental-ct-core";
import { test, expect } from "@playwright/experimental-ct-react";

import { getDataQALocator } from "lib/__tests__/testUtils";

import { TradeBoxStory } from "./TradeBox.ct.stories";

type PageLike = {
  locator: (selector: string, options?: { hasText?: RegExp }) => Locator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => Locator;
};

function infoRowLabel(page: PageLike, label: RegExp) {
  return page.locator(".font-medium.text-typography-secondary", { hasText: label });
}

function infoRow(page: PageLike, label: RegExp) {
  return infoRowLabel(page, label).locator("..");
}

const FRESH_POSITION_WARNING = /may execute after the current position is liquidated/;

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
});

function selectLimitMode(page: PageLike) {
  return page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "Limit", exact: true }).click();
}

function selectShortDirection(page: PageLike) {
  return page.locator(getDataQALocator("trade-direction")).getByRole("button", { name: "Short", exact: true }).click();
}

const liqRow = (page: PageLike) => page.getByText("Liquidation price").locator("..");

test.describe("Limit Increase beyond the current liquidation price", () => {
  test.describe("Long position (liquidates at $1050)", () => {
    test("keeps the existing position in the preview when it survives at the trigger price", async ({
      mount,
      page,
    }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);

      await page.getByText("Execution details").click();
      await expect(infoRow(page, /^Size$/)).toContainText(/2,?000/);
      await expect(infoRow(page, /^Margin \(USDC\)$/)).toContainText(/1,?000/);
      await expect(infoRow(page, /^Entry price$/)).toContainText(/2,?000/);
    });

    test("previews a fresh position when the trigger price is below the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("900");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();
      await expect(liqRow(page)).not.toContainText(/1,?050/);
      await page.getByText("Execution details").click();
      await expect(infoRowLabel(page, /^Size$/)).toHaveCount(0);
      await expect(infoRowLabel(page, /^Margin \(USDC\)$/)).toHaveCount(0);
      await expect(infoRowLabel(page, /^Entry price$/)).toHaveCount(0);
    });

    test("the warning appears and disappears as the trigger crosses the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");

      const triggerPriceInput = page.locator(getDataQALocator("trigger-price-input"));

      await triggerPriceInput.fill("1500");
      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();

      await triggerPriceInput.fill("900");
      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();

      await triggerPriceInput.fill("1500");
      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });

    test("does not warn for a Market Increase", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await page.locator(getDataQALocator("margin-input")).fill("1000");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });

    test("does not warn for a Stop Market Increase priced above the mark", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition />);

      await page.locator(getDataQALocator("trade-mode")).getByRole("button", { name: "More" }).click();
      await page.getByText("Stop Market", { exact: true }).click();

      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("2500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/1,?050/);
    });
  });

  test.describe("Short position (liquidates at $2950)", () => {
    test("keeps the existing position in the preview when it survives at the trigger price", async ({
      mount,
      page,
    }) => {
      await mount(<TradeBoxStory withPosition positionIsShort />);

      await selectShortDirection(page);
      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("2500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();
      await expect(liqRow(page)).toContainText(/2,?950/);
    });

    test("previews a fresh position when the trigger price is above the liquidation price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition positionIsShort />);

      await selectShortDirection(page);
      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("1000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("3200");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();
      await expect(liqRow(page)).not.toContainText(/2,?950/);

      await page.getByText("Execution details").click();
      await expect(infoRowLabel(page, /^Size$/)).toHaveCount(0);
    });
  });

  test.describe("Validation against the fresh projection", () => {
    test("rejects an order that is only safe thanks to the doomed position's collateral", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition manualLeverage />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("100");
      await page.locator(getDataQALocator("position-size-input")).fill("50000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("900");

      await expect(page.getByText(FRESH_POSITION_WARNING)).toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).toHaveText(/Max leverage/);
      await expect(submitButton).toBeDisabled();
    });

    test("accepts the same order when the position survives at the trigger price", async ({ mount, page }) => {
      await mount(<TradeBoxStory withPosition manualLeverage />);

      await selectLimitMode(page);
      await page.locator(getDataQALocator("margin-input")).fill("100");
      await page.locator(getDataQALocator("position-size-input")).fill("50000");
      await page.locator(getDataQALocator("trigger-price-input")).fill("1500");

      await expect(page.getByText(FRESH_POSITION_WARNING)).not.toBeVisible();

      const submitButton = page.locator(getDataQALocator("confirm-trade-button"));
      await expect(submitButton).not.toHaveText(/Max leverage/);
    });
  });
});
