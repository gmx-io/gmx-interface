import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { GMSOL_MARKETS } from "config/gmsol/markets";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { RawMarketsInfoData } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import { composeGmsolMarkets, hasGmsolListedMarketPrices } from "./markets/composeGmsolMarkets";
import { resolveGmsolAccountSnapshot } from "./resolveGmsolAccountSnapshot";
import { fetchGmsolPrices } from "./tokens/fetchGmsolPrices";
import { resolveGmsolTokensData } from "./tokens/resolveGmsolTokensData";
import { useGmsolTokensData } from "./tokens/useGmsolTokensData";

vi.mock("./tokens/fetchGmsolPrices", () => ({ fetchGmsolPrices: vi.fn() }));
vi.mock("lib/oracleKeeperFetcher/useOracleKeeperFetcher", () => {
  const fetcher = { url: "http://oracle.test" };
  return { useOracleKeeperFetcher: () => fetcher };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function renderHook(probe: () => void) {
  function Probe() {
    probe();
    return null;
  }
  await act(async () => {
    render(
      createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0, refreshInterval: 5_000 } },
        createElement(Probe)
      )
    );
  });
}

const market = GMSOL_MARKETS[0];

function token(address: string) {
  return { address, decimals: 1, symbol: address, name: address, prices: { minPrice: 1n, maxPrice: 1n } };
}

function tokens(includeIndex: boolean): TokensData {
  return {
    ...(includeIndex ? { [market.indexTokenAddress]: token(market.indexTokenAddress) } : {}),
    [market.longTokenAddress]: token(market.longTokenAddress),
    [market.shortTokenAddress]: token(market.shortTokenAddress),
  } as TokensData;
}

const raw = {
  [market.marketTokenAddress]: {
    marketTokenAddress: market.marketTokenAddress,
    indexTokenAddress: market.indexTokenAddress,
    longTokenAddress: market.longTokenAddress,
    shortTokenAddress: market.shortTokenAddress,
    isDisabled: false,
  },
} as unknown as RawMarketsInfoData;

it("keeps a missing ticker's last price only within the cache TTL", () => {
  const complete = resolveGmsolTokensData({
    tokensData: tokens(true),
    receivedAt: 0,
    rawMarketsInfoData: raw,
    lastComplete: undefined,
  });
  const withinTtl = resolveGmsolTokensData({
    tokensData: tokens(false),
    receivedAt: PRICES_CACHE_TTL - 1,
    rawMarketsInfoData: raw,
    lastComplete: complete.lastComplete,
  });
  const pastTtl = resolveGmsolTokensData({
    tokensData: tokens(false),
    receivedAt: PRICES_CACHE_TTL,
    rawMarketsInfoData: raw,
    lastComplete: complete.lastComplete,
  });

  expect(withinTtl.tokensData?.[market.indexTokenAddress]).toBe(complete.tokensData?.[market.indexTokenAddress]);
  expect(withinTtl.pricesUpdatedAt).toBe(0);
  expect(pastTtl.tokensData?.[market.indexTokenAddress]).toBeUndefined();
  expect(composeGmsolMarkets(raw, pastTtl.tokensData!).marketsAddresses).not.toContain(market.marketTokenAddress);
  expect(composeGmsolMarkets(raw, complete.tokensData!).marketsAddresses).toContain(market.marketTokenAddress);
});

it("keeps a disabled market so its positions stay listed", () => {
  const disabled = {
    [market.marketTokenAddress]: { ...raw[market.marketTokenAddress], isDisabled: true },
  } as unknown as RawMarketsInfoData;

  expect(composeGmsolMarkets(disabled, tokens(true)).marketsAddresses).toContain(market.marketTokenAddress);
  expect(hasGmsolListedMarketPrices(disabled, tokens(false))).toBe(true);
});

it("marks partial prices unavailable and retains missing account items without reviving closed ones FESOL-52", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  let includeIndex = true;
  vi.mocked(fetchGmsolPrices).mockImplementation(async () =>
    Object.fromEntries(Object.entries(tokens(includeIndex)).map(([address, token]) => [address, token.prices]))
  );
  let result: ReturnType<typeof useGmsolTokensData>;
  await renderHook(() => {
    result = useGmsolTokensData({ enabled: true, rawMarketsInfoData: raw });
  });
  expect(result!.isUnavailable).toBe(false);
  includeIndex = false;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PRICES_CACHE_TTL);
  });
  expect(result!.isUnavailable).toBe(true);
  expect(composeGmsolMarkets(raw, result!.tokensData!).marketsAddresses).not.toContain(market.marketTokenAddress);

  const previousData = { affected: { value: 1 }, healthy: { value: 1 }, closed: { value: 1 } };
  const data = { healthy: { value: 2 } };
  const keys = ["affected", "healthy"];
  expect(resolveGmsolAccountSnapshot({ keys, data, previousData })).toEqual({
    data: { affected: previousData.affected, healthy: data.healthy },
    isIncomplete: true,
  });
  expect(resolveGmsolAccountSnapshot({ keys, data, previousData: undefined })).toEqual({ data, isIncomplete: true });
  expect(resolveGmsolAccountSnapshot({ keys: [], data: {}, previousData })).toEqual({ data: {}, isIncomplete: false });

  includeIndex = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(result!.isUnavailable).toBe(false);
  const recovered = { affected: { value: 3 }, healthy: { value: 3 } };
  expect(resolveGmsolAccountSnapshot({ keys, data: recovered, previousData })).toEqual({
    data: recovered,
    isIncomplete: false,
  });
});

it("expires a snapshot while its refresh is pending and recovers when it resolves FESOL-52", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  let resolveRefresh: (value: number) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(1)
    .mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveRefresh = resolve;
        })
    );
  let result: ReturnType<typeof useSWRWithFreshness<number>>;
  await renderHook(() => {
    result = useSWRWithFreshness("pending-refresh", fetcher);
  });
  expect(result!.freshness.isStale).toBe(false);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_001);
  });
  expect(result!.data).toBe(1);
  expect(result!.error).toBeUndefined();
  expect(result!.freshness.isStale).toBe(true);
  await act(async () => {
    resolveRefresh(2);
  });
  expect(result!.data).toBe(2);
  expect(result!.freshness.isStale).toBe(false);
});
