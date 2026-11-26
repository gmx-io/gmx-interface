import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { GMSOL_MARKETS } from "config/gmsol/markets";
import { MARKETS_STALE_THRESHOLD_MS } from "domain/synthetics/markets/useMarketsInfoRequest/useApiMarketsInfoRequest";
import { PRICES_CACHE_TTL } from "lib/timeConstants";
import { useSWRWithFreshness } from "lib/useSWRWithFreshness";
import type { FeeDiscount } from "sdk/clients/v2";
import type { RawMarketConfig, RawMarketsInfoData, RawMarketValues } from "sdk/utils/markets/types";
import type { TokensData } from "sdk/utils/tokens/types";

import type { GmsolTokenPricesData } from "./gmsolOracleUtils";
import { composeGmsolMarkets, getGmsolUnpricedMarketAddresses } from "./markets/composeGmsolMarkets";
import { resolveGmsolAccountSnapshot } from "./resolveGmsolAccountSnapshot";
import { fetchGmsolPrices } from "./tokens/fetchGmsolPrices";
import { type GmsolTokensSnapshot, resolveGmsolTokensData } from "./tokens/resolveGmsolTokensData";
import { useGmsolTokensData } from "./tokens/useGmsolTokensData";
import { useGmsolFeeDiscount, useGmsolOrders } from "./useGmsolAccountData";
import { getGmsolMarketValuesGaps } from "./useGmsolRawMarketsInfo";

const gmsolApi = vi.hoisted(() => ({ fetchOrders: vi.fn(), fetchFeeDiscount: vi.fn() }));

vi.mock("context/GmxSdkContext/GmxSdkContext", () => ({ useGmxSdk: () => gmsolApi }));
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

const price = (updatedAt: number) => ({ minPrice: 1n, maxPrice: 1n, updatedAt });

it("ages each price from its ticker updatedAt and keeps a missing one only within the cache TTL FESOL-52", () => {
  const { indexTokenAddress: index, longTokenAddress: long, shortTokenAddress: short } = market;
  const resolve = (previous: GmsolTokensSnapshot | undefined, response: GmsolTokenPricesData, now: number) =>
    resolveGmsolTokensData({ previous, scope: "keeper", response, now });

  const complete = resolve(undefined, { [index]: price(0), [long]: price(0), [short]: price(0) }, 1_000);
  const partial = resolve(complete, { [long]: price(10_000), [short]: price(10_000) }, PRICES_CACHE_TTL - 1);
  const lagging = { [index]: price(0), [long]: price(5_000), [short]: price(5_000) };
  const pastTtl = resolve(partial, lagging, PRICES_CACHE_TTL);

  expect(partial.prices[index]).toBe(complete.prices[index]);
  expect(partial.pricesUpdatedAt).toBe(0);
  expect(resolve(partial, lagging, PRICES_CACHE_TTL - 1)).toBe(partial);
  expect(pastTtl.prices).toEqual({ [long]: partial.prices[long], [short]: partial.prices[short] });
  expect(composeGmsolMarkets(raw, pastTtl.tokensData!).marketsAddresses).not.toContain(market.marketTokenAddress);
  expect(composeGmsolMarkets(raw, partial.tokensData!).marketsAddresses).toContain(market.marketTokenAddress);
  for (const updatedAt of [61_000, Number.NaN, 1_000 - PRICES_CACHE_TTL]) {
    expect(resolve(undefined, { [index]: price(updatedAt) }, 1_000).tokensData).toBeUndefined();
  }
  expect(
    resolveGmsolTokensData({ previous: partial, scope: "fallback keeper", response: undefined, now: 1_000 }).tokensData
  ).toBeUndefined();
});

it("keeps a disabled market so its positions stay listed", () => {
  const disabled = {
    [market.marketTokenAddress]: { ...raw[market.marketTokenAddress], isDisabled: true },
  } as unknown as RawMarketsInfoData;

  expect(composeGmsolMarkets(disabled, tokens(true)).marketsAddresses).toContain(market.marketTokenAddress);
  expect(getGmsolUnpricedMarketAddresses(disabled, tokens(false))).toEqual([]);
});

it("blocks only the enabled markets that values omit, and every market when values cover none", () => {
  const config = (marketTokenAddress: string, isDisabled = false) =>
    ({
      marketTokenAddress,
      isDisabled,
      virtualIndexTokenId: "0x00",
      maxCollateralSumLongTokenLong: 0n,
      maxCollateralSumLongTokenShort: 0n,
      maxCollateralSumShortTokenLong: 0n,
      maxCollateralSumShortTokenShort: 0n,
    }) as RawMarketConfig;
  const value = (marketTokenAddress: string, fields: Partial<RawMarketValues> = {}) =>
    ({
      marketTokenAddress,
      updatedAt: 0,
      virtualInventoryForPositionsInTokens: 0n,
      longInterestUsdUsingLongToken: 0n,
      longInterestUsdUsingShortToken: 0n,
      shortInterestUsdUsingLongToken: 0n,
      shortInterestUsdUsingShortToken: 0n,
      longInterestInTokensUsingLongToken: 0n,
      longInterestInTokensUsingShortToken: 0n,
      shortInterestInTokensUsingLongToken: 0n,
      shortInterestInTokensUsingShortToken: 0n,
      ...fields,
    }) as RawMarketValues;
  const [sol, doge, btc] = [config("sol"), config("doge"), config("btc")];
  const lagging = { updatedAt: -MARKETS_STALE_THRESHOLD_MS - 1 };
  const cases: [RawMarketConfig[], RawMarketValues[], boolean, string[]][] = [
    [[sol, doge], [value("sol")], false, ["doge"]],
    [[sol, doge], [value("sol", { virtualInventoryForPositionsInTokens: undefined })], true, ["doge"]],
    [[sol, doge, btc], [value("sol"), value("btc", lagging)], true, ["doge"]],
    [[sol, doge], [value("eth")], true, ["sol", "doge"]],
    [[sol, config("doge", true)], [value("sol")], false, []],
    [[sol, config("doge", true)], [value("sol"), value("doge", { updatedAt: null })], false, []],
    [[config("doge", true)], [], false, []],
  ];

  for (const [configData, valuesData, isStale, missingMarketAddresses] of cases) {
    expect(getGmsolMarketValuesGaps(configData, valuesData)).toEqual({ isStale, missingMarketAddresses });
  }
});

it("marks partial prices unavailable and retains missing account items without reviving closed ones FESOL-52", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  let includeIndex = true;
  vi.mocked(fetchGmsolPrices).mockImplementation(async () =>
    Object.fromEntries(Object.keys(tokens(includeIndex)).map((address) => [address, price(Date.now())]))
  );
  let result: ReturnType<typeof useGmsolTokensData>;
  await renderHook(() => {
    result = useGmsolTokensData({ enabled: true, rawMarketsInfoData: raw });
  });
  expect(result!.unavailableReason).toBeUndefined();
  includeIndex = false;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PRICES_CACHE_TTL);
  });
  expect(result!.unavailableReason).toBe("coverage");
  expect(result!.unpricedMarketAddresses).toEqual([market.marketTokenAddress]);
  expect(composeGmsolMarkets(raw, result!.tokensData!).marketsAddresses).not.toContain(market.marketTokenAddress);

  const previousData = { affected: { value: 1 }, healthy: { value: 1 }, closed: { value: 1 } };
  const data = { healthy: { value: 2 } };
  const items = [
    { key: "affected", marketAddress: "doge" },
    { key: "healthy", marketAddress: "sol" },
  ];
  const uncovered = { uncoveredMarketAddresses: ["doge"] };
  expect(resolveGmsolAccountSnapshot({ items, data, previousData })).toEqual({
    data: { affected: previousData.affected, healthy: data.healthy },
    ...uncovered,
  });
  expect(resolveGmsolAccountSnapshot({ items, data, previousData: undefined })).toEqual({ data, ...uncovered });
  expect(resolveGmsolAccountSnapshot({ items: [], data: {}, previousData })).toEqual({
    data: {},
    uncoveredMarketAddresses: [],
  });

  includeIndex = true;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  expect(result!.unavailableReason).toBeUndefined();
  const recovered = { affected: { value: 3 }, healthy: { value: 3 } };
  expect(resolveGmsolAccountSnapshot({ items, data: recovered, previousData })).toEqual({
    data: recovered,
    uncoveredMarketAddresses: [],
  });
});

it("expires only opted-in snapshots while preserving error and recovery behavior FESOL-52", async () => {
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
  let resolveOrders: () => void;
  type OrdersRead = { onResponse: (metadata: { slot: number }) => void };
  gmsolApi.fetchOrders
    .mockImplementationOnce(async ({ onResponse }: OrdersRead) => {
      onResponse({ slot: 1 });
      return ["cached"];
    })
    .mockImplementation(
      ({ onResponse }: OrdersRead) =>
        new Promise((resolve) => {
          resolveOrders = () => {
            onResponse({ slot: 2 });
            resolve(["refreshed"]);
          };
        })
    );
  let result: ReturnType<typeof useSWRWithFreshness<number>>;
  let defaultResult: ReturnType<typeof useSWRWithFreshness<number>>;
  let orders: ReturnType<typeof useGmsolOrders>;
  await renderHook(() => {
    result = useSWRWithFreshness("pending-refresh", fetcher, { maxAgeMs: 15_000 });
    defaultResult = useSWRWithFreshness("pending-refresh", fetcher);
    orders = useGmsolOrders("owner");
  });
  expect(result!.freshness.isStale).toBe(false);
  expect(orders!).toMatchObject({ data: ["cached"], error: undefined });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_001);
  });
  expect(result!.data).toBe(1);
  expect(result!.error).toBeUndefined();
  expect(result!.freshness.isStale).toBe(true);
  expect(defaultResult!).toMatchObject({ data: 1, error: undefined, freshness: { isStale: false } });
  expect(orders!).toMatchObject({ data: ["cached"], error: expect.any(Error) });
  await act(async () => {
    resolveRefresh(2);
    resolveOrders();
  });
  expect(result!.data).toBe(2);
  expect(result!.freshness.isStale).toBe(false);
  expect(defaultResult!).toMatchObject({ data: 2, error: undefined, freshness: { isStale: false } });
  expect(orders!).toMatchObject({ data: ["refreshed"], error: undefined });
  fetcher.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(3);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  for (const snapshot of [result!, defaultResult!]) {
    expect(snapshot).toMatchObject({ data: 2, error: expect.any(Error), freshness: { isStale: true } });
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5_000);
  });
  for (const snapshot of [result!, defaultResult!]) {
    expect(snapshot).toMatchObject({ data: 3, error: undefined, freshness: { isStale: false } });
  }
});

it("stops applying a fee discount it could not refresh and restores it on recovery FESOL-52", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000);
  const discount = { orderFeeDiscountFactor: 1n } as FeeDiscount;
  gmsolApi.fetchFeeDiscount
    .mockResolvedValueOnce(discount)
    .mockRejectedValueOnce(new Error("429"))
    .mockResolvedValue(discount);
  let result: ReturnType<typeof useGmsolFeeDiscount>;
  await renderHook(() => {
    result = useGmsolFeeDiscount("owner");
  });
  expect(result!).toMatchObject({ data: discount, error: undefined });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(result!).toMatchObject({ data: undefined, error: expect.any(Error) });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  expect(result!).toMatchObject({ data: discount, error: undefined });
});
