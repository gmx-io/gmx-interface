import assert from "node:assert/strict";
import { test } from "node:test";

import { validateFundedTarget } from "./target";
import { fundedErrorMessage } from "./errors";

test("deployment targets: real origins pass unchanged; placeholders and invalid input fail without echoing it", () => {
  for (const value of [
    "https://bbd42782.gmx-interface.pages.dev",
    "https://test.gmx-interface.pages.dev",
    "http://localhost:3010",
  ])
    assert.doesNotThrow(() => validateFundedTarget(value));
  for (const [value, message] of [
    ...["YOUR-UPDATED-PREVIEW", "YOUR-PREVIEW", "placeholder"].map((host) => [
      `https://${host}.gmx-interface.pages.dev`,
      /still contains the example placeholder/,
    ]),
    ...[undefined, "", "not-a-url-secret", "file:///secret", "javascript:secret"].map((value) => [value, undefined]),
  ] as [string | undefined, RegExp | undefined][]) {
    assert.throws(
      () => validateFundedTarget(value),
      (error) => {
        if (message) assert.match(fundedErrorMessage(error), message);
        assert.doesNotMatch(fundedErrorMessage(error), /secret/);
        return true;
      }
    );
  }
});
