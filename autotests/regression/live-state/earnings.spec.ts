import { expect, type Locator, type Page } from "@playwright/test";
import { getAddress } from "viem";
import {
  formatBalanceAmount,
  formatPercentage,
  formatUsd,
  parseValue,
  PRECISION_DECIMALS,
} from "../../../sdk/src/utils/numbers/utils";
import { test } from "../fixtures/liveWallet";
import type { LiveAccount, LiveAccounts } from "../fixtures/liveAccounts";
import { infoRowValue } from "../fixtures/marketData";

type Earning = { marketToken?: string; glvAddress?: string; lifetimeFeeUsd: string; recent7dFeeUsd: string };

// Earnings refetch while open, so keep every response.
function recordEarnings(page: Page, profile: "gm" | "glv", liveAccount: LiveAccount, liveAccounts: LiveAccounts) {
  const received: Earning[] = [];
  page.on("response", (response) => {
    if (!response.ok()) return;
    if (profile === "gm") {
      if (
        !response.url().includes("/v1/yield/gm-user-earnings") ||
        new URL(response.url()).searchParams.get("account") !== liveAccount.account
      )
        return;
    } else {
      if (response.url() !== liveAccounts.endpoint || response.request().method() !== "POST") return;
      const body = response.request().postDataJSON();
      if (!body?.query?.includes("glvUserEarnings(account:") || body?.variables?.account !== liveAccount.account)
        return;
    }
    void response.json().then(
      (data) => {
        const earnings: Earning[] = profile === "gm" ? data.pools : data.data.glvUserEarnings;
        const earning = earnings.find((e) => getAddress((e.marketToken ?? e.glvAddress)!) === liveAccount.token);
        if (earning) received.push(earning);
      },
      () => undefined
    );
  });
  return received;
}

// Polls until every field shows the values of one received response.
async function expectEarnings(received: Earning[], fields: [Locator, keyof Earning][]) {
  let matched: Earning | undefined;
  await expect
    .poll(
      async () => {
        const shown = await Promise.all(fields.map(([field]) => field.textContent()));
        matched = [...received]
          .reverse()
          .find((earning) =>
            fields.every(([, key], i) =>
              shown[i]?.replace(/\s+/g, " ").includes(formatUsd(BigInt(earning[key]!))!.replace(/\s+/g, " "))
            )
          );
        return matched ? true : { shown, received: received.length };
      },
      { timeout: 60_000 }
    )
    .toBe(true);
  return matched;
}

const PERIODS = [
  { period: "total", portfolio: "Total performance APY", pools: "Total" },
  { period: "30d", portfolio: "30d performance APY", pools: "Last 30d" },
] as const;

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

    test(`${profile === "gm" ? "2.31 13.09" : "2.31 12.23 13.10"} live ${symbol}: lifetime and 7d earnings match the unmodified server response, and Portfolio total and 30d performance APY are finite, bounded, signed like the received performance response and equal the Pools Performance column`, async ({
      page,
      liveAccount,
      liveWallet,
      liveAccounts,
    }, testInfo) => {
      const received = recordEarnings(page, profile, liveAccount, liveAccounts);
      const performance = recordPerformance(page);
      await liveWallet.connect(page, "/earn/portfolio");
      const balance = page.getByTestId(`info-row-lp-balance-${liveAccount.token}`);
      await expect(balance).toBeVisible({ timeout: 90_000 });
      const card = balance.locator("../..");
      const earning = await expectEarnings(received, [
        [card.getByText("Lifetime", { exact: true }).locator(".."), "lifetimeFeeUsd"],
        [card.getByText("7d earnings", { exact: true }).locator(".."), "recent7dFeeUsd"],
      ]);
      await testInfo.attach("live-earnings", { body: JSON.stringify(earning), contentType: "application/json" });

      const evidence: Record<string, { raw?: string; shown: string }> = {};
      for (const { period, portfolio } of PERIODS) {
        await expect
          .poll(
            async () => {
              const raw = performance.get(period)?.[liveAccount.token!];
              if (!performance.has(period)) return `waiting for the ${period} performance response`;
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

test.describe("GM details", () => {
  test.use({ liveProfile: "gm" });

  test("12.17 live GM: detail page total earned fees match the unmodified earnings response", async ({
    page,
    liveAccount,
    liveWallet,
    liveAccounts,
  }, testInfo) => {
    const received = recordEarnings(page, "gm", liveAccount, liveAccounts);
    await liveWallet.connect(page, `/pools/details?market=${liveAccount.token}`);
    // Fees are attributed only while the whole balance is in the wallet; otherwise the page shows N/A.
    const balance = page.getByText("Balance", { exact: true }).locator("..");
    await expect(balance).toContainText(
      `${formatBalanceAmount(liveAccount.balance!, 18, undefined, { showZero: true })} GM`,
      { timeout: 90_000 }
    );
    const earning = await expectEarnings(received, [
      [page.getByText("Total earned fees", { exact: true }).locator(".."), "lifetimeFeeUsd"],
    ]);
    await testInfo.attach("live-gm-detail-earnings", {
      body: JSON.stringify(earning),
      contentType: "application/json",
    });
  });
});
