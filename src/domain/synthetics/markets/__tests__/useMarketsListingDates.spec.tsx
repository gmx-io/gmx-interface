import { act, cleanup, render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ARBITRUM, AVALANCHE } from "sdk/configs/chainIds";

const fetchMarketsMock = vi.fn();

vi.mock("lib/oracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => ({
    fetchMarkets: fetchMarketsMock,
  }),
}));

import { useMarketsListingDates, type MarketsListingDates } from "../useMarketsListingDates";

type HookResult = { listingDateByIndexToken: MarketsListingDates; isLoading: boolean };

function Harness({
  chainId,
  onResult,
}: {
  chainId: typeof ARBITRUM | typeof AVALANCHE;
  onResult: (r: HookResult) => void;
}) {
  const result = useMarketsListingDates(chainId);
  onResult(result);
  return null;
}

describe("useMarketsListingDates", () => {
  beforeEach(() => {
    fetchMarketsMock.mockReset();
  });
  afterEach(cleanup);

  it("returns a map keyed by lowercased indexToken with parsed ISO dates (skipping undefined)", async () => {
    fetchMarketsMock.mockResolvedValue([
      { indexToken: "0xAaA", listingDate: "2024-01-01T00:00:00.000Z" },
      { indexToken: "0xBBB", listingDate: "2025-06-15T00:00:00.000Z" },
      { indexToken: "0xCCC", listingDate: undefined },
      { indexToken: "0xDDD" }, // listingDate absent
    ]);

    let captured: HookResult = { listingDateByIndexToken: {}, isLoading: true };

    await act(async () => {
      render(<Harness chainId={ARBITRUM} onResult={(r) => (captured = r)} />);
    });

    await waitFor(() => {
      expect(captured.isLoading).toBe(false);
    });

    expect(captured.listingDateByIndexToken).toEqual({
      "0xaaa": Date.UTC(2024, 0, 1),
      "0xbbb": Date.UTC(2025, 5, 15),
    });
  });

  it("returns empty map when API yields empty array", async () => {
    fetchMarketsMock.mockResolvedValue([]);

    let captured: HookResult = { listingDateByIndexToken: {}, isLoading: true };

    await act(async () => {
      render(<Harness chainId={AVALANCHE} onResult={(r) => (captured = r)} />);
    });

    await waitFor(() => {
      expect(captured.isLoading).toBe(false);
    });

    expect(captured.listingDateByIndexToken).toEqual({});
  });
});
