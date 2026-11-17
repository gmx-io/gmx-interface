import assert from "node:assert/strict";
import path from "node:path";
import { parseArgs } from "node:util";
import { build, createServer } from "vite";

const { values } = parseArgs({
  options: {
    "api-url": { type: "string", default: "http://127.0.0.1:3046" },
    port: { type: "string", default: "3016" },
  },
});
const api = new URL(values["api-url"]);
assert.ok(
  api.protocol === "http:" && ["127.0.0.1", "localhost"].includes(api.hostname),
  "The local API must use loopback HTTP"
);
assert.equal(api.username + api.password + api.search + api.hash, "");
const port = Number(values.port);
assert.ok(Number.isInteger(port) && port > 1024 && port < 65536);
const root = process.cwd();
// Match the normal app startup: verify and bundle the pinned SDK before serving it.
await build({ root, configFile: path.join(root, "vite.gmsol.config.ts") });
const apiConfig = path.join(root, "sdk/src/configs/api.ts");
const lutConfig = path.join(root, "src/config/gmsol/lookupTables.ts");
const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", port, strictPort: true, open: false },
  plugins: [
    {
      name: "trd136-isolated-configuration",
      enforce: "pre",
      transform(source, id) {
        if (id.split("?")[0] === apiConfig) {
          const configuredHost = '"https://solana.gmxapi.io"';
          assert.equal(
            source.split(configuredHost).length,
            2,
            "Review the changed Solana API configuration before continuing"
          );
          return source.replace(configuredHost, JSON.stringify(api.origin));
        }
        if (id.split("?")[0] === lutConfig) {
          return "export const GMSOL_LOOKUP_TABLE_ADDRESSES = []; export const GMSOL_LOOKUP_TABLE_AUTHORITIES = {};";
        }
      },
    },
  ],
});
await server.listen();
console.log(
  JSON.stringify({
    frontendDir: root,
    url: `http://127.0.0.1:${port}`,
    api: api.origin,
    lookupTables: [],
    configurationOnly: true,
  })
);
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close().then(() => process.exit(0)));
