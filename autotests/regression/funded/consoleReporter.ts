import type { Reporter, TestCase, TestError, TestResult } from "@playwright/test/reporter";

import { playwrightFailure } from "./report";

export default class FundedConsoleReporter implements Reporter {
  printsToStdio() {
    return true;
  }

  private name(test: TestCase) {
    return /^@\S+ ([\w-]+):/.exec(test.title)?.[1] ?? "Deployment check";
  }

  onTestBegin(test: TestCase, result: TestResult) {
    if (result.retry === 0) console.log(`Running ${this.name(test)}...`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const name = this.name(test);
    const duration = `${Math.round(result.duration / 1000)}s`;
    if (result.status === "passed") {
      console.log(`PASS ${name} (${duration}${result.retry ? `, retry ${result.retry}` : ""})`);
    } else if (result.status === "skipped") {
      console.log(`SKIP ${name}`);
    } else {
      const reason = playwrightFailure({ errors: result.errors }) ?? result.status;
      const retrying = result.status !== "interrupted" && result.retry < test.retries;
      console.log(`${retrying ? `RETRY ${result.retry + 1}/${test.retries}` : "FAIL"} ${name}: ${reason}`);
    }
  }

  onError(error: TestError) {
    console.error(`ERROR: ${playwrightFailure({ errors: [error] }) ?? "Playwright runner failed"}`);
  }
}
