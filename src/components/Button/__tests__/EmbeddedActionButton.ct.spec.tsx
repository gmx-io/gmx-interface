import { test, expect } from "@playwright/experimental-ct-react";

import { EmbeddedActionButtonTooltipHarness } from "./EmbeddedActionButtonTooltipHarness";

const HANDLE = "Order may not execute";
const ACTION = "Deposit margin";

test.use({ hasTouch: true });

test.describe("remediation action inside an order tooltip", () => {
  test("mouse: hover opens the tooltip and the action fires", async ({ mount, page }) => {
    await mount(<EmbeddedActionButtonTooltipHarness />);

    await page.getByText(HANDLE).first().hover();
    await page.getByRole("button", { name: ACTION }).click();

    await expect(page.getByText("activated: 1")).toBeVisible();
  });

  test("touch: tapping the handle opens the tooltip and the action fires", async ({ mount, page }) => {
    await mount(<EmbeddedActionButtonTooltipHarness />);

    await page.getByText(HANDLE).first().tap();
    await page.getByRole("button", { name: ACTION }).tap();

    await expect(page.getByText("activated: 1")).toBeVisible();
  });

  test("keyboard: focusing the handle opens the tooltip, Tab reaches the action, Enter fires it", async ({
    mount,
    page,
  }) => {
    await mount(<EmbeddedActionButtonTooltipHarness />);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: ACTION })).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: ACTION })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.getByText("activated: 1")).toBeVisible();
  });
});
