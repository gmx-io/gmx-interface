import { expect, type Locator } from "@playwright/test";
import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";

async function values(table: Locator, column: number) {
  const rows = table.locator("tbody tr").filter({ has: table.page().locator('a[href*="/traders/"]') });
  const texts = await rows.evaluateAll(
    (elements, index) => elements.map((row) => row.querySelectorAll("td")[index].textContent!),
    column
  );
  return texts.map(displayedNumber);
}

for (const period of ["Total", "Last 30d", "Last 7d"]) {
  test(`16.01 16.03 16.06 leaderboard ${period}: real rankings open the selected trader's profile`, async ({
    page,
  }) => {
    const days = { Total: 0, "Last 30d": 30, "Last 7d": 7 }[period]!;
    const request = page.waitForRequest((request) => {
      if (request.method() !== "POST") return false;
      let body;
      try {
        body = request.postDataJSON();
      } catch {
        // other POSTs, such as analytics beacons, are not JSON
        return false;
      }
      return body?.operationName === "PeriodAccountStats" && (body.variables.from === 0) === (days === 0);
    });
    await page.goto("/leaderboard");
    await page.getByRole("button", { name: period, exact: true }).click();
    const { from } = (await request).postDataJSON().variables;
    if (days) expect(Math.abs(Date.now() / 1000 - days * 86_400 - from)).toBeLessThan(2 * 86_400);
    const table = page.getByRole("table");
    const link = table.locator('a[href*="/traders/"]').first();
    await expect(link).toBeVisible({ timeout: 30_000 });
    const href = await link.getAttribute("href");
    const address = href!.match(/0x[\da-fA-F]{40}/)![0];
    await page.getByPlaceholder("Search address").fill(address);
    await expect(table.locator('a[href*="/traders/"]')).toHaveCount(1);
    await expect(link).toHaveAttribute("href", href!);
    const popupPromise = page.waitForEvent("popup");
    await link.click();
    const profile = await popupPromise;
    try {
      await expect(profile).toHaveURL(new RegExp(`/traders/${address}`));
      await expect(profile.getByRole("heading", { name: "Trader profile", exact: true })).toBeVisible();
    } finally {
      await profile.close();
    }
  });
}

for (const metric of [
  { title: "PNL ($)", column: 2, initiallyDescending: true },
  { title: "PNL (%)", column: 3 },
  { title: "AVG. SIZE", column: 4 },
]) {
  test(`16.02 leaderboard sorts ${metric.title} in both directions`, async ({ page }) => {
    await page.goto("/leaderboard");
    const table = page.getByRole("table");
    await expect(table.locator('a[href*="/traders/"]').nth(1)).toBeVisible({ timeout: 30_000 });
    const sort = table.getByRole("button", { name: metric.title, exact: true });
    if (!metric.initiallyDescending) await sort.click();
    await expect
      .poll(async () => {
        const numbers = await values(table, metric.column);
        return numbers.length > 1 && numbers.every((n, i) => Number.isFinite(n) && (i === 0 || numbers[i - 1] >= n));
      })
      .toBe(true);
    await sort.click();
    await expect
      .poll(async () => {
        const numbers = await values(table, metric.column);
        return numbers.length > 1 && numbers.every((n, i) => Number.isFinite(n) && (i === 0 || numbers[i - 1] <= n));
      })
      .toBe(true);
  });
}
