import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApiDataFallbackState } from "./useApiDataFallbackState";

type FallbackState = ReturnType<typeof useApiDataFallbackState>;
type Props = Parameters<typeof useApiDataFallbackState>[0];

function renderFallbackState(props: Props) {
  let latestState: FallbackState | undefined;

  function TestComponent(nextProps: Props) {
    latestState = useApiDataFallbackState(nextProps);
    return null;
  }

  const result = render(<TestComponent {...props} />);

  return {
    ...result,
    getState: () => latestState!,
  };
}

describe("useApiDataFallbackState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("waits for the initial fallback timeout when API has no data yet", async () => {
    const rendered = renderFallbackState({
      chainId: 42161,
      apiEnabled: true,
      apiData: undefined,
      isApiStale: true,
      apiError: undefined,
      initialFallbackTimeout: 1000,
    });

    expect(rendered.getState().shouldFallbackToRpc).toBe(false);
    expect(rendered.getState().isWaitingForInitialApiData).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(999);
    });

    expect(rendered.getState().shouldFallbackToRpc).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(rendered.getState().shouldFallbackToRpc).toBe(true);
    expect(rendered.getState().isInitialFallback).toBe(true);
  });

  it("falls back immediately when existing API data becomes stale", () => {
    const rendered = renderFallbackState({
      chainId: 42161,
      apiEnabled: true,
      apiData: { markets: [] },
      isApiStale: true,
      apiError: undefined,
    });

    expect(rendered.getState().shouldFallbackToRpc).toBe(true);
    expect(rendered.getState().isInitialFallback).toBe(false);
  });

  it("uses RPC immediately when API is disabled", () => {
    const rendered = renderFallbackState({
      chainId: 42161,
      apiEnabled: false,
      apiData: undefined,
      isApiStale: true,
      apiError: undefined,
    });

    expect(rendered.getState().shouldFallbackToRpc).toBe(true);
    expect(rendered.getState().isWaitingForInitialApiData).toBe(false);
  });
});
