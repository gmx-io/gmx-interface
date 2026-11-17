import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import net from "node:net";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";

const exec = promisify(execFile);
const { values } = parseArgs({
  options: {
    "api-dir": { type: "string" },
    "rpc-config": { type: "string" },
    port: { type: "string", default: "3046" },
    "index-port": { type: "string", default: "3047" },
  },
});
assert.ok(values["api-dir"], "Provide --api-dir with the reviewed gmx-api checkout");
const apiDir = path.resolve(values["api-dir"]);
const port = Number(values.port);
const indexPort = Number(values["index-port"]);
assert.ok([port, indexPort].every((n) => Number.isInteger(n) && n > 1024 && n < 65536) && port !== indexPort);
for (const selectedPort of [port, indexPort]) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(selectedPort, "127.0.0.1", resolve);
  });
  await new Promise((resolve) => probe.close(resolve));
}
let rpcUrl = process.env.TRD136_RPC_URL;
let rpcProxy;
if (!rpcUrl && values["rpc-config"]) {
  const config = JSON.parse(await readFile(values["rpc-config"], "utf8"));
  const { createProxyHandler } = await import(
    pathToFileURL(path.join(path.dirname(path.resolve(values["rpc-config"])), "proxy.mjs"))
  );
  rpcProxy = createServer(createProxyHandler({ key: process.env.SOLANA_RPC_PROXY_KEY || config.fallbackKey }));
  await new Promise((resolve, reject) => {
    rpcProxy.once("error", reject);
    rpcProxy.listen(0, "127.0.0.1", resolve);
  });
  rpcUrl = `http://127.0.0.1:${rpcProxy.address().port}`;
}
assert.ok(rpcUrl && ["http:", "https:"].includes(new URL(rpcUrl).protocol), "Provide TRD136_RPC_URL or --rpc-config");
const root = path.resolve(".local/trd-136");
await mkdir(root, { recursive: true });
const runDir = await mkdtemp(path.join(root, "api-"));
const owner = `trd136-${randomBytes(6).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const readerPassword = randomBytes(24).toString("hex");
const writerPassword = randomBytes(24).toString("hex");
const children = [];
let container;
let stopped = false;
const report = {
  owner,
  runDir,
  apiDir,
  frontendDir: process.cwd(),
  status: "starting",
  port,
  indexPort,
  startedAt: new Date().toISOString(),
};
const save = () => writeFile(path.join(runDir, "report.json"), JSON.stringify(report, null, 2));
const docker = async (...args) => {
  try {
    return await exec("docker", args, { timeout: 30000, maxBuffer: 1024 * 1024 });
  } catch {
    throw new Error(`Docker ${args[0]} failed; inspect the local daemon and task resources`);
  }
};
async function stop() {
  if (stopped) return;
  stopped = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  for (const child of children) {
    if (child.exitCode === null)
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
  if (container) {
    const { stdout } = await docker("inspect", "--format", '{{index .Config.Labels "trd136.owner"}}', container);
    assert.equal(stdout.trim(), owner);
    await docker("rm", "-f", "-v", container);
    const remaining = await docker("ps", "-aq", "--filter", `label=trd136.owner=${owner}`);
    assert.equal(remaining.stdout.trim(), "", "Owned container cleanup did not complete");
    report.containerCleanup = "passed";
  }
  if (rpcProxy) await new Promise((resolve) => rpcProxy.close(resolve));
  report.stoppedAt = new Date().toISOString();
  report.status = report.status === "failed" ? "failed" : "stopped";
  await save();
}
process.once("SIGINT", () => stop().then(() => process.exit(0)));
process.once("SIGTERM", () => stop().then(() => process.exit(0)));
async function runApi(name, file, extraEnv) {
  const log = await open(path.join(runDir, `${name}.log`), "w", 0o600);
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    NODE_ENV: "development",
    GMX_ENV: "development",
    APP_ROOT: apiDir,
    NODE_OPTIONS: "--max-old-space-size=8192",
    TZ: "UTC",
    DB_NAME: "trd136",
    DB_POOL_MAX: "4",
    DB_POOL_MIN: "0",
    ...extraEnv,
  };
  const child = spawn(
    process.execPath,
    [
      path.join(apiDir, "node_modules/tsx/dist/cli.mjs"),
      "--tsconfig",
      path.join(apiDir, "tsconfig.json"),
      path.join(apiDir, file),
    ],
    { cwd: runDir, env, detached: true, stdio: ["ignore", log.fd, log.fd] }
  );
  await log.close();
  children.push(child);
  return child;
}
try {
  const genesisResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getGenesisHash", params: [] }),
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(genesisResponse.ok, "The selected RPC is unavailable");
  const genesis = await genesisResponse.json();
  assert.equal(
    genesis.result,
    "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
    "The fixed program configuration requires Solana mainnet"
  );
  report.genesis = genesis.result;
  report.apiRevision = (await exec("git", ["-C", apiDir, "rev-parse", "HEAD"])).stdout.trim();
  const apiStatus = (await exec("git", ["-C", apiDir, "status", "--porcelain", "--untracked-files=normal"])).stdout;
  assert.equal(apiStatus, "", "Use a clean reviewed API checkout before recording runtime evidence");
  report.apiClean = true;
  report.frontendRevision = (await exec("git", ["rev-parse", "HEAD"])).stdout.trim();
  await docker("image", "inspect", "postgres:15");
  container = (
    await docker(
      "run",
      "-d",
      "--name",
      owner,
      "--label",
      `trd136.owner=${owner}`,
      "-p",
      "127.0.0.1::5432",
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "-e",
      "POSTGRES_DB=trd136",
      "postgres:15"
    )
  ).stdout.trim();
  report.container = container;
  const mapping = (await docker("port", container, "5432/tcp")).stdout.trim();
  const dbPort = Number(mapping.split(":").at(-1));
  assert.ok(Number.isInteger(dbPort));
  const connection = (user, secret) => `postgresql://${user}:${secret}@localhost:${dbPort}/trd136`;
  const deadline = Date.now() + 30000;
  while (true) {
    try {
      await docker("exec", container, "pg_isready", "-U", "postgres");
      break;
    } catch {
      assert.ok(Date.now() < deadline, "Local PostgreSQL did not become ready");
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  const migration = await runApi("migration", "scripts/migrateSolanaIndex.ts", {
    LAUNCH_MODE: "solana-indexer",
    DB_CONNECTION: connection("postgres", password),
    SOLANA_INDEX_READER_CONNECTION: connection("solana_reader", readerPassword),
    SOLANA_INDEX_WRITER_CONNECTION: connection("solana_writer", writerPassword),
  });
  const code = await Promise.race([
    new Promise((resolve, reject) => {
      migration.once("exit", resolve);
      migration.once("error", reject);
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error("Migration timed out")), 60000);
      timer.unref();
    }),
  ]);
  assert.equal(code, 0, `Migration failed; inspect ${runDir}/migration.log`);
  const indexer = await runApi("indexer", "src/index.ts", {
    LAUNCH_MODE: "solana-indexer",
    DB_CONNECTION: connection("solana_writer", writerPassword),
    RPC_URLS: rpcUrl,
    PORT: String(indexPort),
  });
  report.indexerPid = indexer.pid;
  const reader = await runApi("reader", "src/index.ts", {
    LAUNCH_MODE: "solana-read",
    DB_CONNECTION: connection("solana_reader", readerPassword),
    PORT: String(port),
  });
  report.readerPid = reader.pid;
  await save();
  console.log(JSON.stringify({ runDir, port, indexPort, owner }));
  const readyDeadline = Date.now() + 210000;
  while (Date.now() < readyDeadline) {
    assert.ok(indexer.exitCode === null && reader.exitCode === null, `API process exited; inspect ${runDir}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/markets/config`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const markets = await response.json();
        assert.ok(
          Array.isArray(markets) && markets.length > 0 && markets.every((m) => m.tradeMath === "gmsol"),
          "Compatible real markets are required"
        );
        report.status = "ready";
        report.readyAt = new Date().toISOString();
        report.marketCount = markets.length;
        report.gmsolCount = markets.filter((market) => market.tradeMath === "gmsol").length;
        await save();
        console.log(
          JSON.stringify({ status: report.status, marketCount: report.marketCount, gmsolCount: report.gmsolCount })
        );
        await Promise.race(children.slice(-2).map((child) => new Promise((resolve) => child.once("exit", resolve))));
        if (stopped) break;
        throw new Error("A runtime API process exited");
      }
    } catch (error) {
      if (report.status === "ready") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!stopped) throw new Error(`Live index did not become ready; inspect ${runDir}`);
} catch (error) {
  report.status = "failed";
  report.failure = error.message;
  await save();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await stop();
}
