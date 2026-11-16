import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { fundedCases, type FundedCase } from "./catalog";
import { dollars } from "./economy";
import { chargedFees, readJournal, type FundedJournal } from "./journal";
import type { FundedSession } from "./session";
import { fundedErrorMessage } from "./errors";
import type { fundedReadiness } from "./readiness";
import type { FundedRecovery } from "./recovery";

export type FundedRunDetails = {
  preflight?: Awaited<ReturnType<typeof fundedReadiness>>;
  cleanup?: Awaited<ReturnType<FundedSession["cleanup"]>>;
  cleanupError?: string;
  recovery?: FundedRecovery;
};

export function displayUsd(value: string) {
  return Number(value).toFixed(4);
}

export async function writeFundedPreflightReport(
  directory: string,
  selected: readonly FundedCase[],
  preflight: FundedRunDetails["preflight"],
  error: unknown
) {
  const destination = join(directory, `preflight-${randomUUID()}.json`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(
    destination,
    JSON.stringify(
      { reportedAt: new Date().toISOString(), selected, preflight, error: fundedErrorMessage(error) },
      null,
      2
    ),
    { mode: 0o600 }
  );
  console.log(`Preflight report: ${destination}`);
}

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

export async function writeFundedReport(
  session: Pick<FundedSession, "directory" | "snapshot">,
  selected: readonly FundedCase[],
  details: FundedRunDetails = {}
) {
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
      actionDriver: actions.some((action) => action.purpose.startsWith("ui:"))
        ? "browser UI"
        : actions.length
          ? "SDK/API"
          : "not-run",
      uiOrders: actions
        .filter((action) => action.uiOrder?.createdCount)
        .map((action) => ({
          purpose: action.purpose,
          orderKeys: action.orderKeys,
          creationTxHash: action.txHash,
          executionTxHashes: action.uiOrder?.executionTxHashes,
        })),
      reservedFeesUsd: dollars(actions.reduce((sum, a) => sum + BigInt(a.feeUsd), 0n)),
      nativeReceiptGasUsd: dollars(actions.reduce((sum, a) => sum + BigInt(a.gasPaidUsd ?? "0"), 0n)),
      failures: actions
        .filter((action) => action.failureReason)
        .map(({ purpose, requestId, failureReason }) => ({ purpose, requestId, reason: failureReason })),
    };
  });
  const report = {
    runId: journal.id,
    createdAt: journal.createdAt,
    reportedAt: new Date().toISOString(),
    cleanupCompleted: journal.completed,
    feeProfile: journal.feeProfile ?? "economy",
    targetNativeBps: journal.targetNativeBps,
    reservedFeesUsd: dollars(chargedFees(journal)),
    feeAccounting:
      "Conservative reservations; native receipt gas is a subset. Balance value change includes price movement and PnL.",
    balancesUsd: state ? fundedBalanceValues(state, journal) : undefined,
    positions: state?.positions.length,
    orders: state?.orders.length,
    cases,
    ...details,
  };
  // Persist outside Playwright's output cleanup, including when cleanup itself fails.
  const destination = join(session.directory, `report-${journal.id}.json`);
  await writeFile(destination, JSON.stringify(report, null, 2), { mode: 0o600 });
  await mkdir("test-results/funded", { recursive: true });
  await writeFile("test-results/funded/cost-report.json", JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(
    `Cleanup ${report.cleanupCompleted ? "complete" : "INCOMPLETE"}; ${report.positions ?? "unknown"} positions, ${report.orders ?? "unknown"} orders; fees reserved $${displayUsd(report.reservedFeesUsd)}`
  );
  if (report.balancesUsd?.changeAtStartPrices !== undefined)
    console.log(
      `Run balance change (${cases.length === 1 ? cases[0].id : `${cases.length} cases`}, at starting prices): $${displayUsd(report.balancesUsd.changeAtStartPrices)} (includes fees and PnL)`
    );
  console.log(`Report: ${destination}`);
  return report;
}
