import { expect } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";

const emptyAccount = "0x1000000000000000000000000000000000000001";

test("17.02 public trader profile loads logged out with empty lists and no wallet controls", async ({ page }) => {
  await page.goto(`/traders/${emptyAccount}`);
  await expect(page.getByRole("heading", { name: "Trader Profile", exact: true })).toBeVisible();
  for (const { tab, empty } of [
    { tab: "Positions", empty: "No open positions" },
    { tab: "Orders", empty: "No open orders" },
    { tab: "Trades", empty: "No trades yet" },
    { tab: "Claims", empty: "No claims yet" },
  ]) {
    await page.getByRole("button", { name: new RegExp(`^${tab}(?:\\s+0)?$`) }).click();
    await expect(page.getByText(empty, { exact: true })).toBeVisible();
    await expect(page.getByTestId("position-close-button")).toHaveCount(0);
    await expect(page.getByTestId("position-edit-button")).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByText("No claims yet", { exact: true })).toBeVisible();
});

test("16.05 leaderboard position rankings list sized positions and switch back to addresses", async ({ page }) => {
  test.slow();
  await page.goto("/leaderboard");
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await page.getByRole("button", { name: "Top positions", exact: true }).click();
  await expect(table.getByRole("columnheader", { name: "SIZE", exact: true })).toBeVisible();
  await expect
    .poll(
      async () => {
        const rows = await table
          .locator("tbody tr")
          .evaluateAll((elements) =>
            elements.map((row) => Array.from(row.querySelectorAll("td"), (cell) => cell.innerText.trim()))
          );
        return rows.filter(
          ([, address, , position, , size]) =>
            /0x[\da-fA-F]+/.test(address) && /\/USD\s*(Long|Short)$/.test(position) && displayedNumber(size) > 0
        ).length;
      },
      { timeout: 60_000 }
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Top addresses", exact: true }).click();
  await expect(table.getByRole("columnheader", { name: "SIZE", exact: true })).toBeHidden();
  await expect(table).toBeVisible();
});

test("leaderboard address search recovers from no matching trader", async ({ page }) => {
  await page.goto("/leaderboard");
  const search = page.getByPlaceholder("Search address", { exact: true });
  const table = page.getByRole("table");
  await expect(table.locator('a[href*="/traders/"]').first()).toBeVisible({ timeout: 30_000 });
  await search.fill(emptyAccount);
  await expect(table).toContainText(/No (?:traders|accounts|data|results)/i);
  await search.clear();
  await expect(table.locator('a[href*="/traders/"]').first()).toBeVisible();
});
