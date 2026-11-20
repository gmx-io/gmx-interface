import path from "node:path";
import { build } from "vite";

import { enableSolanaNetwork } from "./abFlagConfiguration.mjs";

const root = process.cwd();
await build({
  root,
  configFile: path.join(root, "vite.config.ts"),
  plugins: [enableSolanaNetwork(root)],
});
