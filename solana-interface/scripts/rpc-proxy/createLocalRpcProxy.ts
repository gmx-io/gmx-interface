import { createProxyMiddleware } from "http-proxy-middleware";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

import { resolveLocalRpcProxyConfig, type LocalRpcProxyConfig } from "./config";

const BROWSER_USER_AGENT = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  "AppleWebKit/537.36 (KHTML, like Gecko)",
  "Chrome/124.0.0.0 Safari/537.36",
].join(" ");

export type LocalRpcProxyServer = {
  config: LocalRpcProxyConfig;
  port: number;
  url: string;
  close: () => Promise<void>;
};

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function getLocalCorsOrigin(req: IncomingMessage): string {
  return req.headers.origin ?? "*";
}

export async function startLocalRpcProxy(
  env: Record<string, string | undefined> = process.env
): Promise<LocalRpcProxyServer> {
  const config = resolveLocalRpcProxyConfig(env);
  const { port, target, env: rpcProxyEnv, simulatedOrigin, simulatedReferer } = config;

  const proxy = createProxyMiddleware<IncomingMessage, ServerResponse>({
    target,
    changeOrigin: true,
    ws: true,
    headers: {
      origin: simulatedOrigin,
      referer: simulatedReferer,
      "user-agent": BROWSER_USER_AGENT,
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
    },
    on: {
      proxyReq(proxyReq) {
        proxyReq.setHeader("origin", simulatedOrigin);
        proxyReq.setHeader("referer", simulatedReferer);
        proxyReq.setHeader("user-agent", BROWSER_USER_AGENT);
        proxyReq.setHeader("accept-language", "en-US,en;q=0.9");
        proxyReq.setHeader("sec-fetch-dest", "empty");
        proxyReq.setHeader("sec-fetch-mode", "cors");
        proxyReq.setHeader("sec-fetch-site", "same-site");
      },
      proxyReqWs(proxyReq) {
        proxyReq.setHeader("origin", simulatedOrigin);
        proxyReq.setHeader("user-agent", BROWSER_USER_AGENT);
      },
      proxyRes(proxyRes, req) {
        proxyRes.headers["access-control-allow-origin"] = getLocalCorsOrigin(req);
        proxyRes.headers["access-control-allow-methods"] = "GET, HEAD, POST, PUT, OPTIONS";
        proxyRes.headers["access-control-allow-headers"] = "Content-Type, Authorization, solana-client";
        proxyRes.headers["vary"] = "Origin";
      },
      error(error, req, res) {
        console.error(`[local-rpc-proxy] ${req.method} ${req.url} failed:`, error.message);

        if (res instanceof http.ServerResponse && !res.headersSent) {
          writeJson(res, 502, {
            error: "Bad Gateway",
            message: error.message,
            target,
          });
        }
      },
    },
  });

  const server = http.createServer((req, res) => {
    if (req.url === "/__health") {
      writeJson(res, 200, {
        ok: true,
        target,
        env: rpcProxyEnv,
        simulatedOrigin,
      });
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": getLocalCorsOrigin(req),
        "access-control-allow-methods": "GET, HEAD, POST, PUT, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization, solana-client",
        "access-control-max-age": "86400",
        vary: "Origin",
      });
      res.end();
      return;
    }

    void proxy(req, res, (error?: unknown) => {
      const message = error instanceof Error ? error.message : "Proxy request failed";
      writeJson(res, 502, {
        error: "Bad Gateway",
        message,
        target,
      });
    });
  });

  server.on("upgrade", proxy.upgrade);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  console.log(`[local-rpc-proxy] listening on http://localhost:${actualPort}`);
  console.log(`[local-rpc-proxy] proxying to ${target}`);
  console.log(`[local-rpc-proxy] env: ${rpcProxyEnv}`);
  console.log(`[local-rpc-proxy] upstream Origin: ${simulatedOrigin}`);

  return {
    config,
    port: actualPort,
    url: `http://localhost:${actualPort}/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
