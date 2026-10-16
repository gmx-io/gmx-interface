import { expect, type Locator, type Page } from "@playwright/test";

import { getTokenBySymbol } from "../../../sdk/src/configs/tokens";
import { displayedNumber } from "./displayedNumber";

export type Quote = { pay: number; receive: number; impact: number; fee: number };

export function relativeDiff(actual: number, expected: number) {
  return Math.abs(actual / expected - 1);
}

// USD price per token from the latest /prices/tickers response the page received.
export function watchTickerPrices(page: Page, chainId: number) {
  let tickers: { tokenSymbol: string; minPrice: string; maxPrice: string }[] = [];
  page.on("response", async (response) => {
    if (!/\/prices\/tickers$/.test(new URL(response.url()).pathname) || !response.ok()) return;
    tickers = await response.json().catch(() => tickers);
  });
  // NaN until the first response arrives, so expect.poll keeps retrying.
  return (symbol: string, side: "minPrice" | "maxPrice") => {
    const ticker = tickers.find((t) => t.tokenSymbol === symbol);
    return ticker ? Number(ticker[side]) / 10 ** (30 - getTokenBySymbol(chainId, symbol).decimals) : NaN;
  };
}

// USD value printed under an amount input.
export function usdText(section: Locator) {
  return section.getByText(/^\$\s*[\d,]+(\.\d+)?$/).first();
}

// "+ 0.006% / - 0.050%" -> { impact: 0.006, fee: -0.05 }
export async function impactAndFee(row: Locator) {
  const [impact, fee] = (await row.innerText()).split("/").map(displayedNumber);
  return { impact, fee };
}

// Tooltip rows rendered as "Label:", "(x% of ... amount)", "-$ y".
export function feeBreakdown(text: string) {
  const lines = text.split("\n").map((line) => line.trim());
  const items: { label: string; percent: number; usd: number }[] = [];
  lines.forEach((line, i) => {
    if (line.endsWith(":") && /^\(.*% of/.test(lines[i + 1] ?? "")) {
      items.push({
        label: line.slice(0, -1),
        percent: displayedNumber(lines[i + 1]),
        usd: displayedNumber(lines[i + 2]),
      });
    }
  });
  return items;
}

// Waits until pay/receive USD and the impact/fee row describe the same quote, so stale values are not read.
export async function settledQuote(
  parts: { pay: Locator; receive: Locator; row: Locator },
  expectedPayUsd?: number
): Promise<Quote> {
  let quote: Quote | undefined;
  await expect
    .poll(
      async () => {
        const pay = displayedNumber(await parts.pay.innerText());
        const receive = displayedNumber(await parts.receive.innerText());
        const { impact, fee } = await impactAndFee(parts.row);
        quote = { pay, receive, impact, fee };
        return (
          pay > 0 &&
          (expectedPayUsd === undefined || relativeDiff(pay, expectedPayUsd) < 0.02) &&
          relativeDiff(receive, pay * (1 + (impact + fee) / 100)) < 0.005
        );
      },
      { timeout: 30_000 }
    )
    .toBe(true);
  return quote!;
}
