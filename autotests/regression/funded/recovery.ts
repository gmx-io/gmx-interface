import assert from "node:assert/strict";

import { fundedCases } from "./catalog";
import { dollars, feePolicy, usd } from "./economy";
import { chargedFees, readJournal, withWalletLock } from "./journal";
import { writeFundedReport, type FundedRunDetails } from "./report";
import type { FundedSession } from "./session";
import { fundedErrorMessage } from "./errors";

export type FundedRecovery = {
  runId: string;
  completed: boolean;
  seconds: number;
  previousReservedFeesUsd: string;
  totalRunReservedFeesUsd: string;
  reservedFeesUsd: string;
};

// Hold the same lock through recovery and the new run; never reset the old journal's budget.
export async function withFundedRecovery<T>(
  session: Pick<FundedSession, "directory" | "resume" | "cleanup" | "snapshot">,
  start: (recovery?: FundedRecovery) => Promise<T>,
  budgetUsd?: bigint
): Promise<T> {
  assert.equal(process.env.REGRESSION_FUNDED_EXECUTE, "1", "Automatic cleanup requires --execute");
  return withWalletLock(session.directory, async () => {
    const previous = await readJournal(session.directory);
    if (!previous || previous.completed) return start();
    await session.resume(previous.id);
    const before = chargedFees(previous);
    const remaining = feePolicy(previous.feeProfile ?? "economy").runFeeLimitUsd - before;
    assert.ok(remaining >= 0n, "Previous run has exceeded its fee budget; automatic cleanup is blocked");
    assert.ok(
      budgetUsd === undefined || remaining <= budgetUsd,
      `Batch budget cannot cover the previous run's remaining $${dollars(remaining)} cleanup allowance`
    );
    console.log(`Recovering unfinished funded run ${previous.id} before starting new tests`);
    const started = Date.now();
    let recovery: FundedRecovery;
    const details: FundedRunDetails = {};
    try {
      details.cleanup = await session.cleanup(true);
      assert.ok(details.cleanup.completed, "Automatic cleanup did not complete; no new tests started");
    } catch (error) {
      details.cleanupError = fundedErrorMessage(error);
      throw error;
    } finally {
      const journal = await readJournal(session.directory);
      assert.ok(journal && journal.id === previous.id, "Recovery journal changed unexpectedly");
      const after = chargedFees(journal);
      assert.ok(after >= before, "Recovery fee accounting decreased unexpectedly");
      recovery = {
        runId: previous.id,
        completed: journal.completed,
        seconds: Math.round((Date.now() - started) / 1000),
        previousReservedFeesUsd: dollars(before),
        totalRunReservedFeesUsd: dollars(after),
        reservedFeesUsd: dollars(after - before),
      };
      await writeFundedReport(session, fundedCases, { ...details, recovery });
    }
    assert.ok(recovery.completed, "Automatic cleanup journal is incomplete; no new tests started");
    assert.ok(
      usd(recovery.reservedFeesUsd) <= remaining,
      "Recovery exceeded the previous run's fee budget; no new tests started"
    );
    return start(recovery);
  });
}
