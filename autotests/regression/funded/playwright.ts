import { spawn } from "node:child_process";

export async function runFundedPlaywright(config: string, env: NodeJS.ProcessEnv) {
  let interrupted = false;
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "-c", config], {
      stdio: "inherit",
      detached: process.platform !== "win32",
      env,
    });
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
      resolve(interrupted ? 130 : code ?? 1);
    });
  });
}
