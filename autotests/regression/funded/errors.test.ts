import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpError } from "../../../sdk/src/utils/http/http";
import { fundedErrorMessage } from "./errors";

test("API preparation errors preserve recognized codes but never response messages or payloads", () => {
  const error = new HttpError(400, "HTTP 400: secret payload", {
    code: "INVALID_PARAMS",
    message: "secret payload",
    traceId: "secret trace",
  });
  assert.equal(fundedErrorMessage(error), "API request failed: INVALID_PARAMS (status 400). Request details omitted.");
  const missing = new HttpError(400, "HTTP 400: Position not found", {
    message: `Position not found: 0x${"ab".repeat(32)}`,
  });
  assert.equal(
    fundedErrorMessage(missing),
    "API request failed: POSITION_NOT_FOUND (status 400). Request details omitted."
  );
});

test("unknown API codes and response bodies stay hidden while the status remains visible", () => {
  const error = new HttpError(503, "https://user:password@example.test failed", {
    code: "secret-code",
    message: "secret-payload",
    traceId: "secret-trace",
  });
  assert.equal(fundedErrorMessage(error), "API request failed (status 503). Request details omitted.");
  assert.equal(
    fundedErrorMessage(
      new HttpError(400, "HTTP 400", {
        code: "secret-code",
        message: "secret-payload",
      })
    ),
    "API request failed (status 400). Request details omitted."
  );
});

test("navigation failures retain their cause without exposing the URL or call log", () => {
  const error = new Error(
    "page.goto: net::ERR_CONNECTION_TIMED_OUT at https://user:password@example.test/trade?token=secret\n" +
      'Call log:\n  - navigating to "https://example.test/trade", waiting until "load"'
  );
  assert.equal(
    fundedErrorMessage(error),
    "Browser navigation failed: net::ERR_CONNECTION_TIMED_OUT. Check REGRESSION_BASE_URL and network access."
  );
});

test("navigation timeout diagnostics omit credentials and only preserve a fixed explanation", () => {
  assert.equal(
    fundedErrorMessage(new Error("page.reload: Timeout 30000ms exceeded.\nhttps://user:password@example.test")),
    "Browser navigation timed out. Check REGRESSION_BASE_URL and network access."
  );
});

test("API errors still hide endpoints, payloads, keys and signatures", () => {
  for (const message of [
    "RPC request to https://user:password@example.test failed",
    `Unexpected payload 0x${"ab".repeat(32)}`,
    "Invalid private key: secret",
    "Rejected signature: secret",
  ]) {
    assert.equal(
      fundedErrorMessage(new Error(message)),
      "Funded operation failed; request details omitted. Inspect the retained journal and cleanup result."
    );
  }
  assert.equal(fundedErrorMessage(new Error("Action fee exceeds $1")), "Action fee exceeds $1");
});
