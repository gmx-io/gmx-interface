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
    const mutate = vi.fn().mockResolvedValue({ ...config, epochTimestamp: epochTimestamp + epochDuration });
    setSWRResult(mutate);
    render(<Harness />);

    await advanceTimers(50_999);
    expect(mutate).not.toHaveBeenCalled();

    await advanceTimers(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("retries after 5, 15, and 30 seconds while the indexer returns the old epoch", async () => {
    vi.setSystemTime((epochTimestamp + epochDuration) * 1000);
    const mutate = vi.fn().mockResolvedValue(config);
    setSWRResult(mutate);
    render(<Harness />);

    await advanceTimers(1_000);
    expect(mutate).toHaveBeenCalledTimes(1);
    await advanceTimers(5_000);
    expect(mutate).toHaveBeenCalledTimes(2);
    await advanceTimers(15_000);
    expect(mutate).toHaveBeenCalledTimes(3);
    await advanceTimers(30_000);
    expect(mutate).toHaveBeenCalledTimes(4);

    await advanceTimers(60_000);
    expect(mutate).toHaveBeenCalledTimes(4);
  });

  it("stops retrying after observing a newer epoch", async () => {
    vi.setSystemTime((epochTimestamp + epochDuration) * 1000);
    const mutate = vi.fn().mockResolvedValue({ ...config, epochTimestamp: epochTimestamp + epochDuration });
    setSWRResult(mutate);
    render(<Harness />);

    await advanceTimers(1_000);
    expect(mutate).toHaveBeenCalledTimes(1);
    await advanceTimers(60_000);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("cancels the scheduled revalidation on unmount", async () => {
    const mutate = vi.fn().mockResolvedValue(config);
    setSWRResult(mutate);
    const { unmount } = render(<Harness />);

    unmount();
    await advanceTimers(60_000);

    expect(mutate).not.toHaveBeenCalled();
  });

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
