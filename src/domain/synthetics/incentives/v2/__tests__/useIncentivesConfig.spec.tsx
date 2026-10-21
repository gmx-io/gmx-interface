import { act, render } from "@testing-library/react";
import useSWR from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", () => ({
  default: vi.fn(),
}));

vi.mock("../client", () => ({
  fetchIncentivesGraphql: vi.fn(),
  getIncentivesIndexerUrl: vi.fn(() => "https://example.com/graphql"),
}));

import { ARBITRUM } from "config/chains";

import { getIncentivesIndexerUrl } from "../client";
import type { IncentivesConfig } from "../types";
import { useIncentivesConfig } from "../useIncentivesConfig";

const mockUseSWR = vi.mocked(useSWR);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);
const epochTimestamp = 1_000;
const epochDuration = 100;
const config = { epochTimestamp, epochDuration } as IncentivesConfig;
const newConfig = { ...config, epochTimestamp: epochTimestamp + epochDuration };

function Harness() {
  useIncentivesConfig(ARBITRUM);
  return null;
}

function setSWRResult(mutate: ReturnType<typeof vi.fn>) {
  mockUseSWR.mockReturnValue({
    data: config,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate,
  } as never);
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

describe("useIncentivesConfig epoch boundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime((epochTimestamp + 50) * 1000);
    mockUseSWR.mockReset();
    mockGetIncentivesIndexerUrl.mockReturnValue("https://example.com/ivprod/graphql");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("revalidates one second after the epoch boundary", async () => {
    const mutate = vi.fn().mockResolvedValue(newConfig);
    setSWRResult(mutate);
    render(<Harness />);

    await advanceTimers(50_999);
    expect(mutate).not.toHaveBeenCalled();

    await advanceTimers(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the indexer keeps returning the old epoch", [], config, [1, 2, 3, 4, 5, 5]],
    [
      "refreshes fail before a newer epoch",
      [new Error("network error"), new Error("network error")],
      newConfig,
      [1, 2, 3, 3, 3, 3],
    ],
    ["a newer epoch is observed", [], newConfig, [1, 1, 1, 1, 1, 1]],
  ])(
    "retries after 5, 15, 30, and 45 seconds until a newer epoch arrives when %s",
    async (_, failures, result, expectedCalls) => {
      vi.setSystemTime((epochTimestamp + epochDuration) * 1000);
      const mutate = vi.fn().mockResolvedValue(result);
      failures.forEach((error) => mutate.mockRejectedValueOnce(error));
      setSWRResult(mutate);
      render(<Harness />);

      const calls: number[] = [];
      for (const milliseconds of [1_000, 5_000, 15_000, 30_000, 45_000, 60_000]) {
        await advanceTimers(milliseconds);
        calls.push(mutate.mock.calls.length);
      }
      expect(calls).toEqual(expectedCalls);
    }
  );

  it("schedules boundary retries again after the selected endpoint changes", async () => {
    vi.setSystemTime((epochTimestamp + epochDuration) * 1000);
    const mutate = vi.fn().mockResolvedValue(config);
    setSWRResult(mutate);
    const view = render(<Harness />);

    await advanceTimers(51_000);
    expect(mutate).toHaveBeenCalledTimes(4);

    mockGetIncentivesIndexerUrl.mockReturnValue("https://example.com/ivtest/graphql");
    view.rerender(<Harness />);
    await advanceTimers(1_000);

    expect(mutate).toHaveBeenCalledTimes(5);
  });
});
