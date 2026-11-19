import { createWalletClient, custom } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getViemChain } from "sdk/configs/chains";

import { clientToSigner } from "./useEthersSigner";

describe("clientToSigner", () => {
  it("PRO-4596 cancels a stale queued signature without affecting another signer", async () => {
    const account = "0x1111111111111111111111111111111111111111";
    const signature = "0x" + "11".repeat(65);
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_chainId") return "0xa4b1";
      if (method === "eth_signTypedData_v4") return signature;
      throw new Error(`Unexpected request: ${method}`);
    });
    const client = createWalletClient({
      account,
      chain: getViemChain(ARBITRUM),
      transport: custom({ request }, { retryCount: 0 }),
    });
    let current = true;
    const signer = clientToSigner(client, account, () => {
      if (!current) throw new Error("Withdrawal changed");
    });
    const otherSigner = clientToSigner(client, account);
    const params = [account, JSON.stringify({ message: { amount: "200000" } })];

    try {
      const pending = signer.provider.send("eth_signTypedData_v4", params);
      current = false;

      await expect(pending).rejects.toThrow("Withdrawal changed");
      expect(request.mock.calls.filter(([args]) => args.method === "eth_signTypedData_v4")).toHaveLength(0);

      await expect(otherSigner.provider.send("eth_signTypedData_v4", params)).resolves.toBe(signature);
      current = true;
      await expect(signer.provider.send("eth_signTypedData_v4", params)).resolves.toBe(signature);
      expect(request.mock.calls.filter(([args]) => args.method === "eth_signTypedData_v4")).toHaveLength(2);
    } finally {
      signer.provider.destroy();
      otherSigner.provider.destroy();
    }
  });
});
