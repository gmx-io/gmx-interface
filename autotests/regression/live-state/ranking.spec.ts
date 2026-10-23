import { expect } from "@playwright/test";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "ranked" });

test("16.04 live leaderboard: the connected ranked account is pinned and survives refresh", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  await liveWallet.connect(page, "/leaderboard");
  const row = page.locator("tr").filter({ has: page.locator(".LeaderboardRankCell-Pinned") });
  const link = row.locator(`a[href*="/traders/${liveAccount.account}"]`);
  await expect(link).toBeVisible({ timeout: 45_000 });
  await expect(row.getByRole("cell").first()).toContainText(/\d/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  await expect(link).toBeVisible({ timeout: 45_000 });
});
