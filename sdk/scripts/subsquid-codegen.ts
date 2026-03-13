import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://gmx-test.squids.live/gmx-synthetics-arbitrum@b78644/api/graphql",
  overwrite: true,
  debug: true,
  generates: {
    "./src/codegen/subsquid.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        // Prevent duplicate types
        namingConvention: "keep",
        declarationKind: "interface",

        // Make BigInt output string instead of any
        scalars: {
          BigInt: {
            input: "number",
            output: "string",
          },
        },

        addEslintDisable: true,
      },
    },
  },
};

export default config;
