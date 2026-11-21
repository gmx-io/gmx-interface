import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { transformSync } from "esbuild";

import { playgroundConfiguration } from "../playgroundConfiguration.mjs";

test("preserves playground RPC purposes in the app and Worker after the proxy migration TRD-136", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "playground-rpc-"));
  try {
    const names = ["DEVELOPMENT", "FALLBACK", "LARGE_ACCOUNT", "EXPRESS"];
    const previous = names.map((name) => process.env[`PLAYGROUND_ALCHEMY_${name}_KEY`]);
    names.forEach((name) => delete process.env[`PLAYGROUND_ALCHEMY_${name}_KEY`]);
    let config;
    try {
      writeFileSync(
        path.join(root, ".env.playground.local"),
        names.map((name, index) => `PLAYGROUND_ALCHEMY_${name}_KEY=test-key-${index}`).join("\n")
      );
      config = playgroundConfiguration(root);
    } finally {
      names.forEach((name, index) => {
        const key = `PLAYGROUND_ALCHEMY_${name}_KEY`;
        if (previous[index] === undefined) delete process.env[key];
        else process.env[key] = previous[index];
      });
    }
    const source = readFileSync("src/config/rpc.ts", "utf8");
    const worker = { worker: { plugins: () => [{ name: "existing-worker-plugin" }] } };
    config.plugins[1].config(worker);
    assert.equal(worker.worker.plugins()[0].name, "existing-worker-plugin");
    const context = {
      error: (message) => {
        throw new Error(message);
      },
    };
    const main = config.plugins[2].transform.call(context, source, path.join(root, "src/config/rpc.ts"));
    const transformedWorker = worker.worker
      .plugins()[1]
      .transform.call(context, source, path.join(root, "src/config/rpc.ts"));
    assert.equal(main.code, transformedWorker.code);
    assert.equal(main.map.sourcesContent[0], main.code);
    assert.throws(
      () =>
        config.plugins[2].transform.call(
          context,
          source.replace("rpc.gmx.io", "changed.example"),
          path.join(root, "src/config/rpc.ts")
        ),
      /no longer matches/
    );
    const ids = readFileSync("sdk/src/configs/chainIds.ts", "utf8");
    const constants = Object.fromEntries(
      [...ids.matchAll(/export const (\w+) = (\d+);/g)].map(([, name, value]) => [name, Number(value)])
    );
    constants.SOLANA_NETWORK_ID = Number(
      readFileSync("sdk/src/configs/chains.ts", "utf8").match(/SOLANA_NETWORK_ID = (-?\d+)/)[1]
    );
    const provider = main.code.slice(
      main.code.indexOf("function getProxyProvider("),
      main.code.indexOf("const SELF_EXPLANATORY_HOSTNAMES")
    );
    const compiled = transformSync(provider, { loader: "ts", target: "es2022" }).code;
    const networks = [
      "solana-mainnet",
      "arb-mainnet",
      "avax-mainnet",
      "megaeth-mainnet",
      "arb-sepolia",
      "base-mainnet",
      "opt-sepolia",
      "eth-sepolia",
      "bnb-mainnet",
      "eth-mainnet",
    ];
    const chains = [
      "SOLANA_NETWORK_ID",
      "ARBITRUM",
      "AVALANCHE",
      "MEGAETH",
      "ARBITRUM_SEPOLIA",
      "SOURCE_BASE_MAINNET",
      "SOURCE_OPTIMISM_SEPOLIA",
      "SOURCE_SEPOLIA",
      "SOURCE_BSC_MAINNET",
      "SOURCE_ETHEREUM_MAINNET",
    ];
    for (const development of [false, true])
      for (const productionRoutes of [false, true]) {
        const getProvider = new Function(
          ...Object.keys(constants),
          "isDevelopment",
          "_debugRpcTracker",
          "RpcDebugFlags",
          `${compiled}; return getProxyProvider;`
        )(
          ...Object.values(constants),
          () => development,
          { getFlag: () => productionRoutes },
          { UseProductionRpcRoutes: "production" }
        );
        for (const [index, chain] of chains.entries())
          for (const [purposeIndex, purpose] of ["fallback", "largeAccount", "express"].entries())
            for (const type of ["http", "ws"]) {
              const keyIndex = development && !productionRoutes ? 0 : purposeIndex + 1;
              assert.deepEqual(getProvider(constants[chain], purpose, type), {
                url: `${type === "ws" ? "wss" : "https"}://${networks[index]}.g.alchemy.com/v2/test-key-${keyIndex}`,
                purpose,
                isPublic: false,
              });
            }
      }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
