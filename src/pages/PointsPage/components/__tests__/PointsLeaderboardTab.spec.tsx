import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SorterContextProvider } from "context/SorterContext/SorterContextProvider";
import type { LeaderboardEntry } from "domain/synthetics/incentives/types";

vi.mock("img/ic_share_arrow_filled.svg?react", () => ({
  default: (props: any) => <svg data-testid="share-icon" {...props} />,
}));

vi.mock("img/ic_chevron_edge_left.svg?react", () => ({
  default: (props: any) => <svg data-testid="chevron-edge-left" {...props} />,
}));

vi.mock("img/ic_chevron_edge_right.svg?react", () => ({
  default: (props: any) => <svg data-testid="chevron-edge-right" {...props} />,
}));

vi.mock("img/ic_chevron_left.svg?react", () => ({
  default: (props: any) => <svg data-testid="chevron-left" {...props} />,
}));

vi.mock("img/ic_chevron_right.svg?react", () => ({
  default: (props: any) => <svg data-testid="chevron-right" {...props} />,
}));

const incentivesConfigMock = vi.hoisted(() => ({
  data: {
    epochTimestamp: 1700000000,
    epochDuration: 604800,
  } as { epochTimestamp: number; epochDuration: number } | undefined,
}));

vi.mock("domain/synthetics/incentives/useIncentivesConfig", () => ({
  useIncentivesConfig: () => ({ data: incentivesConfigMock.data }),
}));

// The component uses `useIncentivesLeaderboard` for both the page query and
// the where-filtered pinned-row query. The mock dispatches by params.where:
// when params.where.account is set, it returns the pinned entry; otherwise it
// returns the page data.
const leaderboardMock = vi.hoisted(() => ({
  data: [] as LeaderboardEntry[] | undefined,
  totalCount: 0 as number | undefined,
  loading: false,
  pinnedEntry: undefined as LeaderboardEntry | undefined,
  // Captures the most recent variables passed to the page query so tests can
  // assert that orderBy / offset / limit were forwarded correctly.
  lastPageParams: undefined as Record<string, unknown> | undefined,
}));

vi.mock("domain/synthetics/incentives/useIncentivesLeaderboard", () => ({
  useIncentivesLeaderboard: (_chainId: number, params: { where?: { account?: string } }) => {
    if (params.where?.account) {
      const entries = leaderboardMock.pinnedEntry ? [leaderboardMock.pinnedEntry] : [];
      return {
        data: entries,
        totalCount: entries.length,
        hasNextPage: false,
        error: undefined,
        loading: false,
      };
    }
    leaderboardMock.lastPageParams = params as unknown as Record<string, unknown>;
    return {
      data: leaderboardMock.data,
      totalCount: leaderboardMock.totalCount,
      hasNextPage: false,
      error: undefined,
      loading: leaderboardMock.loading,
    };
  },
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ active: false, signer: undefined }),
}));

vi.mock("domain/legacy", () => ({
  useGmxPrice: () => ({ gmxPrice: 0n }),
}));

vi.mock("components/PointsShare/PointsShare", () => ({
  PointsShare: () => null,
}));

vi.mock("components/AddressView/AddressView", () => ({
  default: ({ address }: { address: string }) => <span data-testid="address-view">{address}</span>,
}));

import { PointsLeaderboardTab } from "../PointsLeaderboardTab";

i18n.load({ en: {} });
i18n.activate("en");

const ARBITRUM_CHAIN_ID = 42161;
const POINTS_DECIMALS = 18n;
const ONE_POINT = 10n ** POINTS_DECIMALS;
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const PER_PAGE = 16;

function makeEntry(addressIdx: number, points: bigint): LeaderboardEntry {
  // Pad address with the index as the first hex chars so each entry has a unique address
  const padded = addressIdx.toString(16).padStart(40, "0");
  return {
    address: `0x${padded}`,
    volume: 1_000_000n * 10n ** 30n,
    pointsEarned: points,
    rewardsEarned: 0n,
    multiplier: 100,
  };
}

function buildPageEntries(startIdx: number, count: number): LeaderboardEntry[] {
  const list: LeaderboardEntry[] = [];
  for (let i = 0; i < count; i++) {
    // Use a non-account address (indices 1000+) to avoid collisions with the connected account
    list.push(makeEntry(1000 + startIdx + i, 10n ** 18n * BigInt(count - i)));
  }
  return list;
}

function renderTab() {
  return render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <SorterContextProvider>
          <PointsLeaderboardTab chainId={ARBITRUM_CHAIN_ID} account={ACCOUNT} />
        </SorterContextProvider>
      </MemoryRouter>
    </I18nProvider>
  );
}

function getPinnedRow(container: HTMLElement): HTMLElement | null {
  return container.querySelector("tr.\\!bg-blue-500\\/10") as HTMLElement | null;
}

afterEach(() => {
  leaderboardMock.data = [];
  leaderboardMock.totalCount = 0;
  leaderboardMock.loading = false;
  leaderboardMock.pinnedEntry = undefined;
  leaderboardMock.lastPageParams = undefined;
  // Sorter state persists to localStorage; wipe it so tests don't leak sort
  // selections from one another.
  localStorage.clear();
  cleanup();
});

describe("PointsLeaderboardTab", () => {
  describe("pinned account row", () => {
    beforeEach(() => {
      // 32 total entries (2 pages of 16) — none of them is the connected user
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = 2 * PER_PAGE;
      // The connected user is below the visible pages; backend returns the
      // entry but no rank.
      leaderboardMock.pinnedEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 42n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };
    });

    it("renders the connected user's row pinned at the top of page 1", () => {
      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      expect(within(pinned!).getByText(ACCOUNT)).toBeTruthy();
    });

    it("keeps the pinned row visible when paginating to a page that does not contain the user", () => {
      const { container } = renderTab();

      // Confirm pinned row exists on page 1
      expect(getPinnedRow(container)).not.toBeNull();

      // Switch to page 2 and confirm the pinned row is still rendered
      const page2Button = screen.getByRole("button", { name: "2" });
      fireEvent.click(page2Button);

      const pinnedAfter = getPinnedRow(container);
      expect(pinnedAfter).not.toBeNull();
      expect(within(pinnedAfter!).getByText(ACCOUNT)).toBeTruthy();
    });

    it("renders an em dash placeholder for rank when the user is not in the visible page", () => {
      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      // No rank can be derived because the user isn't in the visible page
      expect(within(pinned!).getByText("—")).toBeTruthy();
    });

    it("derives rank from the visible page when the user appears there", () => {
      // Place the connected user inside the visible page at rank 3
      const userInline: LeaderboardEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };
      const baseList = buildPageEntries(0, PER_PAGE - 1);
      baseList.splice(2, 0, userInline);
      leaderboardMock.data = baseList;
      leaderboardMock.totalCount = PER_PAGE;
      leaderboardMock.pinnedEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };

      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      // Rank is computed from the user's index on the current page (3rd entry => rank 3)
      expect(within(pinned!).getByText("3")).toBeTruthy();
    });

    it("does not duplicate the user's row when they appear in the visible page data", () => {
      // Place the connected user inside the visible page at rank 3
      const userInline: LeaderboardEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };
      const baseList = buildPageEntries(0, PER_PAGE - 1);
      baseList.splice(2, 0, userInline);
      leaderboardMock.data = baseList;
      leaderboardMock.totalCount = PER_PAGE;
      leaderboardMock.pinnedEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };

      const { container } = renderTab();

      // Should only have a single rendered row for the connected user (the pinned one)
      const matchingRows = container.querySelectorAll(`[data-testid="address-view"]`);
      const userRows = Array.from(matchingRows).filter((el) => el.textContent === ACCOUNT);
      expect(userRows).toHaveLength(1);
    });

    it("falls back to per-page detection when the where-filtered query returns no data", () => {
      // Simulate the indexer not yet seeing the user (no pinned entry)
      leaderboardMock.pinnedEntry = undefined;

      // Place the user inline in the page data so the existing fallback can find them
      const userInline: LeaderboardEntry = {
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };
      const baseList = buildPageEntries(0, PER_PAGE - 1);
      baseList.splice(2, 0, userInline);
      leaderboardMock.data = baseList;
      leaderboardMock.totalCount = PER_PAGE;

      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      // Rank is computed from the user's index on the current page (3rd entry => rank 3)
      expect(within(pinned!).getByText("3")).toBeTruthy();
    });

    it("does not render the pinned row when the user is unranked and absent from the visible page", () => {
      leaderboardMock.pinnedEntry = undefined;
      // No user in the page data either
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = PER_PAGE;

      const { container } = renderTab();

      expect(getPinnedRow(container)).toBeNull();
    });
  });

  describe("sortable columns", () => {
    beforeEach(() => {
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = PER_PAGE;
    });

    function getSortButton(label: string): HTMLButtonElement {
      // The Sorter wraps the header label in a <button>; querying by text and
      // walking up to the closest button is the most resilient lookup.
      const labelEl = screen.getByText(label);
      const button = labelEl.closest("button");
      if (!button) throw new Error(`No sortable button found for column "${label}"`);
      return button as HTMLButtonElement;
    }

    it("requests volume_DESC by default", () => {
      renderTab();

      expect(leaderboardMock.lastPageParams?.orderBy).toBe("volume_DESC");
    });

    it("toggles a column between DESC, ASC, and unspecified", () => {
      renderTab();

      const earnedPoints = getSortButton("Earned Points");

      // First click: desc (the directionSequence in Sorter is desc → asc → unspecified)
      fireEvent.click(earnedPoints);
      expect(leaderboardMock.lastPageParams?.orderBy).toBe("pointsEarned_DESC");

      // Second click: asc
      fireEvent.click(earnedPoints);
      expect(leaderboardMock.lastPageParams?.orderBy).toBe("pointsEarned_ASC");

      // Third click: unspecified — falls back to default volume_DESC
      fireEvent.click(earnedPoints);
      expect(leaderboardMock.lastPageParams?.orderBy).toBe("volume_DESC");
    });

    it("sends rewardsEarned_DESC when sorting by Earned Rewards", () => {
      renderTab();

      fireEvent.click(getSortButton("Earned Rewards"));

      expect(leaderboardMock.lastPageParams?.orderBy).toBe("rewardsEarned_DESC");
    });

    it("renders a sortable Multiplier column on current/last epochs", () => {
      renderTab();

      const multiplier = getSortButton("Multiplier");
      fireEvent.click(multiplier);
      expect(leaderboardMock.lastPageParams?.orderBy).toBe("multiplier_DESC");
    });

    it("disables the Multiplier sort and snaps back to volume_DESC on All-time", () => {
      renderTab();

      // Sort by multiplier on the default current epoch
      fireEvent.click(getSortButton("Multiplier"));
      expect(leaderboardMock.lastPageParams?.orderBy).toBe("multiplier_DESC");

      // Switch to All-time — the multiplier column hides and the sort snaps
      // back to volume_DESC since multiplier ordering is silently downgraded
      // by the backend in all-time mode.
      fireEvent.click(screen.getByText("All-time"));

      expect(leaderboardMock.lastPageParams?.orderBy).toBe("volume_DESC");
      // The Multiplier sort button is no longer rendered
      expect(screen.queryByText("Multiplier")).toBeNull();
    });

    it("resets to page 1 when the sort changes", () => {
      // 32 entries => 2 pages
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = 2 * PER_PAGE;

      renderTab();

      // Move to page 2
      fireEvent.click(screen.getByRole("button", { name: "2" }));
      expect(leaderboardMock.lastPageParams?.offset).toBe(PER_PAGE);

      // Change sort — page should reset
      fireEvent.click(getSortButton("Earned Points"));
      expect(leaderboardMock.lastPageParams?.offset).toBe(0);
    });
  });
});
