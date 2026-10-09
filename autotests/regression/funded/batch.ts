import { selectFundedCases, type FundedCase } from "./catalog";
import { dollars, feePolicy, usd, type FeeProfile } from "./economy";
import { fundedErrorMessage } from "./errors";

export type BatchCaseResult = {
  exitCode: number;
  cleanupCompleted: boolean;
  reservedFeesUsd: string | null;
  runId?: string;
  error?: string;
};

export type BatchCase = {
  id: FundedCase["id"];
  feeProfile: FeeProfile;
  status: "not-run" | "running" | "passed" | "failed" | "blocked";
  seconds?: number;
  result?: BatchCaseResult;
};

export type FundedBatch = {
  status: "running" | "passed" | "failed" | "blocked";
  budgetUsd: string;
  reservedFeesUsd: string;
  accountingComplete: boolean;
  reason?: string;
  cases: BatchCase[];
};

export function batchOptions(args: string[]) {
  let budget = "5";
  const selection: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--budget-usd") {
      if (args.indexOf("--budget-usd") !== i) throw new Error("Supply --budget-usd once");
      budget = args[++i];
      if (!budget || !/^\d+(?:\.\d{1,2})?$/.test(budget))
        throw new Error("--budget-usd must be a positive dollar amount with at most two decimal places");
    } else if (args[i] === "--fee-profile") {
      throw new Error("The sequential runner uses the GLV profile only for the GLV case");
    } else selection.push(args[i]);
  }
  const budgetUsd = usd(budget);
  if (budgetUsd <= 0n) throw new Error("--budget-usd must be positive");
  const explicitSelection = selection.includes("--case") || selection.includes("--group");
  const selected = selectFundedCases(explicitSelection ? selection : [...selection, "--group", "all"]);
  return { budgetUsd, selected, execute: selection.includes("--execute") };
}

export function createBatch(selected: readonly FundedCase[], budgetUsd: bigint): FundedBatch {
  if (budgetUsd <= 0n) throw new Error("Batch fee budget must be positive");
  return {
    status: "running",
    budgetUsd: dollars(budgetUsd),
    reservedFeesUsd: "0",
    accountingComplete: true,
    cases: selected.map(({ id }) => ({
      id,
      feeProfile: id === "glv" ? "glv" : "economy",
      status: "not-run",
    })),
  };
}

export async function runFundedBatch(
  batch: FundedBatch,
  runCase: (scenario: BatchCase) => Promise<BatchCaseResult>,
  save: (batch: FundedBatch) => Promise<void>
) {
  let charged = 0n;
  await save(batch);
  for (const scenario of batch.cases) {
    const allowance = feePolicy(scenario.feeProfile).runFeeLimitUsd;
    if (charged + allowance > usd(batch.budgetUsd)) {
      scenario.status = "blocked";
      batch.status = "blocked";
      batch.reason = `Remaining batch budget cannot cover the $${dollars(allowance)} allowance including cleanup for ${scenario.id}`;
      break;
    }
    scenario.status = "running";
    await save(batch);
    const started = Date.now();
    try {
      scenario.result = await runCase(scenario);
    } catch (error) {
      scenario.result = {
        exitCode: 1,
        cleanupCompleted: false,
        reservedFeesUsd: null,
        error: fundedErrorMessage(error),
      };
    }
    scenario.seconds = Math.round((Date.now() - started) / 1000);
    const result = scenario.result;
    let reservation: bigint | undefined;
    if (result.reservedFeesUsd !== null && /^\d+(?:\.\d{1,30})?$/.test(result.reservedFeesUsd))
      reservation = usd(result.reservedFeesUsd);
    if (reservation === undefined) batch.accountingComplete = false;
    else charged += reservation;
    batch.reservedFeesUsd = dollars(charged);
    const passed =
      result.exitCode === 0 && result.cleanupCompleted && reservation !== undefined && reservation <= allowance;
    scenario.status = passed ? "passed" : "failed";
    if (!passed) {
      batch.status = "failed";
      batch.reason = result.error ?? `Stopped after ${scenario.id}; check its result, fee accounting and cleanup`;
      break;
    }
    await save(batch);
  }
  if (batch.status === "running") batch.status = "passed";
  await save(batch);
  return batch;
}
