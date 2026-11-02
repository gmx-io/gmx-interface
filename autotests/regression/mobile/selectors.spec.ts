import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
async function openSelector(page: Page) {
  await page.getByRole("button", { name: /\/USD/ }).first().click();
  await expect(page.getByPlaceholder("Search market", { exact: true })).toBeInViewport();
}

test("1.10 1.11 1.12 mobile market selector sheet closes after selection and opens again", async ({ page }) => {
  await page.goto("/trade");
  for (const symbol of ["ETH", "BTC", "ETH"]) {
    await openSelector(page);
    const search = page.getByPlaceholder("Search market", { exact: true });
    await expect(search).toBeInViewport();
    await search.fill(symbol);
    await page
      .getByRole("row")
      .filter({ has: page.getByText(`${symbol}/USD`, { exact: true }) })
      .click();
    await expect(search).toBeHidden();
    await expect(page.getByRole("button", { name: new RegExp(`${symbol}/USD`) })).toBeVisible();
  }
});

test("1.10 1.11 1.12 an open market selector sheet remains usable across mobile and desktop layouts", async ({
  page,
}) => {
  await page.goto("/trade");
  await openSelector(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  const search = page.getByPlaceholder("Search market", { exact: true });
  await expect(search).toBeHidden();
  await openSelector(page);
  await search.fill("ETH");
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(search).toBeHidden();
  await openSelector(page);
  await search.fill("ETH");
  await page
    .getByRole("row")
    .filter({ has: page.getByText("ETH/USD", { exact: true }) })
    .click();
  await expect(search).toBeHidden();
  await expect(page.getByRole("button", { name: /ETH\/USD/ })).toBeVisible();
});
