import { selectFundedCases, type FundedCase } from "./catalog";
import { dollars, feePolicy, usd, type FeeProfile } from "./economy";
import { fundedErrorMessage } from "./errors";
import type { FundedRecovery } from "./recovery";

export type BatchCaseResult = {
  exitCode: number;
  cleanupCompleted: boolean;
  reservedFeesUsd: string | null;
  balanceChangeAtStartPricesUsd?: string | null;
  runId?: string;
  htmlReport?: string;
  error?: string;
};

type BatchCase = {
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
  recovery?: FundedRecovery;
  cases: BatchCase[];
};

export function batchBalanceChange(batch: FundedBatch) {
  let total = 0n;
  const missingCases: string[] = [];
  for (const scenario of batch.cases) {
    if (!scenario.result && scenario.status !== "running") continue;
    const amount = scenario.result?.balanceChangeAtStartPricesUsd;
    if (typeof amount !== "string" || !/^-?\d+(?:\.\d{1,30})?$/.test(amount)) missingCases.push(scenario.id);
    else total += usd(amount);
  }
  return {
    totalUsd: missingCases.length ? null : dollars(total),
    knownSubtotalUsd: dollars(total),
    missingCases,
    scope:
      "Sum of Arbitrum ETH/WETH/USDC changes at each case's starting prices; includes fees and PnL, excludes pre-run recovery and Base balances.",
  };
}

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
  const requested = selectFundedCases(explicitSelection ? selection : [...selection, "--group", "all"]);
  const excluded = explicitSelection ? [] : requested.filter((c) => c.group === "bridge");
  const selected = requested.filter((c) => !excluded.includes(c));
  return { budgetUsd, selected, excluded, execute: selection.includes("--execute") };
}

export function createBatch(
  selected: readonly FundedCase[],
  budgetUsd: bigint,
  recovery?: FundedRecovery
): FundedBatch {
  if (budgetUsd <= 0n) throw new Error("Batch fee budget must be positive");
  if (
    recovery &&
    (!recovery.completed || usd(recovery.reservedFeesUsd) < 0n || usd(recovery.reservedFeesUsd) > budgetUsd)
  )
    throw new Error("Recovery must complete within the batch budget before starting tests");
  return {
    status: "running",
    budgetUsd: dollars(budgetUsd),
    reservedFeesUsd: recovery?.reservedFeesUsd ?? "0",
    accountingComplete: true,
    recovery,
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
  let charged = usd(batch.recovery?.reservedFeesUsd ?? "0");
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
