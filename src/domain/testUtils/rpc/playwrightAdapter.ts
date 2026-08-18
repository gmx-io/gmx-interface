import { chainIdFromRpcUrl } from "./chainIdFromRpcUrl";
import { registerRpcHoleSource } from "./holes";
import { handleJsonRpcBody } from "./jsonRpcBody";
import { GELATO_RELAY_HOST, MockGelatoRelay } from "./mockChain";
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
    gelatoRelay?: MockGelatoRelay;
    http?: HttpResponder;
  } = {}
): Promise<RpcResponderHandle> {
  const { gelatoRelay, http } = options;
  const unhandledRequests: UnhandledRequest[] = [];
  const unknownRpcHosts: string[] = [];
  const relayCallsWithoutMock: string[] = [];
  const handle: RpcResponderHandle = { unhandledRequests, unknownRpcHosts };
  registerRpcHoleSource({ responder, gelatoRelay, unknownRpcHosts, relayCallsWithoutMock });

  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, async (route) => {
    const request = route.request();

    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }

    const url = new URL(request.url());
    const postData = request.method() === "POST" ? request.postData() : null;

    if (url.host === GELATO_RELAY_HOST) {
      if (postData) {
        const relayResponder = gelatoRelay ?? missingRelayResponder(relayCallsWithoutMock);
        const body = await handleJsonRpcBody({ responder: relayResponder, chainId: 0, rawBody: postData });
        await route.fulfill({ status: 200, contentType: "application/json", headers: CORS_HEADERS, body });
        return;
      }

      unhandledRequests.push({ method: request.method(), url: request.url() });
      await route.abort();
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

  if (gelatoRelay && page.routeWebSocket) {
    await page.routeWebSocket(new RegExp(`wss?://${GELATO_RELAY_HOST.replace(/\./g, "\\.")}`), (ws) => {
      ws.onMessage((raw) => {
        try {
          const message = JSON.parse(String(raw)) as { id?: number; method?: string };
          if (message.method === "subscribe" && message.id !== undefined) {
            ws.send(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: `mock-subscription-${message.id}` }));
          } else if (message.method === "unsubscribe" && message.id !== undefined) {
            ws.send(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: true }));
          }
        } catch {
          // ignore non-JSON frames
        }
      });
    });
  }

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

function missingRelayResponder(relayCallsWithoutMock: string[]): RpcResponder {
  return {
    handle: async (_chainId, { method }) => {
      relayCallsWithoutMock.push(method);
      throw new Error(
        `[testUtils/rpc] Gelato relay call ${method} but no MockGelatoRelay installed — pass options.gelatoRelay to installRpcResponder`
      );
    },
  };
}
