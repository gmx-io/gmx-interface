import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql",
  // documents: ["src/**/*.tsx"],
  generates: {
    "./src/types/subsquid/": {
      preset: "client",
      plugins: ["typescript", "typescript-operations"],
    },
  },
};

export default config;
