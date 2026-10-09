import { act, cleanup, render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import type { FrameMeta } from "sdk/clients/v2";
import { getTokenBySymbol, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { getPriceTokenConfig, getWsFrameExpiresAt, useTokenRecentPricesRequest } from "./useTokenRecentPricesData";
import type { WsPriceStore } from "./wsPriceStreamStore";

const fetchTickers = vi.fn();
const fakeStore = createFakeStore();

vi.mock("react-router-dom", () => ({ useLocation: () => ({ pathname: "/trade" }) }));
vi.mock("context/GmxSdkContext/GmxSdkContext", () => ({ useOptionalGmxSdk: () => ({}) }));
vi.mock("domain/synthetics/uiFlags/useIsApiSdkEnabled", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useIsApiSdkEnabled: () => true,
}));
vi.mock("lib/oracleKeeperFetcher/useOracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => ({ url: "keeper", fetchTickers }),
}));
vi.mock("lib/metrics/useApiDataFallbackCounter", () => ({ useApiDataFallbackCounter: () => undefined }));
vi.mock("lib/metrics/reportFreshnessMetric", () => ({
  freshnessMetrics: { reportThrottled: vi.fn(), clear: vi.fn() },
}));
vi.mock("./wsPriceStreamStore", () => ({ getWsPriceStore: () => fakeStore }));

const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const WS_PRICE = { minPrice: 1n, maxPrice: 2n };
const SWR_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

function createFakeStore() {
  const listeners = new Set<() => void>();
  let snapshot: Record<string, { minPrice: bigint; maxPrice: bigint }> | undefined;
  let meta: FrameMeta | undefined;
  let live = true;
  const notify = () => listeners.forEach((listener) => listener());

  const store: WsPriceStore = {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot: () => snapshot,
    getMeta: () => meta,
    isLive: () => live,
  };

  return Object.assign(store, {
    reset() {
      snapshot = undefined;
      meta = undefined;
      live = true;
    },
    push(prices: typeof snapshot) {
      const now = Date.now();
      snapshot = prices;
      meta = { serverTs: now, originTs: now, receivedAt: now, byteLength: 0 };
      notify();
    },
    disconnect() {
      live = false;
      notify();
    },
  });
}

function ticker(address: string) {
  return {
    tokenAddress: address,
    minPrice: "1000",
    maxPrice: "1000",
    oracleDecimals: 0,
    tokenSymbol: "",
    updatedAt: 0,
  };
}

function renderPrices() {
  let result: ReturnType<typeof useTokenRecentPricesRequest> | undefined;

  function Probe() {
    result = useTokenRecentPricesRequest(ARBITRUM);
    return null;
  }

  render(
    <SWRConfig value={SWR_CONFIG}>
      <Probe />
    </SWRConfig>
  );

  return { wethPrice: () => result?.pricesData?.[WETH.address] };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("getWsFrameExpiresAt", () => {
  it.each([
    { name: "a frame sent as soon as the prices changed", serverTs: 1_000, originTs: 1_000, expiresAt: 15_000 },
    { name: "a frame whose prices were 3 s old when sent", serverTs: 4_000, originTs: 1_000, expiresAt: 12_000 },
    { name: "a frame whose origin is ahead of the server clock", serverTs: 1_000, originTs: 2_000, expiresAt: 15_000 },
    { name: "a frame without an origin", serverTs: 1_000, originTs: undefined, expiresAt: 0 },
  ])("$name expires at $expiresAt", ({ serverTs, originTs, expiresAt }) => {
    expect(getWsFrameExpiresAt({ serverTs, originTs, receivedAt: 5_000, byteLength: 0 })).toBe(expiresAt);
  });
});

describe("useTokenRecentPricesRequest with the price stream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeStore.reset();
    fetchTickers.mockReset().mockResolvedValue([ticker(WETH.address)]);
    vi.mocked(freshnessMetrics.clear).mockClear();
    vi.mocked(freshnessMetrics.reportThrottled).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("serves stream prices and falls back to REST once frames stop for 10 s", async () => {
    const { wethPrice } = renderPrices();
    await advance(0);

    fakeStore.push({ [WETH.address]: WS_PRICE });
    await advance(250);
    expect(wethPrice()).toEqual(WS_PRICE);

    await advance(10_000);
    expect(wethPrice()).not.toEqual(WS_PRICE);
  });

  it("keeps the last frame after the socket drops until a newer REST response arrives", async () => {
    const { wethPrice } = renderPrices();
    await advance(500);
    fakeStore.push({ [WETH.address]: WS_PRICE });
    fakeStore.disconnect();
    await advance(250);
    expect(wethPrice()).toEqual(WS_PRICE);

    await advance(250);
    expect(wethPrice()).not.toEqual(WS_PRICE);
  });

  it.each([
    { name: "every REST token", frameTokens: [WETH.address, NATIVE_TOKEN_ADDRESS], slowed: true },
    { name: "only some REST tokens", frameTokens: [WETH.address, USDC.address], slowed: false },
  ])("with live frames covering $name, slowed REST: $slowed", async ({ frameTokens, slowed }) => {
    renderPrices();
    await advance(0);

    for (let second = 0; second < 11; second++) {
      fakeStore.push(Object.fromEntries(frameTokens.map((address) => [address, WS_PRICE])));
      await advance(1_000);
    }

    expect(fetchTickers).toHaveBeenCalledTimes(slowed ? 2 : 12);
    expect(freshnessMetrics.clear).toHaveBeenCalledTimes(slowed ? 1 : 0);
  });
});

describe("getPriceTokenConfig", () => {
  it("resolves known GLV ticker addresses", () => {
    const glvToken = getPriceTokenConfig(ARBITRUM, "0x528a5bac7e746c9a509a1f4f6df58a03d44279f9");

    expect(glvToken?.address).toBe("0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9");
    expect(glvToken?.symbol).toBe("GLV");
    expect(glvToken?.decimals).toBe(18);
  });

  it("ignores unknown ticker addresses", () => {
    const token = getPriceTokenConfig(ARBITRUM, "0x0000000000000000000000000000000000000001");

    expect(token).toBeUndefined();
  });
});
