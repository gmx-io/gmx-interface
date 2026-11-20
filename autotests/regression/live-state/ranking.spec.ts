import { expect } from "@playwright/test";
import { test } from "../fixtures/liveWallet";

test.use({ liveProfile: "ranked" });

test("16.04 live leaderboard: the connected ranked account is pinned and survives refresh", async ({
  page,
  liveAccount,
  liveWallet,
}) => {
  // Until the account's stats load, e.g. after a failed indexer request, the pinned row has no rank and reads N/A.
  const accountStats = page.waitForResponse(
    (response) => {
      if (response.request().method() !== "POST" || !response.ok()) return false;
      let body;
      try {
        body = response.request().postDataJSON();
      } catch {
        // other POSTs, such as analytics beacons, are not JSON
        return false;
      }
      return (
        body?.operationName === "PeriodAccountStats" &&
        body.variables.from === 0 &&
        body.variables.account === liveAccount.account
      );
    },
    { timeout: 90_000 }
  );
  await liveWallet.connect(page, "/leaderboard");
  const row = page.locator("tr").filter({ has: page.locator(".LeaderboardRankCell-Pinned") });
  const link = row.locator(`a[href*="/traders/${liveAccount.account}"]`);
  await expect(link).toBeVisible({ timeout: 45_000 });
  await accountStats;
  await expect(row.getByRole("cell").first()).toContainText(/\d/);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("user-address")).toBeVisible({ timeout: 45_000 });
  await expect(link).toBeVisible({ timeout: 45_000 });
});
