const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { ESLint, RuleTester } = require("eslint");
const rules = require("../eslint-local-rules.cjs");

const ruleName = "solana-import-boundaries";
const restrictedPackages = [
  "@solana/kit",
  "@solana/kit/subpath",
  "@solana-program/system",
  "@gmsol-labs/gmsol-sdk",
  "@privy-io/react-auth/solana",
  "@privy-io/react-auth/solana/subpath",
];

test("restricts direct runtime imports while allowing internal lazy entry points and type queries", () => {
  const tester = new RuleTester({
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  });

  tester.run(ruleName, rules[ruleName], {
    valid: [
      'import("lib/solana/entry")',
      'import("domain/gmsol/entry")',
      'import("../lib/solana/entry")',
      'import("@privy-io/react-auth")',
      'import("@privy-io/react-auth/solana-other")',
      'import("@solana-other/kit")',
      'import("html-to-image")',
      'type Kit = typeof import("@solana/kit")',
      // Resolving variables and interpolated paths is outside this rule's scope.
      "import(packageName)",
      "import(`../locales/${locale}/messages.po`)",
    ],
    invalid: restrictedPackages.flatMap((specifier) => [
      ...[
        `import "${specifier}"`,
        `import { value } from "${specifier}"`,
        `import type { Value } from "${specifier}"`,
        `export { value } from "${specifier}"`,
        `export type { Value } from "${specifier}"`,
        `export * from "${specifier}"`,
      ].map((code) => ({ code, errors: [{ messageId: "restrictedImport" }] })),
      {
        code: `async function load() { return await import("${specifier}"); }`,
        errors: [{ messageId: "restrictedImport" }],
      },
      {
        code: "import(`" + specifier + "`)",
        errors: [{ messageId: "restrictedImport" }],
      },
    ]),
  });
});

test("repository config enables the rule outside the Solana directories", async () => {
  const eslint = new ESLint({ cwd: path.resolve(__dirname, "..") });
  for (const file of [
    "src/App/App.tsx",
    "src/lib/multicall/multicall.worker.ts",
    "landing/src/App.tsx",
    "src/lib/solana-other/probe.ts",
    "src/domain/gmsol-other/probe.ts",
    "src/config/gmsol-other/probe.ts",
  ]) {
    const config = await eslint.calculateConfigForFile(file);
    assert.equal(config.rules[`local-rules/${ruleName}`][0], "error", file);
  }
  for (const file of [
    "src/lib/solana/nested/probe.ts",
    "src/domain/gmsol/nested/probe.ts",
    "src/config/gmsol/nested/probe.ts",
  ]) {
    const config = await eslint.calculateConfigForFile(file);
    assert.equal(config.rules[`local-rules/${ruleName}`][0], "off", file);
  }
});

test("resolves internal module paths and preserves type-only and lazy imports", () => {
  const tester = new RuleTester({
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  });
  const targets = [
    ["src/lib/probe.ts", "./solana/x"],
    ["src/lib/utils/probe.ts", "../solana/x"],
    ["src/domain/probe.ts", "./gmsol/x"],
    ["src/domain/utils/probe.ts", "../gmsol/x"],
    ["src/App/probe.ts", "../lib/utils/../solana/x"],
    ["landing/src/probe.ts", "../../src/domain/gmsol/x"],
    ["src/App/probe.ts", "lib/solana"],
    ["src/App/probe.ts", "lib/solana/x"],
    ["src/App/probe.ts", "domain/gmsol"],
    ["src/App/probe.ts", "domain/gmsol/x"],
    ["src/config/probe.ts", "./gmsol/x"],
    ["src/config/utils/probe.ts", "../gmsol/x"],
    ["src/App/probe.ts", "config/gmsol"],
    ["src/App/probe.ts", "config/gmsol/x"],
  ];
  tester.run(ruleName, rules[ruleName], {
    valid: [
      ...targets.flatMap(([file, source]) =>
        [
          `import type { Value } from "${source}"`,
          `import { type Value } from "${source}"`,
          `export type { Value } from "${source}"`,
          `export { type Value } from "${source}"`,
          `export type * from "${source}"`,
          `import("${source}")`,
        ].map((code) => ({ filename: path.resolve(__dirname, "..", file), code }))
      ),
      ...["./solana-other/x", "./solana/../ordinary", "./gmsol/x"].map((source) => ({
        filename: path.resolve(__dirname, "../src/lib/probe.ts"),
        code: `import "${source}"`,
      })),
      { filename: path.resolve(__dirname, "../src/pages/utils/probe.ts"), code: 'import "../solana/x"' },
      'import "lib/solana-other/x"',
      'import "domain/gmsol-other/x"',
      'import "config/gmsol-other/x"',
      "export const value = 1",
    ],
    invalid: targets.flatMap(([file, source]) =>
      [
        `import "${source}"`,
        `import value from "${source}"`,
        `import * as value from "${source}"`,
        `import { type Value, value } from "${source}"`,
        `export { value } from "${source}"`,
        `export { type Value, value } from "${source}"`,
        `export * from "${source}"`,
        `export * as value from "${source}"`,
      ].map((code) => ({
        filename: path.resolve(__dirname, "..", file),
        code,
        errors: [{ messageId: "staticInternalImport" }],
      }))
    ),
  });
});
