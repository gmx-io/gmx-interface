import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { waitForRelayTaskOutcome } from "lib/transactions/relayTaskStatus";
import { StatusCode } from "sdk/utils/gelatoRelay";

const { getGelatoRelayerClientMock } = vi.hoisted(() => ({ getGelatoRelayerClientMock: vi.fn() }));

vi.mock("sdk/utils/gelatoRelay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/utils/gelatoRelay")>()),
  getGelatoRelayerClient: getGelatoRelayerClientMock,
}));

const TASK_ID = `0x${"ab".repeat(32)}`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubRelayStatus(body: unknown) {
  const requestedUrls: string[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      requestedUrls.push(String(url));
      return jsonResponse(body);
    })
  );

  return requestedUrls;
}

describe("waitForRelayTaskOutcome", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    getGelatoRelayerClientMock.mockReset();
  });

  it("judges a GMX Relay task by the GMX relay, never by Gelato", async () => {
    const requestedUrls = stubRelayStatus({ taskId: TASK_ID, status: "executed", txHash: "0xhash" });

    const outcome = await waitForRelayTaskOutcome({ chainId: ARBITRUM, taskId: TASK_ID, relayProvider: "gmx" });

    expect(outcome?.statusCode).toBe(StatusCode.Success);
    expect(outcome?.transactionHash).toBe("0xhash");
    expect(getGelatoRelayerClientMock).not.toHaveBeenCalled();
    expect(requestedUrls).toContainEqual(expect.stringContaining("/v1/relay/status"));
    expect(requestedUrls).not.toContainEqual(expect.stringContaining("gelato"));
  });

  it("leaves an unresolved GMX Relay task without a verdict instead of calling it failed", async () => {
    stubRelayStatus({ taskId: TASK_ID, status: "unknown", txHash: "0xhash" });

    await expect(
      waitForRelayTaskOutcome({ chainId: ARBITRUM, taskId: TASK_ID, relayProvider: "gmx" })
    ).resolves.toBeUndefined();
    expect(getGelatoRelayerClientMock).not.toHaveBeenCalled();
  });

  it("reports a reverted GMX Relay task with the reason the relay gave", async () => {
    stubRelayStatus({ taskId: TASK_ID, status: "reverted", txHash: "0xhash", reason: "InsufficientRelayFee" });

    const outcome = await waitForRelayTaskOutcome({ chainId: ARBITRUM, taskId: TASK_ID, relayProvider: "gmx" });

    expect(outcome?.statusCode).toBe(StatusCode.Reverted);
    expect(outcome?.message).toBe("InsufficientRelayFee");
    expect(getGelatoRelayerClientMock).not.toHaveBeenCalled();
  });

  it("keeps judging a Gelato task by Gelato", async () => {
    stubRelayStatus({});
    const waitForReceipt = vi.fn(async () => ({ transactionHash: "0xhash" }));
    getGelatoRelayerClientMock.mockReturnValue({ waitForReceipt });

    const outcome = await waitForRelayTaskOutcome({ chainId: ARBITRUM, taskId: TASK_ID, relayProvider: "gelato" });

    expect(waitForReceipt).toHaveBeenCalledWith(expect.objectContaining({ id: TASK_ID }));
    expect(outcome?.statusCode).toBe(StatusCode.Success);
    expect(outcome?.transactionHash).toBe("0xhash");
  });
});
