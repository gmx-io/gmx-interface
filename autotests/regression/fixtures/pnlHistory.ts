import type { BrowserContext } from "@playwright/test";
import { getAddress } from "viem";

// Mirrors the indexer: a quiet day inside the history is a zero row, and an account without trades has no
// all-time rows but gets a zero row for each day of an explicit range.
export async function mockPnlHistory(
  context: BrowserContext,
  account: string,
  { quietDaysAgo = [], noTrades = false }: { quietDaysAgo?: number[]; noTrades?: boolean } = {}
) {
  const today = Math.floor(Date.now() / 86_400_000) * 86_400;
  let cumulative = 0n;
  const rows = noTrades
    ? []
    : Array.from({ length: 100 }, (_, index) => {
        const timestamp = today - (99 - index) * 86_400;
        const pnl = quietDaysAgo.includes(99 - index) ? 0n : BigInt(index % 3 === 0 ? -3 : 10) * 10n ** 30n;
        cumulative += pnl;
        return { timestamp, pnl: pnl.toString(), cumulativePnl: cumulative.toString() };
      });
  const requests: { from?: number; to?: number }[] = [];
  await context.route("**/*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    let body: { query?: string; variables?: { account?: string; from?: number; to?: number } };
    try {
      body = route.request().postDataJSON();
    } catch {
      return route.fallback();
    }
    if (
      !body?.query?.includes("AccountHistoricalPnlResolver") ||
      !body.variables?.account ||
      getAddress(body.variables.account) !== account
    )
      return route.fallback();
    const { from, to } = body.variables;
    requests.push({ from, to });
    const accountPnlHistoryStats =
      noTrades && from !== undefined && to !== undefined
        ? Array.from({ length: Math.floor((to - from) / 86_400) + 1 }, (_, day) => ({
            timestamp: from + day * 86_400,
            pnl: "0",
            cumulativePnl: "0",
          }))
        : rows.filter(
            (row) => (from === undefined || row.timestamp >= from) && (to === undefined || row.timestamp <= to)
          );
    await route.fulfill({ json: { data: { accountPnlHistoryStats } } });
  });
  return { rows, requests, today };
}

type PnlSummaryRow = {
  wins: number;
  losses: number;
  pnlBps: string;
  pnlUsd: string;
  volume: string;
  winsLossesRatioBps: string;
  usedCapitalUsd: string;
};

export async function mockPnlSummary(context: BrowserContext, account: string, row: (index: number) => PnlSummaryRow) {
  await context.route("**/*", async (route) => {
    let body: { query?: string; variables?: { account?: string } } | undefined;
    try {
      body = route.request().method() === "POST" ? route.request().postDataJSON() : undefined;
    } catch {
      return route.fallback();
    }
    if (
      !body?.query?.includes("accountPnlSummaryStats") ||
      !body.variables?.account ||
      getAddress(body.variables.account) !== account
    )
      return route.fallback();
    const accountPnlSummaryStats = ["today", "yesterday", "week", "month", "year", "all"].map((bucketLabel, index) => ({
      bucketLabel,
      ...row(index),
    }));
    await route.fulfill({ json: { data: { accountPnlSummaryStats } } });
  });
}
