import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";
import { createServer } from "vite";
import * as wasm from "@gmsol-labs/gmsol-sdk/index_bg.js";
import { withoutLookupTables } from "./lookupTableConfiguration.mjs";

const { values } = parseArgs({
  options: {
    wallet: { type: "string" },
    "api-url": { type: "string", default: "https://solana.gmxapi.io" },
    market: { type: "string", default: "Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8" },
  },
});
assert.ok(values.wallet, "Provide --wallet with the selected public Solana account");
const api = new URL(values["api-url"]);
assert.ok(
  (api.protocol === "http:" && ["localhost", "127.0.0.1"].includes(api.hostname)) ||
    api.origin === "https://solana.gmxapi.io"
);
assert.equal(api.username + api.password + api.search + api.hash, "");
// Browser environment plumbing for Node only; no persisted session or wallet access.
globalThis.self = globalThis;
globalThis.location = new URL("http://localhost:3016");
globalThis.window = globalThis.self;
globalThis.localStorage = { getItem: () => null };
globalThis.module = { require: createRequire(import.meta.url) };
const rpcUrl = process.env.TRD136_RPC_URL;
assert.ok(rpcUrl, "Set TRD136_RPC_URL to an authorized read/simulation RPC endpoint");
const root = process.cwd();
const report = {
  at: new Date().toISOString(),
  owner: values.wallet,
  signed: false,
  broadcast: false,
  diagnosticOnly: true,
  browserAcceptance: false,
  lookupTables: [],
  adapters:
    "Node loads the hash-verified WASM directly and uses createSolanaRpc without the browser health tracker; production prepare, builder, validator and pre-signature checks execute unchanged",
  hypotheticalInputs: { collateralUsdc: "3", sizeUsd: "6", slippageBps: 100, limitDistanceBps: 500 },
  results: [],
};
const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  cacheDir: path.join(root, ".local/trd-136/simulate-cache"),
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true },
  plugins: [
    withoutLookupTables(root),
    {
      name: "trd136-node-diagnostic-adapters",
      enforce: "pre",
      transform(source, id) {
        if (id === path.join(root, "src/config/ab.ts")) return "export const getIsSolanaNetworkEnabled = () => true;";
        if (id === path.join(root, "src/domain/gmsol/loadGmsolSdk.ts"))
          return "export async function loadGmsolSdk(){return globalThis.__trd136Wasm;}";
        if (id === path.join(root, "src/lib/solana/rpc.ts"))
          return `import {createSolanaRpc} from '@solana/kit'; const rpc=createSolanaRpc(${JSON.stringify(rpcUrl)}); export const getSolanaRpc=()=>rpc; export async function fetchSolanaAccounts(keys){if(!keys.length)return [];return (await rpc.getMultipleAccounts(keys,{encoding:'base64',commitment:'confirmed'}).send()).value;}`;
      },
    },
  ],
});
try {
  const { GMSOL_SDK_WASM_SHA256 } = await server.ssrLoadModule("/src/config/gmsol/sdk.ts");
  const bytes = await readFile("node_modules/@gmsol-labs/gmsol-sdk/index_bg.wasm");
  report.wasmSha256 = createHash("sha256").update(bytes).digest("hex");
  assert.equal(report.wasmSha256, GMSOL_SDK_WASM_SHA256);
  const { instance } = await WebAssembly.instantiate(bytes, { "./index_bg.js": wasm });
  wasm.__wbg_set_wasm(instance.exports);
  instance.exports.__wbindgen_start();
  globalThis.__trd136Wasm = wasm;
  const { getSolanaRpc } = await server.ssrLoadModule("/src/lib/solana/rpc.ts");
  assert.equal(await getSolanaRpc().getGenesisHash().send(), "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d");
  const { GMSOL_MARKETS } = await server.ssrLoadModule("/src/config/gmsol/markets.ts");
  const { GMSOL_TOKENS } = await server.ssrLoadModule("/src/config/gmsol/tokens.ts");
  const { buildGmsolTokenPrices } = await server.ssrLoadModule("/src/domain/gmsol/gmsolOracleUtils.ts");
  const { fetchSolanaTradingEnabled } = await server.ssrLoadModule("/src/domain/gmsol/fetchSolanaTradingEnabled.ts");
  const { prepareGmsolOrderTransactions, checkGmsolTransactionBeforeSignature } = await server.ssrLoadModule(
    "/src/domain/gmsol/transactions/sendOrderTransactions.ts"
  );
  const market = GMSOL_MARKETS.find((m) => m.marketTokenAddress === values.market);
  assert.ok(market);
  report.market = market.marketTokenAddress;
  for (const kind of ["MarketIncrease", "LimitIncrease"])
    for (const isLong of [true, false]) {
      const result = { kind, isLong };
      report.results.push(result);
      try {
        const response = await fetch(`${api.origin}/v1/markets/config`, { signal: AbortSignal.timeout(10000) });
        assert.ok(response.ok, "Fresh market data is unavailable");
        const current = (await response.json()).find((m) => m.marketTokenAddress === market.marketTokenAddress);
        assert.ok(
          current?.tradeMath === "gmsol" && !current.isDisabled,
          "The real target market is not enabled with gmsol math"
        );
        assert.ok(await fetchSolanaTradingEnabled(), "Solana trading is disabled");
        const tickerResponse = await fetch("https://arbitrum-api.gmxinfra.io/prices/tickers", {
          signal: AbortSignal.timeout(10000),
        });
        assert.ok(tickerResponse.ok);
        const prices = buildGmsolTokenPrices(await tickerResponse.json(), [market.indexTokenAddress]);
        const price = prices[market.indexTokenAddress];
        assert.ok(
          price &&
            price.minPrice > 0n &&
            price.maxPrice >= price.minPrice &&
            Date.now() - price.updatedAt <= 10000 &&
            price.updatedAt <= Date.now(),
          "Fresh valid index price required"
        );
        const reference = isLong ? price.maxPrice : price.minPrice;
        const order = {
          kind,
          market,
          collateralToken: market.shortTokenAddress,
          indexTokenDecimals: GMSOL_TOKENS.find((t) => t.address === market.indexTokenAddress).decimals,
          isLong,
          sizeDeltaUsd: 6n * 10n ** 30n,
          collateralDeltaAmount: 3000000n,
          minOutput: 0n,
          acceptablePrice: (reference * (isLong ? 10100n : 9900n)) / 10000n,
          triggerPrice: kind === "LimitIncrease" ? (reference * (isLong ? 9500n : 10500n)) / 10000n : undefined,
          payToken: undefined,
          payWithNativeSol: false,
          receiveToken: undefined,
          swapPath: [],
          unwrapNative: false,
          validFromTs: undefined,
          decreaseSwapType: undefined,
        };
        const plan = await prepareGmsolOrderTransactions({
          owner: values.wallet,
          action: { type: "create", orders: [order], atomic: false },
        });
        result.sizes = plan.groups.flat().map((tx) => tx.length);
        result.checks = [];
        for (const tx of plan.groups.flat())
          result.checks.push(await checkGmsolTransactionBeforeSignature({ plan, bytes: tx }));
        result.ok = true;
      } catch (error) {
        result.ok = false;
        result.error = error.message;
      }
      console.log(JSON.stringify(result, (_, v) => (typeof v === "bigint" ? String(v) : v)));
    }
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  await mkdir(".local/trd-136", { recursive: true });
  await writeFile(
    ".local/trd-136/unsigned-simulation.json",
    JSON.stringify(report, (_, v) => (typeof v === "bigint" ? String(v) : v), 2)
  );
  await server.close();

  delete globalThis.__trd136Wasm;
}
if (report.results.some((r) => !r.ok)) process.exitCode = 1;
