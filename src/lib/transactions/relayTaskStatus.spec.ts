import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { waitForRelayTaskOutcome } from "lib/transactions/relayTaskStatus";
import { StatusCode } from "sdk/utils/gelatoRelay";

const { getGelatoRelayerClientMock, sendTxnErrorMetricMock } = vi.hoisted(() => ({
  getGelatoRelayerClientMock: vi.fn(),
  sendTxnErrorMetricMock: vi.fn(),
}));

vi.mock("sdk/utils/gelatoRelay", async (importOriginal) => ({
  ...(await importOriginal<typeof import("sdk/utils/gelatoRelay")>()),
  getGelatoRelayerClient: getGelatoRelayerClientMock,
}));

vi.mock("lib/metrics/utils", () => ({ sendTxnErrorMetric: sendTxnErrorMetricMock }));

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
    sendTxnErrorMetricMock.mockReset();
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

  // one failure event per operation: the outcome carries the refusal to the single emitter upstream
  it("turns a permanently refused status request into a rejected outcome without its own metric", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "taskId must be a 0x-prefixed 32-byte hex string" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "X-Trace-Id": "tr-9" },
          })
      )
    );

    const outcome = await waitForRelayTaskOutcome({ chainId: ARBITRUM, taskId: TASK_ID, relayProvider: "gmx" });

    expect(outcome?.statusCode).toBe(StatusCode.Rejected);
    expect(outcome?.message).toContain("taskId must be a 0x-prefixed 32-byte hex string");
    expect(outcome?.message).toContain("tr-9");
    expect(sendTxnErrorMetricMock).not.toHaveBeenCalled();
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
