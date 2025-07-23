import { resolve } from "path";
import { defineConfig } from "vite";

import defaultConfig from "./vite.config";

export default defineConfig((props) => {
  const config = defaultConfig(props);
  return {
    ...config,
    publicDir: resolve(__dirname, "public"),
    root: resolve(__dirname, "landing"),
    build: {
      ...config.build,
      outDir: resolve(__dirname, "build"),
      rollupOptions: {
        input: {
          main: resolve(__dirname, "./landing/index.html"),
        },
      },
    },
  };
});
