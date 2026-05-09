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
      sourcemap: false,
      outDir: resolve(__dirname, "build"),
      minify: "terser",
      rollupOptions: {
        ...config.build?.rollupOptions,
        output: {
          ...(typeof config.build?.rollupOptions?.output === "object" && !Array.isArray(config.build.rollupOptions.output)
            ? config.build.rollupOptions.output
            : {}),
          manualChunks: undefined,
        },
        input: {
          main: resolve(__dirname, "./landing/index.html"),
        },
      },
    },
  };
});
