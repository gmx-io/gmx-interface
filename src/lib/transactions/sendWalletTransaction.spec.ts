import { describe, expect, it, vi } from "vitest";

import { sendWalletTransaction } from "./sendWalletTransaction";

const mocks = vi.hoisted(() => ({ sendWalletCalls: vi.fn() }));

vi.mock("./sendWalletCalls", () => ({ sendWalletCalls: mocks.sendWalletCalls }));
vi.mock("lib/tenderly", () => ({ getTenderlyConfig: () => undefined }));

const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const APPROVE = { to: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", data: "0x095ea7b3" } as const;

describe("sendWalletTransaction with a wallet batch", () => {
  it("simulates first, then sends the batched calls and the transaction in one confirmation", async () => {
    const order: string[] = [];
    const signer = { address: ACCOUNT, sendTransaction: vi.fn() };
    const callback = vi.fn();
    const batch = { calls: [APPROVE], flow: "trade", atomicStatus: "supported" };
    mocks.sendWalletCalls.mockImplementation(async () => {
      order.push("send");
      return { transactionHash: "0xhash" };
    });

    const result = await sendWalletTransaction({
      chainId: 42161,
      signer: signer as any,
      to: ROUTER,
      callData: "0xac9650d8",
      value: 2n,
      runSimulation: async () => {
        order.push("simulate");
      },
      callback,
      walletCallsBatch: batch,
    });

    expect(order).toEqual(["simulate", "send"]);
    expect(mocks.sendWalletCalls).toHaveBeenCalledWith({
      chainId: 42161,
      account: ACCOUNT,
      calls: [APPROVE, { to: ROUTER, data: "0xac9650d8", value: 2n }],
      batch,
    });
    expect(signer.sendTransaction).not.toHaveBeenCalled();
    expect(result.transactionHash).toBe("0xhash");
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ event: "Sent", data: expect.objectContaining({ transactionHash: "0xhash" }) })
    );
  });
});
