import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createGmxSolanaRequest, createGmxSolanaWebSocket, HttpError } from "./index";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("cross-fetch", () => ({ default: fetch }));

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 2;
  });
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
  opened() {
    this.readyState = 1;
    this.onopen?.({ type: "open" } as Event);
  }
  closed(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code, reason: "", wasClean: code === 1000 } as CloseEvent);
  }
}

const latest = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

describe("GMX Solana WebSocket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects lazily, exposes state, forwards events and sends only when open", () => {
    const onMessage = vi.fn();
    const onOpen = vi.fn();
    const onError = vi.fn();
    const onStateChange = vi.fn();
    const client = createGmxSolanaWebSocket(() => " wss://example.com/ws ", {
      onMessage,
      onOpen,
      onError,
      onStateChange,
    });
    expect(client.status).toBe("idle");
    expect(() => client.send("hello")).toThrow("not connected");
    client.connect();
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(latest().url).toBe("wss://example.com/ws");
    expect(client.status).toBe("connecting");
    latest().opened();
    expect(client.state).toEqual({ status: "connected", error: null });
    expect(onOpen).toHaveBeenCalledOnce();
    const message = { data: "hello" } as MessageEvent;
    latest().onmessage?.(message);
    expect(onMessage).toHaveBeenCalledWith(message);
    client.send("request");
    expect(latest().send).toHaveBeenCalledWith("request");
    latest().onerror?.({ type: "error" } as Event);
    expect(client.error).toBeInstanceOf(Error);
    expect(onError).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenLastCalledWith(client.state);
    expect(vi.getTimerCount()).toBe(0);
    client.destroy();
  });

  it("retries after 3s, 5s, 10s, 10s without concurrent connections and resets after success", () => {
    const client = createGmxSolanaWebSocket(() => "wss://example.com");
    client.connect();
    latest().opened();
    for (const delay of [3000, 5000, 10000, 10000]) {
      const old = latest();
      old.onerror?.({} as Event);
      old.closed();
      expect(client.status).toBe("reconnecting");
      expect(vi.getTimerCount()).toBe(1);
      const count = MockWebSocket.instances.length;
      client.connect();
      vi.advanceTimersByTime(delay - 1);
      expect(MockWebSocket.instances).toHaveLength(count);
      vi.advanceTimersByTime(1);
      expect(MockWebSocket.instances).toHaveLength(count + 1);
      client.connect();
      expect(MockWebSocket.instances).toHaveLength(count + 1);
    }
    latest().opened();
    expect(client.error).toBeNull();
    latest().closed(1000); // A server-initiated clean close is also unexpected.
    const count = MockWebSocket.instances.length;
    vi.advanceTimersByTime(3000);
    expect(MockWebSocket.instances).toHaveLength(count + 1);
    client.destroy();
  });

  it.each([undefined, "", "https://example.com", "invalid"])(
    "reports invalid endpoint %s without retrying",
    (endpoint) => {
      const onError = vi.fn();
      const client = createGmxSolanaWebSocket(() => endpoint, { onError });
      client.connect();
      expect(client.status).toBe("error");
      expect(client.error).toBeInstanceOf(Error);
      expect(onError).toHaveBeenCalledOnce();
      expect(MockWebSocket.instances).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    }
  );

  it("retries constructor failures", () => {
    vi.stubGlobal(
      "WebSocket",
      vi.fn(function () {
        throw new Error("constructor failure");
      })
    );
    const client = createGmxSolanaWebSocket(() => "wss://example.com");
    client.connect();
    expect(client.status).toBe("reconnecting");
    expect(client.error?.message).toBe("constructor failure");
    vi.advanceTimersByTime(3000);
    expect(WebSocket).toHaveBeenCalledTimes(2);
    client.destroy();
  });

  it("disconnects without retrying and blocks new connections until the socket closes", () => {
    const client = createGmxSolanaWebSocket(() => "wss://example.com");
    client.connect();
    client.disconnect();
    expect(latest().close).toHaveBeenCalledOnce();
    expect(client.status).toBe("disconnected");
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    latest().closed();
    vi.advanceTimersByTime(30000);
    expect(MockWebSocket.instances).toHaveLength(1);
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(2);
    latest().closed();
    client.disconnect();
    expect(vi.getTimerCount()).toBe(0);
    client.destroy();
  });

  it("destroys connecting sockets, ignores stale events and cannot be restarted", () => {
    const onMessage = vi.fn();
    const client = createGmxSolanaWebSocket(() => "wss://example.com", { onMessage });
    client.connect();
    const old = latest();
    const staleClose = old.onclose!;
    const staleOpen = old.onopen!;
    const staleMessage = old.onmessage!;
    client.destroy();
    client.destroy();
    staleClose({ code: 1006 } as CloseEvent);
    staleOpen({} as Event);
    staleMessage({ data: "late" } as MessageEvent);
    expect(onMessage).not.toHaveBeenCalled();
    expect(old.close).toHaveBeenCalledOnce();
    expect(old.onclose).toBeNull();
    expect(client.status).toBe("destroyed");
    expect(vi.getTimerCount()).toBe(0);
    expect(() => client.connect()).toThrow("destroyed");
  });

  it("clears pending retries on destroy, including destruction from state callbacks", () => {
    const client = createGmxSolanaWebSocket(() => "wss://example.com", {
      onStateChange: (state) => {
        if (state.status === "reconnecting") client.destroy();
      },
    });
    client.connect();
    latest().closed();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(client.status).toBe("destroyed");
  });
});

describe("gmxSolanaRequest", () => {
  let endpoint: string | undefined;
  let gmxSolanaRequest: ReturnType<typeof createGmxSolanaRequest>;

  beforeEach(() => {
    endpoint = undefined;
    gmxSolanaRequest = createGmxSolanaRequest(() => endpoint);
  });

  afterEach(() => {
    fetch.mockReset();
  });

  it("uses the configured endpoint and returns JSON", async () => {
    endpoint = "https://solana.example.com";
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ value: 42 }) } as Response);

    await expect(gmxSolanaRequest.fetchJson("/prices", { query: { token: "SOL" } })).resolves.toEqual({ value: 42 });
    expect(fetch).toHaveBeenCalledWith("https://solana.example.com/prices?token=SOL", expect.any(Object));
  });

  it.each(["fetchJson", "postJson"] as const)("preserves HTTP errors from %s", async (method) => {
    endpoint = "https://solana.example.com";
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({ message: "Solana API unavailable", code: "UNAVAILABLE" }),
    } as Response);

    const request =
      method === "fetchJson"
        ? gmxSolanaRequest.fetchJson("/prices")
        : gmxSolanaRequest.postJson("/orders", { amount: 1n });

    await expect(request).rejects.toBeInstanceOf(HttpError);
    await expect(request).rejects.toMatchObject({
      statusCode: 503,
      code: "UNAVAILABLE",
      message: "HTTP 503: Solana API unavailable",
    });
  });

  it("propagates network failures without returning empty data", async () => {
    endpoint = "https://solana.example.com";
    const error = new TypeError("Failed to fetch");
    vi.mocked(fetch).mockRejectedValue(error);
    await expect(gmxSolanaRequest.fetchJson("/prices")).rejects.toBe(error);
  });

  it.each([undefined, "", "   "])("rejects missing endpoint %s before making a request", async (missingEndpoint) => {
    endpoint = missingEndpoint;
    await expect(gmxSolanaRequest.fetchJson("/prices")).rejects.toThrow(
      "VITE_GMX_SOLANA_API_ENDPOINT is not configured"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an invalid endpoint before making a request", async () => {
    endpoint = "/api";
    await expect(gmxSolanaRequest.postJson("/orders", {})).rejects.toThrow("must be an absolute HTTP(S) URL");
    expect(fetch).not.toHaveBeenCalled();
  });
});
