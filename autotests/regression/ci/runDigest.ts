type ReportError = { message?: string };
type ReportResult = { status: string; duration: number; error?: ReportError; errors?: ReportError[] };
type ReportTest = {
  projectName: string;
  status: "expected" | "unexpected" | "flaky" | "skipped";
  expectedStatus: string;
  annotations?: { type: string; description?: string }[];
  results: ReportResult[];
};
type ReportSpec = { title: string; file: string; line: number; tests: ReportTest[] };
type ReportSuite = { title: string; suites?: ReportSuite[]; specs?: ReportSpec[] };
export type PlaywrightReport = {
  config: { metadata?: Record<string, unknown> };
  suites: ReportSuite[];
  errors?: ReportError[];
  stats?: { duration?: number };
};

const MAX_FAILURES = 50;
const MAX_FLAKY = 40;

export function cleanError(message = "", limit = 1200) {
  const text = message.replace(/\u001b\[[0-9;]*m/g, "").trim();
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function rowIds(title: string) {
  return (
    title
      .match(/^(?:\d{1,2}\.\d{2}\s+)+/)?.[0]
      .trim()
      .split(/\s+/) ?? []
  );
}

function lastError(test: ReportTest) {
  for (const result of [...test.results].reverse()) {
    const message = result.error?.message ?? result.errors?.[0]?.message;
    if (message) return message;
  }
  return "";
}

export function buildRunDigest(report: PlaywrightReport) {
  const counts: Record<string, number> = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
  const projects: Record<string, Record<string, number>> = {};
  const failures: { project: string; location: string; title: string; attempts: number; error: string }[] = [];
  const flaky: { project: string; title: string; firstError: string }[] = [];
  const knownGaps: string[] = [];
  const skipped: { project: string; title: string; reason: string }[] = [];
  // Tests left unrun when the run stopped at its failure limit are reported as skipped without results.
  const notRun: Record<string, number> = {};
  const failedRows = new Set<string>();

  const visit = (suites: ReportSuite[], parents: string[]) => {
    for (const suite of suites) {
      const path = suite.title && !suite.title.endsWith(".ts") ? [...parents, suite.title] : parents;
      visit(suite.suites ?? [], path);
      for (const spec of suite.specs ?? []) {
        const title = [...path, spec.title].join(" › ");
        for (const test of spec.tests) {
          counts[test.status] = (counts[test.status] ?? 0) + 1;
          (projects[test.projectName] ??= {})[test.status] = (projects[test.projectName][test.status] ?? 0) + 1;
          if (test.status === "unexpected") {
            rowIds(spec.title).forEach((row) => failedRows.add(row));
            failures.push({
              project: test.projectName,
              location: `${spec.file}:${spec.line}`,
              title,
              attempts: test.results.length,
              error: cleanError(lastError(test)),
            });
          } else if (test.status === "flaky") {
            const first = test.results.find((result) => result.status !== "passed");
            flaky.push({
              project: test.projectName,
              title,
              firstError: cleanError(first?.error?.message ?? first?.errors?.[0]?.message, 400),
            });
          } else if (test.status === "expected" && test.expectedStatus === "failed") {
            knownGaps.push(`${test.projectName}: ${title}`);
          } else if (test.status === "skipped" && !test.results.length) {
            notRun[test.projectName] = (notRun[test.projectName] ?? 0) + 1;
          } else if (test.status === "skipped") {
            const reason =
              test.annotations?.find((annotation) => annotation.type === "skip" || annotation.type === "fixme")
                ?.description ?? "";
            skipped.push({ project: test.projectName, title, reason });
          }
        }
      }
    }
  };
  visit(report.suites, []);
  const runErrors = (report.errors ?? []).map((error) => cleanError(error.message, 600));
  const notRunCount = Object.values(notRun).reduce((sum, count) => sum + count, 0);

  return {
    metadata: report.config.metadata ?? {},
    durationMinutes: Math.round((report.stats?.duration ?? 0) / 60_000),
    counts,
    projects,
    failedChecklistRows: [...failedRows].sort(),
    failures: failures.slice(0, MAX_FAILURES),
    omittedFailures: Math.max(0, failures.length - MAX_FAILURES),
    flaky: flaky.slice(0, MAX_FLAKY),
    omittedFlaky: Math.max(0, flaky.length - MAX_FLAKY),
    knownGaps,
    skipped,
    stoppedEarly: notRunCount > 0 || runErrors.some((error) => /stopped early/i.test(error)),
    notRun: { total: notRunCount, byProject: notRun },
    runErrors,
  };
}

export type RunDigest = ReturnType<typeof buildRunDigest>;

const TEST_OR_CI_FILE =
  /^(?:autotests\/|\.github\/|playwright[^/]*\.config\.ts$)|(?:^|\/)__tests__\/|\.(?:spec|test|ct\.spec|stories)\.[cm]?[jt]sx?$|\.md$/;

// App files go first so a large PR's source changes survive the cap on what the model reads.
export function summarizeChangedFiles(files: string[], limit = 150) {
  const appFiles = files.filter((file) => !TEST_OR_CI_FILE.test(file));
  const otherFiles = files.filter((file) => TEST_OR_CI_FILE.test(file));
  return {
    total: files.length,
    appFileCount: appFiles.length,
    files: [...appFiles, ...otherFiles].slice(0, limit),
  };
}
