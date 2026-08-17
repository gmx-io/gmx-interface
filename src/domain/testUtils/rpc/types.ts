export type RpcRequest = { method: string; params?: unknown[] | Record<string, unknown> };

/**
 * Answers JSON-RPC calls in tests. Implementations decide *where* the answer comes from — a
 * synthetic in-memory chain ({@link MockChain}) or recorded fixtures (`createRecordedResponder`) —
 * while the adapters decide *how* requests are intercepted (Playwright routes in component tests,
 * a `fetch` stub in vitest).
 *
 * Throwing turns into a JSON-RPC error response; attach `rpcCode` / `rpcData` to the error to pick
 * the error code and `error.data` payload.
 */
export type RpcResponder = {
  handle(chainId: number, request: RpcRequest): Promise<unknown>;
};

export type MockHttpResponse = { status?: number; body: string };

/** Serves plain REST calls (oracle keeper, subsquid, LayerZero Scan). Undefined = not handled. */
export type HttpResponder = (url: URL, request: HttpRequestInfo) => Promise<MockHttpResponse | undefined>;

export type HttpRequestInfo = { method: string; body: string | undefined };

export type UnhandledRequest = { method: string; url: string };
