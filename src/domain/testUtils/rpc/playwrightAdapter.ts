import { chainIdFromRpcUrl } from "./chainIdFromRpcUrl";
import { registerRpcHoleSource } from "./holes";
import { handleJsonRpcBody } from "./jsonRpcBody";
import { MockGmxRelay } from "./mockChain";
import { HttpResponder, RpcResponder, UnhandledRequest } from "./types";

export { assertNoRpcHoles, collectRpcHoles } from "./holes";

type RouteLike = {
  request: () => {
    method: () => string;
    postData: () => string | null;
    url: () => string;
  };
  fulfill: (response: {
    status: number;
    contentType?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<void>;
  abort: () => Promise<void>;
};

type WebSocketRouteLike = {
  onMessage: (handler: (message: string | Buffer) => void) => void;
  send: (message: string) => void;
};

type PageLikeForRouting = {
  route: (url: RegExp, handler: (route: RouteLike) => Promise<void> | void) => Promise<void>;
  routeWebSocket?: (url: RegExp, handler: (ws: WebSocketRouteLike) => void) => Promise<void>;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export type RpcResponderHandle = {
  /** Aborted requests no responder answered — mostly REST the app tolerates losing; for debugging. */
  unhandledRequests: UnhandledRequest[];
  /** JSON-RPC hosts missing from `RPC_HOSTS_BY_CHAIN_ID`, so their chain could not be recovered. */
  unknownRpcHosts: string[];
};

/**
 * Routes every outbound browser request of a Playwright (component) test to `responder`, recovering
 * the chain a JSON-RPC call belongs to from the request url.
 */
export async function installRpcResponder(
  page: PageLikeForRouting,
  responder: RpcResponder,
  options: {
    gmxRelay?: MockGmxRelay;
    http?: HttpResponder;
  } = {}
): Promise<RpcResponderHandle> {
  const { gmxRelay, http } = options;
  const unhandledRequests: UnhandledRequest[] = [];
  const unknownRpcHosts: string[] = [];
  const handle: RpcResponderHandle = { unhandledRequests, unknownRpcHosts };
  registerRpcHoleSource({ responder, unknownRpcHosts });

  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    const url = new URL(request.url());
    const postData = request.method() === "POST" ? request.postData() : null;

    const relayResponse = await gmxRelay?.handle(url, { method: request.method(), body: postData ?? undefined });
    if (relayResponse) {
      await route.fulfill({
        status: relayResponse.status,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: relayResponse.body,
      });
      return;
    }

    if (postData && postData.includes("jsonrpc")) {
      const chainId = chainIdFromRpcUrl(url);

      if (chainId === undefined) {
        if (!unknownRpcHosts.includes(url.host)) {
          unknownRpcHosts.push(url.host);
        }
        const body = await handleJsonRpcBody({
          responder: unknownHostResponder(url.host),
          chainId: 0,
          rawBody: postData,
        });
        await route.fulfill({ status: 200, contentType: "application/json", headers: CORS_HEADERS, body });
        return;
      }

      const body = await handleJsonRpcBody({ responder, chainId, rawBody: postData });
      await route.fulfill({ status: 200, contentType: "application/json", headers: CORS_HEADERS, body });
      return;
    }

    const httpResponse = await http?.(url, { method: request.method(), body: postData ?? undefined });
    if (httpResponse) {
      await route.fulfill({
        status: httpResponse.status ?? 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: httpResponse.body,
      });
      return;
    }

    unhandledRequests.push({ method: request.method(), url: request.url() });
    await route.abort();
  });

  return handle;
}

function unknownHostResponder(host: string): RpcResponder {
  return {
    handle: async () => {
      throw new Error(
        `[testUtils/rpc] JSON-RPC host ${host} is not in RPC_HOSTS_BY_CHAIN_ID — add it to chainIdFromRpcUrl.ts`
      );
    },
  };
}

