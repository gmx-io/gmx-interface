import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import "./PointsLeaderboardTab.scss";

import { ARBITRUM } from "config/chains";
import type { ContractsChainId } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { formatMultiplier } from "domain/synthetics/incentives/constants";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/useIncentivesLeaderboard";
import { formatAmount, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { PointsShare } from "components/PointsShare/PointsShare";
import { TableRowsSkeleton } from "components/Skeleton/TableRowsSkeleton";
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
const LEADERBOARD_SKELETON_COLUMNS = [40, 140, 90, 90, 150, 70, 56];

function getRankClassName(rank: number | null) {
  if (rank !== null && rank <= 3) return `PointsLeaderboardRank-${rank}`;
  return undefined;
}

const PER_PAGE = 16;

type TimeFilter = "current" | "last" | "all";

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

  const leaderboardEnabled = timeFilter === "all" || epoch !== undefined;
  const {
    data: leaderboard,
    totalCount,
    loading,
  } = useIncentivesLeaderboard(chainId, {
    epoch,
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
    enabled: leaderboardEnabled,
  });
  const showMultiplier = timeFilter !== "all";

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

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PER_PAGE));
  const indexFrom = (page - 1) * PER_PAGE;
  const pageData = useMemo(() => leaderboard ?? [], [leaderboard]);
  const isInitialLoading = loading && !leaderboard;
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

  const { userRank, userEntry } = useMemo(() => {
    if (!account || !pageData.length) return { userRank: null, userEntry: null };
    const lowerAccount = account.toLowerCase();
    const idx = pageData.findIndex((e) => e.address.toLowerCase() === lowerAccount);
    return {
      userRank: idx >= 0 ? indexFrom + idx + 1 : null,
      userEntry: idx >= 0 ? pageData[idx] : null,
    };
  }, [account, pageData, indexFrom]);

  const tdClassName = "!py-10";

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

      {page === 1 && leaderboard && leaderboard.length === 0 ? (
        <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
          <Trans>Leaderboard data is not available yet.</Trans>
        </div>
      ) : (
        <div className="flex grow flex-col rounded-8 bg-slate-900">
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
                  <TableTh>{t`Volume`}</TableTh>
                  <TableTh>{t`Earned Points`}</TableTh>
                  <TableTh>{t`Earned Rewards`}</TableTh>
                  <TableTh>{showMultiplier && t`Multiplier`}</TableTh>
                  <TableTh />
                </TableTheadTr>
              </thead>
              <tbody>
                {isInitialLoading ? (
                  <TableRowsSkeleton
                    count={PER_PAGE}
                    columns={LEADERBOARD_SKELETON_COLUMNS}
                    cellClassName={tdClassName}
                  />
                ) : (
                  <>
                    {userEntry && userRank && (
                      <TableTr className="border-b-1/2 border-blue-500/30 !bg-blue-500/10">
                        <TableTd className={cx(tdClassName, "relative")}>
                          <span className={cx("numbers", getRankClassName(userRank))}>{userRank}</span>
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
                          {showMultiplier && userEntry.multiplier ? formatMultiplier(userEntry.multiplier) : ""}
                        </TableTd>
                        <TableTd className={tdClassName}>
                          <button
                            type="button"
                            onClick={() => setIsShareOpen(true)}
                            className="inline-flex items-center gap-4 whitespace-nowrap text-13 font-medium text-blue-100"
                          >
                            <ShareIcon />
                            <Trans>Share</Trans>
                          </button>
                        </TableTd>
                      </TableTr>
                    )}
                    {pageData.map((entry, i) => {
                      if (userEntry && entry.address.toLowerCase() === userEntry.address.toLowerCase()) return null;
                      const rank = indexFrom + i + 1;
                      return (
                        <TableTr key={entry.address} hoverable>
                          <TableTd className={cx(tdClassName, "relative")}>
                            <span
                              className={cx("font-medium numbers after:!top-7", getRankClassName(rank), {
                                "text-yellow-300": rank <= 3,
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
                          <TableTd className={cx(tdClassName, "numbers")} />
                        </TableTr>
                      );
                    })}
                    {leaderboard && pageData.length < PER_PAGE && (
                      <TableRowsSkeleton
                        invisible
                        count={PER_PAGE - pageData.length}
                        columns={LEADERBOARD_SKELETON_COLUMNS}
                        cellClassName={tdClassName}
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
