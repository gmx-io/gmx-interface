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

  it("returns a map keyed by lowercased indexTokenAddress (skipping undefined dates)", async () => {
    fetchMarketsMock.mockResolvedValue([
      { indexTokenAddress: "0xAaA", listingDate: 1000 },
      { indexTokenAddress: "0xBBB", listingDate: 2000 },
      { indexTokenAddress: "0xCCC", listingDate: undefined },
    ]);

    let captured: HookResult = { listingDateByIndexToken: {}, isLoading: true };

    await act(async () => {
      render(<Harness chainId={ARBITRUM} onResult={(r) => (captured = r)} />);
    });

    await waitFor(() => {
      expect(captured.isLoading).toBe(false);
    });

    expect(captured.listingDateByIndexToken).toEqual({
      "0xaaa": 1000,
      "0xbbb": 2000,
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
