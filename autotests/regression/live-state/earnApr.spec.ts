import { expect, type Page } from "@playwright/test";
import { getAddress } from "viem";
import { formatPercentage, parseValue, PRECISION_DECIMALS } from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import { infoRowValue } from "../fixtures/marketData";

const PERIODS = [
  { period: "total", portfolio: "Total performance APY", pools: "Total" },
  { period: "30d", portfolio: "30d performance APY", pools: "Last 30d" },
] as const;

// Latest unmodified annualized performance per period, keyed by GM/GLV token.
function recordPerformance(page: Page) {
  const received = new Map<string, Record<string, string>>();
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!response.ok() || url.pathname !== "/performance/annualized" || url.searchParams.get("address")) return;
    const json = await response.json().catch(() => undefined);
    if (!Array.isArray(json)) return;
    received.set(
      url.searchParams.get("period")!,
      Object.fromEntries(json.map((item) => [getAddress(item.address), item.uniswapV2Performance]))
    );
  });
  return received;
}

// The Pools Performance column format: a fraction of 1, signed, without a plus.
function expectedApy(raw: string | undefined) {
  const value = raw === undefined ? undefined : parseValue(raw, PRECISION_DECIMALS);
  return value ? formatPercentage(value, { bps: false, signed: true, showPlus: false })! : "N/A";
}

for (const profile of ["gm", "glv"] as const) {
  test.describe(profile.toUpperCase(), () => {
    const symbol = profile.toUpperCase();
    test.use({ liveProfile: profile });

    test(`2.31 live ${symbol}: Portfolio total and 30d performance APY are finite, bounded, signed like the received performance response and equal the Pools Performance column`, async ({
      page,
      liveAccount,
      liveWallet,
    }, testInfo) => {
      const received = recordPerformance(page);
      await liveWallet.connect(page, "/earn/portfolio");
      const balance = page.getByTestId(`info-row-lp-balance-${liveAccount.token}`);
      await expect(balance).toBeVisible({ timeout: 90_000 });
      const card = balance.locator("../..");
      const evidence: Record<string, { raw?: string; shown: string }> = {};
      for (const { period, portfolio } of PERIODS) {
        await expect
          .poll(
            async () => {
              const raw = received.get(period)?.[liveAccount.token!];
              if (!received.has(period)) return `waiting for the ${period} performance response`;
              const shown = (await infoRowValue(card, portfolio).innerText()).trim();
              evidence[period] = { raw, shown };
              return shown === expectedApy(raw) ? "match" : `${shown} vs ${expectedApy(raw)} (${raw})`;
            },
            { timeout: 45_000 }
          )
          .toBe("match");
        const raw = evidence[period].raw;
        expect(raw, `${period} performance for ${liveAccount.token}`).toBeDefined();
        // Annualized fractions; a month of a halved pool annualizes to about -6, so allow ±1000%.
        expect(Number.isFinite(Number(raw)) && Math.abs(Number(raw)) <= 10, `${period} APY ${raw}`).toBe(true);
      }

      await page.goto("/pools");
      const row = page.getByRole("row").filter({ has: page.locator(`a[href*="market=${liveAccount.token}"]`) });
      for (const { period, pools } of PERIODS) {
        await page.getByRole("button", { name: pools, exact: true }).click();
        await expect(row.locator("td").nth(4)).toHaveText(evidence[period].shown, { timeout: 90_000 });
      }
      await testInfo.attach("live-performance-apy", {
        body: JSON.stringify({ token: liveAccount.token, ...evidence }),
        contentType: "application/json",
      });
    });
  });
}
