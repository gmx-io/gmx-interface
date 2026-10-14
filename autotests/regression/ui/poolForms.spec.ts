import { expect, type Locator, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { infoRowValue, openTooltip } from "../fixtures/marketData";
import { feeBreakdown, type Quote, relativeDiff, settledQuote, usdText } from "../fixtures/quoteDetails";

type PoolType = "GM" | "GLV";

async function openPoolDetails(page: Page, type: PoolType) {
  await page.goto("/pools");
  await page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }) })
    .getByRole("link", { name: "Details", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/pools\/details\?market=0x/);
}

async function openForm(page: Page, type: PoolType, operation: "Buy" | "Sell") {
  await page.getByRole("button", { name: `${operation} ${type}`, exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByTestId("gm-first-token") });
  const section = (label: string) =>
    form
      .locator('[data-label="left"]')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .first()
      .locator("xpath=../..");
  const parts = {
    pay: usdText(section("Pay")),
    receive: usdText(section("Receive")),
    row: infoRowValue(form, "Price impact / fees"),
  };
  const input = page.getByTestId("gm-first-token-input");
  await input.fill("1");
  // USD value of one unit of the token in the first input.
  const unitUsd = (await settledQuote(parts))[operation === "Buy" ? "pay" : "receive"];
  return { form, input, parts, unitUsd };
}

async function feeTooltip(page: Page, form: Locator) {
  const popup = await openTooltip(page, infoRowValue(form, "Price impact / fees").locator(".Tooltip-handle"));
  const items = feeBreakdown(await popup.innerText());
  await form.getByText("Price impact / fees", { exact: true }).hover();
  await expect(popup).toBeHidden();
  return items;
}

for (const type of ["GM", "GLV"] as const) {
  test(`12.14 ${type} buy and sell forms show a fee that matches the entered amount`, async ({ page }) => {
    await openPoolDetails(page, type);
    for (const operation of ["Buy", "Sell"] as const) {
      const { form, parts } = await openForm(page, type, operation);
      const quote = await settledQuote(parts);
      expect(quote.fee).toBeLessThan(0);
      expect(quote.fee).toBeGreaterThan(-1);
      const items = await feeTooltip(page, form);
      const fee = items.find((item) => item.label === `${operation} fee`);
      expect(fee, JSON.stringify(items)).toBeDefined();
      expect(Math.abs(fee!.percent - Math.abs(quote.fee))).toBeLessThanOrEqual(0.001);
      // The fee basis is the paid side: the deposited token on buys, the sold GM/GLV on sells.
      expect(Math.abs(Math.abs(fee!.usd) - (quote.pay * fee!.percent) / 100)).toBeLessThanOrEqual(
        0.01 + quote.pay * 0.00001
      );
      const sum = items.reduce((acc, item) => acc + item.usd, 0);
      expect(relativeDiff(quote.receive, quote.pay + sum)).toBeLessThan(0.001);
    }
  });

  test(`12.15 12.27 large ${type} deposit shows its impact percentage with the high price impact warning; withdrawal has none`, async ({
    page,
  }) => {
    test.slow();
    await openPoolDetails(page, type);
    const { form, input, parts, unitUsd } = await openForm(page, type, "Buy");
    const warning = form.getByText("High price impact", { exact: true });
    let quote: Quote | undefined;
    // Impact grows about linearly with size: aim each step at ~1.2%, past the 0.8% warning threshold.
    for (
      let usd = 1_000_000;
      !quote || quote.impact > -0.9;
      usd *= quote.impact < 0 ? Math.min(2, Math.max(1.1, 1.2 / -quote.impact)) : 2
    ) {
      expect(usd, "price impact never reached the warning threshold").toBeLessThan(900_000_000);
      await input.fill((usd / unitUsd).toFixed(4));
      quote = await settledQuote(parts, usd);
      if (quote.impact > -0.7) await expect(warning).toBeHidden();
    }
    await expect(warning).toBeVisible();
    await expect(form.getByRole("button", { name: "Connect wallet", exact: true })).toBeVisible();
    const impact = (await feeTooltip(page, form)).find((item) => item.label === "Price impact");
    expect(impact).toBeDefined();
    expect(Math.abs(impact!.percent - Math.abs(quote.impact))).toBeLessThanOrEqual(0.001);
    expect(relativeDiff(Math.abs(impact!.usd), (quote.pay * impact!.percent) / 100)).toBeLessThan(0.001);

    const sell = await openForm(page, type, "Sell");
    await sell.input.fill((quote.pay / sell.unitUsd).toFixed(4));
    const withdrawal = await settledQuote(sell.parts, quote.pay);
    expect(Math.abs(withdrawal.impact)).toBe(0);
    await expect(sell.form.getByText("High price impact", { exact: true })).toBeHidden();
  });
}
