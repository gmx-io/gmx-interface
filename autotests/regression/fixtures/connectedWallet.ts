import { expect } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { test as browserTest } from "./browser";
import { installInjectedWallet } from "./injectedWallet";

export const test = browserTest.extend<{ wallet: { address: string } }>({
  wallet: async ({ context, chainId }, use, testInfo) => {
    const address = privateKeyToAccount(generatePrivateKey()).address;
    const forbiddenRequests: string[] = [];
    // Empty-account scenarios have no contract events; public market HTTP data stays live.
    await context.routeWebSocket(/^wss:\/\//, (socket) => {
      socket.onMessage((message) => {
        const request = JSON.parse(String(message));
        const result =
          request.method === "eth_subscribe"
            ? "0x1"
            : request.method === "eth_unsubscribe"
              ? true
              : request.method === "eth_chainId"
                ? `0x${chainId.toString(16)}`
                : undefined;
        socket.send(
          JSON.stringify(
            result === undefined
              ? { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Unmocked subscription method" } }
              : { jsonrpc: "2.0", id: request.id, result }
          )
        );
      });
    });
    const provider = await installInjectedWallet(context, {
      address,
      chainId,
      request: async ({ method }) => {
        if (/^(eth_send|eth_sign|personal_sign|wallet_send)/.test(method)) {
          forbiddenRequests.push(method);
          throw new Error(`State-only suite attempted ${method}`);
        }
        if (method === "eth_getCode") return "0x";
        if (method === "eth_getBalance") return "0x0";
        throw Object.assign(new Error(`Unsupported mock wallet method: ${method}`), { code: 4200 });
      },
    });
    await use({ address });
    await testInfo.attach("mock-wallet-state", {
      body: JSON.stringify(provider.getState()),
      contentType: "application/json",
    });
    expect(forbiddenRequests, "Connected-state tests must never sign or submit").toEqual([]);
  },
});
