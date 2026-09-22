import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpClientWithFallback } from "utils/http/httpFallback";
import { fetchOrderStatus, prepareOrder, submitOrder } from "utils/orderTransactions/api";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("cross-fetch", () => ({ default: fetchMock }));

const PREPARE = "/v1/orders/txns/prepare";
const SUBMIT = "/v1/orders/txns/submit";
const STATUS = "/v1/orders/txns/status";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("express chain pinning", () => {
  const calls: string[] = [];
  const failingOnA = new Set<string>();
  const notFoundOnce = new Set<string>();

  beforeEach(() => {
    calls.length = 0;
    failingOnA.clear();
    notFoundOnce.clear();
    vi.spyOn(Math, "random").mockReturnValue(0);
    fetchMock.mockImplementation(async (input: string) => {
      const url = new URL(input);
      calls.push(`${url.origin}${url.pathname}`);
      if (url.origin === "http://a" && failingOnA.has(url.pathname)) {
        return jsonResponse(503, { message: "busy" });
      }
      if (notFoundOnce.delete(url.pathname)) {
        return jsonResponse(404, { message: "not found" });
      }
      if (url.pathname === PREPARE) {
        return jsonResponse(200, { requestId: "req-1", payloadType: "typed-data", mode: "express", payload: {} });
      }
      if (url.pathname === SUBMIT) {
        return jsonResponse(200, { requestId: "req-1", status: "relay_accepted" });
      }
      if (url.pathname === STATUS) {
        return jsonResponse(200, { requestId: "req-1", status: "created" });
      }
      return jsonResponse(404, { message: "not found" });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function newCtx() {
    return { api: new HttpClientWithFallback(["http://a", "http://b"]) };
  }

  it("sends submit and status to the origin that served prepare", async () => {
    failingOnA.add(PREPARE);
    const ctx = newCtx();

    const prepared = await prepareOrder(ctx, { kind: "increase", orderType: "market", mode: "express", from: "0x1" });
    await submitOrder(ctx, { mode: "express", requestId: prepared.requestId });
    await fetchOrderStatus(ctx, { requestId: prepared.requestId });

    expect(calls).toEqual([`http://a${PREPARE}`, `http://b${PREPARE}`, `http://b${SUBMIT}`, `http://b${STATUS}`]);
  });

  it("pins status to the origin that served an unpinned submit", async () => {
    failingOnA.add(SUBMIT);
    const ctx = newCtx();

    await submitOrder(ctx, { mode: "express", requestId: "req-1" });
    await fetchOrderStatus(ctx, { requestId: "req-1" });

    expect(calls).toEqual([`http://a${SUBMIT}`, `http://b${SUBMIT}`, `http://b${STATUS}`]);
  });

  it("drops the pin when the pinned origin answers 404", async () => {
    failingOnA.add(PREPARE);
    const ctx = newCtx();
    const prepared = await prepareOrder(ctx, { kind: "increase", orderType: "market", mode: "express", from: "0x1" });

    notFoundOnce.add(SUBMIT);
    await expect(submitOrder(ctx, { mode: "express", requestId: prepared.requestId })).rejects.toMatchObject({
      statusCode: 404,
    });
    await fetchOrderStatus(ctx, { requestId: prepared.requestId });

    expect(calls).toEqual([`http://a${PREPARE}`, `http://b${PREPARE}`, `http://b${SUBMIT}`, `http://a${STATUS}`]);
  });
});
