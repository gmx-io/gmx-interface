import { expect, test } from "@playwright/experimental-ct-react";

import { RewardsTiersSummaryStory } from "./RewardsTiersSummary.ct.stories";

test.describe("RewardsTiersSummary", () => {
  test("renders the two-metric summary with vesting gated", async ({ mount }) => {
    const component = await mount(<RewardsTiersSummaryStory />);

    await expect(component.getByText("All-time Rewards")).toBeVisible();
    await expect(component.getByText("Vestable esGMX")).toBeVisible();
    await expect(component.getByText(/500/)).toBeVisible();
    await expect(component.getByText("Coming soon")).toHaveCount(0);
    await expect(component.getByText("-", { exact: true })).toHaveCount(1);
    await expect(component.getByText("Unavailable", { exact: true })).toHaveCount(0);

    const summaryBox = await component.boundingBox();
    const allTimeBox = await component.getByTestId("rewards-all-time-summary").boundingBox();
    const vestableBox = await component.getByTestId("rewards-vestable-summary").boundingBox();

    expect(summaryBox?.height).toBeCloseTo(60, 0);
    expect(allTimeBox).not.toBeNull();
    expect(vestableBox).not.toBeNull();
    expect(vestableBox!.x).toBeGreaterThan(allTimeBox!.x);
  });

  test("shows indexed token totals in the all-time tooltip", async ({ mount, page }) => {
    const component = await mount(<RewardsTiersSummaryStory />);

    await component.getByRole("button", { name: "All-time Rewards" }).focus();

    await expect(page.getByText("All-time esGMX")).toBeVisible();
    await expect(page.getByText("12 esGMX")).toBeVisible();
    await expect(page.getByText("All-time GT")).toBeVisible();
    await expect(page.getByText("150 GT")).toBeVisible();
  });

  for (const summaryState of ["disconnected", "loading", "unavailable"] as const) {
    test(`disables the all-time breakdown while the summary is ${summaryState}`, async ({ mount, page }) => {
      const component = await mount(<RewardsTiersSummaryStory summaryState={summaryState} />);

      await expect(component.getByRole("button", { name: "All-time Rewards" })).toBeDisabled();

      await expect(page.getByText("All-time esGMX")).toHaveCount(0);
      await expect(page.getByText("0 esGMX", { exact: true })).toHaveCount(0);
      await expect(page.getByText("0 GT", { exact: true })).toHaveCount(0);
    });
  }

  test("stacks summary metrics at a mobile viewport", async ({ mount, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const component = await mount(<RewardsTiersSummaryStory />);

    const allTimeBox = await component.getByTestId("rewards-all-time-summary").boundingBox();
    const vestableBox = await component.getByTestId("rewards-vestable-summary").boundingBox();

    expect(allTimeBox).not.toBeNull();
    expect(vestableBox).not.toBeNull();
    expect(vestableBox!.y).toBeGreaterThan(allTimeBox!.y);
  });
});
