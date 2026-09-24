/// <reference types="node" />

import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

type ProxyEnv = 'prod' | 'beta' | 'nightly' | 'devnet';

type RpcProxyHealth = {
  ok?: boolean;
  env?: string;
  target?: string;
  simulatedOrigin?: string;
};

const proxyEnvByName = new Set<ProxyEnv>(['prod', 'beta', 'nightly', 'devnet']);
const [proxyEnvInput, viteMode] = process.argv.slice(2);
const proxyEnv = proxyEnvInput as ProxyEnv;

if (!proxyEnvByName.has(proxyEnv) || !viteMode) {
  console.error(
    'Usage: tsx scripts/startWithRpcProxy.ts <prod|beta|nightly|devnet> <vite-mode>'
  );
  process.exit(1);
}

const appDir = process.cwd();
const workspaceRoot = resolve(appDir, '..');
const rpcProxyDir = resolve(workspaceRoot, 'rpc-proxy');
const rpcProxyPort = process.env.LOCAL_RPC_PROXY_PORT ?? '9001';
const rpcProxyUrl =
  process.env.VITE_LOCAL_RPC_PROXY_ENDPOINT ??
  `http://localhost:${rpcProxyPort}/`;

let proxyProcess: ChildProcess | null = null;
let shuttingDown = false;

function isProcessRunning(child: ChildProcess): boolean {
  return child.exitCode === null && child.signalCode === null;
}

function spawnProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): ChildProcess {
  return spawn(command, args, {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: 'inherit',
  });
}

function runProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawnProcess(command, args, options);

    child.on('error', rejectRun);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(
          `${command} ${args.join(' ')} exited with ${
            signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`
          }`
        )
      );
    });
  });
}

async function getRpcProxyHealth(): Promise<RpcProxyHealth | null> {
  try {
    const response = await fetch(`${rpcProxyUrl.replace(/\/$/, '')}/__health`);

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

  if (!health) {
    return false;
  }

  if (health.env !== proxyEnv) {
    throw new Error(
      `Local RPC proxy at ${rpcProxyUrl} is already running for ${health.env ?? 'unknown'}; expected ${proxyEnv}. Stop it or use another LOCAL_RPC_PROXY_PORT.`
    );
  }

  console.log(
    `Reusing local RPC proxy at ${rpcProxyUrl} for ${health.env} (${health.simulatedOrigin ?? 'unknown origin'})`
  );

  return true;
}

async function waitForRpcProxy(): Promise<void> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (proxyProcess && !isProcessRunning(proxyProcess)) {
      throw new Error('Local RPC proxy exited before it became healthy');
    }

    try {
      const health = await getRpcProxyHealth();

      if (health?.env === proxyEnv) {
        return;
      }
    } catch {
      // The proxy process is still starting.
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
  proxyProcess.kill('SIGINT');
  await delay(500);

  if (isProcessRunning(proxyProcess)) {
    proxyProcess.kill('SIGTERM');
  }
}

async function main(): Promise<void> {
  const hasExistingProxy = await findExistingRpcProxy();

  if (hasExistingProxy) {
    proxyProcess = null;
  } else {
    proxyProcess = spawnProcess('pnpm', [`dev:local:${proxyEnv}`], {
      cwd: rpcProxyDir,
      env: {
        PORT: rpcProxyPort,
      },
    });

    proxyProcess.on('exit', (code, signal) => {
      if (!shuttingDown) {
        console.error(
          `Local RPC proxy exited unexpectedly with ${
            signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`
          }`
        );
      }
    });

    await waitForRpcProxy();
  }

  const frontendEnv = {
    VITE_LOCAL_RPC_PROXY_ENDPOINT: rpcProxyUrl,
  };

  await runProcess('pnpm', ['-w', 'build-client'], {
    cwd: appDir,
    env: frontendEnv,
  });

  await runProcess('pnpm', ['exec', 'vite', '--mode', viteMode], {
    cwd: appDir,
    env: frontendEnv,
  });
}

process.on('SIGINT', () => {
  void stopRpcProxy().finally(() => process.exit(130));
});

process.on('SIGTERM', () => {
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
