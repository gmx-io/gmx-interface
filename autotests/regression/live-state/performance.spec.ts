import { expect } from "@playwright/test";
import { formatPercentage, formatUsd } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "history" });

test("17.02 17.03 live profile: all performance periods match the unmodified indexer response", async ({
  page,
  liveAccount,
  liveAccounts,
}, testInfo) => {
  const responsePromise = page.waitForResponse(
    (response) => {
      if (!response.ok() || response.url() !== liveAccounts.endpoint || response.request().method() !== "POST")
        return false;
      const body = response.request().postDataJSON();
      return body?.query?.includes("accountPnlSummaryStats(") && body?.variables?.account === liveAccount.account;
    },
    { timeout: 60_000 }
  );
  await page.goto(`/traders/${liveAccount.account}`);
  const response = await (await responsePromise).json();
  expect(response.errors).toBeUndefined();
  const rows = response.data.accountPnlSummaryStats as {
    bucketLabel: string;
    volume: string;
    pnlUsd: string;
    pnlBps: string;
    wins: number;
    losses: number;
  }[];
  const labels = {
    today: "Today",
    yesterday: "Yesterday",
    week: "Last 7d",
    month: "Last 30d",
    year: "This year",
    all: "All time",
  };
  expect(rows.map((row) => row.bucketLabel).sort()).toEqual(Object.keys(labels).sort());
  expect(rows.some((row) => BigInt(row.volume) > 0n)).toBe(true);
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "DATE", exact: true }) });
  for (const row of rows) {
    const cells = table
      .getByRole("row")
      .filter({ has: page.getByRole("button", { name: labels[row.bucketLabel as keyof typeof labels], exact: true }) })
      .getByRole("cell");
    await expect(cells.nth(1)).toContainText(formatUsd(BigInt(row.volume), { maxThreshold: null })!);
    await expect(cells.nth(2)).toContainText(formatUsd(BigInt(row.pnlUsd))!);
    await expect(cells.nth(3)).toContainText(formatPercentage(BigInt(row.pnlBps), { signed: true, useCommas: true })!);
    await expect(cells.nth(4)).toHaveText(`${row.wins} / ${row.losses}`);
  }
  await testInfo.attach("live-performance", { body: JSON.stringify(rows), contentType: "application/json" });
  await expect(page.getByTestId("user-address")).toHaveCount(0);
});

test("17.03 live profile: PnL and win-rate tooltips expose the selected period's breakdown", async ({
  page,
  liveAccount,
}) => {
  await page.goto(`/traders/${liveAccount.account}`);
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "DATE", exact: true }) });
  const cells = table
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: "All time", exact: true }) })
    .getByRole("cell");
  await expect(cells.nth(2)).toContainText("$");
  await cells.nth(2).locator(".numbers").first().hover();
  await expect(page.getByText("Realized PnL before fees", { exact: true })).toBeVisible();
  await expect(page.getByText("Fees and impacts", { exact: true })).toBeVisible();
  await cells.first().hover();
  await expect(page.getByText("Fees and impacts", { exact: true })).toBeHidden();
  await cells.nth(3).locator(".numbers").first().hover();
  await expect(page.getByText("Capital used:", { exact: true })).toBeVisible();
  await cells.first().hover();
  await expect(page.getByText("Capital used:", { exact: true })).toBeHidden();
  await cells.nth(4).locator(".numbers").hover();
  await expect(page.getByText("Total trades:", { exact: true })).toBeVisible();
  await expect(page.getByText("Win rate:", { exact: true })).toBeVisible();
});
