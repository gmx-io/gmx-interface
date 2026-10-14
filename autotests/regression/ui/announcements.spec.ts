import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

test("2.12 2.21 announcement search recovers from no matches and opens a deep link", async ({ page }) => {
  await page.goto("/announcements");
  const cards = page.locator("[data-announcement-id]");
  await expect(cards.first()).toBeVisible();
  const title = await cards.first().getByRole("heading").innerText();
  const id = await cards.first().getAttribute("data-announcement-id");
  const search = page.getByPlaceholder("Search", { exact: true });
  await search.fill("regression-no-such-announcement");
  await expect(page.getByText("No announcements found", { exact: true })).toBeVisible();
  await expect(cards).toHaveCount(0);
  await search.fill(title);
  await expect(cards.first().getByRole("heading")).toHaveText(title);
  await page.goto(`/announcements?id=${encodeURIComponent(id!)}`);
  await expect(page.locator(`[data-announcement-id="${id}"]`)).toBeInViewport();
});

test("2.12 announcement category filters show only the selected type", async ({ page }) => {
  await page.goto("/announcements");
  await page.getByRole("button", { name: /^Listings(?:\s+\d+)?$/ }).click();
  const cards = page.locator("[data-announcement-id]");
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    await expect(card.getByText("Listing", { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: /^All Announcements/ }).click();
  await expect(cards.first()).toBeVisible();
});
