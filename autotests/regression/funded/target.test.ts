import assert from "node:assert/strict";
import { test } from "node:test";

import { validateFundedTarget } from "./target";
import { fundedErrorMessage } from "./errors";

test("copied preview placeholders fail with an actionable diagnostic", () => {
  for (const host of ["YOUR-UPDATED-PREVIEW", "YOUR-PREVIEW", "placeholder"]) {
    assert.throws(
      () => validateFundedTarget(`https://${host}.gmx-interface.pages.dev`),
      (error) => {
        assert.match(fundedErrorMessage(error), /still contains the example placeholder/);
        return true;
      }
    );
  }
});

test("missing and invalid deployment targets fail without echoing their input", () => {
  for (const value of [undefined, "", "not-a-url-secret", "file:///secret", "javascript:secret"]) {
    assert.throws(
      () => validateFundedTarget(value),
      (error) => {
        assert.doesNotMatch(fundedErrorMessage(error), /secret/);
        return true;
      }
    );
  }
});

test("real preview and test origins are accepted without rewriting the configured URL", () => {
  for (const value of [
    "https://bbd42782.gmx-interface.pages.dev",
    "https://test.gmx-interface.pages.dev",
    "http://localhost:3010",
  ])
    assert.doesNotThrow(() => validateFundedTarget(value));
});
