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

  test("opens on keyboard focus of a disabled handle and hides when focus leaves", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <button>Before</button>
        <Tooltip handle={<button disabled>Submit</button>} content={CONTENT} variant="none" isHandlerDisabled />
      </div>
    );

    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByText(CONTENT)).toBeVisible();

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByText(CONTENT)).not.toBeVisible();
  });

  for (const withPortal of [false, true]) {
    test(`moves keyboard focus through the content of a disabled handle's tooltip, portal: ${withPortal}`, async ({
      mount,
      page,
    }) => {
      await mount(
        <div style={WRAPPER_STYLE}>
          <button>Before</button>
          <Tooltip
            handle={<button disabled>Submit</button>}
            content={<button>Set max withdrawal</button>}
            variant="none"
            isHandlerDisabled
            withPortal={withPortal}
          />
          <button>After</button>
        </div>
      );

      const action = page.getByRole("button", { name: "Set max withdrawal" });

      await page.getByRole("button", { name: "Before" }).focus();
      await page.keyboard.press("Tab");
      await expect(action).toBeVisible();

      await page.keyboard.press("Tab");
      await expect(action).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "After" })).toBeFocused();
      await expect(action).not.toBeVisible();
    });
  }

  for (const withPortal of [false, true]) {
    test(`returns focus to a disabled handle on Escape inside its tooltip, portal: ${withPortal}`, async ({
      mount,
      page,
    }) => {
      await mount(
        <div style={WRAPPER_STYLE}>
          <button>Before</button>
          <Tooltip
            handle={<button disabled>Submit</button>}
            content={<button>Set max withdrawal</button>}
            variant="none"
            isHandlerDisabled
            withPortal={withPortal}
          />
        </div>
      );

      await page.getByRole("button", { name: "Before" }).focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Set max withdrawal" })).toBeFocused();

      await page.keyboard.press("Escape");
      await expect(page.locator(".Tooltip-handle")).toBeFocused();
    });
  }

  test("adds no tab stop when the tooltip itself is disabled", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <button>Before</button>
        <Tooltip handle={<button disabled>Max</button>} content={CONTENT} variant="none" isHandlerDisabled disabled />
        <button>After</button>
      </div>
    );

    await page.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");

    await expect(page.getByRole("button", { name: "After" })).toBeFocused();
  });

  test("hides after a disabled handle is clicked and the mouse leaves", async ({ mount, page }) => {
    await mount(
      <div style={WRAPPER_STYLE}>
        <Tooltip handle={<button disabled>Submit</button>} content={CONTENT} variant="none" isHandlerDisabled />
      </div>
    );

    const handle = page.getByText("Submit");
    await handle.hover({ force: true });
    await expect(page.getByText(CONTENT)).toBeVisible();

    await handle.click({ force: true });
    await page.mouse.move(0, 0);

    await expect(page.getByText(CONTENT)).not.toBeVisible();
  });
});
