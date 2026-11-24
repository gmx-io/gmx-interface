import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
globalThis.module = { require: createRequire(import.meta.url) };
import { createServer } from "vite";
import * as wasm from "@gmsol-labs/gmsol-sdk/index_bg.js";

// Offline encoding measurement only. The generated identity is never funded, signed or sent.
const root = process.cwd();
await mkdir(".local/trd-136", { recursive: true });
const server = await createServer({
  cacheDir: path.join(root, ".local/trd-136/measure-cache"),
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  root,
  configFile: path.join(root, "vite.config.ts"),
  server: { middlewareMode: true },
  plugins: [
    {
      name: "offline-measurement-flag",
      enforce: "pre",
      transform(source, id) {
        if (id === path.join(root, "src/config/ab.ts")) return "export const getIsSolanaNetworkEnabled = () => true;";
      },
    },
  ],
});
try {
  const { GMSOL_SDK_WASM_SHA256 } = await server.ssrLoadModule("/src/config/gmsol/sdk.ts");
  const { GMSOL_MARKETS } = await server.ssrLoadModule("/src/config/gmsol/markets.ts");
  const { buildGmsolOrderTransactions } = await server.ssrLoadModule(
    "/src/domain/gmsol/transactions/buildOrderTransactions.ts"
  );
  const bytes = await readFile("node_modules/@gmsol-labs/gmsol-sdk/index_bg.wasm");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), GMSOL_SDK_WASM_SHA256);
  const { instance } = await WebAssembly.instantiate(bytes, { "./index_bg.js": wasm });
  wasm.__wbg_set_wasm(instance.exports);
  instance.exports.__wbindgen_start();
  const key = new wasm.Keypair();
  const owner = key.pubkey().toString();
  key.free();
  const market = GMSOL_MARKETS.find((m) => m.marketTokenAddress === "Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8");
  assert.ok(market);
  const results = [];
  for (const kind of ["MarketIncrease", "LimitIncrease"])
    for (const isLong of [true, false]) {
      const order = {
        kind,
        market,
        collateralToken: market.longTokenAddress,
        indexTokenDecimals: 8,
        isLong,
        sizeDeltaUsd: 10n ** 31n,
        collateralDeltaAmount: 5000000n,
        minOutput: 0n,
        acceptablePrice: 100000n * 10n ** 30n,
        triggerPrice: kind === "LimitIncrease" ? 90000n * 10n ** 30n : undefined,
        payToken: undefined,
        payWithNativeSol: false,
        receiveToken: undefined,
        swapPath: [],
        unwrapNative: false,
        validFromTs: undefined,
        decreaseSwapType: undefined,
      };
      const plan = await buildGmsolOrderTransactions({
        owner,
        action: { type: "create", orders: [order] },
        recentBlockhash: "11111111111111111111111111111111",
        lastValidBlockHeight: 1n,
        lookupTables: {},
        sdk: wasm,
      });
      const sizes = plan.groups.flat().map((tx) => tx.length);
      assert.ok(sizes.every((size) => size <= 1232));
      results.push({ kind, isLong, sizes, validated: true });
    }
  const report = {
    offlineMeasurement: true,
    runtimeAcceptance: false,
    generatedIdentity: true,
    pricesAndAmounts: "fixed offline encoding inputs; never use as live trading inputs",
    wasmSha256: GMSOL_SDK_WASM_SHA256,
    market: market.marketTokenAddress,
    lookupTables: [],
    results,
  };
  await writeFile(".local/trd-136/no-lut-size.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await server.close();
}
