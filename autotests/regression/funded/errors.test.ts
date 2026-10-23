import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpRequestError, TimeoutError } from "viem";

import { HttpError } from "../../../sdk/src/utils/http/http";
import { fundedErrorMessage, fundedNetworkFailure, fundedRelayFailure } from "./errors";

const endpoint = "https://user:password@example.test/secret";
const named = (name: string, fields: object = {}, message = `${endpoint}; signature secret`) =>
  Object.assign(new Error(message), { name, ...fields });
const wrapped = (cause: unknown) => new Error(endpoint, { cause });
const revertOf = (cause: Error) =>
  Object.assign(new Error("secret", { cause }), { name: "ContractFunctionRevertedError" });

test("network failures are retried only when transient, with safe diagnostics", () => {
  for (const [error, retryable, message] of [
    ...[408, 429, 500, 502, 503, 504].flatMap((status) => [
      [wrapped(new HttpError(status, endpoint)), true, `API request failed (status ${status}).`],
      [wrapped(new HttpRequestError({ status, url: endpoint })), true, `RPC request failed (status ${status}).`],
    ]),
    ...[400, 401, 403, 404].map((status) => [new HttpRequestError({ status, url: endpoint }), false]),
    [new HttpError(400, "Invalid order", { code: "INVALID_PARAMS" }), false],
    // Errors from another module instance only keep their class name.
    [{ cause: { name: "HttpError", statusCode: 503, message: endpoint } }, true, /request failed \(status 503\)/],
    [{ cause: { name: "HttpRequestError", status: 503, message: endpoint } }, true, /request failed \(status 503\)/],
    [new TimeoutError({ url: endpoint, body: { signature: "secret" } }), true, "Read request timed out."],
    [named("Error", { code: "ECONNRESET" }), true, "Network connection failed (ECONNRESET)."],
    [wrapped(named("Error", { code: "UND_ERR_SOCKET" })), true, "Network connection failed (UND_ERR_SOCKET)."],
    [new DOMException(endpoint, "AbortError"), true, "Read request timed out."],
    ...(
      [
        ["InternalRpcError", -32603],
        ["LimitExceededRpcError", -32005],
        ["ResourceUnavailableRpcError", -32002],
        ["RpcRequestError", 429],
      ] as const
    ).map(([name, code]) => [wrapped(named(name, { code })), true, `RPC request failed (code ${code}).`]),
    [
      named("InvalidInputRpcError", { code: -32000 }, `rate limit exceeded: ${endpoint}`),
      true,
      "RPC rate limit exceeded.",
    ],
    ...[-32600, -32601, -32602, -32000, 3].map((code) => [named("RpcRequestError", { code }), false]),
    [revertOf(named("InternalRpcError", { code: -32603 })), true],
    [
      Object.assign(revertOf(named("InternalRpcError", { code: -32603 })), { raw: `0x${"11".repeat(32)}` }),
      false,
      "Contract call reverted.",
    ],
    [named("ContractFunctionRevertedError"), false],
    [named("InternalRpcError", { code: -32603 }, "execution reverted"), false],
    [new Error("Unowned exposure found"), undefined],
    [new Error("Missing or stale token prices"), undefined],
  ] as [unknown, boolean | undefined, (string | RegExp)?][]) {
    assert.equal(fundedNetworkFailure(error)?.retryable, retryable);
    if (!message) continue;
    if (typeof message === "string") assert.equal(fundedErrorMessage(error), `${message} Request details omitted.`);
    else assert.match(fundedErrorMessage(error), message);
    assert.doesNotMatch(fundedErrorMessage(error), /password|secret|https/);
  }
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

test("error messages keep a useful cause without credentials, payloads, keys or signatures", () => {
  const decoding = (name: string) =>
    wrapped(Object.assign(new Error(`private key: secret; calldata 0x${"ab".repeat(32)}`), { name }));
  const omitted = "Funded operation failed; request details omitted. Inspect the retained journal and cleanup result.";
  for (const [error, message] of [
    ...["PositionOutOfBoundsError", "AbiDecodingDataSizeTooSmallError"].map((name) => [
      decoding(name),
      "Contract response could not be decoded; check that the ABI matches the deployed contract.",
    ]),
    [
      new HttpError(400, "HTTP 400: secret payload", {
        code: "INVALID_PARAMS",
        message: "secret payload",
        traceId: "secret trace",
      }),
      "API request failed: INVALID_PARAMS (status 400). Request details omitted.",
    ],
    [
      new HttpError(400, "HTTP 400: Position not found", { message: `Position not found: 0x${"ab".repeat(32)}` }),
      "API request failed: POSITION_NOT_FOUND (status 400). Request details omitted.",
    ],
    [
      new HttpError(503, `${endpoint} failed`, { code: "secret-code", message: "secret-payload", traceId: "secret" }),
      "API request failed (status 503). Request details omitted.",
    ],
    [
      new HttpError(400, "HTTP 400", { code: "secret-code", message: "secret-payload" }),
      "API request failed (status 400). Request details omitted.",
    ],
    [
      new Error(
        `page.goto: net::ERR_CONNECTION_TIMED_OUT at ${endpoint}/trade?token=secret\n` +
          'Call log:\n  - navigating to "https://example.test/trade", waiting until "load"'
      ),
      "Browser navigation failed: net::ERR_CONNECTION_TIMED_OUT. Check REGRESSION_BASE_URL and network access.",
    ],
    [
      new Error(`page.reload: Timeout 30000ms exceeded.\n${endpoint}`),
      "Browser navigation timed out. Check REGRESSION_BASE_URL and network access.",
    ],
    [new Error(`RPC request to ${endpoint} failed`), omitted],
    [new Error(`Unexpected payload 0x${"ab".repeat(32)}`), omitted],
    [new Error("Invalid private key: secret"), omitted],
    [new Error("Rejected signature: secret"), omitted],
    [new Error("Action fee exceeds $1"), "Action fee exceeds $1"],
  ] as [unknown, string][])
    assert.equal(fundedErrorMessage(error), message);
});
