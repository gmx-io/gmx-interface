import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";

import { isMarketRecentlyListed } from "components/ChartTokenSelector/marketFilters";

import { useMarketsListingDates } from "./useMarketsListingDates";

const state = vi.hoisted(() => ({ networkId: 42161 }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ networkId: state.networkId }) }));

const mocks = vi.hoisted(() => ({ fetchMarkets: vi.fn() }));

vi.mock("lib/oracleKeeperFetcher", () => ({
  useOracleKeeperFetcher: () => mocks,
}));

const existingIndexToken = "0x00000000000000000000000000000000000000A1";
const newIndexToken = "0x00000000000000000000000000000000000000B2";
const originalListingDate = "2025-01-01T00:00:00.000Z";
const recentListingDate = "2026-09-16T00:00:00.000Z";
const now = Date.parse("2026-09-17T00:00:00.000Z");
const swrConfig = { provider: () => new Map() };

describe("useMarketsListingDates", () => {
  afterEach(cleanup);

  it.each(["oldest first", "newest first"])(
    "only marks new index tokens as recently listed when markets arrive %s",
    async (order) => {
      const markets = [
        { indexToken: existingIndexToken, listingDate: originalListingDate },
        { indexToken: existingIndexToken, listingDate: recentListingDate },
        { indexToken: newIndexToken, listingDate: recentListingDate },
      ];
      mocks.fetchMarkets.mockResolvedValue(order === "oldest first" ? markets : [...markets].reverse());

      let result!: ReturnType<typeof useMarketsListingDates>;
      function TestComponent() {
        result = useMarketsListingDates(ARBITRUM);
        return null;
      }

      render(
        <SWRConfig value={swrConfig}>
          <TestComponent />
        </SWRConfig>
      );

      await waitFor(() => expect(result.isLoading).toBe(false));

      expect(result.listingDateByIndexToken).toEqual({
        [existingIndexToken]: Date.parse(originalListingDate),
        [newIndexToken]: Date.parse(recentListingDate),
      });
      expect(isMarketRecentlyListed(result.listingDateByIndexToken[existingIndexToken], now)).toBe(false);
      expect(isMarketRecentlyListed(result.listingDateByIndexToken[newIndexToken], now)).toBe(true);
    }
  );
});

describe("market listing dates by network", () => {
  it("keeps EVM dates out of Solana on selection changes and never requests guessed Solana dates", async () => {
    const date = "2026-11-01T00:00:00Z";
    mocks.fetchMarkets.mockResolvedValue([{ indexToken: "evm-index", listingDate: date }]);
    const cache = new Map();
    const config = { provider: () => cache, dedupingInterval: 0 };
    const wrapper = ({ children }: PropsWithChildren) => <SWRConfig value={config}>{children}</SWRConfig>;
    let result!: ReturnType<typeof useMarketsListingDates>;
    function Harness() {
      result = useMarketsListingDates(ARBITRUM);
      return null;
    }
    const { rerender } = render(<Harness />, { wrapper });
    await waitFor(() => expect(result.listingDateByIndexToken).toEqual({ "evm-index": Date.parse(date) }));
    const requests = mocks.fetchMarkets.mock.calls.length;

    act(() => {
      state.networkId = SOLANA_NETWORK_ID;
      rerender(<Harness />);
    });
    expect(result).toEqual({ listingDateByIndexToken: {}, isLoading: false });
    expect(mocks.fetchMarkets).toHaveBeenCalledTimes(requests);

    act(() => {
      state.networkId = ARBITRUM;
      rerender(<Harness />);
    });
    await waitFor(() => expect(result.listingDateByIndexToken).toEqual({ "evm-index": Date.parse(date) }));
  });
});
