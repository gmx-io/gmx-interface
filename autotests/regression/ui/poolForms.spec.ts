import { expect, type Locator, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { infoRowValue, openTooltip } from "../fixtures/marketData";
import { feeBreakdown, impactAndFee, type Quote, relativeDiff, settledQuote, usdText } from "../fixtures/quoteDetails";

type PoolType = "GM" | "GLV";

async function openPoolDetails(page: Page, type: PoolType) {
  await page.goto("/pools");
  await page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }) })
    .locator("tbody tr")
    // Pinned USDG pools are whitelist-only, so their forms quote no fee or impact.
    .filter({ hasNotText: "USDG" })
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
      const { form, input, parts, unitUsd } = await openForm(page, type, operation);
      // Fees on a one-unit stable amount round to "< $0.01", so the checks use about $1,000.
      await input.fill((1_000 / unitUsd).toFixed(6));
      const quote = await settledQuote(parts, 1_000);
      // A deposit or withdrawal that improves the pool balance can be charged a zero fee.
      expect(quote.fee).toBeLessThanOrEqual(0);
      expect(quote.fee).toBeGreaterThan(-1);
      const items = await feeTooltip(page, form);
      const fee = items.find((item) => item.label === `${operation} fee`);
      expect(fee, JSON.stringify(items)).toBeDefined();
      // The row shows every fee combined, e.g. the swap fee of a single-token sell.
      const fees = items.filter((item) => item.label !== "Price impact");
      const feePercent = fees.reduce((acc, item) => acc + item.percent, 0);
      expect(Math.abs(feePercent - Math.abs(quote.fee)), JSON.stringify(items)).toBeLessThanOrEqual(
        0.001 * fees.length
      );
      // The fee basis is the paid side: the deposited token on buys, the sold GM/GLV on sells.
      expect(Math.abs(Math.abs(fee!.usd) - (quote.pay * fee!.percent) / 100)).toBeLessThanOrEqual(
        0.01 + quote.pay * 0.00001
      );
      const sum = items.reduce((acc, item) => acc + item.usd, 0);
      expect(relativeDiff(quote.receive, quote.pay + sum)).toBeLessThan(0.001);
    }
  });

  test(`12.15 12.27 large ${type} deposit shows its impact percentage with the high price impact warning, and a withdrawal of the same size shows its impact`, async ({
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
    // A single-token withdrawal can swap the other side, so its impact is not checked against the amounts.
    await expect
      .poll(async () => relativeDiff(displayedNumber(await sell.parts.pay.innerText()), quote.pay), { timeout: 30_000 })
      .toBeLessThan(0.02);
    const withdrawal = await impactAndFee(sell.parts.row);
    expect(withdrawal.impact).toBeLessThanOrEqual(0);
    // The tooltip lists price impact only when there is some.
    const withdrawalImpact = (await feeTooltip(page, sell.form)).find((item) => item.label === "Price impact");
    expect(withdrawalImpact?.percent ?? 0).toBeCloseTo(Math.abs(withdrawal.impact), 3);
  });
}

test("12.15 a large single-token GM withdrawal's Pay and Receive include the price impact it shows", async ({
  page,
  chainId,
}) => {
  test.fixme(true, "PRO-4468 bug 29: Sell GM (Single) shows the price impact, but Pay and Receive leave it out");
  test.skip(chainId !== 42161, "Avalanche's first pool shows no impact for a single-token withdrawal");
  test.slow();
  await openPoolDetails(page, "GM");
  const sell = await openForm(page, "GM", "Sell");
  await sell.input.fill((25_000_000 / sell.unitUsd).toFixed(4));
  await expect.poll(async () => (await impactAndFee(sell.parts.row)).impact, { timeout: 30_000 }).toBeLessThan(-0.1);
  await settledQuote(sell.parts);
});
