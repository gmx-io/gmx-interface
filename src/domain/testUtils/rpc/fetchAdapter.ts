import { vi } from "vitest";

import { chainIdFromRpcUrl } from "./chainIdFromRpcUrl";
import { registerRpcHoleSource } from "./holes";
import { handleJsonRpcBody } from "./jsonRpcBody";
import { HttpResponder, RpcResponder } from "./types";

/**
 * The vitest counterpart of {@link installRpcResponder}: stubs `fetch` so the app's own viem
 * transports keep running while every request they make is answered by `responder`.
 *
 * Anything neither the RPC nor the HTTP responder claims throws, so an unmocked network call cannot
 * silently make a test flaky again.
 */
export function installFetchResponder(
  responder: RpcResponder,
  options: { http?: HttpResponder } = {}
): { restore: () => void } {
  const { http } = options;
  const realFetch = globalThis.fetch;
  registerRpcHoleSource({ responder });

  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl);
    const method = init?.method ?? request?.method ?? "GET";
    const signal = init?.signal ?? request?.signal;
    const body =
      typeof init?.body === "string" ? init.body : request ? (await request.clone().text()) || undefined : undefined;

    throwIfAborted(signal);

    const chainId = chainIdFromRpcUrl(url);

    if (chainId !== undefined && body?.includes("jsonrpc")) {
      const responseBody = await handleJsonRpcBody({ responder, chainId, rawBody: body });
      throwIfAborted(signal);
      return new Response(responseBody, { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const httpResponse = await http?.(url, { method, body });
    throwIfAborted(signal);

    if (httpResponse) {
      return new Response(httpResponse.body, {
        status: httpResponse.status ?? 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`[testUtils/rpc] unmocked network call: ${method} ${rawUrl}`);
  });

  return { restore: () => vi.stubGlobal("fetch", realFetch) };
}

/** The real `fetch` rejects aborted requests; the code under test branches on that rejection. */
function throwIfAborted(signal: AbortSignal | undefined | null) {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
  }
}
