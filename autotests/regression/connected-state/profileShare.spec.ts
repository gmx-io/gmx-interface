import { expect } from "@playwright/test";
import { getAddress } from "viem";

import { test } from "../fixtures/accountState";
import { mockPnlHistory } from "../fixtures/pnlHistory";

const SHARE_ID = "regression-share-card";

test("17.18 own profile Share PnL copies a share link and opens an X intent; the card upload is intercepted", async ({
  page,
  context,
  accountState,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockPnlHistory(context, accountState.address);
  // The share card needs the summary row of the selected period (all time by default).
  await page.route("**/*", async (route) => {
    let body: { query?: string; variables?: { account?: string } } | undefined;
    try {
      body = route.request().method() === "POST" ? route.request().postDataJSON() : undefined;
    } catch {
      return route.fallback();
    }
    if (
      !body?.query?.includes("accountPnlSummaryStats") ||
      !body.variables?.account ||
      getAddress(body.variables.account) !== accountState.address
    )
      return route.fallback();
    const row = (bucketLabel: string) => ({
      bucketLabel,
      wins: 7,
      losses: 3,
      pnlBps: "1250",
      pnlUsd: (1234n * 10n ** 30n).toString(),
      volume: (50_000n * 10n ** 30n).toString(),
      winsLossesRatioBps: "7000",
      usedCapitalUsd: (10_000n * 10n ** 30n).toString(),
    });
    await route.fulfill({
      json: { data: { accountPnlSummaryStats: ["today", "yesterday", "week", "month", "year", "all"].map(row) } },
    });
  });
  // Nothing may be published: uploads get a fake image id and X is never loaded.
  const uploads: number[] = [];
  await page.route(/\/api\/upload$/, async (route) => {
    uploads.push(route.request().postDataBuffer()?.length ?? 0);
    await route.fulfill({ json: { id: SHARE_ID } });
  });
  await context.route(/^https:\/\/(?:twitter|x)\.com\//, (route) => route.fulfill({ body: "" }));

  await accountState.connect(page, `/traders/${accountState.address}`);
  await page.getByRole("button", { name: "Share PnL", exact: true }).click();
  const modal = page.locator(".Modal-content").filter({ hasText: "Share your PnL" });
  const copyLink = modal.getByRole("button", { name: "Copy link", exact: true });
  await expect(copyLink).toBeEnabled({ timeout: 30_000 });
  await expect(modal).toContainText(
    /\+\s*12\.50%\s*\+\$\s*1,234\.00\s*Period\s*All time\s*Win rate\s*70\.00%\s*Trades\s*10/
  );
  // Once the account is known to have no referral code, the first click offers to create one instead of sharing.
  await expect(modal.getByText("Earn rewards by sharing your code!", { exact: true })).toBeVisible();
  await copyLink.click();
  await expect(modal.getByText("Skip creating a referral code?", { exact: true })).toBeVisible();
  expect(uploads).toEqual([]);
  await copyLink.click();
  await expect(page.getByText("Link copied to clipboard", { exact: true })).toBeVisible();
  expect(uploads).toHaveLength(1);
  expect(uploads[0]).toBeGreaterThan(1000);
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(new RegExp(`^https://[^/]+/api/s\\?id=${SHARE_ID}$`));

  const popup = page.waitForEvent("popup");
  await modal.getByRole("button", { name: /Share on/ }).click();
  const intent = new URL((await popup).url());
  expect(intent.hostname).toBe("twitter.com");
  expect(intent.pathname).toBe("/intent/tweet");
  expect(intent.searchParams.get("url")).toBe(link);
  expect(uploads).toHaveLength(2);
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
