import { expect } from "@playwright/test";
import { test } from "../base";

test.describe("Should navigate across all pages with no crashes", () => {
  test.describe.configure({ retries: 2 });
  test.afterEach(async ({ gmx }) => {
    await gmx.page.close();
  });

  test("/trade", async ({ gmx }) => {
    await gmx.navigateTo("/trade");
    await gmx.tradebox.root.waitForSelector();
    expect(gmx.tradebox.root).toBeAttached();
  });

  test("/dashboard", async ({ gmx }) => {
    await gmx.navigateTo("/dashboard");
    await gmx.dashboardPage.waitForSelector();
    expect(gmx.dashboardPage).toBeAttached();
  });

  test("/earn", async ({ gmx }) => {
    await gmx.navigateTo("/earn");
    await gmx.earnPage.waitForSelector();
    expect(gmx.earnPage).toBeAttached();
  });

  test("/leaderboard", async ({ gmx }) => {
    await gmx.navigateTo("/leaderboard");
    await gmx.leaderboardPage.waitForSelector();
    expect(gmx.leaderboardPage).toBeAttached();
  });

  test("/ecosystem", async ({ gmx }) => {
    await gmx.navigateTo("/ecosystem");
    await gmx.ecosystemPage.waitForSelector();
    expect(gmx.ecosystemPage).toBeAttached();
  });

  test("/buy_glp", async ({ gmx }) => {
    await gmx.navigateTo("/buy_glp");
    await gmx.buyGlpPage.waitForSelector();
    expect(gmx.buyGlpPage).toBeAttached();
  });

  test("/buy", async ({ gmx }) => {
    await gmx.navigateTo("/buy");
    await gmx.buyPage.waitForSelector();
    expect(gmx.buyPage).toBeAttached();
  });

  test("/pools", async ({ gmx }) => {
    await gmx.navigateTo("/pools");
    await gmx.poolsPage.waitForSelector();
    expect(gmx.poolsPage).toBeAttached();
  });

  test("/referrals", async ({ gmx }) => {
    await gmx.navigateTo("/referrals");
    await gmx.referralsPage.waitForSelector();
    expect(gmx.referralsPage).toBeAttached();
  });

  test("open settings modal", async ({ gmx }) => {
    await gmx.navigateTo("/trade");
    await gmx.openSettings();
    await gmx.settings.modal.root.waitForSelector();
    expect(await gmx.settings.modal.root).toBeAttached();
  });
});
