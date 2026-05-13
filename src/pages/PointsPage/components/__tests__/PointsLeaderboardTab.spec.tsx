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
  error: undefined as Error | undefined,
  pinnedEntry: undefined as LeaderboardEntry | undefined,
  pinnedError: undefined as Error | undefined,
  pinnedLoading: false,
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
        error: leaderboardMock.pinnedError,
        loading: leaderboardMock.pinnedLoading,
      };
    }
    leaderboardMock.lastPageParams = params as unknown as Record<string, unknown>;
    return {
      data: leaderboardMock.data,
      totalCount: leaderboardMock.totalCount,
      hasNextPage: false,
      error: leaderboardMock.error,
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

function makeEntry(addressIdx: number, points: bigint, rank: number): LeaderboardEntry {
  // Pad address with the index as the first hex chars so each entry has a unique address
  const padded = addressIdx.toString(16).padStart(40, "0");
  return {
    rank,
    address: `0x${padded}`,
    volume: 1_000_000n * 10n ** 30n,
    pointsEarned: points,
    rewardsEarned: 0n,
    multiplier: 100,
  };
}

function buildPageEntries(startIdx: number, count: number, startRank = 1): LeaderboardEntry[] {
  const list: LeaderboardEntry[] = [];
  for (let i = 0; i < count; i++) {
    // Use a non-account address (indices 1000+) to avoid collisions with the connected account
    list.push(makeEntry(1000 + startIdx + i, 10n ** 18n * BigInt(count - i), startRank + i));
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
  return container.querySelector('[data-testid="leaderboard-pinned-row"]') as HTMLElement | null;
}

afterEach(() => {
  leaderboardMock.data = [];
  leaderboardMock.totalCount = 0;
  leaderboardMock.loading = false;
  leaderboardMock.error = undefined;
  leaderboardMock.pinnedEntry = undefined;
  leaderboardMock.pinnedError = undefined;
  leaderboardMock.pinnedLoading = false;
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
      // entry with a server-computed rank.
      leaderboardMock.pinnedEntry = {
        rank: 99,
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

    it("does not render the pinned row on pages other than page 1", () => {
      const { container } = renderTab();

      // Pinned row exists on page 1
      expect(getPinnedRow(container)).not.toBeNull();

      // Switch to page 2 — pinned row should disappear
      const page2Button = screen.getByRole("button", { name: "2" });
      fireEvent.click(page2Button);

      expect(getPinnedRow(container)).toBeNull();
    });

    it("renders the server-provided rank on the pinned row", () => {
      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      expect(within(pinned!).getByText("99")).toBeTruthy();
    });

    it("highlights the user's inline row and shows a share button when user is on page 1", () => {
      // Connected user has rank 3 — they appear inline on page 1, no separate pin
      const userInline: LeaderboardEntry = {
        rank: 3,
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };
      const baseList = buildPageEntries(0, PER_PAGE - 1);
      baseList.splice(2, 0, userInline);
      baseList.forEach((e, i) => (e.rank = i + 1));
      leaderboardMock.data = baseList;
      leaderboardMock.totalCount = PER_PAGE;
      leaderboardMock.pinnedEntry = {
        rank: 3,
        address: ACCOUNT,
        volume: 5_000n * 10n ** 30n,
        pointsEarned: 100n * ONE_POINT,
        rewardsEarned: 0n,
        multiplier: 100,
      };

      const { container } = renderTab();

      // No separate pinned row because user is on page 1 (rank ≤ PER_PAGE)
      expect(getPinnedRow(container)).toBeNull();

      // User appears exactly once inline, and that row has the highlight bg + share button
      const matchingRows = container.querySelectorAll(`[data-testid="address-view"]`);
      const userAddressEls = Array.from(matchingRows).filter((el) => el.textContent === ACCOUNT);
      expect(userAddressEls).toHaveLength(1);

      const userRow = userAddressEls[0].closest("tr") as HTMLElement;
      expect(userRow.className).toContain("!bg-blue-500/10");
      expect(within(userRow).getByText("Share")).toBeTruthy();
    });

    it("renders a synthetic N/A pinned row with zeros when the user has no leaderboard entry", () => {
      leaderboardMock.pinnedEntry = undefined;
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = PER_PAGE;

      const { container } = renderTab();

      const pinned = getPinnedRow(container);
      expect(pinned).not.toBeNull();
      const text = pinned!.textContent ?? "";
      expect(text).toContain("N/A");
      expect(text).toContain(ACCOUNT);
      // Volume "$0", earned points "0.00", rewards "0.00 GMX (...)", multiplier "0.00x"
      expect(text).toContain("0.00 GMX");
      expect(text).toContain("0.00x");
      // No share button when there is no real rank
      expect(within(pinned!).queryByText("Share")).toBeNull();
    });

    it("does not render the synthetic pinned row on page 2", () => {
      leaderboardMock.pinnedEntry = undefined;
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = 2 * PER_PAGE;

      const { container } = renderTab();
      expect(getPinnedRow(container)).not.toBeNull();

      const page2Button = screen.getByRole("button", { name: "2" });
      fireEvent.click(page2Button);

      expect(getPinnedRow(container)).toBeNull();
    });

    it("does not render the pinned row when the user is in page data but their rank > PER_PAGE", () => {
      // Regression: when the active sort places the user on page 1 but their
      // server-returned rank (from a different default ordering) is past
      // PER_PAGE, the previous rank-based check would still pin them, causing
      // a duplicate row.
      const userInline: LeaderboardEntry = {
        rank: 47,
        address: ACCOUNT,
        volume: 14n * 10n ** 30n,
        pointsEarned: 0n,
        rewardsEarned: 0n,
        multiplier: 225,
      };
      const baseList = buildPageEntries(0, PER_PAGE - 1);
      baseList.splice(0, 0, userInline);
      leaderboardMock.data = baseList;
      leaderboardMock.totalCount = 100;
      leaderboardMock.pinnedEntry = userInline;

      const { container } = renderTab();

      expect(getPinnedRow(container)).toBeNull();
      const userAddressEls = container.querySelectorAll(`[data-testid="address-view"]`);
      const userRows = Array.from(userAddressEls).filter((el) => el.textContent === ACCOUNT);
      expect(userRows).toHaveLength(1);
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

  describe("degraded states", () => {
    it("renders a failed state when leaderboard data cannot be loaded", () => {
      leaderboardMock.data = undefined;
      leaderboardMock.totalCount = undefined;
      leaderboardMock.error = new Error("blocked");

      renderTab();

      expect(screen.getByText("Leaderboard data is temporarily unavailable. Please try again later.")).toBeTruthy();
      expect(screen.queryByText("Rank")).toBeNull();
    });

    it("does not synthesize a user row when the pinned account lookup fails", () => {
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = PER_PAGE;
      leaderboardMock.pinnedEntry = undefined;
      leaderboardMock.pinnedError = new Error("blocked");

      const { container } = renderTab();

      expect(screen.getByText("Your leaderboard rank is temporarily unavailable.")).toBeTruthy();
      expect(getPinnedRow(container)).toBeNull();
      expect(screen.queryByText("N/A")).toBeNull();
    });
  });
});
