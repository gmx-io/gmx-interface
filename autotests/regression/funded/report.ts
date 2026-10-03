import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fundedCases, type FundedCase } from "./catalog";
import { dollars } from "./economy";
import { chargedFees, readJournal, type FundedJournal } from "./journal";
import type { FundedSession } from "./session";
import { fundedErrorMessage } from "./errors";

type ReportError = { message?: string };
type ReportSuite = {
  suites?: ReportSuite[];
  specs?: { tests?: { results?: { status?: string; errors?: ReportError[]; error?: ReportError }[] }[] }[];
};

export function playwrightFailure(report: { suites?: ReportSuite[]; errors?: ReportError[] }) {
  let message: string | undefined;
  const visit = (suites: ReportSuite[]) => {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          const result = test.results?.at(-1);
          if (!result || result.status === "passed" || result.status === "skipped") continue;
          message = result.errors?.[0]?.message ?? result.error?.message ?? message;
        }
      }
      visit(suite.suites ?? []);
    }
  };
  visit(report.suites ?? []);
  message ??= report.errors?.[0]?.message;
  if (!message) return undefined;
  const firstLine = message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")[0]
    .replace(/^Error:\s*/, "");
  return fundedErrorMessage(new Error(firstLine));
}

export function fundedBalanceValues(
  state: Awaited<ReturnType<FundedSession["snapshot"]>>,
  journal: Pick<FundedJournal, "initialNativeUsd" | "initialStableUsd" | "inventory">
) {
  const wrappedUsd = (state.wrappedAmount * state.weth.prices.minPrice) / 10n ** 18n;
  const initialTotal = BigInt(journal.initialNativeUsd) + BigInt(journal.initialStableUsd);
  const initialNative = BigInt(journal.inventory?.initialNativeAmount ?? "0");
  const initialStable = BigInt(journal.inventory?.initialStableAmount ?? "0");
  const changeAtStartPrices =
    initialNative > 0n && initialStable > 0n
      ? ((state.nativeAmount + state.wrappedAmount) * BigInt(journal.initialNativeUsd)) / initialNative +
        (state.stableAmount * BigInt(journal.initialStableUsd)) / initialStable -
        initialTotal
      : undefined;
  return {
    native: dollars(state.nativeUsd),
    stable: dollars(state.stableUsd),
    wrapped: dollars(wrappedUsd),
    change: dollars(state.nativeUsd + state.stableUsd + wrappedUsd - initialTotal),
    changeAtStartPrices: changeAtStartPrices === undefined ? undefined : dollars(changeAtStartPrices),
    scope:
      "Arbitrum ETH, WETH and USDC only; includes fees, PnL and transfers, excludes Base and other assets. Not a fees-only measurement.",
  };
}

export async function writeFundedReport(session: FundedSession, selected: readonly FundedCase[]) {
  const journal = await readJournal(session.directory);
  if (!journal) return;
  const state = await session.snapshot().catch(() => undefined);
  const cases = (
    journal.selectedCases ? fundedCases.filter((c) => journal.selectedCases!.includes(c.id)) : selected
  ).map((scenario) => {
    const record = journal.scenarios?.[scenario.id];
    const actions = journal.actions.filter((a) => a.step?.startsWith(`${scenario.id}:`));
    return {
      id: scenario.id,
      group: scenario.group,
      status: record?.status ?? "not-run",
      seconds: record?.finishedAt
        ? Math.round((Date.parse(record.finishedAt) - Date.parse(record.startedAt)) / 1000)
        : undefined,
      actions: actions.length,
      reservedFeesUsd: dollars(actions.reduce((sum, a) => sum + BigInt(a.feeUsd), 0n)),
      nativeReceiptGasUsd: dollars(actions.reduce((sum, a) => sum + BigInt(a.gasPaidUsd ?? "0"), 0n)),
    };
  });
  const report = {
    runId: journal.id,
    createdAt: journal.createdAt,
    reportedAt: new Date().toISOString(),
    cleanupCompleted: journal.completed,
    feeProfile: journal.feeProfile ?? "economy",
    targetNativeBps: journal.targetNativeBps ?? "initial-ratio",
    reservedFeesUsd: dollars(chargedFees(journal)),
    feeAccounting:
      "Conservative reservations; native receipt gas is a subset. Balance value change includes price movement and PnL.",
    balancesUsd: state ? fundedBalanceValues(state, journal) : undefined,
    positions: state?.positions.length,
    orders: state?.orders.length,
    cases,
  };
  // Persist outside Playwright's output cleanup, including when cleanup itself fails.
  const destination = join(session.directory, `report-${journal.id}.json`);
  await writeFile(destination, JSON.stringify(report, null, 2), { mode: 0o600 });
  await mkdir("test-results/funded", { recursive: true });
  await writeFile("test-results/funded/cost-report.json", JSON.stringify(report, null, 2), { mode: 0o600 });
  console.table(cases);
  console.log(
    JSON.stringify(
      { cleanupCompleted: report.cleanupCompleted, reservedFeesUsd: report.reservedFeesUsd, report: destination },
      null,
      2
    )
  );
  return report;
}
