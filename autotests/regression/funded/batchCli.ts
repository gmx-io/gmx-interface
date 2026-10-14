import { randomUUID } from "node:crypto";
import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { batchBalanceChange, batchOptions, createBatch, runFundedBatch } from "./batch";
import { verifyFundedDeployment } from "./deployment";
import { dollars, feePolicy } from "./economy";
import { fundedErrorMessage } from "./errors";
import { chargedFees, readJournal } from "./journal";
import { runFundedCases } from "./runner";
import { FundedSession } from "./session";
import { validateFundedTarget } from "./target";
import { displayUsd, playwrightFailure } from "./report";
import { fundedReadiness, requireFundedReadiness } from "./readiness";
import { withFundedRecovery } from "./recovery";

async function main() {
  const options = batchOptions(process.argv.slice(2));
  let batch = createBatch(options.selected, options.budgetUsd);
  const excludedCases = options.excluded.map(({ id }) => ({
    id,
    reason: "Multichain excluded from the default batch",
  }));
  if (!options.execute) {
    const readiness = await fundedReadiness(new FundedSession(), options.selected, (c) =>
      c.id === "glv" ? "glv" : "economy"
    );
    console.log(JSON.stringify({ preflight: readiness }, null, 2));
    console.log(
      JSON.stringify(
        {
          execute: false,
          excludedCases,
          budgetUsd: batch.budgetUsd,
          cases: batch.cases.map(({ id, feeProfile }) => ({
            id,
            feeProfile,
            feeAllowanceUsd: dollars(feePolicy(feeProfile).runFeeLimitUsd),
          })),
          execution:
            "With --execute, recover any unfinished run first, then run one case at a time with two retries and cleanup. Recovery fees share this batch's budget. Stops on failure or insufficient budget. This preview sends no transactions.",
        },
        null,
        2
      )
    );
    process.exitCode = readiness.ready ? 0 : 1;
    return;
  }
  if (process.env.REGRESSION_CHAIN_ID && process.env.REGRESSION_CHAIN_ID !== "42161")
    throw new Error("Economy funded mode supports Arbitrum only");
  validateFundedTarget(process.env.REGRESSION_BASE_URL);
  process.env.REGRESSION_FUNDED_EXECUTE = "1";
  const directory = new FundedSession().directory;
  const batchId = randomUUID();
  const output = join("test-results/funded-batch", batchId);
  const durable = join(directory, `batch-${batchId}.json`);
  const startedAt = new Date().toISOString();
  let preflight: Awaited<ReturnType<typeof fundedReadiness>> | undefined;
  let recoveryComplete = false;
  let interrupted = false;
  const stop = () => {
    interrupted = true;
  };
  await mkdir(output, { recursive: true, mode: 0o700 });
  const save = async () => {
    const report = JSON.stringify(
      {
        batchId,
        startedAt,
        reportedAt: new Date().toISOString(),
        excludedCases,
        preflight,
        ...batch,
        balanceChange: batchBalanceChange(batch),
        durableReport: durable,
        feeAccounting:
          "Conservative fee reservations including retries and cleanup, not actual balance loss. Market PnL and token price movements are not capped by this fee budget.",
      },
      null,
      2
    );
    await writeFile(durable, report, { mode: 0o600 });
    await writeFile(join(output, "summary.json"), report, { mode: 0o600 });
  };
  console.log(`Funded batch: ${batch.cases.length} cases, sequential, fee cap $${batch.budgetUsd}`);
  if (excludedCases.length) console.log(`Excluded: ${excludedCases.map((c) => c.id).join(", ")}`);

  try {
    await withFundedRecovery(
      new FundedSession(),
      async (recovery) => {
        recoveryComplete = true;
        batch = createBatch(options.selected, options.budgetUsd, recovery);
        console.log("Checking batch prerequisites...");
        preflight = await fundedReadiness(new FundedSession(), options.selected, (c) =>
          c.id === "glv" ? "glv" : "economy"
        );
        await save();
        requireFundedReadiness(preflight);
        await verifyFundedDeployment(new FundedSession(), options.selected);
        await copyFile("test-results/funded-deployment/playwright.json", join(output, "deployment-playwright.json"));
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
              let balanceChangeAtStartPricesUsd: string | null = null;
              console.log(
                `\n[${batch.cases.indexOf(scenario) + 1}/${batch.cases.length}] ${scenario.id}; fees reserved $${displayUsd(batch.reservedFeesUsd)} / $${batch.budgetUsd}`
              );
              try {
                exitCode = await runFundedCases(new FundedSession(scenario.feeProfile), selected, () => interrupted);
              } catch (failure) {
                error = fundedErrorMessage(failure);
              }
              const journal = await readJournal(directory);
              if (!journal || journal.id === previous?.id) {
                return {
                  exitCode: 1,
                  cleanupCompleted: previous?.completed ?? true,
                  reservedFeesUsd: "0",
                  balanceChangeAtStartPricesUsd: "0",
                  error: error ?? "Case did not create a new run journal",
                };
              }
              // Preserve each report before the next Playwright run clears its output.
              try {
                const reportPath = join(directory, `report-${journal.id}.json`);
                const costReport = JSON.parse(await readFile(reportPath, "utf8"));
                if (costReport.runId !== journal.id) throw new Error("Cost report belongs to a different run");
                balanceChangeAtStartPricesUsd = costReport.balancesUsd?.changeAtStartPrices ?? null;
                await copyFile(reportPath, join(output, `${scenario.id}.json`));
                const playwright = await readFile("test-results/funded/playwright.json", "utf8");
                const playwrightReport = JSON.parse(playwright);
                if (playwrightReport.config?.metadata?.fundedRunId !== journal.id)
                  throw new Error("Playwright report belongs to a different run");
                if (exitCode !== 0) error ??= playwrightFailure(playwrightReport);
                await writeFile(join(output, `${scenario.id}-playwright.json`), playwright, { mode: 0o600 });
                await cp("playwright-report/funded", join(output, `${scenario.id}-html`), { recursive: true });
              } catch {
                exitCode = 1;
                error ??= "Case reports could not be archived; check the retained journal";
              }
              return {
                exitCode: interrupted ? 130 : exitCode,
                cleanupCompleted: journal.completed,
                reservedFeesUsd: dollars(chargedFees(journal)),
                balanceChangeAtStartPricesUsd,
                runId: journal.id,
                htmlReport: join(output, `${scenario.id}-html`, "index.html"),
                error,
              };
            },
            save
          );
        } finally {
          process.off("SIGINT", stop);
          process.off("SIGTERM", stop);
        }
      },
      options.budgetUsd
    );
  } catch (error) {
    batch.status = "failed";
    batch.reason = fundedErrorMessage(error);
    if (!recoveryComplete) batch.accountingComplete = false;
    await save();
  }
  const count = (status: string) => batch.cases.filter((c) => c.status === status).length;
  console.log(
    `\n${batch.status.toUpperCase()}: ${count("passed")} passed, ${count("failed")} failed, ${count("blocked")} blocked, ${count("not-run")} not run; fees reserved ${batch.accountingComplete ? `$${displayUsd(batch.reservedFeesUsd)}` : "unknown"} / $${batch.budgetUsd}`
  );
  if (batch.reason) console.error(batch.reason);
  const balanceChange = batchBalanceChange(batch);
  console.log(
    balanceChange.totalUsd === null
      ? `Batch tests balance change: unknown; measured subtotal $${displayUsd(balanceChange.knownSubtotalUsd)}; missing ${balanceChange.missingCases.join(", ")}`
      : `Batch tests balance change: $${displayUsd(balanceChange.totalUsd)} (sum at each case's starting prices; includes fees and PnL)`
  );
  if (batch.recovery) console.log("Batch balance change excludes pre-run recovery; see its separate report.");
  console.log(`Report: ${join(output, "summary.json")}`);
  process.exitCode = interrupted ? 130 : batch.status === "passed" ? 0 : 1;
}

main().catch((error) => {
  console.error(fundedErrorMessage(error));
  process.exitCode = 1;
});
