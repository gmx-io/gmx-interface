import path from "node:path";
import { createServer } from "vite";

import { playgroundConfiguration } from "./playgroundConfiguration.mjs";

const root = process.cwd();
const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  ...playgroundConfiguration(root),
  server: { host: "127.0.0.1", port: 3016, strictPort: true },
});
await server.listen();
server.printUrls();
