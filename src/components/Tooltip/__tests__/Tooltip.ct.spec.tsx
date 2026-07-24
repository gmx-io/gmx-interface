import { test, expect } from "@playwright/experimental-ct-react";

import Tooltip from "../Tooltip";

const CONTENT = "Tooltip content";

const WRAPPER_STYLE = { padding: 100 };

test.describe("Tooltip", () => {
  test("shows content on hover and hides on mouse leave", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <Tooltip handle="Handle" content={CONTENT} variant="none" />
      </div>
    );

    await page.getByText("Handle").hover();
    await expect(page.getByText(CONTENT)).toBeVisible();

    await page.mouse.move(0, 0);
    await expect(page.getByText(CONTENT)).not.toBeVisible();
  });

  test("hides after a link handle is clicked and the mouse leaves", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <Tooltip
          handle={<a href="https://example.com">View in explorer</a>}
          content={CONTENT}
          variant="none"
          position="bottom"
        />
      </div>
    );

    const handle = page.getByText("View in explorer");
    await handle.hover();
    await expect(page.getByText(CONTENT)).toBeVisible();

    await handle.click();
    await page.mouse.move(0, 0);

    await expect(page.getByText(CONTENT)).not.toBeVisible();
  });

  test("toggles on click when closeOnDoubleClick is set", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <Tooltip handle="Handle" content={CONTENT} variant="none" closeOnDoubleClick />
      </div>
    );

    const handle = page.getByText("Handle");
    await handle.hover();
    await expect(page.getByText(CONTENT)).toBeVisible();

    await handle.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    await expect(page.getByText(CONTENT)).toBeVisible();

    await handle.hover();
    await page.waitForTimeout(200);
    await handle.click();
    await expect(page.getByText(CONTENT)).not.toBeVisible();
  });

  test("stays open while an input inside the handle is focused", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <Tooltip handle={<input placeholder="Amount" />} content={CONTENT} variant="none" />
      </div>
    );

    const input = page.getByPlaceholder("Amount");
    await input.click();
    await expect(page.getByText(CONTENT)).toBeVisible();

    await page.mouse.move(0, 0);
    await page.waitForTimeout(500);
    await expect(page.getByText(CONTENT)).toBeVisible();
  });
});
