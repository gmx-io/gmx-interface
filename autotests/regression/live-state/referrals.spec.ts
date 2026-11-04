import { expect, type Page } from "@playwright/test";
import { hexToString } from "viem";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "referral" });

test("15.08 live referrals: owned code appears in the affiliate dashboard after refresh", async ({
  page,
  context,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/referrals/affiliates");
  const code = hexToString(liveAccount.code!, { size: 32 });
  const row = await findCodeRow(page, code);
  await expect(row.getByRole("button", { name: "Copy", exact: true })).toBeEnabled();
  await expect(row.getByRole("button", { name: "Share", exact: true })).toBeEnabled();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await row.getByRole("button", { name: "Copy", exact: true }).click();
  const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied.pathname).toBe("/trade/");
  expect(copied.searchParams.get("ref")).toBe(code);
  await row.getByRole("button", { name: "Share", exact: true }).click();
  const share = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Share your referral card", { exact: true }) });
  await expect(share.getByText(code, { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(share).not.toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await findCodeRow(page, code);
});

async function findCodeRow(page: Page, code: string) {
  const table = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "REFERRAL CODE", exact: true }) });
  const firstRow = table.locator("tbody tr").first();
  await expect(firstRow).toBeVisible({ timeout: 60_000 });
  const row = table.getByRole("row").filter({ has: page.getByText(code, { exact: true }) });
  for (let pageNumber = 1; pageNumber <= 40; pageNumber++) {
    if (await row.count()) {
      await expect(row).toBeVisible();
      return row;
    }
    const next = table
      .locator("xpath=ancestor::div[.//div[contains(@class, 'pagination')]][1]")
      .locator(".pagination")
      .getByRole("button")
      .nth(-2);
    if (!(await next.count()) || (await next.isDisabled()) || pageNumber === 40) break;
    const previous = await firstRow.textContent();
    await next.click();
    await expect(firstRow).not.toHaveText(previous!);
  }
  throw new Error(`Registered referral code ${code} is absent from the first 40 dashboard pages`);
}
