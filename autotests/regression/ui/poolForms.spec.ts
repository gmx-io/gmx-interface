import { expect, type Locator, type Page, type Route } from "@playwright/test";
import { decodeFunctionData, isAddressEqual, multicall3Abi, toFunctionSelector, type Address, type Hex } from "viem";

import SyntheticsReader from "../../../sdk/src/abis/SyntheticsReader";
import type { ContractsChainId } from "../../../sdk/src/configs/chains";
import { getContract } from "../../../sdk/src/configs/contracts";
import { test } from "../fixtures/browser";
import { displayedNumber } from "../fixtures/displayedNumber";
import { infoRowValue, openTooltip } from "../fixtures/marketData";
import {
  feeBreakdown,
  impactAndFee,
  quoteUntilImpact,
  relativeDiff,
  settledQuote,
  usdText,
} from "../fixtures/quoteDetails";

type PoolType = "GM" | "GLV";

async function openPoolDetails(page: Page, type: PoolType) {
  await page.goto("/pools");
  const details = page
    .getByRole("table")
    .filter({ has: page.getByRole("columnheader", { name: type === "GM" ? "POOL" : "VAULT", exact: true }) })
    .locator("tbody tr")
    // Pinned USDG pools are whitelist-only, so their forms quote no fee or impact.
    .filter({ hasNotText: "USDG" })
    .getByRole("link", { name: "Details", exact: true })
    .first();
  await expect(details).toHaveAttribute("href", /\/pools\/details\?market=0x[\da-fA-F]{40}/);
  const market = new URL((await details.getAttribute("href"))!, page.url()).searchParams.get("market")!;
  await details.click();
  await expect(page).toHaveURL(new RegExp(`/pools/details\\?market=${market}`));
  return market;
}

function formParts(page: Page) {
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
  return { form, input: page.getByTestId("gm-first-token-input"), parts };
}

async function openForm(page: Page, type: PoolType, operation: "Buy" | "Sell") {
  await page.getByRole("button", { name: `${operation} ${type}`, exact: true }).click();
  const { form, input, parts } = formParts(page);
  await input.fill("1");
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
  test(
    `12.05 12.14 ${type} details open from the list, and the buy and sell forms show a fee that matches the entered amount`,
    { tag: "@avalanche" },
    async ({ page }) => {
      const market = await openPoolDetails(page, type);
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
        // Known bug: a swapping single-token sell leaves impact and swap fee out of Receive.
        if (!items.some((item) => item.label === "Swap fee")) {
          const sum = items.reduce((acc, item) => acc + item.usd, 0);
          expect(relativeDiff(quote.receive, quote.pay + sum)).toBeLessThan(0.001);
        }
      }
      await page.reload();
      await expect(page).toHaveURL(new RegExp(`market=${market}`));
      await expect(page.getByRole("button", { name: `Buy ${type}`, exact: true })).toBeVisible();
      await expect(page.getByText("Something went wrong", { exact: true }).filter({ visible: true })).toHaveCount(0);
    }
  );

  test(`12.15 12.27 large ${type} deposit shows its impact percentage with the high price impact warning, and a withdrawal of the same size shows its impact`, async ({
    page,
  }) => {
    test.slow();
    await openPoolDetails(page, type);
    const { form, input, parts, unitUsd } = await openForm(page, type, "Buy");
    const warning = form.getByText("High price impact", { exact: true });
    // Past the 0.8% warning threshold.
    const quote = await quoteUntilImpact(
      { startUsd: 1_000_000, maxUsd: 900_000_000, untilImpact: 0.9, stepImpact: 1.2, maxStep: 2 },
      async (usd) => {
        await input.fill((usd / unitUsd).toFixed(4));
        const step = await settledQuote(parts, usd);
        if (step.impact > -0.7) await expect(warning).toBeHidden();
        return step;
      }
    );
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

// The GLV picks its pool once the GM token prices arrive. The app's batcher merges them with other reads into
// aggregate3 chunks sent to the primary and fallback RPCs, so match chunks that price GM tokens without market info.
function isGmTokenPriceMulticall(body: string | null, chainId: ContractsChainId) {
  try {
    const requests = JSON.parse(body ?? "") as { method?: string; params?: [{ to?: Address; data?: Hex }] }[];
    if (!Array.isArray(requests) || requests.length !== 1 || requests[0].method !== "eth_call") return false;
    const call = requests[0].params?.[0];
    if (!call?.to || !call.data || !isAddressEqual(call.to, multicall3)) return false;
    const decoded = decodeFunctionData({ abi: multicall3Abi, data: call.data });
    if (decoded.functionName !== "aggregate3") return false;
    const reader = getContract(chainId, "SyntheticsReader");
    const reads = decoded.args[0].filter(({ target }) => isAddressEqual(target, reader));
    const selectors = new Set(reads.map(({ callData }) => callData.slice(0, 10)));
    return selectors.has(readerSelector("getMarketTokenPrice")) && !selectors.has(readerSelector("getMarketInfo"));
  } catch {
    return false;
  }
}

const multicall3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
const readerSelector = (name: string) =>
  toFunctionSelector(SyntheticsReader.find((item) => item.type === "function" && item.name === name)!);

test("12.19 a GLV detail page loaded directly quotes a buy amount typed before the vault picks its pool", async ({
  page,
  chainId,
}) => {
  await openPoolDetails(page, "GLV");
  const maxHeld = 8;
  const holdMs = 30_000;
  let held = 0;
  let timedOut = false;
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  const deadline = setTimeout(() => {
    timedOut = true;
    release();
  }, holdMs);
  const hold = async (route: Route) => {
    if (held < maxHeld && isGmTokenPriceMulticall(route.request().postData(), chainId as ContractsChainId)) {
      held++;
      await released;
    }
    await route.fallback();
  };
  await page.context().route("**/*", hold);
  try {
    await page.reload();
    await page.getByRole("button", { name: "Buy GLV", exact: true }).click();
    const { form, input, parts } = formParts(page);
    await input.fill("1");
    await expect.poll(() => held, { message: "The GM token price multicall was not held" }).toBeGreaterThan(0);
    const pool = form.locator(".Exchange-info-row").filter({ hasText: /^Pool/ });
    await expect(pool).toBeVisible();
    await expect(pool).not.toContainText("/USD");
    expect(timedOut, `The held GM token prices were released after ${holdMs} ms, before the amount was typed`).toBe(
      false
    );
    release();
    await settledQuote(parts);
    await expect(input).toHaveValue("1");
  } finally {
    clearTimeout(deadline);
    release();
    await page.context().unroute("**/*", hold);
  }
});

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
