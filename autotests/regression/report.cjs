const fs = require("node:fs");

const reportPath = process.argv[2] || "test-results/regression-results.json";
const lines = ["## Regression results", ""];
if (!fs.existsSync(reportPath)) {
  lines.push("No test report was produced. Regression coverage is incomplete.");
  process.exitCode = 1;
} else {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const metadata = report.config.metadata;
  lines.push(`Test suite checkout: ${metadata.checkoutCommit}. Chain: ${metadata.chainId}.`, "");
  lines.push(`Target: ${metadata.target}.`, "");
  lines.push(`Data: ${metadata.data}.`, "");
  if (metadata.deployedCommitVerified) {
    lines.push(
      `PR #${metadata.prNumber}. Deployed commit: ${metadata.deploymentCommit}.`,
      `Deployment linked to this commit by its [successful Cloudflare check](${metadata.deploymentCheckUrl}).`,
      ""
    );
  } else {
    lines.push("External target: deployment SHA has not been verified.", "");
  }
  const counts = { expected: 0, flaky: 0, unexpected: 0, skipped: 0 };
  const incomplete = [];
  function visit(suites) {
    for (const suite of suites) {
      visit(suite.suites || []);
      for (const spec of suite.specs || []) {
        for (const test of spec.tests) {
          counts[test.status] = (counts[test.status] || 0) + 1;
          if (test.status !== "expected") {
            const reasons = (test.annotations || [])
              .map((entry) => entry.description)
              .filter(Boolean)
              .join("; ");
            incomplete.push(`${test.status}: ${test.projectName} — ${spec.title}${reasons ? ` (${reasons})` : ""}`);
          }
        }
      }
    }
  }
  visit(report.suites);
  lines.push(
    `Passed: ${counts.expected}. Flaky: ${counts.flaky}. Failed: ${counts.unexpected}. Skipped: ${counts.skipped}.`,
    ""
  );
  lines.push(...incomplete.map((line) => `- ${line.replace(/[\r\n]/g, " ")}`));
  if (counts.unexpected || counts.skipped || report.errors?.length || (!counts.expected && !counts.flaky)) {
    process.exitCode = 1;
  }
}
lines.push(
  "",
  "Only the tests listed in this report ran. This is partial regression coverage. Funded transaction execution, settlement, and real device/wallet compatibility are not certified by this run.",
  ""
);
const summary = lines.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.stdout.write(summary);
