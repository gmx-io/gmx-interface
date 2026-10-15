import { expect, test } from "@playwright/experimental-ct-react";

import { RewardsTiersSummaryStory } from "./RewardsTiersSummary.ct.stories";

test.describe("RewardsTiersSummary", () => {
  test("shows the current multiplier with its label and cap tooltip", async ({ mount, page }) => {
    const component = await mount(<RewardsTiersSummaryStory />);

    await expect(component.getByText("Current multiplier")).toBeVisible();
    await expect(component.getByText("1.75x")).toHaveClass(/text-h1/);
    await expect(component.getByText("1.75x")).toHaveClass(/text-green-500/);
    await expect(component.getByText("1.75x")).toHaveClass(/dark:text-green-300/);
    await expect(component.getByTestId("multiplier-transition-arrow")).toHaveCount(0);

    await component.getByText("Current multiplier").hover();

    await expect(
      page.getByText(
        "Your reward multiplier combines your volume tier, staking tier, and applicable activity boosts. The total multiplier is capped at 5x."
      )
    ).toBeVisible();
  });

  test("hides the multiplier while disconnected", async ({ mount }) => {
    const component = await mount(<RewardsTiersSummaryStory statusState="disconnected" />);

    await expect(component.getByText("Current multiplier")).toHaveCount(0);
    await expect(component.getByTestId("rewards-current-multiplier")).toHaveCount(0);
  });

  test("shows the restored multiplier transition using the summary colors", async ({ mount, page }) => {
    const component = await mount(<RewardsTiersSummaryStory projectedMultiplier={215n} />);

    await expect(component.getByText("1.75x")).toHaveClass(/text-green-500/);
    await expect(component.getByText("2.15x")).toHaveClass(/text-blue-700/);
    await expect(component.getByText("2.15x")).toHaveClass(/dark:text-blue-100/);
    await expect(component.getByTestId("multiplier-transition-arrow")).toHaveClass(/size-16/);
    await expect(component.getByTestId("multiplier-transition-arrow")).toHaveClass(/rounded-full/);

    await component.getByTestId("multiplier-transition-arrow").hover();

    await expect(page.getByText("Your multiplier will increase next epoch.")).toBeVisible();
    await expect(page.getByText("Due to changes in your volume and staking tiers.")).toBeVisible();
  });

  test("explains a projected multiplier decrease", async ({ mount, page }) => {
    const component = await mount(<RewardsTiersSummaryStory projectedMultiplier={135n} />);

    await expect(component.getByText("1.35x")).toHaveClass(/text-blue-700/);

    await component.getByTestId("multiplier-transition-arrow").hover();

    await expect(page.getByText("Your multiplier will decrease next epoch.")).toBeVisible();
  });

  test("shows an inactive multiplier in blue", async ({ mount }) => {
    const component = await mount(<RewardsTiersSummaryStory currentMultiplier={0n} />);

    await expect(component.getByText("0x")).toHaveClass(/text-blue-700/);
    await expect(component.getByText("0x")).toHaveClass(/dark:text-blue-100/);
  });

  for (const [statusState, placeholder] of [
    ["loading", "…"],
    ["unavailable", "-"],
  ] as const) {
    test(`shows a placeholder instead of the multiplier while the status is ${statusState}`, async ({ mount }) => {
      const component = await mount(<RewardsTiersSummaryStory statusState={statusState} />);

      await expect(component.getByText("Current multiplier")).toBeVisible();
      await expect(component.getByText(placeholder, { exact: true })).toBeVisible();
      await expect(component.getByText("1.75x")).toHaveCount(0);
    });
  }
});
