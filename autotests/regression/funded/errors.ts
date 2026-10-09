import { HttpError } from "../../../sdk/src/utils/http/http";
import { parsePrepareOrderError } from "../../../sdk/src/utils/orderTransactions/api";

export function fundedErrorMessage(error: unknown) {
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
  // Arbitrary API/RPC messages may contain credentials or signed payloads.
  if (/http|0x[a-fA-F0-9]{64}|private.?key|signature/i.test(message))
    return "Funded operation failed; request details omitted. Inspect the retained journal and cleanup result.";
  return message.slice(0, 400);
}
