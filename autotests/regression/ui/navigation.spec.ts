import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

const routes = [
  { path: "/trade", id: "RR-02-01", selector: "[data-qa='tradebox']" },
  { path: "/earn/discover", id: "RR-02-03", heading: "Earn" },
  { path: "/pools", id: "RR-02-04", text: "TVL in vaults and pools" },
  { path: "/stats", id: "RR-02-05", selector: "[data-qa='dashboard-page']" },
  { path: "/referrals", id: "RR-02-07", selector: "[data-qa='referrals-page']" },
  { path: "/leaderboard", id: "RR-02-08", selector: "table" },
  { path: "/ecosystem", id: "RR-02-11", selector: "[data-qa='ecosystem-page']" },
  { path: "/announcements", id: "RR-02-12", heading: "Announcements" },
];

for (const { path, id, heading, text, selector } of routes) {
  test(`${id} ${path} loads without a wallet`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).first()).toBeVisible();
    if (selector) await expect(page.locator(selector).first()).toBeVisible();
    if (heading) await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    if (text) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
  });
}

test("RR-02-13 sidebar navigation and browser back", async ({ page }) => {
  await page.goto("/trade");
  await page.getByRole("link", { name: "Pools", exact: true }).first().click();
  await expect(page).toHaveURL(/\/pools(?:\?|$)/);
  await page.getByRole("link", { name: "Trade", exact: true }).first().click();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/pools(?:\?|$)/);
});

test("legacy hash link preserves query parameters", async ({ page }) => {
  await page.goto("/#/trade?network=arbitrum");
  await expect(page).toHaveURL(/\/trade\?network=arbitrum$/);
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});

test("unknown route renders a usable fallback", async ({ page }) => {
  await page.goto("/regression-route-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "trade", exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
});
