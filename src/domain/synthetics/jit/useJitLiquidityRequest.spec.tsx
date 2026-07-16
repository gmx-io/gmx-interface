import { act, cleanup, render } from "@testing-library/react";
import noop from "lodash/noop";
import { SWRConfig, useSWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JitLiquidityData, JitLiquiditySnapshot } from "sdk/utils/jitLiquidity/types";
import { JIT_LIQUIDITY_MAX_FRESH_AGE_MS } from "sdk/utils/jitLiquidity/utils";

import { useJitLiquidityRequest } from "./useJitLiquidityRequest";

const mocks = vi.hoisted(() => ({
  fetchJitLiquidityInfo: vi.fn(),
  fetchJitLiquiditySnapshot: vi.fn(),
  useV2: true,
}));

vi.mock("config/api", () => ({
  getUiApiCacheKey: () => "test-api",
}));

vi.mock("context/GmxSdkContext/GmxSdkContext", () => ({
  useGmxSdk: () => ({
    fetchJitLiquidityInfo: mocks.fetchJitLiquidityInfo,
    fetchJitLiquiditySnapshot: mocks.fetchJitLiquiditySnapshot,
  }),
}));

vi.mock("../uiFlags/useUiFlagsRequest", () => ({
  getIsV2JitLiquidityInfoEnabled: () => mocks.useV2,
  useUiFlagsRequest: () => ({ uiFlags: undefined }),
}));

const MARKET = "0x2222222222222222222222222222222222222222";
const TEST_SWR_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

function buildSnapshot(generatedAt = Date.now()): JitLiquiditySnapshot {
  return {
    generatedAt,
    status: "available",
    unavailableMarkets: [],
    unavailableSides: [],
    jitLiquidityMap: {
      [MARKET]: {
        maxReservedUsdWithJitLong: 300n,
        maxReservedUsdWithJitShort: 400n,
        maxOrderSizeUsdLong: 100n,
        maxOrderSizeUsdShort: 200n,
        glvShiftParamsLong: [],
        glvShiftParamsShort: [],
        glvShiftParams: [],
        glv: "0x1111111111111111111111111111111111111111",
      },
    },
  };
}

function renderJitLiquidityRequest() {
  let latestState: JitLiquidityData | undefined;
  let mutate: ReturnType<typeof useSWRConfig>["mutate"] | undefined;
  let renderRevision = 0;

  function TestComponent({ revision }: { revision: number }) {
    void revision;
    latestState = useJitLiquidityRequest(42161);
    mutate = useSWRConfig().mutate;
    return null;
  }

  const view = render(
    <SWRConfig value={TEST_SWR_CONFIG}>
      <TestComponent revision={renderRevision} />
    </SWRConfig>
  );

  return {
    getState: () => latestState!,
    revalidate: async () => mutate!(["jitLiquidity", "test-api", "v2"]),
    rerender: () => {
      renderRevision++;
      view.rerender(
        <SWRConfig value={TEST_SWR_CONFIG}>
          <TestComponent revision={renderRevision} />
        </SWRConfig>
      );
    },
  };
}

describe("useJitLiquidityRequest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    mocks.fetchJitLiquidityInfo.mockReset();
    mocks.fetchJitLiquiditySnapshot.mockReset();
    mocks.useV2 = true;
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("expires retained v2 data at the local freshness boundary", async () => {
    mocks.fetchJitLiquiditySnapshot.mockResolvedValueOnce(buildSnapshot()).mockImplementation(() => new Promise(noop));
    const rendered = renderJitLiquidityRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(JIT_LIQUIDITY_MAX_FRESH_AGE_MS + 1);
    });
    expect(rendered.getState().jitLiquidityMap).toEqual({});
  });

  it("revalidates an aged healthy snapshot at its local freshness boundary", async () => {
    mocks.fetchJitLiquiditySnapshot
      .mockResolvedValueOnce(buildSnapshot(Date.now() - 3_000))
      .mockImplementationOnce(async () => buildSnapshot());
    const rendered = renderJitLiquidityRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(JIT_LIQUIDITY_MAX_FRESH_AGE_MS - 3_000 + 1);
    });

    expect(mocks.fetchJitLiquiditySnapshot).toHaveBeenCalledTimes(2);
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);
  });

  it("expires a snapshot received exactly at the freshness boundary", async () => {
    mocks.fetchJitLiquiditySnapshot
      .mockResolvedValueOnce(buildSnapshot(Date.now() - JIT_LIQUIDITY_MAX_FRESH_AGE_MS))
      .mockImplementation(() => new Promise(noop));
    const rendered = renderJitLiquidityRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(rendered.getState().jitLiquidityMap).toEqual({});
  });

  it("hides SWR-retained data after an error and restores it after recovery", async () => {
    vi.spyOn(console, "error").mockImplementation(noop);
    mocks.fetchJitLiquiditySnapshot.mockResolvedValueOnce(buildSnapshot());
    const rendered = renderJitLiquidityRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);

    mocks.fetchJitLiquiditySnapshot.mockRejectedValueOnce(new Error("keeper unavailable"));
    await act(async () => {
      await rendered.revalidate().catch(noop);
    });
    expect(rendered.getState().jitLiquidityMap).toBeUndefined();

    mocks.fetchJitLiquiditySnapshot.mockResolvedValueOnce(buildSnapshot());
    await act(async () => {
      await rendered.revalidate();
    });
    expect(rendered.getState().jitLiquidityMap).toHaveProperty(MARKET);
  });

  it("keeps stable data identity across unrelated renders", async () => {
    mocks.fetchJitLiquiditySnapshot.mockResolvedValueOnce(buildSnapshot()).mockImplementation(() => new Promise(noop));
    const rendered = renderJitLiquidityRequest();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const initialState = rendered.getState();
    const initialMap = initialState.jitLiquidityMap;

    rendered.rerender();

    expect(rendered.getState()).toBe(initialState);
    expect(rendered.getState().jitLiquidityMap).toBe(initialMap);
  });
});
