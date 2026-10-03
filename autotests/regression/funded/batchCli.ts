import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { batchOptions, createBatch, runFundedBatch } from "./batch";
import { verifyFundedDeployment } from "./deployment";
import { dollars, feePolicy } from "./economy";
import { fundedErrorMessage } from "./errors";
import { chargedFees, readJournal, withWalletLock } from "./journal";
import { runFundedCases } from "./runner";
import { FundedSession } from "./session";
import { validateFundedTarget } from "./target";
import { playwrightFailure } from "./report";
import { fundedReadiness, requireFundedReadiness } from "./readiness";

async function main() {
  const options = batchOptions(process.argv.slice(2));
  const batch = createBatch(options.selected, options.budgetUsd);
  const readiness = await fundedReadiness(new FundedSession(), options.selected, (c) =>
    c.id === "glv" ? "glv" : "economy"
  );
  console.log(JSON.stringify({ preflight: readiness }, null, 2));
  if (!options.execute) {
    console.log(
      JSON.stringify(
        {
          execute: false,
          budgetUsd: batch.budgetUsd,
          cases: batch.cases.map(({ id, feeProfile }) => ({
            id,
            feeProfile,
            feeAllowanceUsd: dollars(feePolicy(feeProfile).runFeeLimitUsd),
          })),
          execution:
            "One case at a time, two retries, cleanup before the next case. Stops on failure or when remaining total budget cannot cover the next case's full allowance. Use --execute to send transactions.",
        },
        null,
        2
      )
    );
    process.exitCode = readiness.ready ? 0 : 1;
    return;
  }
  requireFundedReadiness(readiness);
  await verifyFundedDeployment(new FundedSession(), options.selected);
  if (process.env.REGRESSION_CHAIN_ID && process.env.REGRESSION_CHAIN_ID !== "42161")
    throw new Error("Economy funded mode supports Arbitrum only");
  validateFundedTarget(process.env.REGRESSION_BASE_URL);
  process.env.REGRESSION_FUNDED_EXECUTE = "1";
  const directory = new FundedSession().directory;
  const batchId = randomUUID();
  const output = join("test-results/funded-batch", batchId);
  const durable = join(directory, `batch-${batchId}.json`);
  const startedAt = new Date().toISOString();
  let interrupted = false;
  const stop = () => {
    interrupted = true;
  };

  await withWalletLock(directory, async () => {
    await mkdir(output, { recursive: true, mode: 0o700 });
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    try {
      await runFundedBatch(
        batch,
        async (scenario) => {
          if (interrupted) throw new Error("Sequential funded run interrupted; no further cases started");
          const previous = await readJournal(directory);
          const selected = options.selected.filter((c) => c.id === scenario.id);
          let exitCode = 1;
          let error: string | undefined;
          console.log(`\nFunded case ${scenario.id}; batch reserved $${batch.reservedFeesUsd} / $${batch.budgetUsd}`);
          try {
            exitCode = await runFundedCases(new FundedSession(scenario.feeProfile), selected, () => interrupted);
          } catch (failure) {
            error = fundedErrorMessage(failure);
            console.error(error);
          }
          const journal = await readJournal(directory);
          if (!journal || journal.id === previous?.id) {
            return {
              exitCode: 1,
              cleanupCompleted: previous?.completed ?? true,
              reservedFeesUsd: "0",
              error: error ?? "Case did not create a new run journal",
            };
          }
          // Preserve each report before the next Playwright run clears its output.
          try {
            await copyFile(join(directory, `report-${journal.id}.json`), join(output, `${scenario.id}.json`));
            const playwright = await readFile("test-results/funded/playwright.json", "utf8");
            const playwrightReport = JSON.parse(playwright);
            if (playwrightReport.config?.metadata?.fundedRunId !== journal.id)
              throw new Error("Playwright report belongs to a different run");
            if (exitCode !== 0) error ??= playwrightFailure(playwrightReport);
            await writeFile(join(output, `${scenario.id}-playwright.json`), playwright, { mode: 0o600 });
          } catch {
            exitCode = 1;
            error ??= "Case reports could not be archived; check the retained journal";
          }
          return {
            exitCode: interrupted ? 130 : exitCode,
            cleanupCompleted: journal.completed,
            reservedFeesUsd: dollars(chargedFees(journal)),
            runId: journal.id,
            error,
          };
        },
        async (state) => {
          const report = JSON.stringify(
            {
              batchId,
              startedAt,
              reportedAt: new Date().toISOString(),
              ...state,
              feeAccounting:
                "Conservative fee reservations including retries and cleanup, not actual balance loss. Market PnL and token price movements are not capped by this fee budget.",
            },
            null,
            2
          );
          await writeFile(durable, report, { mode: 0o600 });
          await writeFile(join(output, "summary.json"), report, { mode: 0o600 });
        }
      );
    } finally {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
    }
  });
  console.table(
    batch.cases.map(({ id, status, seconds, result }) => ({
      id,
      status,
      seconds,
      reservedFeesUsd: result?.reservedFeesUsd,
      cleanupCompleted: result?.cleanupCompleted,
    }))
  );
  console.log(
    JSON.stringify(
      {
        status: batch.status,
        reservedFeesUsd: batch.reservedFeesUsd,
        reason: batch.reason,
        report: join(output, "summary.json"),
        durableReport: durable,
      },
      null,
      2
    )
  );
  process.exitCode = interrupted ? 130 : batch.status === "passed" ? 0 : 1;
}

main().catch((error) => {
  console.error(fundedErrorMessage(error));
  process.exitCode = 1;
});
