import { expect, type Locator, type Page } from "@playwright/test";

export async function openTrade(page: Page) {
  await page.goto("/trade");
  await expect(page.getByTestId("margin-input")).toBeVisible();
  await expect(page.getByTestId("margin-collateral-selector")).toContainText(/USDC|ETH|AVAX/);
}

export async function selectTradeDirection(page: Page, direction: "Long" | "Short" | "Swap") {
  if (direction === "Swap") {
    await page.getByTestId("trade-direction-swap").click();
    return;
  }
  await page.getByTestId("trade-direction").getByRole("button", { name: direction, exact: true }).click();
}

export async function selectTradeMode(page: Page, mode: "Market" | "Limit" | "Stop Market" | "TWAP") {
  const tabs = page.getByTestId("trade-mode");
  const button = tabs.getByRole("button", { name: mode, exact: true });
  if (mode === "Market" || mode === "Limit" || (await button.count())) {
    await button.click();
    return;
  }
  await tabs.getByRole("button", { name: /^(More|Stop Market|TWAP)$/ }).click();
  await page.getByRole("menuitem", { name: mode, exact: true }).click();
}

export async function openMarketSelector(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: /\/USD/ }).click();
  await expect(page.getByPlaceholder("Search market", { exact: true })).toBeVisible();
}

export async function selectMarket(page: Page, symbol: string) {
  await openMarketSelector(page);
  await page.getByPlaceholder("Search market", { exact: true }).fill(symbol);
  await page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: "LAST PRICE", exact: true }) })
    .getByRole("row")
    .filter({ has: page.getByText(`${symbol}/USD`, { exact: true }) })
    .click();
  await expect(page.getByRole("banner").getByRole("button", { name: new RegExp(`${symbol}/USD`) })).toBeVisible();
  await expect(page.getByPlaceholder("Search market", { exact: true })).toBeHidden();
}

export async function inputNumber(input: Locator) {
  return Number((await input.inputValue()).replaceAll(",", ""));
}

export function labelledInput(scope: Locator, label: string) {
  return scope
    .locator("div")
    .filter({ has: scope.page().getByText(label, { exact: true }) })
    .filter({ has: scope.page().getByRole("textbox") })
    .last()
    .getByRole("textbox");
}

export async function openSettings(page: Page, tab: "Trading" | "Display" = "Trading") {
  await page.getByRole("button", { name: "Settings", exact: true }).first().click();
  const modal = page.getByTestId("settings-modal");
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: `${tab} settings`, exact: true }).click();
  return modal;
}

export async function setSettingsToggle(modal: Locator, label: string, enabled: boolean) {
  const toggle = modal
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'inline-flex')][1]")
    .locator("div.cursor-pointer");
  const current = (await toggle.getAttribute("class"))!.includes("bg-blue-400");
  if (current !== enabled) await toggle.click();
  if (enabled) await expect(toggle).toHaveClass(/bg-blue-400/);
  else await expect(toggle).not.toHaveClass(/bg-blue-400/);
}

// A label/value row such as SyntheticsInfoRow ("Leverage", "Network fee", "Minimum receive").
export function infoRow(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
}

export async function displayedNumbers(locator: Locator) {
  return [...(await locator.innerText()).replaceAll(",", "").matchAll(/\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0])
  );
}
