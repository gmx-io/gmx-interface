import { afterEach, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

import { fetchSolanaTradingEnabled } from "./fetchSolanaTradingEnabled";

afterEach(() => vi.unstubAllGlobals());

it("requires fresh explicit permission from the Arbitrum keeper on every read", async () => {
  for (const enabled of [true, false, undefined, "true", 1]) {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ solanaTrading: { enabled } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchSolanaTradingEnabled()).resolves.toBe(enabled === true);
    expect(fetchMock).toHaveBeenCalledWith(`${getOracleKeeperUrl(ARBITRUM)}/ui-flags/v2`, {
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  await expect(fetchSolanaTradingEnabled()).resolves.toBe(false);
});

it("propagates failures instead of reusing an earlier permission", async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ solanaTrading: { enabled: true } }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(fetchSolanaTradingEnabled()).resolves.toBe(true);
  for (const response of [new Response("", { status: 503 }), new Response("invalid JSON")]) {
    fetchMock.mockResolvedValueOnce(response);
    await expect(fetchSolanaTradingEnabled()).rejects.toThrow();
  }
  for (const error of [new TypeError("Network error"), new DOMException("Timed out", "TimeoutError")]) {
    fetchMock.mockRejectedValueOnce(error);
    await expect(fetchSolanaTradingEnabled()).rejects.toBe(error);
  }
});
