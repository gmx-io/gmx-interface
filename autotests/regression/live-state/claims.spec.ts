import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "claims" });

test("10.09 live claims: executed funding claim appears with its explorer link after refresh", async ({
  page,
  liveAccount,
  liveAccounts,
  liveWallet,
}) => {
  await liveWallet.connect(page);
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Claims(?:\s+\d+)?$/ })
    .click();
  const link = page.locator(`.ClaimsHistory-table a[href$="${liveAccount.transactionHash}"]`).first();
  await expect(link).toBeVisible({ timeout: 45_000 });
  await expect(link.locator("xpath=ancestor::tr")).toContainText("Claim funding fees");
  await expect(link).toHaveAttribute(
    "href",
    `https://${liveAccounts.chainId === 42161 ? "arbiscan.io" : "snowtrace.io"}/tx/${liveAccount.transactionHash}`
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(link).toBeVisible({ timeout: 45_000 });
});

test("10.09 live claims: the history lists the on-chain claim and its CSV export includes it", async ({
  page,
  liveAccount,
  liveWallet,
}, testInfo) => {
  await liveWallet.connect(page);
  await page
    .getByTestId("exchange-list-tabs")
    .getByRole("button", { name: /^Claims(?:\s+\d+)?$/ })
    .click();
  await expect(page.locator(`.ClaimsHistory-table a[href$="${liveAccount.transactionHash}"]`).first()).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const modal = page
    .locator(".Modal-content")
    .filter({ has: page.getByText("Export claims history", { exact: true }) });
  const downloadPromise = page.waitForEvent("download");
  await modal.getByRole("button", { name: "GMX Claims CSV", exact: true }).click();
  const download = await downloadPromise;
  expect(await download.failure()).toBeNull();
  const path = testInfo.outputPath("claims.csv");
  await download.saveAs(path);
  const csv = await readFile(path, "utf8");
  expect(csv).toContain(liveAccount.transactionHash!);
  expect(csv).toContain("ClaimFunding");
  expect(csv).not.toMatch(/NaN|Infinity|undefined/);
  await testInfo.attach("claims-export", { path, contentType: "text/csv" });
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
  await expect(link.locator("xpath=ancestor::tr")).toContainText("Claim funding fees");
  await expect(link).toHaveAttribute(
    "href",
    `https://${liveAccounts.chainId === 42161 ? "arbiscan.io" : "snowtrace.io"}/tx/${liveAccount.transactionHash}`
  );
  await expect(page.getByTestId("user-address")).toHaveCount(0);
});
