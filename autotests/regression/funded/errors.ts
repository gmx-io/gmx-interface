import { HttpRequestError, TimeoutError } from "viem";

import { HttpError } from "../../../sdk/src/utils/http/http";
import { parsePrepareOrderError } from "../../../sdk/src/utils/orderTransactions/api";
import type { OrderStatusResponse } from "../../../sdk/src/utils/orderTransactions/api";

export function fundedNetworkFailure(error: unknown): { message: string; retryable: boolean } | undefined {
  let cause = error;
  let fallback: { message: string; retryable: boolean } | undefined;
  for (let depth = 0; cause && typeof cause === "object" && depth < 8; depth++) {
    const current = cause as Error & { status?: number; statusCode?: number; code?: string | number; details?: string };
    cause = current.cause;
    // SDK/Playwright can load separate copies of the same error classes.
    const api = current instanceof HttpError || current.name === "HttpError";
    const status = api ? current.statusCode : current.status;
    if (api || current instanceof HttpRequestError || current.name === "HttpRequestError") {
      if (status !== undefined) {
        if (!Number.isInteger(status) || status < 100 || status > 599) return undefined;
        return {
          message: `${api ? "API" : "RPC"} request failed (status ${status}). Request details omitted.`,
          retryable: [408, 429, 500, 502, 503, 504].includes(status),
        };
      }
      return { message: "RPC connection failed. Request details omitted.", retryable: true };
    }
    if (current instanceof TimeoutError || current.name === "AbortError" || current.name === "TimeoutError")
      return { message: "Read request timed out. Request details omitted.", retryable: true };
    if (["ContractFunctionRevertedError", "ExecutionRevertedError"].includes(current.name)) {
      fallback = { message: "Contract call reverted. Request details omitted.", retryable: false };
      const raw = (current as Error & { raw?: unknown }).raw;
      if (typeof raw === "string" && raw !== "0x" && raw.length > 2) return fallback;
      // Viem also wraps backend -32603 errors as contract reverts; inspect their cause.
    }
    if (current.name === "InsufficientFundsError")
      return { message: "Insufficient funds for transaction preparation. Request details omitted.", retryable: false };
    const code = current.code;
    if (
      typeof code === "number" &&
      Number.isInteger(code) &&
      code >= -32768 &&
      code <= 9999 &&
      [
        "RpcRequestError",
        "UnknownRpcError",
        "InternalRpcError",
        "LimitExceededRpcError",
        "ResourceUnavailableRpcError",
        "InvalidInputRpcError",
        "InvalidParamsRpcError",
      ].includes(current.name)
    ) {
      const rateLimited =
        code === -32000 && /rate.?limit|too many requests/i.test(`${current.details ?? ""} ${current.message ?? ""}`);
      return {
        message: rateLimited
          ? "RPC rate limit exceeded. Request details omitted."
          : `RPC request failed (code ${code}). Request details omitted.`,
        retryable:
          rateLimited ||
          ([-32603, -32005, -32002, 429].includes(code) &&
            !/execution reverted/i.test(`${current.details ?? ""} ${current.message ?? ""}`)),
      };
    }
    if (
      typeof code === "string" &&
      ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"].includes(
        code
      )
    )
      return { message: `Network connection failed (${code}). Request details omitted.`, retryable: true };
  }
  return fallback;
}

export function fundedRelayFailure(status: Pick<OrderStatusResponse, "status" | "error">) {
  const fee = /^InsufficientRelayFee\((\d{1,78}),\s*(\d{1,78})\)$/.exec(status.error?.message ?? "");
  if (fee) return `Relay fee quote was insufficient (required ${fee[1]} wei, available ${fee[2]} wei)`;
  return status.status === "relay_reverted" ? "Relay transaction reverted" : "Relay request failed";
}

export function fundedErrorMessage(error: unknown) {
  let cause: unknown = error;
  for (let depth = 0; cause instanceof Error && depth < 5; depth++, cause = cause.cause) {
    if (cause.name === "PositionOutOfBoundsError" || cause.name === "AbiDecodingDataSizeTooSmallError")
      return "Contract response could not be decoded; check that the ABI matches the deployed contract.";
  }
  const message = error instanceof Error ? error.message : "Funded operation failed";
  const navigation = /^page\.(?:goto|reload|waitForURL): (net::ERR_[A-Z_]{1,60})\b/.exec(message);
  if (navigation) return `Browser navigation failed: ${navigation[1]}. Check REGRESSION_BASE_URL and network access.`;
  if (/^page\.(?:goto|reload|waitForURL): Timeout \d+ms exceeded/.test(message))
    return "Browser navigation timed out. Check REGRESSION_BASE_URL and network access.";
  if (
    error instanceof HttpError &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 100 &&
    error.statusCode <= 599
  ) {
    const parsed = parsePrepareOrderError(error);
    const code =
      parsed?.code && parsed.code !== "UNKNOWN_PREPARE_ORDER_ERROR"
        ? parsed.code
        : typeof parsed?.message === "string" && /^Position not found(?::|$)/.test(parsed.message)
          ? "POSITION_NOT_FOUND"
          : undefined;
    return `API request failed${code ? `: ${code}` : ""} (status ${error.statusCode}). Request details omitted.`;
  }
  const network = fundedNetworkFailure(error);
  if (network) return network.message;
  // Arbitrary API/RPC messages may contain credentials or signed payloads.
  if (/http|0x[a-fA-F0-9]{64}|private.?key|signature/i.test(message))
    return "Funded operation failed; request details omitted. Inspect the retained journal and cleanup result.";
  return message.slice(0, 400);
}
