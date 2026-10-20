import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

import { test } from "../fixtures/accountState";
import { mockPnlHistory } from "../fixtures/pnlHistory";

const DAY = 86_400;

// The chart buckets by UTC day, Monday-based UTC week or UTC month and labels a bucket by its first point.
function buckets(timestamps: number[], grouping: "Daily" | "Weekly" | "Monthly") {
  const firstPoints = new Map<number, number>();
  for (const timestamp of timestamps) {
    const date = new Date(timestamp * 1000);
    const key =
      grouping === "Daily"
        ? timestamp
        : grouping === "Weekly"
          ? timestamp - ((date.getUTCDay() + 6) % 7) * DAY
          : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    if (!firstPoints.has(key)) firstPoints.set(key, timestamp);
  }
  return [...firstPoints.values()];
}

function axisLabel(timestamp: number, grouping: "Daily" | "Weekly" | "Monthly") {
  const date = new Date(timestamp * 1000);
  if (grouping === "Monthly") return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function tooltipPnl(page: Page) {
  return page.locator(".recharts-tooltip-wrapper .Tooltip-row").filter({ hasText: /^PnL/ });
}

test("17.04 17.05 17.08 mocked PnL history regroups into daily, weekly and monthly bars and keeps the last period label", async ({
  page,
  context,
  accountState,
}) => {
  const history = await mockPnlHistory(context, accountState.address);
  await page.goto(`/traders/${accountState.address}`);
  const chart = page.locator(".recharts-wrapper").filter({ has: page.locator(".recharts-bar") });
  await expect(chart).toBeVisible();
  const { from, to } = history.requests.at(-1)!;
  const shown = history.rows
    .map((row) => row.timestamp)
    .filter((timestamp) => (from === undefined || timestamp >= from) && (to === undefined || timestamp <= to));
  const counts: number[] = [];
  for (const grouping of ["Daily", "Weekly", "Monthly"] as const) {
    await page
      .getByText(/^(Daily|Weekly|Monthly)$/)
      .first()
      .click();
    await page.getByText(grouping, { exact: true }).last().click();
    await expect(page.getByText(grouping, { exact: true })).toBeVisible();
    const expected = buckets(shown, grouping);
    counts.push(expected.length);
    await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(expected.length);
    const ticks = chart.locator(".recharts-xAxis .recharts-cartesian-axis-tick-value");
    await expect(ticks.last()).toHaveText(axisLabel(expected.at(-1)!, grouping));
    const last = await ticks.last().boundingBox();
    const bounds = await chart.boundingBox();
    expect(last).not.toBeNull();
    expect(bounds).not.toBeNull();
    expect(last!.x + last!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
    await expect(chart).not.toContainText(/NaN|Infinity|undefined/);
  }
  expect(new Set(counts).size).toBe(3);
});

test("17.06 17.07 a performance day applies a UTC single-day range showing that day's PnL; a quiet day shows $0.00", async ({
  page,
  context,
  accountState,
}) => {
  const history = await mockPnlHistory(context, accountState.address, { quietDaysAgo: [1] });
  await page.goto(`/traders/${accountState.address}`);
  const chart = page.locator(".recharts-wrapper").filter({ has: page.locator(".recharts-bar") });
  await expect(page.locator(".recharts-bar").first()).toBeVisible();
  // The mocked history loses $3 today and has no trades yesterday.
  for (const { day, from, pnl } of [
    { day: "Today", from: history.today, pnl: /^PnL:?\s*-\$\s*3\.00$/ },
    { day: "Yesterday", from: history.today - DAY, pnl: /^PnL:?\s*\$\s*0\.00$/ },
  ]) {
    await page.getByRole("button", { name: day, exact: true }).click();
    await expect.poll(() => history.requests.at(-1)).toEqual({ from, to: from + DAY - 1 });
    await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(1);
    await chart.hover();
    const date = new Date(from * 1000);
    const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    await expect(page.locator(".recharts-tooltip-wrapper")).toContainText(
      `${String(date.getUTCDate()).padStart(2, "0")} ${month} ${date.getUTCFullYear()}`
    );
    await expect(tooltipPnl(page)).toHaveText(pnl);
    await page.getByRole("banner").hover();
  }
});

test("17.07 an account without trades shows No data available, and a single day of it shows $0.00", async ({
  page,
  context,
  accountState,
}) => {
  const history = await mockPnlHistory(context, accountState.address, { noTrades: true });
  await page.goto(`/traders/${accountState.address}`);
  await expect(page.getByText("No data available", { exact: true })).toBeVisible();
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(0);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect.poll(() => history.requests.at(-1)).toEqual({ from: history.today, to: history.today + DAY - 1 });
  await expect(page.getByText("No data available", { exact: true })).toBeHidden();
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(1);
  await page
    .locator(".recharts-wrapper")
    .filter({ has: page.locator(".recharts-bar") })
    .hover();
  await expect(tooltipPnl(page)).toHaveText(/^PnL:?\s*\$\s*0\.00$/);
});

test("17.17 chart export downloads a nonempty PNG image", async ({ page, context, accountState }, testInfo) => {
  await mockPnlHistory(context, accountState.address);
  await page.goto(`/traders/${accountState.address}`);
  await expect(page.locator(".recharts-bar").first()).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("daily-and-cumulative-pnl.png");
  const path = testInfo.outputPath("pnl-export.png");
  await download.saveAs(path);
  const image = await readFile(path);
  expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(image.readUInt32BE(16)).toBeGreaterThan(300);
  expect(image.readUInt32BE(20)).toBeGreaterThan(100);
  expect(image.length).toBeGreaterThan(5000);
  await testInfo.attach("pnl-export", { path, contentType: "image/png" });
});
