import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { readRegressionIndexers } from "../fixtures/deploymentConfig";
import { displayedNumber } from "../fixtures/displayedNumber";

type PnlSummaryRow = { bucketLabel: string; pnlUsd: string };

test("17.16 trader profile network buttons show each chain's indexed performance for a leaderboard trader", async ({
  page,
}) => {
  test.slow();
  await page.goto("/leaderboard");
  const link = page.getByRole("table").locator('a[href*="/traders/"]').first();
  await expect(link).toBeVisible({ timeout: 30_000 });
  const address = (await link.getAttribute("href"))!.match(/0x[\da-fA-F]{40}/)![0];
  const { endpoints } = readRegressionIndexers();
  const summaries = new Map<string, PnlSummaryRow[]>();
  page.on("response", async (response) => {
    const body = response.request().postData() ?? "";
    if (!response.ok() || !body.includes("accountPnlSummaryStats") || !body.includes(address)) return;
    const json = await response.json().catch(() => undefined);
    if (json?.data?.accountPnlSummaryStats) summaries.set(response.url(), json.data.accountPnlSummaryStats);
  });
  await page.goto(`/traders/${address}`);
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "DATE", exact: true }) });
  const allTime = table.getByRole("row").filter({ has: page.getByRole("button", { name: "All time", exact: true }) });
  for (const { name, slug, key } of [
    { name: "Avalanche", slug: "avalanche", key: "[AVALANCHE]" },
    { name: "Arbitrum", slug: "arbitrum", key: "[ARBITRUM]" },
  ]) {
    await page.locator(`a[href*="/traders/${address}?network=${slug}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/traders/${address}\\?network=${slug}&v=2$`));
    await expect(page.getByText(`${name} data`, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(address, { exact: true })).toBeVisible();
    const endpoint = endpoints.get(key)!;
    await expect.poll(() => summaries.has(endpoint), { timeout: 30_000 }).toBe(true);
    const all = summaries.get(endpoint)!.find((row) => row.bucketLabel === "all");
    if (!all) {
      await expect(allTime).toHaveCount(0);
      continue;
    }
    const expected = Number(BigInt(all.pnlUsd) / 10n ** 28n) / 100;
    await expect
      .poll(async () => Math.abs(displayedNumber(await allTime.getByRole("cell").nth(2).innerText()) - expected))
      .toBeLessThanOrEqual(0.011);
  }
  await page.reload();
  await expect(page).toHaveURL(/network=arbitrum/);
  await expect(page.getByText("Arbitrum data", { exact: true }).first()).toBeVisible();
});
