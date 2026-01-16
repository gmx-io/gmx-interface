export default {
  exclude: ["enumMembers"],
  includeEntryExports: true,
  entry: ["src/index.tsx", "landing/src/index.tsx"],
  project: ["src/**/*.ts", "src/**/*.tsx", "landing/**/*.ts", "landing/**/*.tsx"],
  ignore: [
    "src/**/typechain*/**",
    "src/typechain-types/**",
    "src/typechain-types-stargate/**",
    "src/charting_library.d.ts",
    "landing/tailwind.config.ts",
    "autotests/**",
  ],
  ignoreDependencies: [
    "env-cmd", // Used in npm scripts (start-home, start-app, build-home, etc.)
    "abitype", // Type-only imports, provided transitively by viem
    "@floating-ui/utils", // Provided transitively by @floating-ui/react/dom/core
    "jsbi", // Provided transitively by @uniswap/sdk-core
  ],
};
