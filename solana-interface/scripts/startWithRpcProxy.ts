/// <reference types="node" />

import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnv } from "vite";

type RpcProxyHealth = {
  ok?: boolean;
  env?: string;
  target?: string;
  simulatedOrigin?: string;
};

const commandArgs = process.argv.slice(2);

if (commandArgs.length === 0) {
  console.error("Usage: tsx solana-interface/scripts/startWithRpcProxy.ts <command> [...args]");
  process.exit(1);
}

applyLoadedEnv(loadEnv("development", process.cwd(), ""));

const rpcProxyPort = process.env.LOCAL_RPC_PROXY_PORT ?? "9010";
const rpcProxyUrl = process.env.VITE_APP_LOCAL_RPC_PROXY_ENDPOINT ?? `http://localhost:${rpcProxyPort}/`;

let proxyProcess: ChildProcess | null = null;
let shuttingDown = false;

function applyLoadedEnv(loaded: Record<string, string>): void {
  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function isProcessRunning(child: ChildProcess): boolean {
  return child.exitCode === null && child.signalCode === null;
}

function spawnProcess(command: string, args: string[], env?: NodeJS.ProcessEnv): ChildProcess {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

function runProcess(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawnProcess(command, args, env);

    child.on("error", rejectRun);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          `${command} ${args.join(" ")} exited with ${signal ? `signal ${signal}` : `code ${code ?? "unknown"}`}`
        )
      );
    });
  });
}

async function getRpcProxyHealth(): Promise<RpcProxyHealth | null> {
  try {
    const response = await fetch(`${rpcProxyUrl.replace(/\/$/, "")}/__health`);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RpcProxyHealth;
  } catch {
    return null;
  }
}

async function findExistingRpcProxy(): Promise<boolean> {
  const health = await getRpcProxyHealth();

  if (!health?.ok) {
    return false;
  }

  console.log(
    `Reusing local RPC proxy at ${rpcProxyUrl} (${health.env ?? "nightly"}, ${health.simulatedOrigin ?? "unknown origin"})`
  );

  return true;
}

async function waitForRpcProxy(): Promise<void> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (proxyProcess && !isProcessRunning(proxyProcess)) {
      throw new Error("Local RPC proxy exited before it became healthy");
    }

    const health = await getRpcProxyHealth();

    if (health?.ok) {
      return;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for local RPC proxy at ${rpcProxyUrl}`);
}

async function stopRpcProxy(): Promise<void> {
  if (!proxyProcess || !isProcessRunning(proxyProcess) || shuttingDown) {
    return;
  }

  shuttingDown = true;
  proxyProcess.kill("SIGINT");
  await delay(500);

  if (isProcessRunning(proxyProcess)) {
    proxyProcess.kill("SIGTERM");
  }
}

async function main(): Promise<void> {
  const hasExistingProxy = await findExistingRpcProxy();

  if (hasExistingProxy) {
    proxyProcess = null;
  } else {
    proxyProcess = spawnProcess("tsx", ["solana-interface/scripts/rpc-proxy/local-proxy.ts"], {
      PORT: rpcProxyPort,
      RPC_PROXY_TARGET: process.env.RPC_PROXY_TARGET,
      RPC_PROXY_ENV: process.env.RPC_PROXY_ENV ?? "nightly",
      RPC_PROXY_ORIGIN: process.env.RPC_PROXY_ORIGIN ?? "https://nightly.gmtrade.xyz",
    });

    proxyProcess.on("exit", (code, signal) => {
      if (!shuttingDown) {
        console.error(
          `Local RPC proxy exited unexpectedly with ${signal ? `signal ${signal}` : `code ${code ?? "unknown"}`}`
        );
      }
    });

    await waitForRpcProxy();
  }

  const [command, ...args] = commandArgs;

  await runProcess(command, args, {
    VITE_APP_LOCAL_RPC_PROXY_ENDPOINT: rpcProxyUrl,
  });
}

process.on("SIGINT", () => {
  void stopRpcProxy().finally(() => process.exit(130));
});

process.on("SIGTERM", () => {
  void stopRpcProxy().finally(() => process.exit(143));
});

void (async () => {
  try {
    await main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    await stopRpcProxy();
  }
})();
