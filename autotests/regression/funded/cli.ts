import { spawn } from "node:child_process";

import { checkGasPrice } from "./gasGuard";
import { withWalletLock } from "./journal";
import { FundedSession } from "./session";

async function main() {
  const command = process.argv[2] || "plan";
  const execute = process.argv.includes("--execute");
  if (!["plan", "run", "cleanup"].includes(command)) throw new Error("Use plan, run or cleanup");
  if (process.env.REGRESSION_CHAIN_ID && process.env.REGRESSION_CHAIN_ID !== "42161")
    throw new Error("Economy funded mode supports Arbitrum only");
  const session = new FundedSession();
  if (command === "plan" || (command === "run" && !execute)) {
    console.log(JSON.stringify(await session.plan(), null, 2));
    return;
  }
  if (execute) process.env.REGRESSION_FUNDED_EXECUTE = "1";
  await withWalletLock(session.directory, async () => {
    if (command === "cleanup") {
      console.log(JSON.stringify(await session.cleanup(execute), null, 2));
      return;
    }
    const gas = await checkGasPrice({
      chainId: 42161,
      rpcUrl: session.rpcUrl,
      maxGasGwei: process.env.REGRESSION_MAX_GAS_GWEI || process.env.REGRESSION_ARBITRUM_MAX_GAS_GWEI,
    });
    if (!gas.allowed) throw new Error(`BLOCKED: ${gas.reason}`);
    const runId = await session.begin();
    let interrupted = false;
    try {
      const code = await new Promise<number>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["node_modules/@playwright/test/cli.js", "test", "-c", "playwright-funded.config.ts"],
          {
            stdio: "inherit",
            detached: process.platform !== "win32",
            env: { ...process.env, REGRESSION_FUNDED_RUN_ID: runId },
          }
        );
        let timer: ReturnType<typeof setTimeout> | undefined;
        const signal = (name: NodeJS.Signals) => {
          if (!child.pid) return;
          try {
            if (process.platform === "win32") child.kill(name);
            else process.kill(-child.pid, name);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
        };
        const stop = () => {
          interrupted = true;
          signal("SIGTERM");
          timer ??= setTimeout(() => signal("SIGKILL"), 10_000);
        };
        const remove = () => {
          process.off("SIGINT", stop);
          process.off("SIGTERM", stop);
          if (timer) clearTimeout(timer);
        };
        process.on("SIGINT", stop);
        process.on("SIGTERM", stop);
        child.on("error", (error) => {
          remove();
          reject(error);
        });
        child.on("exit", (code) => {
          remove();
          resolve(code ?? 1);
        });
      });
      process.exitCode = interrupted ? 130 : code;
    } finally {
      // Runs after assertion failures and retries as well as successful tests.
      console.log(JSON.stringify(await session.cleanup(true), null, 2));
    }
  });
}

main().catch((error) => {
  // Never print API/RPC errors, serialized payloads, signatures or environment values.
  if (error instanceof Error && !/http|0x[a-fA-F0-9]{64}|private.?key|signature/i.test(error.message)) {
    console.error(error.message.slice(0, 240));
  } else {
    console.error("Funded operation failed; key/RPC details omitted. Resolve the retained journal before another run.");
  }
  process.exitCode = 1;
});
