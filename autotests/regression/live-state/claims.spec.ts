import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "claims" });

test("10.09 live claims: executed funding claim appears with its explorer link after refresh and the CSV export includes it", async ({
  page,
  liveAccount,
  liveAccounts,
  liveWallet,
}, testInfo) => {
  await liveWallet.connect(page);
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Claims(?:\s+\d+)?$/ })
    .click();
  const link = page.locator(`.ClaimsHistory-table a[href$="${liveAccount.transactionHash}"]`).first();
  await expect(link).toBeVisible({ timeout: 45_000 });
  await expect(link.locator("xpath=ancestor::tr")).toContainText("Claimed funding fees");
  await expect(link).toHaveAttribute(
    "href",
    `https://${liveAccounts.chainId === 42161 ? "arbiscan.io" : "snowtrace.io"}/tx/${liveAccount.transactionHash}`
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const modal = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Export claims history", { exact: true }) });
  const downloadPromise = page.waitForEvent("download");
  await modal.getByRole("button", { name: "GMX claims CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const path = testInfo.outputPath("claims.csv");
  await download.saveAs(path);
  const csv = await readFile(path, "utf8");
  expect(csv).toContain(liveAccount.transactionHash!);
  expect(csv).toContain("ClaimFunding");
  expect(csv).not.toMatch(/NaN|Infinity|undefined/);
  await testInfo.attach("claims-export", { path, contentType: "text/csv" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(link).toBeVisible({ timeout: 45_000 });
});

test("17.15 live profile: Claims tab lists the account's indexed funding claim without a wallet", async ({
  page,
  liveAccount,
  liveAccounts,
}) => {
  await page.goto(`/traders/${liveAccount.account}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Claims", exact: true }).click();
  const link = page.locator(`.ClaimsHistory-table a[href$="${liveAccount.transactionHash}"]`).first();
  await expect(link).toBeVisible({ timeout: 45_000 });
  await expect(link.locator("xpath=ancestor::tr")).toContainText("Claimed funding fees");
  await expect(link).toHaveAttribute(
    "href",
    `https://${liveAccounts.chainId === 42161 ? "arbiscan.io" : "snowtrace.io"}/tx/${liveAccount.transactionHash}`
  );
  await expect(page.getByTestId("user-address")).toHaveCount(0);
});
