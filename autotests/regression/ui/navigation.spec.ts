import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";

test("13.11 Earn Portfolio link opens /earn/portfolio", async ({ page }) => {
  await page.goto("/earn/discover");
  await page.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/earn\/portfolio$/);
  await expect(page.getByText("Connect wallet to see your assets", { exact: true })).toBeVisible();
});

const navLinks = [
  { label: "Earn", path: /\/earn\// },
  { label: "Pools", path: /\/pools$/ },
  { label: "Stats", path: /\/stats$/ },
  { label: "Referrals", path: /\/referrals\/traders$/ },
  { label: "Leaderboard", path: /\/leaderboard\/?$/ },
  { label: "Ecosystem", path: /\/ecosystem$/ },
  { label: "Announcements", path: /\/announcements$/ },
];

for (const { label, path } of navLinks) {
  test(`2.13 2.15 ${label} sidebar link navigates and updates the page title`, async ({ page }) => {
    await page.goto("/trade");
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(path);
    await expect(page).toHaveTitle(new RegExp(label));
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.goBack();
    await expect(page.getByTestId("margin-input")).toBeVisible();
  });
}

test("2.13 header menu links navigate without a not-found page", async ({ page }) => {
  // Below the sidebar breakpoint the navigation moves into the header menu.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto("/trade");
  for (const { label, path } of [{ label: "Trade", path: /\/trade$/ }, ...navLinks]) {
    await test.step(label, async () => {
      // The menu button has no accessible name; it is the header's last button.
      await page.getByRole("banner").getByRole("button").last().click();
      await page.getByRole("link", { name: label, exact: true }).filter({ visible: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
      await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
    });
  }
});

test("invalid trader address reports the problem and keeps navigation usable", async ({ page }) => {
  await page.goto("/traders/not-an-address");
  await expect(page.getByText("Invalid Ethereum address", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Trade", exact: true }).first().click();
  await expect(page.getByTestId("margin-input")).toBeVisible();
});

test("legacy hash link preserves query parameters", async ({ page }) => {
  await page.goto("/#/trade?network=arbitrum");
  await expect(page).toHaveURL(/\/trade\?network=arbitrum$/);
  await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
});

test("2.14 unknown route renders a usable fallback", async ({ page }) => {
  await page.goto("/regression-route-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "trade", exact: true }).click();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
});
