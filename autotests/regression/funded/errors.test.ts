import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpError } from "../../../sdk/src/utils/http/http";
import { fundedErrorMessage, fundedNetworkFailure, fundedRelayFailure } from "./errors";

test("RPC error codes survive contract wrappers without exposing request details", () => {
  for (const [name, code] of [
    ["InternalRpcError", -32603],
    ["LimitExceededRpcError", -32005],
    ["ResourceUnavailableRpcError", -32002],
    ["RpcRequestError", 429],
  ] as const) {
    const cause = Object.assign(new Error("https://user:password@example.test; signature secret"), { name, code });
    const error = new Error("secret wrapper", { cause });
    assert.equal(fundedNetworkFailure(error)?.retryable, true);
    assert.equal(fundedErrorMessage(error), `RPC request failed (code ${code}). Request details omitted.`);
  }
});

test("errors from another module instance retain safe status diagnostics", () => {
  for (const name of ["HttpError", "HttpRequestError"]) {
    const cause = { name, statusCode: 503, status: 503, message: "https://user:secret@example.test" };
    assert.equal(fundedNetworkFailure({ cause })?.retryable, true);
    assert.match(fundedErrorMessage({ cause }), /request failed \(status 503\)/);
    assert.doesNotMatch(fundedErrorMessage({ cause }), /https|secret/);
  }
});

test("contract revert data, permanent RPC errors and actual execution reverts are never retried", () => {
  const internal = Object.assign(new Error("backend unavailable"), { name: "InternalRpcError", code: -32603 });
  const wrapped = Object.assign(new Error("secret", { cause: internal }), { name: "ContractFunctionRevertedError" });
  assert.equal(fundedNetworkFailure(wrapped)?.retryable, true);
  Object.assign(wrapped, { raw: `0x${"11".repeat(32)}` });
  assert.equal(fundedNetworkFailure(wrapped)?.retryable, false);
  assert.equal(fundedErrorMessage(wrapped), "Contract call reverted. Request details omitted.");
  for (const code of [-32600, -32601, -32602, -32000, 3]) {
    const error = Object.assign(new Error("secret"), { name: "RpcRequestError", code });
    assert.equal(fundedNetworkFailure(error)?.retryable, false);
  }
  internal.message = "execution reverted";
  assert.equal(fundedNetworkFailure(internal)?.retryable, false);
});

test("provider rate-limit responses are recognized without echoing the provider message", () => {
  const error = Object.assign(new Error("rate limit exceeded: https://user:secret@example.test"), {
    name: "InvalidInputRpcError",
    code: -32000,
  });
  assert.equal(fundedNetworkFailure(error)?.retryable, true);
  assert.equal(fundedErrorMessage(error), "RPC rate limit exceeded. Request details omitted.");
});

test("relay failure reports only recognized fee amounts or a fixed explanation", () => {
  const reason = fundedRelayFailure({
    status: "relay_failed",
    error: { code: "RELAY_FAILED", message: "InsufficientRelayFee(63929528447360,62685121314477)" },
  });
  assert.equal(reason, "Relay fee quote was insufficient (required 63929528447360 wei, available 62685121314477 wei)");
  assert.equal(fundedErrorMessage(new Error(reason)), reason);
  for (const message of [
    "https://user:password@example.test",
    "private key: secret",
    `InsufficientRelayFee(1,2) signature 0x${"ab".repeat(65)}`,
  ]) {
    assert.equal(
      fundedRelayFailure({ status: "relay_failed", error: { code: "secret", message } }),
      "Relay request failed"
    );
  }
  assert.equal(fundedRelayFailure({ status: "relay_reverted" }), "Relay transaction reverted");
});

test("contract decoding errors retain a useful explanation without RPC credentials or calldata", () => {
  for (const name of ["PositionOutOfBoundsError", "AbiDecodingDataSizeTooSmallError"]) {
    const cause = new Error(`private key: secret; calldata 0x${"ab".repeat(32)}`);
    cause.name = name;
    const error = new Error("https://user:password@example.test", { cause });
    assert.equal(
      fundedErrorMessage(error),
      "Contract response could not be decoded; check that the ABI matches the deployed contract."
    );
  }
});

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
