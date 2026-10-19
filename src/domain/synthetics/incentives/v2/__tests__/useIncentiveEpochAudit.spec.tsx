import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../useIncentivesIndexerUrl", () => ({ useIncentivesIndexerUrl: () => "https://example.com/graphql" }));
vi.mock("../fetchIncentiveEpochAudit", () => ({ fetchIncentiveEpochAudit: vi.fn() }));

import { fetchIncentiveEpochAudit } from "../fetchIncentiveEpochAudit";
import { useIncentiveEpochAudit } from "../useIncentiveEpochAudit";

const mockFetch = vi.mocked(fetchIncentiveEpochAudit);
const swrConfig = { provider: () => new Map(), refreshInterval: 20, dedupingInterval: 0 };

function TestPage({ epoch }: { epoch: number }) {
  const { data, mutate } = useIncentiveEpochAudit(42161, epoch);
  return (
    <>
      <span>{data ? data.totalFees.toString() : "Loading"}</span>
      <button onClick={() => void mutate()}>Refresh</button>
    </>
  );
}

describe("useIncentiveEpochAudit", () => {
  beforeEach(() => mockFetch.mockReset());
  afterEach(cleanup);

  it("keeps a loaded epoch stable despite the app polling interval and reloads on demand", async () => {
    mockFetch.mockResolvedValue({ entries: [], totalFees: 10n });
    render(
      <SWRConfig value={swrConfig}>
        <TestPage epoch={100} />
      </SWRConfig>
    );
    await screen.findByText("10");
    await act(async () => new Promise((resolve) => setTimeout(resolve, 100)));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValue({ entries: [], totalFees: 20n });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("20");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not show another epoch's data while the selected epoch loads", async () => {
    mockFetch.mockResolvedValueOnce({ entries: [], totalFees: 10n });
    const { rerender } = render(
      <SWRConfig value={swrConfig}>
        <TestPage epoch={100} />
      </SWRConfig>
    );
    await screen.findByText("10");

    let resolveNext!: (value: Awaited<ReturnType<typeof fetchIncentiveEpochAudit>>) => void;
    mockFetch.mockImplementationOnce(() => new Promise((resolve) => (resolveNext = resolve)));
    rerender(
      <SWRConfig value={swrConfig}>
        <TestPage epoch={200} />
      </SWRConfig>
    );
    await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith("https://example.com/graphql", 200));
    expect(screen.queryByText("10")).toBeNull();
    expect(screen.getByText("Loading")).toBeTruthy();

    await act(async () => resolveNext({ entries: [], totalFees: 30n }));
    await screen.findByText("30");
  });
});
