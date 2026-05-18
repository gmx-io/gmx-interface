import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import "./PointsLeaderboardTab.scss";

import { ARBITRUM } from "config/chains";
import type { ContractsChainId } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { formatMultiplier } from "domain/synthetics/incentives/constants";
import type { LeaderboardEntry } from "domain/synthetics/incentives/types";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import {
  type IncentivesLeaderboardOrderBy,
  useIncentivesLeaderboard,
} from "domain/synthetics/incentives/useIncentivesLeaderboard";
import { formatAmount, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { PointsShare } from "components/PointsShare/PointsShare";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import ShareIcon from "img/ic_share_arrow_filled.svg?react";

const COL_RANK: React.CSSProperties = { width: "6%" };
const COL_ADDRESS: React.CSSProperties = { width: "22%" };
const COL_VOLUME: React.CSSProperties = { width: "18%" };
const COL_POINTS: React.CSSProperties = { width: "16%" };
const COL_REWARDS: React.CSSProperties = { width: "20%" };
const COL_MULTIPLIER: React.CSSProperties = { width: "10%" };
const COL_SHARE: React.CSSProperties = { width: "8%" };
const GMX_DECIMALS = 18;
const GMX_DECIMALS_FACTOR = 10n ** 18n;
const LEADERBOARD_ROW_CLASS_NAME = "h-[43px]";
const LEADERBOARD_TD_CLASS_NAME = "!py-10";
const CURRENT_ACCOUNT_ROW_CLASS_NAME =
  "border-b-1/2 border-blue-500/30 !bg-blue-500/10 text-blue-100 [&_.AddressView-trader-id]:!text-typography-primary [&_.AddressView-trader-id_.text-typography-secondary]:!text-blue-100";

function PointsLeaderboardSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <tr className={cx(LEADERBOARD_ROW_CLASS_NAME, !invisible && "odd:bg-fill-surfaceElevated50")}>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={40} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={140} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={150} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={70} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={56} inline />
      </TableTd>
    </tr>
  );
}

function getRankClassName(rank: number | null) {
  if (rank !== null && rank <= 3) return `PointsLeaderboardRank-${rank}`;
  return undefined;
}

const PER_PAGE = 16;

type TimeFilter = "current" | "last" | "all";

type LeaderboardSortField = "volume" | "pointsEarned" | "rewardsEarned" | "multiplier";

function toLeaderboardOrderBy(
  field: LeaderboardSortField | "unspecified",
  direction: "asc" | "desc" | "unspecified"
): IncentivesLeaderboardOrderBy {
  if (direction === "unspecified" || field === "unspecified") return "volume_DESC";
  return `${field}_${direction === "asc" ? "ASC" : "DESC"}` as IncentivesLeaderboardOrderBy;
}

type Props = {
  chainId: ContractsChainId;
  account?: string;
};

export function PointsLeaderboardTab({ chainId, account }: Props) {
  const { data: config } = useIncentivesConfig(chainId);
  const { active, signer } = useWallet();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("current");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const epoch = useMemo(() => {
    if (!config) return undefined;
    if (timeFilter === "current") return config.epochTimestamp;
    if (timeFilter === "last") return config.epochTimestamp - config.epochDuration;
    return undefined; // all-time
  }, [config, timeFilter]);

  const showMultiplier = timeFilter !== "all";
  const {
    orderBy: sortField,
    direction: sortDirection,
    getSorterProps,
    setOrderBy,
    setDirection,
  } = useSorterHandlers<LeaderboardSortField>("points-leaderboard", {
    orderBy: "volume",
    direction: "desc",
  });

  // Backend silently falls back to volume_DESC for multiplier ordering when
  // epoch is undefined (all-time). To keep the visible sort consistent with
  // the data, snap the sort back to volume_DESC if the user switches to
  // all-time while sorting by multiplier.
  useEffect(() => {
    if (!showMultiplier && sortField === "multiplier") {
      setOrderBy("volume");
      setDirection("desc");
    }
  }, [showMultiplier, sortField, setOrderBy, setDirection]);

  const orderBy = toLeaderboardOrderBy(sortField, sortDirection);

  const leaderboardEnabled = timeFilter === "all" || epoch !== undefined;
  const {
    data: leaderboard,
    totalCount,
    error,
    loading,
  } = useIncentivesLeaderboard(chainId, {
    epoch,
    orderBy,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
    enabled: leaderboardEnabled,
  });
  // Fetch the connected user's leaderboard entry separately so we can pin it
  // to page 1 when their rank is below the visible page. Uses the same
  // `orderBy` as the main list so the server-computed rank stays consistent
  // with the visible ordering.
  const {
    data: pinnedEntries,
    error: pinnedError,
    loading: pinnedLoading,
  } = useIncentivesLeaderboard(chainId, {
    epoch,
    where: { account },
    orderBy,
    limit: 1,
    offset: 0,
    enabled: leaderboardEnabled && !!account,
  });
  const pinnedEntry = pinnedEntries?.[0];

  const timeFilterOptions = useMemo(
    () => [
      { value: "current" as const, label: <Trans>Volume this epoch</Trans> },
      { value: "last" as const, label: <Trans>Last epoch</Trans> },
      { value: "all" as const, label: <Trans>All-time</Trans> },
    ],
    []
  );

  const handleTimeFilterChange = useCallback(
    (value: TimeFilter) => {
      setTimeFilter(value);
      setPage(1);
    },
    [setTimeFilter, setPage]
  );

  // Reset to page 1 whenever the sort changes — otherwise the user can land
  // mid-list with no rows above the visible offset.
  useEffect(() => {
    setPage(1);
  }, [orderBy]);

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const pageData = useMemo(() => leaderboard ?? [], [leaderboard]);
  const isInitialLoading = loading && !leaderboard;
  const hasLeaderboardFailure = Boolean(error) && (!leaderboard || leaderboard.length === 0);
  const showLeaderboardDegradedNotice = Boolean(error) && Boolean(leaderboard?.length);
  const showPinnedEntryDegradedNotice = Boolean(pinnedError) && Boolean(account) && !hasLeaderboardFailure;
  const formatRewards = useCallback(
    (rewardsEarned: bigint) => {
      const gmxLabel = `${formatAmount(rewardsEarned, GMX_DECIMALS, 2, true)} GMX`;
      const usdValue =
        gmxPrice !== undefined && gmxPrice > 0n ? (rewardsEarned * gmxPrice) / GMX_DECIMALS_FACTOR : undefined;
      const usdLabel = formatUsd(usdValue, { fallbackToZero: true, displayDecimals: 2 });

      return `${gmxLabel} (${usdLabel})`;
    },
    [gmxPrice]
  );

  // When the user has no leaderboard entry, synthesize a zero-valued row so
  // the pinned slot still surfaces their account at rank "N/A". Wait for the
  // pinned query to settle before synthesizing — otherwise we'd flash a fake
  // zero row during the initial load.
  const userEntry: LeaderboardEntry | null = useMemo(() => {
    if (!account) return null;
    if (pinnedEntry) return pinnedEntry;
    if (pinnedError) return null;
    if (pinnedLoading) return null;
    return {
      rank: 0,
      address: account,
      volume: 0n,
      pointsEarned: 0n,
      rewardsEarned: 0n,
      multiplier: 0,
    };
  }, [account, pinnedEntry, pinnedError, pinnedLoading]);
  const isSyntheticUserEntry = userEntry !== null && pinnedEntry === undefined;
  const userRank = isSyntheticUserEntry ? null : userEntry?.rank ?? null;
  // Show the pinned row only on page 1, and only when the user's row isn't
  // already in the visible page data. Checking the actual page data (rather
  // than rank math) is robust to sort/order mismatches between the two
  // queries.
  const isUserOnVisiblePage = useMemo(() => {
    if (!account) return false;
    const lower = account.toLowerCase();
    return pageData.some((e) => e.address.toLowerCase() === lower);
  }, [account, pageData]);
  const showPinnedRow = page === 1 && userEntry !== null && !isUserOnVisiblePage;

  const tdClassName = LEADERBOARD_TD_CLASS_NAME;

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 p-20">
        <h3 className="mb-12 text-16 font-medium text-typography-primary">
          <Trans>Leaderboard</Trans>
        </h3>

        <div className="flex flex-wrap items-center gap-8">
          <Tabs<TimeFilter>
            type="inline"
            options={timeFilterOptions}
            selectedValue={timeFilter}
            onChange={handleTimeFilterChange}
            className="shrink-0"
          />
        </div>
      </div>

      {hasLeaderboardFailure ? (
        <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
          <Trans>Leaderboard data is temporarily unavailable. Please try again later.</Trans>
        </div>
      ) : page === 1 && leaderboard && leaderboard.length === 0 ? (
        <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
          <Trans>Leaderboard data is not available yet.</Trans>
        </div>
      ) : (
        <div className="flex grow flex-col rounded-8 bg-slate-900">
          {(showLeaderboardDegradedNotice || showPinnedEntryDegradedNotice) && (
            <div className="px-20 pb-8 pt-12">
              <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
                {showLeaderboardDegradedNotice ? (
                  <Trans>Leaderboard data could not be refreshed. Showing the latest loaded data.</Trans>
                ) : (
                  <Trans>Your leaderboard rank is temporarily unavailable.</Trans>
                )}
              </div>
            </div>
          )}
          <TableScrollFadeContainer className="grow">
            <table className="w-full min-w-[800px] table-fixed">
              <colgroup>
                <col style={COL_RANK} />
                <col style={COL_ADDRESS} />
                <col style={COL_VOLUME} />
                <col style={COL_POINTS} />
                <col style={COL_REWARDS} />
                <col style={COL_MULTIPLIER} />
                <col style={COL_SHARE} />
              </colgroup>
              <thead>
                <TableTheadTr>
                  <TableTh>{t`Rank`}</TableTh>
                  <TableTh>{t`Address`}</TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("volume")}>{t`Volume`}</Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("pointsEarned")}>{t`Earned Points`}</Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("rewardsEarned")}>{t`Earned Rewards`}</Sorter>
                  </TableTh>
                  <TableTh>
                    {showMultiplier ? <Sorter {...getSorterProps("multiplier")}>{t`Multiplier`}</Sorter> : null}
                  </TableTh>
                  <TableTh />
                </TableTheadTr>
              </thead>
              <tbody>
                {isInitialLoading ? (
                  <TableListSkeleton count={PER_PAGE} Structure={PointsLeaderboardSkeletonRow} />
                ) : (
                  <>
                    {showPinnedRow && userEntry && (
                      <TableTr
                        data-testid="leaderboard-pinned-row"
                        className={cx(LEADERBOARD_ROW_CLASS_NAME, CURRENT_ACCOUNT_ROW_CLASS_NAME)}
                      >
                        <TableTd className={cx(tdClassName, "relative")}>
                          <span className={cx("numbers", getRankClassName(userRank))}>
                            {userRank !== null ? userRank : t`N/A`}
                          </span>
                        </TableTd>
                        <TableTd>
                          <AddressView size={20} address={userEntry.address} breakpoint="XL" />
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatUsd(userEntry.volume, { displayDecimals: 0 })}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatAmount(userEntry.pointsEarned, 18, 2, true)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {formatRewards(userEntry.rewardsEarned)}
                        </TableTd>
                        <TableTd className={cx(tdClassName, "numbers")}>
                          {showMultiplier ? formatMultiplier(userEntry.multiplier) : ""}
                        </TableTd>
                        <TableTd className={tdClassName}>
                          {userRank !== null && (
                            <button
                              type="button"
                              onClick={() => setIsShareOpen(true)}
                              className="inline-flex items-center gap-4 whitespace-nowrap text-13 font-medium text-blue-100"
                            >
                              <ShareIcon />
                              <Trans>Share</Trans>
                            </button>
                          )}
                        </TableTd>
                      </TableTr>
                    )}
                    {pageData.map((entry) => {
                      const rank = entry.rank;
                      const isUserRow = !!account && entry.address.toLowerCase() === account.toLowerCase();
                      return (
                        <TableTr
                          key={entry.address}
                          hoverable={!isUserRow}
                          className={cx(LEADERBOARD_ROW_CLASS_NAME, isUserRow && CURRENT_ACCOUNT_ROW_CLASS_NAME)}
                        >
                          <TableTd className={cx(tdClassName, "relative")}>
                            <span
                              className={cx("font-medium numbers after:!top-7", getRankClassName(rank), {
                                "text-yellow-300": rank <= 3 && !isUserRow,
                              })}
                            >
                              {rank}
                            </span>
                          </TableTd>
                          <TableTd className={cx(tdClassName, "numbers")}>
                            <AddressView size={20} address={entry.address} breakpoint="XL" />
                          </TableTd>
                          <TableTd className={cx(tdClassName, "numbers")}>
                            {formatUsd(entry.volume, { displayDecimals: 0 })}
                          </TableTd>
                          <TableTd className={cx(tdClassName, "numbers")}>
                            {formatAmount(entry.pointsEarned, 18, 2, true)}
                          </TableTd>
                          <TableTd className={cx(tdClassName, "numbers")}>{formatRewards(entry.rewardsEarned)}</TableTd>
                          <TableTd className={cx(tdClassName, "numbers")}>
                            {showMultiplier && entry.multiplier ? formatMultiplier(entry.multiplier) : ""}
                          </TableTd>
                          <TableTd className={tdClassName}>
                            {isUserRow && (
                              <button
                                type="button"
                                onClick={() => setIsShareOpen(true)}
                                className="inline-flex items-center gap-4 whitespace-nowrap text-13 font-medium text-blue-100"
                              >
                                <ShareIcon />
                                <Trans>Share</Trans>
                              </button>
                            )}
                          </TableTd>
                        </TableTr>
                      );
                    })}
                    {leaderboard && pageData.length < PER_PAGE && (
                      <TableListSkeleton
                        invisible
                        count={PER_PAGE - pageData.length}
                        Structure={PointsLeaderboardSkeletonRow}
                      />
                    )}
                  </>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
      {userEntry && userRank !== null && (
        <PointsShare
          isOpen={isShareOpen}
          setIsOpen={setIsShareOpen}
          account={account}
          chainId={chainId}
          rank={userRank}
          pointsEarned={userEntry.pointsEarned}
          rewardsEarned={userEntry.rewardsEarned}
        />
      )}
    </div>
  );
}
