import { runFundedPlaywright } from "./playwright";

import { verifyFundedDeployment } from "./deployment";
import type { FundedCase } from "./catalog";
import { writeFundedPreflightReport, writeFundedReport, type FundedRunDetails } from "./report";
import type { FundedSession } from "./session";
import { fundedReadiness, requireFundedReadiness } from "./readiness";
import { fundedErrorMessage } from "./errors";

export async function runFundedCases(
  session: FundedSession,
  selected: readonly FundedCase[],
  isInterrupted = () => false
) {
  if (isInterrupted()) return 130;
  console.log("Checking prerequisites...");
  const readiness = await fundedReadiness(session, selected, () => session.feeProfile);
  const details: FundedRunDetails = { preflight: readiness };
  try {
    requireFundedReadiness(readiness);
    if (isInterrupted()) return 130;
    await verifyFundedDeployment(session, selected);
  } catch (error) {
    await writeFundedPreflightReport(session.directory, selected, readiness, error);
    throw error;
  }
  if (isInterrupted()) return 130;
  const runId = await session.begin();
  session.active.selectedCases = selected.map((c) => c.id);
  await session.save();
  try {
    if (isInterrupted()) return 130;
    return await runFundedPlaywright("playwright-funded.config.ts", {
      ...process.env,
      REGRESSION_FUNDED_RUN_ID: runId,
      REGRESSION_FUNDED_CASES: selected.map((c) => c.id).join(","),
    });
  } finally {
    try {
      console.log("Cleaning up...");
      details.cleanup = await session.cleanup(true);
    } catch (error) {
      details.cleanupError = fundedErrorMessage(error);
      throw error;
    } finally {
      await writeFundedReport(session, selected, details);
    }
  }
}
