import { act, cleanup, render } from "@testing-library/react";
import { createElement } from "react"; 
import { SWRConfig } from "swr"; 
import { afterEach, describe, expect, it, vi } from "vitest";
 
import { mergeFreshness, useSWRWithFreshness } from "./useSWRWithFreshness";

describe("mergeFreshness", () => {
  it("is stale as soon as one part is stale and dates from the oldest stale part", () => {
    expect(
      mergeFreshness({ isStale: false, asOf: 10 }, { isStale: true, asOf: 30 }, { isStale: true, asOf: 20 })
    ).toEqual({
      isStale: true,
      asOf: 20,
    });
  });

  it("keeps the oldest known time while every part is fresh", () => {
    expect(mergeFreshness({ isStale: false, asOf: 10 }, undefined, { isStale: false, asOf: 5 })).toEqual({
      isStale: false,
      asOf: 5,
    });
  });

  it("reports a stale part of unknown age without inventing one", () => {
    expect(mergeFreshness({ isStale: true, asOf: undefined }, { isStale: false, asOf: 10 })).toEqual({
      isStale: true,
      asOf: undefined,
    });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("retries a failed refresh and updates both the value and its freshness", async () => {
  let result: ReturnType<typeof useSWRWithFreshness<number>>;
  const fetcher = vi.fn().mockResolvedValueOnce(1).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(2);
  vi.spyOn(Date, "now").mockReturnValue(1000);
  function Probe() {
    result = useSWRWithFreshness<number>("retry-freshness", fetcher, { shouldRetryOnError: false });
    return null;
  }
  await act(async () => {
    render(
      createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, createElement(Probe))
    );
  });
  expect(result!.data).toBe(1);
  await act(async () => {
    expect(await result!.refetch()).toBe(1);
  });
  expect(result!.data).toBe(1);
  expect(result!.error?.message).toBe("offline");
  expect(result!.freshness.isStale).toBe(true);
  vi.mocked(Date.now).mockReturnValue(2000);
  await act(async () => {
    expect(await result!.refetch()).toBe(2);
  });
  expect(result!.data).toBe(2);
  expect(result!.error).toBeUndefined();
  expect(result!.freshness).toEqual({ isStale: false, asOf: 2000 });
});
