import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "configs/chains";

import {
  GmxRelayError,
  getGmxRelayTaskStatus,
  isPermanentRelayError,
  isRelayUnavailableError,
  sendToGmxRelay,
  waitForGmxRelayTask,
} from "./gmxRelayUtils";

const TASK_ID = `0x${"ab".repeat(32)}`;

const TXN_DATA = {
  callData: "0xdeadbeef",
  to: "0x0000000000000000000000000000000000000001",
  feeToken: "0x0000000000000000000000000000000000000002",
  feeAmount: 123n,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("sendToGmxRelay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // a submit refused before it is relayed never gets a taskId, so the trace id is the only handle
  // a user can quote back when reporting it
  it("carries the API's trace id on a refusal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "nope" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "X-Trace-Id": "tr-1" },
          })
      )
    );

    const error = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA }).catch((e) => e);

    expect(error).toBeInstanceOf(GmxRelayError);
    expect(error.data).toEqual({ traceId: "tr-1" });
  });

  it("posts bare calldata without the Gelato fee suffix", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA });

    expect(result).toEqual({ taskId: TASK_ID, status: "pending" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/relay/submit");
    expect(JSON.parse(String(init.body))).toEqual({ to: TXN_DATA.to, data: TXN_DATA.callData });
  });

  it("honours an explicit api url", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);

    await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA, apiUrl: "https://api.example.com/" });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api.example.com/v1/relay/submit");
  });

  it("raises a permanent error when the api rejects the operation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "to is not an allowlisted relay router" }, 400))
    );

    const error = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA }).catch((e) => e);

    expect(error).toBeInstanceOf(GmxRelayError);
    expect(error.message).toContain("allowlisted relay router");
    expect(isPermanentRelayError(error)).toBe(true);
    expect(isRelayUnavailableError(error)).toBe(false);
  });

  it("treats a rate-limited response as retryable rather than permanent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "slow down" }, 429))
    );

    const error = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA }).catch((e) => e);

    expect(isPermanentRelayError(error)).toBe(false);
    expect(isRelayUnavailableError(error)).toBe(false);
  });

  it("flags an unavailable relay so callers can degrade to the classic flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "relay is disabled" }, 503))
    );

    const error = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA }).catch((e) => e);

    expect(isRelayUnavailableError(error)).toBe(true);
    expect(isPermanentRelayError(error)).toBe(false);
  });

  it("flags a transport failure as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const error = await sendToGmxRelay({ chainId: ARBITRUM, txnData: TXN_DATA }).catch((e) => e);

    expect(error).toBeInstanceOf(GmxRelayError);
    expect(isRelayUnavailableError(error)).toBe(true);
  });
});

describe("getGmxRelayTaskStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the taskId and returns the status view", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "executed", txHash: "0xhash" }));
    vi.stubGlobal("fetch", fetchMock);

    const view = await getGmxRelayTaskStatus({ chainId: ARBITRUM, taskId: TASK_ID });

    expect(view.status).toBe("executed");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/relay/status");
    expect(JSON.parse(String(init.body))).toEqual({ taskId: TASK_ID });
  });
});

describe("waitForGmxRelayTask", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("polls until the operation leaves the pending state", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        return call < 3
          ? jsonResponse({ taskId: TASK_ID, status: "pending" })
          : jsonResponse({ taskId: TASK_ID, status: "executed", txHash: "0xhash" });
      })
    );

    const result = await waitForGmxRelayTask({ chainId: ARBITRUM, taskId: TASK_ID, pollingInterval: 1 });

    expect(result.status).toBe("success");
    expect(result.transactionHash).toBe("0xhash");
    expect(call).toBe(3);
  });

  it("keeps polling through a transient status failure", async () => {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        call++;
        if (call === 1) throw new Error("network blip");
        if (call === 2) return jsonResponse({ message: "upstream" }, 503);
        // accepted a moment before it became readable
        if (call === 3) return jsonResponse({ message: "no relay operation" }, 404);
        return jsonResponse({ taskId: TASK_ID, status: "executed", txHash: "0xhash" });
      })
    );

    const result = await waitForGmxRelayTask({ chainId: ARBITRUM, taskId: TASK_ID, pollingInterval: 1 });

    // a broadcasting operation must not be judged by a hiccup on the way to the status endpoint
    expect(result.status).toBe("success");
    expect(result.transactionHash).toBe("0xhash");
    expect(call).toBe(4);
  });

  it("gives up immediately when the status request itself is rejected", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: "taskId must be a 32-byte hex string" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    const error = await waitForGmxRelayTask({ chainId: ARBITRUM, taskId: TASK_ID, pollingInterval: 1 }).catch((e) => e);

    expect(error).toBeInstanceOf(GmxRelayError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports an unresolved status rather than a failure when the window closes on errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "upstream" }, 503))
    );

    const result = await waitForGmxRelayTask({
      chainId: ARBITRUM,
      taskId: TASK_ID,
      pollingInterval: 1,
      timeout: 5,
    });

    expect(result.status).toBe("pending");
    expect(result.message).toContain("Could not read");
  });

  it("reports a revert as a failure carrying the reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ taskId: TASK_ID, status: "reverted", txHash: "0xhash", reason: "InsufficientRelayFee" })
      )
    );

    const result = await waitForGmxRelayTask({ chainId: ARBITRUM, taskId: TASK_ID, pollingInterval: 1 });

    expect(result.status).toBe("failed");
    expect(result.relayStatus).toBe("reverted");
    expect(result.message).toBe("InsufficientRelayFee");
  });

  it("never resolves an undetermined outcome as success or failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "unknown", txHash: "0xhash" }))
    );

    const result = await waitForGmxRelayTask({ chainId: ARBITRUM, taskId: TASK_ID, pollingInterval: 1 });

    expect(result.status).toBe("pending");
    expect(result.relayStatus).toBe("unknown");
  });

  it("gives up as pending once the wait window elapses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ taskId: TASK_ID, status: "pending" }))
    );

    const result = await waitForGmxRelayTask({
      chainId: ARBITRUM,
      taskId: TASK_ID,
      timeout: 5,
      pollingInterval: 10,
    });

    expect(result.status).toBe("pending");
    expect(result.message).toMatch(/Timed out/);
  });
});
