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
  if (metadata.landingTarget) lines.push(`Landing target: ${metadata.landingTarget}.`, "");
  for (const feature of metadata.unavailableFeatures || []) lines.push(`Outside this chain's suite: ${feature}.`, "");
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
  const projects = new Map();
  const incomplete = [];
  // Worst status of the tests citing each checklist row in their title.
  const rows = new Map();
  const severity = { expected: 0, flaky: 1, skipped: 2, unexpected: 3 };
  function visit(suites) {
    for (const suite of suites) {
      visit(suite.suites || []);
      for (const spec of suite.specs || []) {
        for (const test of spec.tests) {
          counts[test.status] = (counts[test.status] || 0) + 1;
          for (const row of spec.title
            .match(/^(?:\d{1,2}\.\d{2}\s+)+/)?.[0]
            .trim()
            .split(/\s+/) || []) {
            if ((severity[test.status] ?? 3) >= (severity[rows.get(row)] ?? -1)) rows.set(row, test.status);
          }
          const project = projects.get(test.projectName) || { expected: 0, flaky: 0, unexpected: 0, skipped: 0 };
          project[test.status] = (project[test.status] || 0) + 1;
          projects.set(test.projectName, project);
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
  lines.push("| Project | Passed | Flaky | Failed | Skipped |", "| --- | ---: | ---: | ---: | ---: |");
  for (const [name, project] of projects) {
    lines.push(`| ${name} | ${project.expected} | ${project.flaky} | ${project.unexpected} | ${project.skipped} |`);
  }
  lines.push("");
  const rowsByStatus = {};
  for (const [row, status] of rows) (rowsByStatus[status] ||= []).push(row);
  const sortRows = (list) =>
    list.sort((a, b) => a.split(".")[0] - b.split(".")[0] || a.split(".")[1] - b.split(".")[1]);
  lines.push(
    `Checklist rows cited by these tests: ${rows.size}. Passed: ${rowsByStatus.expected?.length || 0}. Flaky: ${rowsByStatus.flaky?.length || 0}. Failed or skipped: ${(rowsByStatus.unexpected?.length || 0) + (rowsByStatus.skipped?.length || 0)}.`,
    ""
  );
  for (const [status, label] of [
    ["unexpected", "failed"],
    ["skipped", "skipped"],
    ["flaky", "passed only on retry"],
  ]) {
    if (rowsByStatus[status]) lines.push(`- Rows ${label}: ${sortRows(rowsByStatus[status]).join(", ")}`);
  }
  lines.push("");
  lines.push(...incomplete.map((line) => `- ${line.replace(/[\r\n]/g, " ")}`));
  if (counts.unexpected || counts.skipped || report.errors?.length || (!counts.expected && !counts.flaky)) {
    process.exitCode = 1;
  }
}
lines.push(
  "",
  "Only the listed tests ran. Counts are test cases, not a checklist coverage percentage. UI and landing checks use public data; live-state discovers public accounts through Subsquid and uses live API/RPC data with a read-only injected provider; connected-state checks substitute account state and cannot sign or send transactions. Mobile checks emulate Chromium on Android. Harness unit/runtime checks do not add application checklist coverage. Funded settlement, real wallet extensions and physical devices require separate validation.",
  ""
);
const summary = lines.join("\n");
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.stdout.write(summary);
