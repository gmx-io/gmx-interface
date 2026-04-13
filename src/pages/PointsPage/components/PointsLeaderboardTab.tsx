import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import "./PointsLeaderboardTab.scss";

import { formatMultiplier } from "domain/synthetics/incentives/constants";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/useIncentivesLeaderboard";
import { formatAmount, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

const COL_RANK: React.CSSProperties = { width: "6%" };
const COL_ADDRESS: React.CSSProperties = { width: "22%" };
const COL_VOLUME: React.CSSProperties = { width: "18%" };
const COL_POINTS: React.CSSProperties = { width: "18%" };
const COL_MULTIPLIER: React.CSSProperties = { width: "22%" };
const COL_TIER: React.CSSProperties = { width: "14%" };

function getRankClassName(rank: number | null) {
  if (rank !== null && rank <= 3) return `PointsLeaderboardRank-${rank}`;
  return undefined;
}

const PER_PAGE = 20;

type TimeFilter = "current" | "last" | "all";
type SortField = "volume" | "pointsEarned" | "rewardsEarned" | "multiplier";

type Props = {
  chainId: number;
  account?: string;
};

export function PointsLeaderboardTab({ chainId, account }: Props) {
  const { data: config } = useIncentivesConfig(chainId);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("current");
  const [searchAddress, setSearchAddress] = useState("");

  const epoch = useMemo(() => {
    if (!config) return undefined;
    if (timeFilter === "current") return config.epochTimestamp;
    if (timeFilter === "last") return config.epochTimestamp - config.epochDuration;
    return undefined; // all-time
  }, [config, timeFilter]);

  const { data: leaderboard } = useIncentivesLeaderboard(chainId, { epoch });
  const [page, setPage] = useState(1);
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchAddress(value);
      setPage(1);
    },
    [setSearchAddress, setPage]
  );

  const { orderBy, direction, getSorterProps } = useSorterHandlers<SortField>("points-leaderboard", {
    orderBy: "volume",
    direction: "desc",
  });

  const filteredLeaderboard = useMemo(() => {
    if (!leaderboard) return [];

    const filtered = searchAddress
      ? leaderboard.filter((e) => e.address.toLowerCase().includes(searchAddress.toLowerCase()))
      : leaderboard;

    return [...filtered].sort((a, b) => {
      if (orderBy === "unspecified" || direction === "unspecified") {
        // Default: sort by volume desc
        if (b.volume > a.volume) return 1;
        if (b.volume < a.volume) return -1;
        return 0;
      }

      let aVal: bigint | number;
      let bVal: bigint | number;

      switch (orderBy) {
        case "volume":
          aVal = a.volume;
          bVal = b.volume;
          break;
        case "pointsEarned":
          aVal = a.pointsEarned;
          bVal = b.pointsEarned;
          break;
        case "rewardsEarned":
          aVal = a.rewardsEarned;
          bVal = b.rewardsEarned;
          break;
        case "multiplier":
          aVal = a.multiplier ?? 0;
          bVal = b.multiplier ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === "asc" ? -1 : 1;
      if (aVal > bVal) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [leaderboard, searchAddress, orderBy, direction]);

  const pageCount = Math.ceil(filteredLeaderboard.length / PER_PAGE);
  const indexFrom = (page - 1) * PER_PAGE;
  const pageData = filteredLeaderboard.slice(indexFrom, indexFrom + PER_PAGE);

  const { userRank, userEntry } = useMemo(() => {
    if (!account || !filteredLeaderboard.length) return { userRank: null, userEntry: null };
    const lowerAccount = account.toLowerCase();
    const idx = filteredLeaderboard.findIndex((e) => e.address.toLowerCase() === lowerAccount);
    return {
      userRank: idx >= 0 ? idx + 1 : null,
      userEntry: idx >= 0 ? filteredLeaderboard[idx] : null,
    };
  }, [account, filteredLeaderboard]);

  return (
    <div className="rounded-8 bg-slate-900">
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

          <SearchInput
            className="ml-auto !h-36 w-[200px] !grow-0"
            value={searchAddress}
            setValue={handleSearchChange}
            placeholder={t`Search Address`}
            autoFocus={false}
            qa="points-leaderboard-search"
          />
        </div>
      </div>

      {leaderboard && leaderboard.length === 0 ? (
        <div className="flex grow items-center justify-center rounded-8 bg-slate-900 p-24 text-center text-typography-secondary">
          <Trans>Leaderboard data is not available yet.</Trans>
        </div>
      ) : (
        <div className="rounded-8 bg-slate-900">
          <TableScrollFadeContainer>
            <table className="w-full min-w-[800px] table-fixed">
              <colgroup>
                <col style={COL_RANK} />
                <col style={COL_ADDRESS} />
                <col style={COL_VOLUME} />
                <col style={COL_POINTS} />
                <col style={COL_MULTIPLIER} />
                <col style={COL_TIER} />
              </colgroup>
              <thead>
                <TableTheadTr>
                  <TableTh>{t`Rank`}</TableTh>
                  <TableTh>{t`Address`}</TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("volume")}>
                      <span className="whitespace-nowrap">{t`Volume`}</span>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("pointsEarned")}>
                      <span className="whitespace-nowrap">{t`Earned Points`}</span>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("rewardsEarned")}>
                      <span className="whitespace-nowrap">{t`Earned Rewards`}</span>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    {showMultiplier && (
                      <Sorter {...getSorterProps("multiplier")}>
                        <span className="whitespace-nowrap">{t`Multiplier`}</span>
                      </Sorter>
                    )}
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {userEntry && userRank && (
                  <TableTr className="border-b-1/2 border-blue-500/30 !bg-blue-500/10">
                    <TableTd className="relative">
                      <span className={cx("numbers", getRankClassName(userRank))}>{userRank}</span>
                    </TableTd>
                    <TableTd>
                      <AddressView size={20} address={userEntry.address} breakpoint="XL" />
                    </TableTd>
                    <TableTd className="numbers">{formatUsd(userEntry.volume, { displayDecimals: 0 })}</TableTd>
                    <TableTd className="numbers">{formatAmount(userEntry.pointsEarned, 18, 4, true)}</TableTd>
                    <TableTd className="numbers">{formatAmount(userEntry.rewardsEarned, 18, 4, true)} GMX</TableTd>
                    <TableTd className="numbers">
                      {showMultiplier && userEntry.multiplier ? formatMultiplier(userEntry.multiplier) : ""}
                    </TableTd>
                  </TableTr>
                )}
                {pageData.map((entry, i) => {
                  if (userEntry && entry.address.toLowerCase() === userEntry.address.toLowerCase()) return null;
                  const rank = indexFrom + i + 1;
                  return (
                    <TableTr key={entry.address} hoverable>
                      <TableTd className="relative">
                        <span
                          className={cx("font-medium numbers after:!top-7", getRankClassName(rank), {
                            "text-yellow-300": rank <= 3,
                          })}
                        >
                          {rank}
                        </span>
                      </TableTd>
                      <TableTd>
                        <AddressView size={20} address={entry.address} breakpoint="XL" />
                      </TableTd>
                      <TableTd className="numbers">{formatUsd(entry.volume, { displayDecimals: 0 })}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.pointsEarned, 18, 4, true)}</TableTd>
                      <TableTd className="numbers">{formatAmount(entry.rewardsEarned, 18, 4, true)} GMX</TableTd>
                      <TableTd className="numbers">
                        {showMultiplier && entry.multiplier ? formatMultiplier(entry.multiplier) : ""}
                      </TableTd>
                    </TableTr>
                  );
                })}
                {!leaderboard && (
                  <TableTr>
                    <TableTd colSpan={6} className="py-16 text-center text-typography-secondary">
                      <Trans>Loading...</Trans>
                    </TableTd>
                  </TableTr>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>
          <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
