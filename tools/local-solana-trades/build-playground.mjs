import path from "node:path";
import { build } from "vite";

import { playgroundConfiguration } from "./playgroundConfiguration.mjs";

const root = process.cwd();
await build({
  root,
  configFile: path.join(root, "vite.config.ts"),
  ...playgroundConfiguration(root),
});
