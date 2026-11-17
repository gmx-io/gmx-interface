import type { BrowserContext } from "@playwright/test";
import type { WalletRequest } from "./injectedWallet";

const readMethods = new Set([
  "eth_call",
  "eth_getBalance",
  "eth_getCode",
  "eth_blockNumber",
  "eth_getBlockByNumber",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_feeHistory",
  "eth_maxPriorityFeePerGas",
]);

export function readOnlyWalletHandler(
  read: (request: WalletRequest, chainId: number) => Promise<unknown>,
  rejected: string[]
) {
  return async (request: WalletRequest, chainId: number) => {
    if (!readMethods.has(request.method)) {
      rejected.push(request.method);
      throw Object.assign(new Error(`Read-only account cannot ${request.method}`), { code: 4001 });
    }
    return read(request, chainId);
  };
}

export async function blockLiveSubmissions(context: BrowserContext, rejected: string[]) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.fallback();
    const url = new URL(request.url());
    const relay = /\/(?:relay|order|orders|subaccount|withdraw)\/.*(?:submit|send)$|\/relay$|\/relays\//.test(
      url.pathname
    );
    if (relay) {
      rejected.push(`POST ${url.pathname}`);
      await route.abort("blockedbyclient");
      return;
    }
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      return route.fallback();
    }
    const calls = Array.isArray(body) ? body : [body];
    const write = calls.find(
      (item) =>
        item && typeof item === "object" && /^(eth_send|eth_sign|personal_sign|wallet_send)/.test(String(item.method))
    );
    if (write) {
      rejected.push(String(write.method));
      await route.abort("blockedbyclient");
      return;
    }
    await route.fallback();
  });
}
