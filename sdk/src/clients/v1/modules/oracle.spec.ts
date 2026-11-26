import { expect, it, vi } from "vitest";

import { arbitrumSdk } from "clients/v1/testUtil";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("cross-fetch", () => ({ default: fetchMock }));

it("keeps routing available when market state fails and excludes closed markets on recovery", async () => {
  const market = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
  fetchMock.mockRejectedValueOnce(new Error("connection reset"));
  await expect(arbitrumSdk.oracle.getClosedMarketAddresses()).resolves.toEqual([]);

  for (const [response, expected] of [
    [new Response(null, { status: 500 }), []],
    [new Response("invalid JSON"), []],
    [Response.json({}), []],
    [Response.json({ markets: [{ marketToken: market, isMarketClosed: true }] }), [market]],
  ] as const) {
    fetchMock.mockResolvedValueOnce(response);
    await expect(arbitrumSdk.oracle.getClosedMarketAddresses()).resolves.toEqual(expected);
  }
});
