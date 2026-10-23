import { expect, type BrowserContext, type Page } from "@playwright/test";

import { datedChainAnnouncements } from "../fixtures/announcements";
import { test } from "../fixtures/browser";

const DAY = 24 * 60 * 60 * 1000;

// Live flags with the given overrides, so unrelated KLI switches keep their production values.
async function mockUiFlags(context: BrowserContext, overrides: Record<string, boolean>) {
  await context.route(/\/ui-flags\/v2(?:\?|$)/, async (route) => {
    const live = await route
      .fetch()
      .then((response) => (response.ok() ? response.json() : {}))
      .catch(() => ({}));
    const flags = Object.fromEntries(Object.entries(overrides).map(([name, enabled]) => [name, { enabled }]));
    await route.fulfill({ json: { ...live, ...flags } });
  });
  return overrides;
}

function banner(page: Page, title: string | RegExp) {
  return page.getByTestId("announcement-banner").filter({ hasText: title });
}

test("2.24 the KLI service-disruption banner shows while its flag is on, dismisses for a day, returns after the cooldown and hides when the flag is off", async ({
  page,
  context,
}) => {
  const now = Date.now();
  await page.clock.install({ time: now });
  const flags = await mockUiFlags(context, { showServiceDisruptionBanner: true });
  await page.goto("/pools", { waitUntil: "domcontentloaded" });
  const disruption = banner(page, "Service disruption");
  await expect(disruption).toBeVisible();
  await expect(disruption).toContainText("Trading may be temporarily unavailable");
  await disruption.getByTestId("announcement-banner-close").click();
  await expect(disruption).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => Number(localStorage.getItem("ui-flag-event-dismissed-service-disruption"))))
    .toBeGreaterThanOrEqual(now);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  await expect(disruption).toHaveCount(0);

  await page.clock.setSystemTime(now + DAY + 60_000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(disruption).toBeVisible();

  flags.showServiceDisruptionBanner = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  await expect(page.getByTestId("whats-new-toast-container")).toBeAttached();
  await expect(disruption).toHaveCount(0);
});

test("2.24 a KLI flag-gated listing appears in What's new only while its flag is on", async ({
  page,
  context,
  chainId,
}) => {
  const event = datedChainAnnouncements(chainId)
    .filter((candidate) => candidate.flagId && candidate.title)
    .sort((a, b) => b.start - a.start)[0];
  test.skip(!event, "No flag-gated announcement with a start date targets this chain");
  await page.clock.install({ time: event.start + 60 * 60 * 1000 });
  const flags = await mockUiFlags(context, { [event.flagId!]: true });
  await page.goto("/pools", { waitUntil: "domcontentloaded" });
  const whatsNew = banner(page, "What's new");
  await expect(whatsNew.getByText(event.title!, { exact: true }).last()).toBeAttached();
  await expect(whatsNew.getByRole("link", { name: "See more" })).toBeVisible();

  flags[event.flagId!] = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  await expect(page.getByTestId("whats-new-toast-container")).toBeAttached();
  await expect(page.getByTestId("announcement-banner").getByText(event.title!, { exact: true })).toHaveCount(0);
});

test("2.24 the Update available banner offers a reload for a newer build and its dismissal snoozes it", async ({
  page,
}) => {
  await page.clock.install();
  // A newer build id on the app shell; the debug flag makes the running build "1".
  await page.route(
    (url) => url.pathname === "/",
    async (route) => {
      if (route.request().resourceType() !== "fetch") return route.fallback();
      await route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><meta name="gmx-pwa-build-id" content="2">',
      });
    }
  );
  await page.goto("/pools?appUpdateDebug=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("TVL in vaults and pools", { exact: true })).toBeVisible();
  // An interacted session gets the banner instead of a silent reload.
  await page.keyboard.press("Shift");
  await page.clock.fastForward(6_000);
  const update = banner(page, "Update available");
  await expect(update).toBeVisible();
  await expect(update).toContainText("A new version of GMX is ready");
  await expect(update.getByText("Reload now", { exact: true })).toBeVisible();
  await update.getByTestId("announcement-banner-close").click();
  await expect(update).toHaveCount(0);
  await page.clock.fastForward(12_000);
  await expect(update).toHaveCount(0);
  await page.clock.fastForward(30_000);
  await expect(update).toBeVisible();
});

test("2.24 the wallet-extension connection banner shows in its window and stays dismissed across in-app navigation", async ({
  page,
}) => {
  await page.clock.install({ time: Date.UTC(2026, 7, 3, 18) });
  await page.goto("/pools", { waitUntil: "domcontentloaded" });
  const wallet = banner(page, "Wallet connection");
  await expect(wallet).toBeVisible();
  await expect(wallet).toContainText("Disable and reenable your wallet extension");
  await wallet.getByTestId("announcement-banner-close").click();
  await expect(wallet).toHaveCount(0);
  await page.getByRole("link", { name: "Stats", exact: true }).first().click();
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
  await expect(wallet).toHaveCount(0);
});
