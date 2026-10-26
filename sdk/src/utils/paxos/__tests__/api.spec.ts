import { describe, expect, it } from "vitest";

import type { IHttp } from "utils/http/types";
import {
  fetchApiTransitFeeTier,
  fetchApiTransitOrder,
  fetchApiTransitOrders,
  fetchApiTransitQuote,
  fetchApiTransitRoutes,
} from "utils/paxos/api";

const API_URL = "https://example.test";
const USER = "0x1111111111111111111111111111111111111111";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";
const ORDER_ID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

type Call = { path: string; query: Record<string, unknown> | undefined };

function createApi(calls: Call[], response: unknown = {}): IHttp {
  return {
    url: API_URL,
    fetchJson: async <TResult>(path: string, opts?: { query?: Record<string, unknown> }) => {
      calls.push({ path, query: opts?.query });
      return response as TResult;
    },
    postJson: async () => {
      throw new Error("Unexpected POST request");
    },
  };
}

const RAW_ORDER = {
  id: ORDER_ID,
  offerAsset: USDC,
  wantAsset: USDG,
  amountDue: "50000000",
  remainingAmountDue: "0",
  offerAmount: "50000000",
  receiver: USER,
  distributorCode: "0x",
  destinationChainId: 42161,
  sourceChainId: 42161,
  receiveTime: 1234567890,
  status: "PROCESSED",
  user: USER,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:05:00Z",
  orderExecuteds: [
    { id: "0xab", amount: "50000000", remaining: "0", timestamp: 1234567890, txHash: "0xcd", chainId: 42161 },
  ],
};

describe("paxos transit api", () => {
  it("parses routes", async () => {
    const calls: Call[] = [];
    const api = createApi(calls, {
      routes: [
        {
          sourceChainId: 42161,
          destinationChainId: 42161,
          destinationChainEID: 30110,
          offerAsset: USDC,
          wantAsset: USDG,
          minOrderSize: "10000000",
        },
      ],
    });

    const routes = await fetchApiTransitRoutes({ api });

    expect(calls).toEqual([{ path: "/v1/paxos/transit/routes", query: { filter: undefined } }]);
    expect(routes).toEqual([
      {
        sourceChainId: 42161,
        destinationChainId: 42161,
        destinationChainEID: 30110,
        offerAsset: USDC,
        wantAsset: USDG,
        minOrderSize: 10_000_000n,
        tokenMetadataMap: {},
      },
    ]);
  });

  it("asks for the routes of a fee tier", async () => {
    const calls: Call[] = [];
    const api = createApi(calls, { routes: [] });

    await fetchApiTransitRoutes({ api }, { feeTier: "zeroFee" });

    expect(calls).toEqual([{ path: "/v1/paxos/transit/routes", query: { filter: undefined, feeTier: "zeroFee" } }]);
  });

  it("parses fee tier capacity as bigint", async () => {
    const calls: Call[] = [];
    const api = createApi(calls, { feeTier: "zeroFee", zeroFeeCapacity: "250000000000" });

    const result = await fetchApiTransitFeeTier({ api }, { userAddress: USER });

    expect(calls).toEqual([{ path: "/v1/paxos/transit/fee-tier", query: { userAddress: USER } }]);
    expect(result).toEqual({ feeTier: "zeroFee", zeroFeeCapacity: 250_000_000_000n });
  });

  it("sends quote amounts as strings and parses fees", async () => {
    const calls: Call[] = [];
    const api = createApi(calls, {
      transaction: { to: "0x22", data: "0x33", value: "1500", functionName: "submitOrder" },
      amountOut: "49990000",
      protocolFee: "10000",
      fillCostFee: "5000",
      conversionRateFee: "5000",
      conversionRateHundredthsBps: 100,
      integratorFee: "0",
      totalFees: "10000",
    });

    const quote = await fetchApiTransitQuote(
      { api },
      {
        userAddress: USER,
        offerAsset: USDC,
        wantAsset: USDG,
        offerAmount: 50_000_000n,
        sourceChainId: 42161,
        destinationChainId: 42161,
        feeTier: "standardFee",
      }
    );

    expect(calls[0].path).toBe("/v1/paxos/transit/orders/quote");
    expect(calls[0].query).toMatchObject({ offerAmount: "50000000", feeTier: "standardFee" });
    expect(quote.transaction.value).toBe(1500n);
    expect(quote.amountOut).toBe(49_990_000n);
    expect(quote.totalFees).toBe(10_000n);
    expect(quote.estimatedLatencyMs).toBeUndefined();
  });

  it("parses a single order", async () => {
    const calls: Call[] = [];
    const api = createApi(calls, { order: RAW_ORDER });

    const order = await fetchApiTransitOrder({ api }, { orderId: ORDER_ID });

    expect(calls).toEqual([{ path: `/v1/paxos/transit/orders/${ORDER_ID}`, query: undefined }]);
    expect(order.status).toBe("PROCESSED");
    expect(order.offerAmount).toBe(50_000_000n);
    expect(order.tokenMetadata).toEqual({});
    expect(order.orderExecuteds[0].amount).toBe(50_000_000n);
  });

  it("drops an empty next page token", async () => {
    const api = createApi([], { orders: [RAW_ORDER], nextPageToken: "" });

    const result = await fetchApiTransitOrders({ api }, { userAddress: USER });

    expect(result.orders).toHaveLength(1);
    expect(result.nextPageToken).toBeUndefined();
  });
});
