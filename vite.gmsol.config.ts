import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";

import { GMSOL_SDK_ASSET_PATH, GMSOL_SDK_WASM_SHA256 } from "./src/config/gmsol/sdk";
import sdkBuild from "./vendor/gmsol-sdk/build.json";

const require = createRequire(import.meta.url);

export default defineConfig({
  publicDir: false,
  base: "./",
  plugins: [
    {
      name: "gmsol-sdk-wasm-integrity",
      buildStart() {
        if (sdkBuild.files["index_bg.wasm"] !== GMSOL_SDK_WASM_SHA256) {
          this.error("The gmsol SDK build manifest does not match the approved WASM hash.");
        }
        const sdkDir = path.dirname(require.resolve("@gmsol-labs/gmsol-sdk/package.json"));
        for (const [file, hash] of Object.entries(sdkBuild.files)) {
          const bytes = readFileSync(path.join(sdkDir, file));
          if (createHash("sha256").update(bytes).digest("hex") !== hash) {
            this.error(`The gmsol SDK ${file} does not match the approved GMX build.`);
          }
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
