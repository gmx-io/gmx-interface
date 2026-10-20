import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";

import { bigintToNumber } from "../../../sdk/src/utils/numbers/utils";
import { displayedNumber } from "./displayedNumber";

export type ApiMarket = Record<string, string | boolean> & {
  name: string;
  marketTokenAddress: string;
  isDisabled: boolean;
};

const apiHosts: Record<number, string> = { 42161: "arbitrum", 43114: "avalanche" };

export function watchMarketsApi(page: Page, chainId: number) {
  const api: { origin?: string; config?: ApiMarket[]; values?: ApiMarket[]; valuesResponses: number } = {
    valuesResponses: 0,
  };
  page.on("response", async (response) => {
    const url = new URL(response.url());
    const kind = /\/v1\/markets\/(config|values)$/.exec(url.pathname)?.[1];
    if (!kind || !response.ok() || !url.hostname.startsWith(apiHosts[chainId])) return;
    const json = await response.json().catch(() => undefined);
    if (!Array.isArray(json)) return;
    api.origin = url.origin;
    if (kind === "config") api.config = json;
    else {
      api.values = json;
      api.valuesResponses++;
    }
  });
  return api;
}

export async function fetchMarketsInfo(request: APIRequestContext, origin: string) {
  const response = await request.get(`${origin}/v1/markets/info`);
  expect(response.ok(), `${origin}/v1/markets/info`).toBe(true);
  return (await response.json()) as ApiMarket[];
}

export function factor(value: string | boolean) {
  return bigintToNumber(BigInt(value), 30);
}

export function findMarket(markets: ApiMarket[] | undefined, name: string) {
  const market = markets?.find((m) => m.name === name && !m.isDisabled);
  expect(market, `API market ${name}`).toBeDefined();
  return market!;
}

export function findValues(values: ApiMarket[] | undefined, market: ApiMarket) {
  const found = values?.find((m) => m.marketTokenAddress === market.marketTokenAddress);
  expect(found, `API values for ${market.name}`).toBeDefined();
  return found!;
}

export async function selectedMarketName(page: Page) {
  const text = await page.getByRole("banner").getByRole("button", { name: /\/USD/ }).innerText();
  const [, index, pool] = /(\S+\/USD)\s*\[([^\]]+)\]/.exec(text)!;
  return `${index} [${pool}]`;
}

export function headerPrice(page: Page) {
  return page
    .getByRole("banner")
    .getByText(/^\$\s*[\d,]+\.\d+$/)
    .first();
}

export async function headerPriceValue(page: Page) {
  return displayedNumber(await headerPrice(page).innerText());
}

export function infoRowValue(scope: Locator, label: string | RegExp) {
  return scope
    .getByText(label, { exact: true })
    .first()
    .locator("xpath=ancestor::div[contains(concat(' ', @class, ' '), ' justify-between ')][1]/div[last()]");
}

export async function openTooltip(page: Page, handle: Locator) {
  const popup = page.locator(".Tooltip-popup").last();
  // A late layout shift can move the handle away from the pointer, so hover again until it opens.
  await expect(async () => {
    await handle.hover();
    await expect(popup).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
  return popup;
}

export async function openExecutionDetails(page: Page) {
  const box = page.getByTestId("tradebox");
  const networkFee = box.getByText("Network fee", { exact: true });
  if (!(await networkFee.isVisible()))
    await box.getByRole("button", { name: "Execution details", exact: true }).click();
  await expect(networkFee).toBeVisible();
  return box;
}

// Amounts shown with two decimals of k/m/b: each displayed term may be off by half of its last digit.
export function displayedSumMatches(total: number, parts: number[], drift = 0) {
  const rounding = [total, ...parts].reduce(
    (sum, value) => sum + 0.005 * ([1e12, 1e9, 1e6, 1e3].find((unit) => Math.abs(value) >= unit) ?? 1),
    0
  );
  return Math.abs(parts.reduce((a, b) => a + b, 0) - total) <= rounding + Math.abs(total) * drift;
}
