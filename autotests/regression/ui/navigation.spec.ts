import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";

const TITLE_SUFFIX = " | Decentralized perpetual exchange | GMX";
const pageTitle = (name: string) => new RegExp(`^${name}${TITLE_SUFFIX.replaceAll("|", "\\|")}$`);
// The trade pages show the selected market's live price.
const TRADE_TITLE = new RegExp(`^\\$\\s?[\\d,.]+ \\| \\S+ USD${TITLE_SUFFIX.replaceAll("|", "\\|")}$`);

function tableWith(page: Page, header: string) {
  return page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: header, exact: true }) });
}

const routes: {
  path: string;
  id: string;
  title: RegExp;
  selector?: string;
  heading?: string;
  text?: string;
  loaded?: (page: Page) => Promise<void>;
}[] = [
  { path: "/trade", id: "2.01", title: TRADE_TITLE, selector: "[data-qa='tradebox']" },
  { path: "/earn/discover", id: "2.03", title: pageTitle("Earn"), heading: "Earn" },
  {
    path: "/pools",
    id: "2.04",
    title: pageTitle("Pools"),
    text: "TVL in vaults and pools",
    loaded: async (page) => {
      for (const header of ["POOL", "VAULT"])
        await expect(tableWith(page, header).getByRole("link", { name: "Details", exact: true }).first()).toBeVisible();
    },
  },
  {
    path: "/stats",
    id: "2.05",
    title: pageTitle("Stats"),
    selector: "[data-qa='dashboard-page']",
    loaded: async (page) => {
      const tvl = page
        .locator(".DashboardV2-cards .App-card-row")
        .filter({ has: page.getByText("TVL", { exact: true }) });
      await expect
        .poll(async () => displayedNumber(await tvl.locator(":scope > div").last().innerText()))
        .toBeGreaterThan(0);
    },
  },
  { path: "/referrals", id: "2.07", title: pageTitle("Referrals"), selector: "[data-qa='referrals-page']" },
  { path: "/leaderboard", id: "2.08", title: pageTitle("Leaderboard"), selector: "table" },
  { path: "/ecosystem", id: "2.11", title: pageTitle("Ecosystem projects"), selector: "[data-qa='ecosystem-page']" },
  { path: "/announcements", id: "2.12", title: pageTitle("Announcements"), heading: "Announcements" },
  { path: "/trade/swap", id: "2.02", title: TRADE_TITLE, selector: "[data-qa='pay-input']" },
  {
    path: "/monitor",
    id: "2.06 18.11",
    title: pageTitle("Synthetics Stats"),
    text: "POOL CAP LONG",
    loaded: async (page) => {
      const table = tableWith(page, "POOL VALUE");
      await expect(table.locator("tbody tr").nth(2)).toBeVisible();
      await expect
        .poll(async () => {
          const values = (await table.locator("tbody tr > td:nth-child(2)").allInnerTexts()).map(displayedNumber);
          return values.length > 2 && values.every((value) => value > 0);
        })
        .toBe(true);
      await expect(table).not.toContainText(/\b(?:NaN|Infinity|undefined)\b/);
    },
  },
  { path: "/earn/distributions", id: "", title: pageTitle("Earn"), heading: "Earn" },
  {
    path: "/earn/additional_opportunities/all",
    id: "13.07",
    title: pageTitle("Earn"),
    selector: "input[placeholder='Search opportunities']",
  },
  { path: "/competitions", id: "2.09", title: pageTitle("Leaderboard"), selector: "table" },
];

for (const { path, id, title, heading, text, selector, loaded } of routes) {
  test(`${id ? `${id} 2.15 ` : "2.15 "}${path} loads without a wallet`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).first()).toBeVisible();
    if (selector) await expect(page.locator(selector).first()).toBeVisible();
    if (heading) await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    if (text) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await loaded?.(page);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
    await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
  });
}

test("13.11 Earn Portfolio link opens /earn/portfolio", async ({ page }) => {
  await page.goto("/earn/discover");
  await page.getByRole("link", { name: "Portfolio", exact: true }).click();
  await expect(page).toHaveURL(/\/earn\/portfolio$/);
  await expect(page.getByText("Connect wallet to see your assets", { exact: true })).toBeVisible();
});

test("2.13 sidebar navigation and browser back", async ({ page }) => {
  await page.goto("/trade");
  await page.getByRole("link", { name: "Pools", exact: true }).first().click();
  await expect(page).toHaveURL(/\/pools(?:\?|$)/);
  await page.getByRole("link", { name: "Trade", exact: true }).first().click();
  await expect(page.getByTestId("confirm-trade-button")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/pools(?:\?|$)/);
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
