import { expect, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { selectNetwork } from "../fixtures/network";

function opportunityNames(page: Page) {
  return page.getByRole("heading", { level: 3 });
}

test("13.02 Earn opportunities follow the network selected in the header (Arbitrum and Avalanche)", async ({
  page,
  chainId,
}) => {
  await page.goto("/earn/additional_opportunities/all");
  const names = opportunityNames(page);
  const expectOpportunities = async (network: "Arbitrum" | "Avalanche") => {
    await expect(page).toHaveURL(/\/earn\/additional_opportunities\/all$/);
    await expect(names.filter({ hasText: /^Beefy$/ })).toBeVisible();
    await expect(names.filter({ hasText: /^DeltaPrime$/ })).toBeVisible();
    // Dolomite and the GM/GLV lending venues are configured only for Arbitrum.
    if (network === "Arbitrum") await expect(names.filter({ hasText: /^Dolomite$/ })).toBeVisible();
    else await expect(names).toHaveText(["Beefy", "DeltaPrime"]);
  };
  const current = chainId === 42161 ? "Arbitrum" : "Avalanche";
  const other = chainId === 42161 ? "Avalanche" : "Arbitrum";
  await expectOpportunities(current);
  await selectNetwork(page, other);
  await expectOpportunities(other);
  await selectNetwork(page, current);
  await expectOpportunities(current);
});

test("13.03 Earn opportunity search matches token names in each opportunity's assets", async ({ page, chainId }) => {
  await page.goto("/earn/additional_opportunities/all");
  const search = page.getByPlaceholder("Search opportunities", { exact: true });
  const names = opportunityNames(page);
  await expect(names.first()).toBeVisible();
  const all = await names.count();
  const cases =
    chainId === 42161
      ? [
          { query: "SOL", shown: ["Dolomite", "Gloop"] },
          { query: "glv", shown: ["Dolomite", "Morpho", "Radiant"] },
        ]
      : [{ query: "GMX", shown: ["Beefy", "DeltaPrime"] }];
  for (const { query, shown } of cases) {
    await search.fill(query);
    await expect(names).toHaveText(shown);
  }
  await search.fill("PEPE-no-such-token");
  await expect(page.getByText("No opportunities match your search", { exact: true })).toBeVisible();
  await search.clear();
  await expect(names).toHaveCount(all);
});
