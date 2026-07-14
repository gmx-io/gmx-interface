import { StatusCode as appGaslessStatusCode } from "@gelatocloud/gasless";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { StatusCode as sdkGaslessStatusCode } from "sdk/utils/gelatoRelay";

describe("@gelatocloud/gasless dedupe", () => {
  it("app and sdk imports resolve to the same module instance", () => {
    expect(sdkGaslessStatusCode).toBe(appGaslessStatusCode);
  });

  it("sendExpressTransaction surfaces revertData when Gelato rejects on simulation", async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: 4211, message: "Transaction reverted on simulation.", data: "0x1234beef" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        sendExpressTransaction({
          chainId: ARBITRUM,
          txnData: {
            callData: "0x",
            to: "0x0000000000000000000000000000000000000001",
            feeToken: "0x0000000000000000000000000000000000000002",
            feeAmount: 0n,
          },
        })
      ).rejects.toThrow('data="0x1234beef"');

      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
