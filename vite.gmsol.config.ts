import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";

import { GMSOL_SDK_ASSET_PATH, GMSOL_SDK_WASM_SHA256 } from "./src/config/gmsol/sdk";

const require = createRequire(import.meta.url);

export default defineConfig({
  publicDir: false,
  base: "./",
  plugins: [
    {
      name: "gmsol-sdk-wasm-integrity",
      buildStart() {
        const wasm = readFileSync(require.resolve("@gmsol-labs/gmsol-sdk/index_bg.wasm"));
        if (createHash("sha256").update(wasm).digest("hex") !== GMSOL_SDK_WASM_SHA256) {
          this.error("The gmsol SDK WASM does not match the approved production binary.");
        }
      },
    },
  ],
  build: {
    outDir: path.resolve(__dirname, "public", GMSOL_SDK_ASSET_PATH),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      input: path.resolve(__dirname, "src/domain/gmsol/sdk-entry.js"),
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        entryFileNames: "entry.js",
      },
    },
  },
});
