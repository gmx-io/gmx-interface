import { expect, test } from "@playwright/experimental-ct-react";

import { RewardsTiersSummaryStory } from "./RewardsTiersSummary.ct.stories";

test.describe("RewardsTiersSummary", () => {
  test("shows indexed token totals in the all-time tooltip", async ({ mount, page }) => {
    const component = await mount(<RewardsTiersSummaryStory />);

    await component.getByRole("button", { name: "All-time Rewards" }).focus();

    await expect(page.getByText("All-time esGMX")).toBeVisible();
    await expect(page.getByText("12 esGMX")).toBeVisible();
    await expect(page.getByText("All-time GT")).toBeVisible();
    await expect(page.getByText("150 GT")).toBeVisible();
  });

  test("hides account totals while disconnected", async ({ mount }) => {
    const component = await mount(<RewardsTiersSummaryStory summaryState="disconnected" />);

    await expect(component.getByRole("button", { name: "All-time Rewards" })).toHaveCount(0);
    await expect(component.getByText("Current Multiplier")).toHaveCount(0);
    await expect(component.getByText("Vestable esGMX")).toHaveCount(0);
  });

  for (const summaryState of ["loading", "unavailable"] as const) {
    test(`disables the all-time breakdown while the summary is ${summaryState}`, async ({ mount, page }) => {
      const component = await mount(<RewardsTiersSummaryStory summaryState={summaryState} />);

      await expect(component.getByRole("button", { name: "All-time Rewards" })).toBeDisabled();

      await expect(page.getByText("All-time esGMX")).toHaveCount(0);
      await expect(page.getByText("0 esGMX", { exact: true })).toHaveCount(0);
      await expect(page.getByText("0 GT", { exact: true })).toHaveCount(0);
    });
  }
});
