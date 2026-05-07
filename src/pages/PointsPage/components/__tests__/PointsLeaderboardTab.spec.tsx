import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LeaderboardEntry } from "domain/synthetics/incentives/types";
import type { AccountLeaderboardEntry } from "domain/synthetics/incentives/useIncentivesAccountLeaderboardEntry";

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

const leaderboardMock = vi.hoisted(() => ({
  data: [] as LeaderboardEntry[] | undefined,
  totalCount: 0 as number | undefined,
  loading: false,
}));

vi.mock("domain/synthetics/incentives/useIncentivesLeaderboard", () => ({
  useIncentivesLeaderboard: () => ({
    data: leaderboardMock.data,
    totalCount: leaderboardMock.totalCount,
    hasNextPage: false,
    error: undefined,
    loading: leaderboardMock.loading,
  }),
}));

const accountEntryMock = vi.hoisted(() => ({
  data: undefined as AccountLeaderboardEntry | undefined,
  loading: false,
}));

vi.mock("domain/synthetics/incentives/useIncentivesAccountLeaderboardEntry", () => ({
  useIncentivesAccountLeaderboardEntry: () => ({
    data: accountEntryMock.data,
    error: undefined,
    loading: accountEntryMock.loading,
  }),
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
        <PointsLeaderboardTab chainId={ARBITRUM_CHAIN_ID} account={ACCOUNT} />
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
  accountEntryMock.data = undefined;
  accountEntryMock.loading = false;
  cleanup();
});

describe("PointsLeaderboardTab", () => {
  describe("pinned account row", () => {
    beforeEach(() => {
      // 32 total entries (2 pages of 16) — none of them is the connected user
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = 2 * PER_PAGE;
      // The connected user is rank 50 (way below the visible pages)
      accountEntryMock.data = {
        rank: 50,
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
      expect(within(pinned!).getByText("50")).toBeTruthy();
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
      expect(within(pinnedAfter!).getByText("50")).toBeTruthy();
      expect(within(pinnedAfter!).getByText(ACCOUNT)).toBeTruthy();
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
      accountEntryMock.data = {
        rank: 3,
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

    it("falls back to per-page detection when the account-leaderboard hook returns no data", () => {
      // Simulate the indexer not yet exposing the dedicated query
      accountEntryMock.data = undefined;

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
      accountEntryMock.data = undefined;
      // No user in the page data either
      leaderboardMock.data = buildPageEntries(0, PER_PAGE);
      leaderboardMock.totalCount = PER_PAGE;

      const { container } = renderTab();

      expect(getPinnedRow(container)).toBeNull();
    });
  });
});
