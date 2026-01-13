import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactPerfPlugin from "eslint-plugin-react-perf";
import importPlugin from "eslint-plugin-import";
import esXPlugin from "eslint-plugin-es-x";
import packageJson from "eslint-plugin-package-json";
import localRules from "eslint-plugin-local-rules";
import globals from "globals";

export default defineConfig([
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "autotests/**",
      "postcss.config.js",
      "**/postcss.config.js",
      "tailwind.config.js",
      "**/tailwind.config.ts",
      "vite.config.ts",
      "vite.landing.config.ts",
      "**/tsconfig.json",
      "vitest-env.js",
      "vitest.global-setup.js",
      "eslint-local-rules.cjs",
      // Ignore JSON files from typescript linting (except package.json)
      "src/**/*.json",
      // SDK has its own eslint config
      "sdk/**",
    ],
  },

  // package.json linting - must come BEFORE type-checked config
  {
    files: ["package.json", "sdk/package.json"],
    ...packageJson.configs.recommended,
    rules: {
      ...packageJson.configs.recommended.rules,
      "package-json/sort-collections": "off", // requires Node 20+
      "package-json/require-description": "off",
      "package-json/restrict-dependency-ranges": ["error", { rangeType: "pin" }],
    },
  },

  // TypeScript type-checked config for JS/TS files
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Disable no-undef for TypeScript files (TypeScript compiler already checks this)
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-undef": "off",
    },
  },

  // Main config for source files
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "landing/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-perf": reactPerfPlugin,
      import: importPlugin,
      "es-x": esXPlugin,
      "local-rules": localRules,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
        TradingView: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json", "./landing/tsconfig.json"],
          noWarnOnMultipleProjects: true,
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".d.ts"],
        },
      },
    },
    rules: {
      // Core rules
      "no-console": "warn",
      "no-var": "error",
      "no-case-declarations": "error",
      "no-extra-boolean-cast": "error",
      "no-prototype-builtins": "error",
      "no-empty": "error",

      // TypeScript rules
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", caughtErrors: "none", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/await-thenable": "off",

      // React rules (from recommended + custom overrides)
      ...reactPlugin.configs.flat.recommended.rules,
      "react/no-unused-prop-types": "error",
      "react/hook-use-state": "warn",
      "react/jsx-fragments": "warn",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "react/prop-types": "off",
      "react/jsx-no-bind": "off",
      "react/jsx-no-leaked-render": "off",
      "react/no-multi-comp": "off",
      "react/no-array-index-key": "off",
      "react/no-unstable-nested-components": "off",
      "react/jsx-no-useless-fragment": "off",
      "react/require-default-props": "off",
      "react/jsx-handler-names": "off",
      "react/display-name": "off",

      // React hooks
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // React perf
      "react-perf/jsx-no-new-array-as-prop": "warn",
      "react-perf/jsx-no-new-object-as-prop": "warn",
      "react-perf/jsx-no-new-function-as-prop": "off",

      // Import rules
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
          "newlines-between": "always",
          pathGroups: [
            { pattern: "components/**", group: "internal", position: "after" },
            { pattern: "img/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/namespace": "off",
      "import/no-unresolved": "error",

      // ES-X rules (restrict to ES2017)
      "es-x/no-bigint": "off",
      "es-x/no-optional-chaining": "off",
      "es-x/no-import-meta": "off",
      "es-x/no-dynamic-import": "off",
      "es-x/no-class-instance-fields": "off",
      "es-x/no-class-static-fields": "off",
      "es-x/no-nullish-coalescing-operators": "off",
      "es-x/no-global-this": "off",
      "es-x/no-numeric-separators": "off",
      "es-x/no-rest-spread-properties": "off",
      "es-x/no-regexp-named-capture-groups": "off",
      "es-x/no-array-prototype-at": "off",
      "es-x/no-array-prototype-flat": "off",
      "es-x/no-object-fromentries": "off",
      "es-x/no-promise-prototype-finally": "off",
      "es-x/no-promise-any": "off",
      "es-x/no-promise-all-settled": "off",
      "es-x/no-promise-withresolvers": "off",
      "es-x/no-array-prototype-findlast-findlastindex": "off",
      "es-x/no-array-prototype-toreversed": "off",

      // Local rules
      "local-rules/no-bigint-negation": "error",
      "local-rules/no-logical-bigint": "error",

      // Other rules
      curly: "off",
      "prefer-const": "off",
      "no-irregular-whitespace": "off",
      "no-async-promise-executor": "off",

      "no-restricted-imports": ["error", { paths: ["lodash"] }],
      "no-restricted-globals": ["error", { name: "process", message: "Don't use `process` in client code" }],
    },
  },

  // Scripts folder - allow process global
  {
    files: ["scripts/**/*.{js,ts}"],
    rules: {
      "no-restricted-globals": "off",
    },
  },

  {
    files: ["**/*.json"],
    rules: Object.fromEntries(
      Object.keys(tseslint.configs.recommendedTypeChecked[0]?.rules || {}).map((rule) => [rule, "off"])
    ),
  }
);
