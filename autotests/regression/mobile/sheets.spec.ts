import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";

async function openReceiveSheet(page: Page) {
  await page.getByTestId("receive-selector").click();
  const sheet = page.getByTestId("receive-selector-modal");
  await expect(sheet).toBeInViewport();
  // The curtain slides up until its bottom edge meets the viewport bottom.
  await expect
    .poll(async () => {
      const box = (await sheet.boundingBox())!;
      return Math.round(box.y + box.height - page.viewportSize()!.height);
    })
    .toBe(0);
  return sheet;
}

async function sheetTop(page: Page) {
  return (await page.getByTestId("receive-selector-modal").boundingBox())?.y ?? Infinity;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/trade/swap");
  // Opens the collapsed mobile tradebox.
  await page.getByTestId("trade-direction-swap").getByRole("button", { name: "Swap", exact: true }).click();
  await expect(page.getByTestId("receive-selector")).toBeInViewport();
});

test("1.11 mobile bottom sheet slides up over a dimmed backdrop and closes from its close icon", async ({ page }) => {
  const sheet = await openReceiveSheet(page);
  await expect(sheet.getByTestId("token-search-input")).toBeInViewport();
  const backdrop = await page.evaluate(() => {
    const element = document.elementFromPoint(innerWidth / 2, 20)!;
    return {
      alpha: Number(getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.[3] ?? 1),
      fixed: getComputedStyle(element).position,
    };
  });
  expect(backdrop.fixed).toBe("fixed");
  expect(backdrop.alpha).toBeGreaterThan(0.2);
  // The close icon has no accessible name; it follows the sheet title.
  await sheet
    .getByText("Receive", { exact: true })
    .locator("xpath=following-sibling::*[local-name()='svg'][1]")
    .click();
  await expect(sheet).toBeHidden();
  await openReceiveSheet(page);
});

test("1.11 mobile bottom sheet closes on a backdrop tap and keeps the page usable", async ({ page }) => {
  const sheet = await openReceiveSheet(page);
  await page.touchscreen.tap(page.viewportSize()!.width / 2, 20);
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId("receive-selector")).toBeInViewport();
  await openReceiveSheet(page);
  await sheet.getByText("ETH", { exact: true }).first().click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId("receive-selector")).toContainText("ETH");
});

test("1.11 mobile bottom sheet follows a drag, snaps back after a short drag and closes when dragged down", async ({
  page,
}) => {
  const sheet = await openReceiveSheet(page);
  const title = (await sheet.getByText("Receive", { exact: true }).boundingBox())!;
  const start = { x: title.x + title.width / 2, y: title.y + title.height / 2 };
  const top = await sheetTop(page);

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 150, { steps: 8 });
  await expect.poll(() => sheetTop(page)).toBeGreaterThan(top + 100);
  await page.mouse.move(start.x, start.y + 50, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => sheetTop(page)).toBe(top);
  await expect(sheet).toBeInViewport();

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x, start.y + 650, { steps: 16 });
  await page.mouse.up();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId("receive-selector")).toBeInViewport();
});
