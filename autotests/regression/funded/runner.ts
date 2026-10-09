import { runFundedPlaywright } from "./playwright";

import { verifyFundedDeployment } from "./deployment";
import type { FundedCase } from "./catalog";
import { writeFundedReport } from "./report";
import type { FundedSession } from "./session";
import { fundedReadiness, requireFundedReadiness } from "./readiness";

export async function runFundedCases(
  session: FundedSession,
  selected: readonly FundedCase[],
  isInterrupted = () => false
) {
  if (isInterrupted()) return 130;
  const readiness = await fundedReadiness(session, selected, () => session.feeProfile);
  console.log(JSON.stringify({ preflight: readiness }, null, 2));
  requireFundedReadiness(readiness);
  if (isInterrupted()) return 130;
  await verifyFundedDeployment(session, selected);
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
    // Runs after assertion failures and retries as well as successful tests.
    try {
      console.log(JSON.stringify(await session.cleanup(true), null, 2));
    } finally {
      await writeFundedReport(session, selected);
    }
  }
}
