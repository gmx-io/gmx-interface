import { afterEach, describe, expect, it, vi } from "vitest";

import { sendTokenApprovalMetric } from "./tokenApprovalMetric";

const mocks = vi.hoisted(() => ({ pushEvent: vi.fn() }));

vi.mock("lib/metrics", () => ({ metrics: { pushEvent: mocks.pushEvent } }));

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RECEIVER = "0x0000000000000000000000000000000000000001";

afterEach(() => {
  vi.clearAllMocks();
});

describe("sendTokenApprovalMetric", () => {
  it("names source-chain tokens and keeps a user account spender out of the event", () => {
    sendTokenApprovalMetric({
      metric: { flow: "accountTransfer", hideSpender: true },
      method: "transaction",
      outcome: "accepted",
      chainId: 8453,
      tokenAddress: BASE_USDC,
      spender: RECEIVER,
      isUnlimited: undefined,
    });

    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "tokenApproval",
      isError: false,
      data: {
        flow: "accountTransfer",
        method: "transaction",
        outcome: "accepted",
        chainId: 8453,
        tokenAddress: BASE_USDC,
        tokenSymbol: "USDC",
        spenderAddress: undefined,
        isUnlimited: undefined,
        errorContext: undefined,
        txErrorType: undefined,
      },
    });
  });

  it("adds what failed before the wallet prompt", () => {
    sendTokenApprovalMetric({
      metric: { flow: "stake" },
      method: "transaction",
      outcome: "failed",
      chainId: 8453,
      tokenAddress: BASE_USDC,
      spender: RECEIVER,
      isUnlimited: true,
      error: Object.assign(new Error("insufficient funds for transfer"), { errorContext: "gasLimit" }),
    });

    expect(mocks.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorContext: "gasLimit", txErrorType: "NOT_ENOUGH_FUNDS" }),
      })
    );
  });
});
