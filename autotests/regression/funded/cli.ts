import { withWalletLock } from "./journal";
import { FundedSession } from "./session";
import { selectFeeProfile, selectFundedCases } from "./catalog";
import { writeFundedReport } from "./report";
import { planLiquidity } from "./liquidity";
import { fundedErrorMessage } from "./errors";
import { runFundedCases } from "./runner";
import { fundedReadiness } from "./readiness";

async function main() {
  const command = process.argv[2] || "plan";
  const execute = process.argv.includes("--execute");
  const selected = selectFundedCases(process.argv.slice(3));
  const profile = selectFeeProfile(process.argv.slice(3), selected);
  if (!["plan", "run", "cleanup", "list"].includes(command)) throw new Error("Use plan, run, cleanup or list");
  if (command === "list") {
    console.table(selected);
    return;
  }
  if (process.env.REGRESSION_CHAIN_ID && process.env.REGRESSION_CHAIN_ID !== "42161")
    throw new Error("Economy funded mode supports Arbitrum only");
  const session = new FundedSession(profile);
  if (command === "plan" || (command === "run" && !execute)) {
    const liquidity: (Awaited<ReturnType<typeof planLiquidity>> | { kind: "gm" | "glv"; quote: string })[] = [];
    for (const kind of ["gm", "glv"] as const) {
      if (!selected.some((c) => c.id === kind)) continue;
      try {
        liquidity.push(await planLiquidity(session, kind));
      } catch {
        liquidity.push({ kind, quote: "unavailable; liquidity execution is blocked" });
      }
    }
    console.log(
      JSON.stringify(
        {
          ...(await session.plan()),
          selected,
          liquidity,
          readiness: await fundedReadiness(session, selected, () => profile),
          execution:
            "Sequential; all selected cases share the displayed fee budget. Missing prerequisites fail explicitly.",
        },
        null,
        2
      )
    );
    return;
  }
  if (execute) process.env.REGRESSION_FUNDED_EXECUTE = "1";
  await withWalletLock(session.directory, async () => {
    if (command === "cleanup") {
      try {
        console.log(JSON.stringify(await session.cleanup(execute), null, 2));
      } finally {
        await writeFundedReport(session, selected);
      }
      return;
    }
    process.exitCode = await runFundedCases(session, selected);
  });
}

main().catch((error) => {
  console.error(fundedErrorMessage(error));
  process.exitCode = 1;
});
