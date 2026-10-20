import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";

import { announcementTime as time } from "../fixtures/announcements";
import { test } from "../fixtures/browser";
import { readRegressionAnnouncements, type RegressionAnnouncement } from "../fixtures/deploymentConfig";

type UiFlags = Record<string, { enabled: boolean; createdAt: string }>;

const TITLE_SUFFIX = / \| Decentralized perpetual exchange \| GMX$/;
// Social hosts answer bots with login walls or 4xx, so only the URL shape is checked for them.
const SOCIAL_LINK = /^https:\/\/(?:(?:x|twitter)\.com\/\w+\/status\/\d+|t\.me\/\w+\/\d+)$/;
const MAX_TOAST_CARDS = 4;

// Test registration happens before fixtures exist, so read the chain the same way as the config.
const chainName = Number(process.env.REGRESSION_CHAIN_ID || 42161) === 43114 ? "AVALANCHE" : "ARBITRUM";
const announcements = readRegressionAnnouncements();
const now = Date.now();

// Candidates for a disconnected user; flag-gated ones are filtered in the browser.
const current = announcements.filter(
  (event) =>
    !event.requiresOpenPosition &&
    (event.isActive || event.flagId) &&
    (!event.startDate || time(event.startDate) <= now) &&
    now < time(event.endDate) &&
    (!event.chains || event.chains.includes(chainName))
);
const sortTime = (event: RegressionAnnouncement, flags: UiFlags) =>
  event.startDate
    ? time(event.startDate)
    : event.flagId && flags[event.flagId]?.createdAt
      ? Date.parse(flags[event.flagId].createdAt)
      : time(event.endDate);

function recordFlags(page: Page) {
  const flags: UiFlags = {};
  const received = { count: 0 };
  page.on("response", async (response) => {
    if (!response.ok() || new URL(response.url()).pathname !== "/ui-flags/v2") return;
    for (const [flag, meta] of Object.entries((await response.json().catch(() => ({}))) as UiFlags))
      if (meta.enabled) flags[flag] = meta;
    received.count++;
  });
  return { flags, received };
}

const linksOf = (event: RegressionAnnouncement) => [...event.hrefs, ...(event.linkHref ? [event.linkHref] : [])];

async function openCard(page: Page, event: RegressionAnnouncement) {
  await page.goto(`/announcements?id=${encodeURIComponent(event.id)}`, { waitUntil: "domcontentloaded" });
  const card = page.locator(`[data-announcement-id="${event.id}"]`);
  await expect(card).toBeInViewport();
  return card;
}

async function checkLinks(page: Page, request: APIRequestContext, event: RegressionAnnouncement, testInfo: TestInfo) {
  const links = linksOf(event);
  const card = await openCard(page, event);
  if (event.title) await expect(card.getByRole("heading", { level: 3 })).toHaveText(event.title);
  await expect(card.locator("a[href]")).toHaveCount(links.length);
  const results: { href: string; result: string }[] = [];
  for (const [i, href] of links.entries()) {
    const anchor = (await openCard(page, event)).locator("a[href]").nth(i);
    await expect(anchor).toHaveAttribute("href", href);
    if (href.startsWith("/")) {
      await anchor.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(new URL(href, page.url()).pathname);
      await expect(page).toHaveTitle(TITLE_SUFFIX);
      await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
      await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
      results.push({ href, result: `opened ${page.url()}` });
    } else if (SOCIAL_LINK.test(href)) {
      results.push({ href, result: "URL shape only (social host blocks automated requests)" });
    } else {
      const response = await request.get(href, { maxRedirects: 5, failOnStatusCode: false, timeout: 30_000 });
      expect(response.status(), href).toBeLessThan(400);
      results.push({ href, result: `HTTP ${response.status()} ${response.url()}` });
    }
  }
  await testInfo.attach(`announcement-links-${event.id}`, {
    body: JSON.stringify({ id: event.id, results }, null, 2),
    contentType: "application/json",
  });
}

for (const event of current) {
  const rows = event.type === "listing" ? "24.04 24.06 23.07" : "24.04 24.06";
  test(`${rows} day-after announcement ${event.id}: it displays in-app and every link lands on its page`, async ({
    page,
    request,
  }, testInfo) => {
    const { flags, received } = recordFlags(page);
    await page.goto("/pools", { waitUntil: "domcontentloaded" });
    await expect.poll(() => received.count).toBeGreaterThan(0);
    const live = current
      .filter((candidate) => (candidate.flagId ? flags[candidate.flagId]?.enabled : candidate.isActive))
      .sort((a, b) => sortTime(b, flags) - sortTime(a, flags) || a.id.localeCompare(b.id));
    test.skip(!live.includes(event), `${event.flagId} is disabled, so ${event.id} is not live`);
    if (live.indexOf(event) < MAX_TOAST_CARDS && event.title) {
      const banner = page.getByTestId("announcement-banner").filter({ hasText: "What's new" });
      // The carousel rotates every 5 seconds through at most four cards.
      await expect(banner.getByTestId("whats-new-slide").getByText(event.title, { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(banner.getByRole("link", { name: "See more" })).toHaveAttribute(
        "href",
        `/announcements?id=${encodeURIComponent(event.id)}`
      );
    }
    await checkLinks(page, request, event, testInfo);
  });
}

test("24.04 24.06 partial (latest config release and listing, possibly retired; Announcements page only): both render and every link lands on its page", async ({
  page,
  request,
}, testInfo) => {
  const { flags } = recordFlags(page);
  await page.goto("/announcements", { waitUntil: "domcontentloaded" });
  // Cards render once every chain's flags have settled.
  await expect(page.locator("[data-announcement-id]").first()).toBeVisible();
  const listed = announcements.filter(
    (event) =>
      !event.requiresOpenPosition &&
      (event.flagId ? flags[event.flagId]?.enabled : event.isActive) &&
      (!event.startDate || time(event.startDate) <= Date.now())
  );
  const release = listed
    .filter((event) => event.id.startsWith("release-"))
    .sort((a, b) => sortTime(b, flags) - sortTime(a, flags))[0];
  const listing = listed
    .filter((event) => event.type === "listing")
    .sort((a, b) => sortTime(b, flags) - sortTime(a, flags))[0];
  expect(release, "a shown release announcement in src/config/events.tsx").toBeDefined();
  expect(listing, "a shown listing announcement in src/config/events.tsx").toBeDefined();
  for (const event of [release, listing]) await checkLinks(page, request, event, testInfo);
});
