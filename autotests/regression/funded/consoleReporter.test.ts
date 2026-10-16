import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

test("concise Playwright output retains all retry errors, stdout and stderr in JSON and HTML reports", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gmx-funded-reporter-"));
  try {
    const json = join(directory, "results.json");
    const html = join(directory, "html");
    const config = join(directory, "playwright.config.cjs");
    await writeFile(
      config,
      `module.exports = ${JSON.stringify({
        testDir: directory,
        testMatch: "output.spec.cjs",
        workers: 1,
        retries: 2,
        outputDir: join(directory, "artifacts"),
        tsconfig: resolve("autotests/regression/funded/tsconfig.json"),
        reporter: [
          [resolve("autotests/regression/funded/consoleReporter.ts")],
          ["json", { outputFile: json }],
          ["html", { outputFolder: html, open: "never" }],
        ],
      })}`
    );
    await writeFile(
      join(directory, "output.spec.cjs"),
      `
      const { test } = require(${JSON.stringify(resolve("node_modules/@playwright/test"))});
      test('@orders twap: reports every failed attempt', () => {
        console.log('detailed stdout');
        console.error('detailed stderr');
        throw new Error('first TWAP part executes: Action fee exceeds $1 (estimated $1.1)');
      });
      test('@swap swap: succeeds on retry', ({}, testInfo) => {
        if (testInfo.retry === 0) throw new Error('temporary failure');
      });
    `
    );
    const env = { ...process.env };
    for (const name of ["REGRESSION_PRIVATE_KEY", "GMX_TEST_PRIVATE_KEY", "REGRESSION_FUNDED_EXECUTE"])
      delete env[name];
    const result = spawnSync(
      process.execPath,
      [resolve("node_modules/@playwright/test/cli.js"), "test", "-c", config],
      {
        encoding: "utf8",
        timeout: 60_000,
        env,
      }
    );
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 1, output);
    assert.match(output, /RETRY 1\/2 twap:/);
    assert.match(output, /RETRY 2\/2 twap:/);
    assert.match(output, /FAIL twap: first TWAP part executes: Action fee exceeds \$1 \(estimated \$1.1\)/);
    assert.match(output, /PASS swap \(\d+s, retry 1\)/);
    assert.doesNotMatch(output, /detailed stdout|detailed stderr|at .*output.spec|To open last HTML/);
    assert.ok(output.trim().split("\n").length <= 10, output);
    const report = JSON.parse(await readFile(json, "utf8"));
    const attempts = report.suites[0].specs[0].tests[0].results;
    assert.equal(attempts.length, 3);
    for (const attempt of attempts) {
      assert.match(attempt.error.stack, /output.spec.cjs/);
      assert.match(attempt.errors[0].message, /output.spec.cjs/);
      assert.match(attempt.stdout[0].text, /detailed stdout/);
      assert.match(attempt.stderr[0].text, /detailed stderr/);
    }
    assert.equal(report.stats.unexpected, 1);
    assert.equal(report.stats.flaky, 1);
    await access(join(html, "index.html"));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
