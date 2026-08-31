import { describe, expect, it, vi, afterEach, beforeAll } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { sendExpressTransaction } from "lib/transactions/sendExpressTransaction";
import { StatusCode } from "sdk/utils/gelatoRelay";

const TASK_ID = `0x${"ab".repeat(32)}`;

const TXN_DATA = {
  callData: "0xdeadbeef",
  to: "0x0000000000000000000000000000000000000001",
  feeToken: "0x0000000000000000000000000000000000000002",
  feeAmount: 0n,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("sendExpressTransaction via GMX Relay", () => {
  // the real config, pinned onto the gmx side of the split
  beforeAll(() => {
    setAbFlagEnabled("gmxRelay", true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits bare calldata to gmx-api and returns the relay taskId", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA });

    expect(result.taskId).toBe(TASK_ID);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/relay/submit");
    expect(JSON.parse(String(init.body))).toEqual({ to: TXN_DATA.to, data: TXN_DATA.callData });
  });

  it("maps an executed relay operation to a successful result", async () => {
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("/submit")
        ? jsonResponse({ taskId: TASK_ID, status: "pending" })
        : jsonResponse({ taskId: TASK_ID, status: "executed", txHash: "0xhash" })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { wait } = await sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA });
    const result = await wait();

    expect(result.status).toBe("success");
    expect(result.transactionHash).toBe("0xhash");
    expect(result.relayStatus?.statusCode).toBe(StatusCode.Success);
  });

  it("maps a reverted relay operation to a failure carrying the reason", async () => {
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("/submit")
        ? jsonResponse({ taskId: TASK_ID, status: "pending" })
        : jsonResponse({ taskId: TASK_ID, status: "reverted", txHash: "0xhash", reason: "InsufficientRelayFee" })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { wait } = await sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA });
    const result = await wait();

    expect(result.status).toBe("failed");
    expect(result.relayStatus?.statusCode).toBe(StatusCode.Reverted);
    expect(result.relayStatus?.message).toBe("InsufficientRelayFee");
  });

  it("maps a failed relay operation to a rejection with no transaction hash", async () => {
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("/submit")
        ? jsonResponse({ taskId: TASK_ID, status: "pending" })
        : jsonResponse({ taskId: TASK_ID, status: "failed", reason: "deadline passed" })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { wait } = await sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA });
    const result = await wait();

    expect(result.status).toBe("failed");
    expect(result.transactionHash).toBeUndefined();
    expect(result.relayStatus?.statusCode).toBe(StatusCode.Rejected);
  });

  it("never reports an undetermined outcome as success or failure", async () => {
    const fetchMock = vi.fn(async (url: unknown) =>
      String(url).includes("/submit")
        ? jsonResponse({ taskId: TASK_ID, status: "pending" })
        : jsonResponse({ taskId: TASK_ID, status: "unknown", txHash: "0xhash" })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { wait } = await sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA });

    await expect(wait()).rejects.toThrow(/did not resolve/);
  });

  it("surfaces the api error message when submit is rejected", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: "to is not an allowlisted relay router" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendExpressTransaction({ chainId: ARBITRUM, txnData: TXN_DATA })).rejects.toThrow(
      /not an allowlisted relay router/
    );
  });
});
