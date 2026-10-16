import { readFileSync } from "node:fs";
import { expect, type ConsoleMessage, type Locator, type Page } from "@playwright/test";

import { test } from "../fixtures/browser";
import { readRegressionGlvs } from "../fixtures/deploymentConfig";
import { displayedNumber } from "../fixtures/displayedNumber";
import { marketLabel, newestPerpMarkets } from "../fixtures/marketConfig";
import { expectSettled } from "../fixtures/pageState";

const ACCOUNT = "0x000000000000000000000000000000000000dEaD";
// Public RPCs the app is configured to fall back across, plus the Addressable pixel and the ad syncs it loads.
const PUBLIC_RPC_HOSTS = new Set(
  [...readFileSync("src/config/rpc.ts", "utf8").matchAll(/(?:https|wss):\/\/([\w.-]+)/g)].map(([, host]) => host)
);
const AD_PIXEL_HOSTS = /(^|\.)(adrsbl\.io|adnxs\.com|adradv\.io|adform\.net)$/;

type Route = { path: string; ids?: string; url?: RegExp; testId?: string; text?: string | RegExp; heading?: string };

const routes: Route[] = [
  { path: "/", url: /\/trade$/, testId: "tradebox" },
  { path: "/v1", url: /\/trade$/, testId: "tradebox" },
  { path: "/trade", testId: "tradebox" },
  { path: "/trade/long", testId: "tradebox" },
  { path: "/trade/short", testId: "tradebox" },
  { path: "/trade/swap", testId: "pay-input" },
  { path: "/stats", testId: "dashboard-page" },
  { path: "/dashboard", url: /\/stats$/, testId: "dashboard-page" },
  { path: "/monitor", text: "POOL CAP LONG" },
  { path: "/monitor/v2", url: /\/monitor$/, text: "POOL CAP LONG" },
  { path: "/earn", url: /\/earn\/discover$/, text: "What is GMX?" },
  { path: "/stake", url: /\/earn\/discover$/, text: "What is GMX?" },
  { path: "/earn/discover", text: "What is GMX?" },
  { path: "/earn/portfolio", text: "Connect wallet to see your assets" },
  { path: "/buy_gmx", url: /\/earn\/portfolio\?buyGmx=1$/, text: "Connect wallet to see your assets" },
  { path: "/earn/additional_opportunities", url: /\/all$/, text: "Lending and borrowing" },
  { path: "/earn/distributions", text: "No distribution history" },
  { path: "/pools", text: "TVL in vaults and pools" },
  { path: "/jobs", text: "Job openings at GMX" },
  { path: "/ecosystem", testId: "ecosystem-page" },
  { path: "/announcements", heading: "Announcements" },
  { path: "/leaderboard", text: "Top addresses" },
  { path: "/competitions", url: /\/competitions\/march_13-20_2024$/, text: "Concluded competitions" },
  { path: "/competitions/march_20-27_2024", text: "Concluded competitions" },
  { path: "/referrals", url: /\/referrals\/traders$/, testId: "referrals-page" },
  { path: "/referrals/affiliates", testId: "referrals-page" },
  { path: "/referrals/distributions", url: /\/referrals\/affiliates$/, testId: "referrals-page" },
  { path: `/referrals/traders/${ACCOUNT}`, testId: "referrals-page" },
  { path: "/traders", url: /\/traders\?network=\w+&v=2$/, text: "Trader activity" },
  { path: "/actions", url: /\/traders\?network=\w+&v=2$/, text: "Trader activity" },
  { path: `/traders/${ACCOUNT}`, ids: "17.02", text: ACCOUNT },
  { path: `/accounts/${ACCOUNT}`, url: new RegExp(`/traders/${ACCOUNT}`), text: ACCOUNT },
  { path: "/referrals-tier", text: "Referrals tier" },
  { path: "/price_impact_rebates_stats", text: "TIMEKEY" },
  { path: "/begin_account_transfer", text: "Transfer account" },
  { path: `/complete_account_transfer/${ACCOUNT}/${ACCOUNT}`, text: "Complete account transfer" },
  { path: "/rpc-debug", text: /^RPC endpoints$/i },
  { path: "/oracle-keeper-debug", text: /^Oracle endpoints$/i },
];

const MULTICALL_FALLBACK_LOGS = [
  /^Error: Multicall failed/,
  /^Error: multicall timeout/,
  /^\[executeMulticallWorker\] Worker (?:execution failed|did not respond in time)\. Falling back/,
];

function messageUrl(message: ConsoleMessage) {
  const text = message.text();
  return (
    /^Access to fetch at '([^']+)'/.exec(text)?.[1] ??
    (/^Failed to load resource/.test(text) ? message.location().url : "")
  );
}

// Console noise the release cannot fix; every message is still attached, and the app-side cases are reported.
function ignoredConsoleReason(message: ConsoleMessage) {
  const text = message.text();
  const url = messageUrl(message);
  const host = url && new URL(url).hostname;
  if (host && (PUBLIC_RPC_HOSTS.has(host) || host.endsWith(".g.alchemy.com")))
    return "public RPC transport failure; the app falls back to the next configured RPC";
  if (host && AD_PIXEL_HOSTS.test(host)) return "ad pixel request failed; no page data";
  if (host && /(^|\.)gmxinfra2?\.io$/.test(host) && new URL(url).pathname.startsWith("/report/ui/"))
    return "UI telemetry report was rejected; no page data";
  if (text.startsWith("Warning: ")) return "React development-build warning; production builds omit it";
  if (MULTICALL_FALLBACK_LOGS.some((pattern) => pattern.test(text)))
    return "multicall logs a failed RPC attempt or a slow worker before its fallback";
  if (/^TypeError: Failed to fetch\s+at _FetchRequest\.getUrl/.test(text)) return "ethers RPC transport failure";
}

function watchConsole(page: Page) {
  const messages: { text: string; url: string; ignored?: string }[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    messages.push({
      text: message.text().slice(0, 500),
      url: message.location().url,
      ignored: ignoredConsoleReason(message),
    });
  });
  return messages;
}

function pagePath(path: string, chainId: number) {
  if (!path.includes("<")) return path;
  const gm = newestPerpMarkets(chainId)[0];
  return path.replace("<GM>", gm.marketTokenAddress).replace("<GLV>", readRegressionGlvs(chainId as 42161)[0]);
}

const detailRoutes = [
  {
    path: "/pools/details?market=<GM>",
    text: (chainId: number) => `GM: ${marketLabel(newestPerpMarkets(chainId)[0].indexToken)}`,
  },
  { path: "/pools/details?market=<GLV>", text: () => "Buy GLV" },
];

for (const route of [...routes, ...detailRoutes.map(({ path }): Route => ({ path }))]) {
  const ids = ["2.14 2.16 2.23", route.ids].filter(Boolean).join(" ");
  test(`${ids} ${route.path} renders, settles its loading states and logs no console errors`, async ({
    page,
    chainId,
  }, testInfo) => {
    const messages = watchConsole(page);
    const path = pagePath(route.path, chainId);
    try {
      await page.goto(path);
      if (route.url) await expect(page).toHaveURL(route.url);
      const detail = detailRoutes.find((candidate) => candidate.path === route.path);
      if (detail) {
        await expect(page).toHaveURL(new RegExp(`/pools/details\\?market=${path.split("=")[1]}`));
        await expect(page.getByText(detail.text(chainId), { exact: true }).first()).toBeVisible();
      }
      if (route.testId) await expect(page.getByTestId(route.testId).first()).toBeVisible();
      if (route.text) await expect(page.getByText(route.text, { exact: true }).first()).toBeVisible();
      if (route.heading) await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible();
      await expectSettled(page);
      expect(await page.evaluate(() => document.body.innerText.trim().length)).toBeGreaterThan(100);
      expect(messages.filter((message) => !message.ignored).map((message) => message.text)).toEqual([]);
    } finally {
      await testInfo.attach("console-errors", {
        body: JSON.stringify(messages, null, 2),
        contentType: "application/json",
      });
    }
  });
}

test("2.10 /traders without a wallet lists recent trader activity across accounts", async ({ page }) => {
  await page.goto("/traders");
  await expect(page).toHaveURL(/\/traders\?network=\w+&v=2$/);
  await expect(page).toHaveTitle(/Trader activity/);
  await expect(page.getByRole("button", { name: "Connect wallet", exact: true }).first()).toBeVisible();
  const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: /^Action/i }) });
  const rows = table.locator("tbody tr");
  await expect(rows.nth(1)).toBeVisible({ timeout: 30_000 });
  await expectSettled(page);
  const actions = await rows.evaluateAll((elements) => elements.map((row) => (row as HTMLElement).innerText));
  const accounts = new Set(actions.map((text) => /0x[\da-fA-F]{40}/.exec(text)?.[0]).filter(Boolean));
  expect(actions.every((text) => /\/USD|SWAP|Swap/.test(text))).toBe(true);
  expect(accounts.size).toBeGreaterThan(1);
});

function amountIssues(texts: string[], rule: { positive?: boolean; nonNegative?: boolean; significant?: number }) {
  return texts.flatMap((text) => {
    const value = displayedNumber(text);
    if (!Number.isFinite(value)) return [`${text}: not a number`];
    if (rule.positive && !(value > 0)) return [`${text}: not positive`];
    if (rule.nonNegative && value < 0) return [`${text}: negative`];
    const digits = /[\d,]+(?:\.\d+)?/.exec(text)![0].replace(/\D/g, "").replace(/^0+/, "");
    if (rule.significant && digits.length < rule.significant) return [`${text}: rounded to ${digits.length} digits`];
    return [];
  });
}

async function column(table: Locator, header: string, skipRow?: RegExp) {
  const cells = await table.evaluate((element, name) => {
    const headers = Array.from(element.querySelectorAll("thead th")).map((th) => (th as HTMLElement).innerText.trim());
    const index = headers.indexOf(name);
    if (index === -1) throw new Error(`Missing column ${name}: ${headers.join(", ")}`);
    return Array.from(element.querySelectorAll("tbody tr")).map((row) => {
      const { cells } = row as HTMLTableRowElement;
      return { row: cells[0]?.innerText.trim() ?? "", text: cells[index]?.innerText.trim() ?? "" };
    });
  }, header);
  return cells.filter(({ row, text }) => text && !skipRow?.test(row)).map(({ text }) => text);
}

function tableWith(page: Page, header: string) {
  return page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: header, exact: true }) });
}

// Applies to the whole page: invalid values and large USD amounts without separators or a k/m/b suffix.
async function pageTextIssues(page: Page) {
  const text = await page.evaluate(() => document.body.innerText);
  return [
    ...[...text.matchAll(/.{0,30}\b(?:NaN|Infinity|undefined)\b.{0,30}/g)].map(([match]) => `invalid: ${match}`),
    ...[...text.matchAll(/\$\s?\d{4,}(?:\.\d+)?/g)].map(([match]) => `unseparated: ${match}`),
  ];
}

const numericPages: {
  path: string;
  ids: string;
  ready: (page: Page) => Locator;
  issues: (page: Page) => Promise<string[]>;
}[] = [
  {
    path: "/trade",
    ids: "22.17 22.18 22.19 22.20",
    ready: (page) => page.getByText(/^24h volume$/i),
    issues: async (page) => {
      const stats = page
        .locator("div")
        .filter({ has: page.getByText(/^24h volume$/i) })
        .filter({ has: page.getByText(/^available liquidity$/i) })
        .last();
      const header = `${await page.getByRole("banner").innerText()}\n${await stats.innerText()}`;
      const amounts = [...header.matchAll(/\$\s?[\d,.]+[kmb]?/g)].map(([match]) => match);
      return amounts.length < 6 ? [`header amounts: ${amounts.join(" ")}`] : amountIssues(amounts, { positive: true });
    },
  },
  {
    path: "/pools",
    ids: "22.17 22.18 22.19 22.20 22.21",
    ready: (page) => tableWith(page, "POOL").getByRole("link", { name: "Details", exact: true }).nth(2),
    issues: async (page) => {
      const total = await page.getByText("TVL in vaults and pools", { exact: true }).locator("xpath=..").innerText();
      const issues = amountIssues([/\$\s?[\d,.]+/.exec(total)?.[0] ?? total], { positive: true });
      for (const type of ["POOL", "VAULT"]) {
        const table = tableWith(page, type);
        const tvl = await column(table, "TVL (SUPPLY)");
        issues.push(...amountIssues(tvl, { positive: true, significant: 2 }));
        issues.push(
          ...amountIssues(
            tvl.map((text) => /\(([^)]+)\)/.exec(text)?.[1] ?? text),
            { positive: true }
          )
        );
        issues.push(...amountIssues(await column(table, "FEE APY"), { nonNegative: true }));
      }
      return issues;
    },
  },
  {
    path: "/stats",
    ids: "22.17 22.18 22.19 22.20 22.21",
    ready: (page) => tableWith(page, "MARKETS").locator("tbody tr").nth(2),
    issues: async (page) => {
      const cards = page.locator(".DashboardV2-cards .App-card-row");
      const values = await cards.evaluateAll((rows) =>
        rows.map((row) => (row.lastElementChild as HTMLElement).innerText.trim()).filter((text) => /\d/.test(text))
      );
      const table = tableWith(page, "MARKETS");
      return [
        ...(values.length < 8 ? [`overview values: ${values.join(" | ")}`] : amountIssues(values, { positive: true })),
        ...amountIssues(await column(table, "PRICE"), { positive: true, significant: 3 }),
        ...amountIssues(await column(table, "TVL"), { positive: true, significant: 2 }),
        ...amountIssues(await column(table, "LIQUIDITY"), { nonNegative: true }),
        ...amountIssues(await column(table, "UTILIZATION"), { nonNegative: true }),
      ];
    },
  },
  {
    path: "/earn/discover",
    ids: "22.18 22.20",
    ready: (page) => page.getByText("What is GMX?", { exact: true }),
    issues: async () => [],
  },
  {
    path: "/leaderboard",
    ids: "22.17 22.18 22.19 22.20",
    ready: (page) => tableWith(page, "RANK").locator("tbody tr").nth(2),
    issues: async (page) => {
      const table = tableWith(page, "RANK");
      return [
        ...amountIssues(await column(table, "AVG. SIZE"), { positive: true }),
        ...amountIssues(await column(table, "AVG. LEV."), { positive: true }),
        ...amountIssues(
          (await column(table, "WIN/LOSS")).flatMap((text) => text.split("/")),
          { nonNegative: true }
        ),
      ];
    },
  },
  {
    path: "/monitor",
    ids: "22.17 22.18 22.19 22.20",
    ready: (page) => tableWith(page, "POOL VALUE").locator("tbody tr").nth(2),
    issues: async (page) => {
      const table = tableWith(page, "POOL VALUE");
      const split = (texts: string[]) => texts.flatMap((text) => text.split(" / "));
      const caps = split([...(await column(table, "POOL CAP LONG")), ...(await column(table, "POOL CAP SHORT"))]);
      return [
        ...amountIssues(await column(table, "POOL VALUE"), { positive: true }),
        // Swap-only pools have no open interest and show "...".
        ...amountIssues(split(await column(table, "OPEN INTEREST", /^SWAP-ONLY/)), { nonNegative: true }),
        ...amountIssues(split(await column(table, "LIQUIDITY LONG")), { nonNegative: true }),
        ...amountIssues(split(await column(table, "LIQUIDITY SHORT")), { nonNegative: true }),
        ...amountIssues(caps, { nonNegative: true }),
        // A token amount must not carry a USD sign, e.g. "$ 360.0 BTC".
        ...caps.filter((text) => /^\$.*\d\s+[A-Z][\w.]*$/.test(text)).map((text) => `token amount as USD: ${text}`),
      ];
    },
  },
];

for (const { path, ids, ready, issues } of numericPages) {
  test(`${ids} ${path} amounts are valid, positive where required and formatted`, async ({ page }) => {
    await page.goto(path);
    await expect(ready(page)).toBeVisible({ timeout: 30_000 });
    await expectSettled(page);
    await expect
      .poll(async () => [...(await pageTextIssues(page)), ...(await issues(page))], { timeout: 30_000 })
      .toEqual([]);
  });
}
