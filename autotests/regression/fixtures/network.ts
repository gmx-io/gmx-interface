import { expect, type Page } from "@playwright/test";

export async function selectNetwork(page: Page, network: "Arbitrum" | "Avalanche") {
  await page.getByTestId("networks-dropdown-handle").click();
  await page.getByTestId(`networks-dropdown-${network}`).click();
  await expect(page.getByRole("banner").getByRole("button", { name: network, exact: true })).toBeVisible();
}
