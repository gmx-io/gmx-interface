import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import AddressView from "components/AddressView/AddressView";
import Pagination from "components/Pagination/Pagination";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { formatAmount, formatUsd } from "lib/bigint";
import { useDebounce } from "lib/useDebounce";
import { ReactNode, memo, useCallback, useLayoutEffect, useMemo, useState } from "react";

import { TopAccountsSkeleton } from "components/Skeleton/Skeleton";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import {
  useLeaderboardAccountsRanks,
  useLeaderboardCurrentAccount,
  useLeaderboardIsCompetition,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import {
  CompetitionType,
  LeaderboardAccount,
  RemoteData,
  formatDelta,
  signedValueClassName,
} from "domain/synthetics/leaderboard";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { createBreakpoint } from "react-use";
import SearchInput from "components/SearchInput/SearchInput";

function getRowClassname(rank: number | null, competition: CompetitionType | undefined, pinned: boolean) {
  if (pinned) return cx("LeaderboardRankRow-Pinned", "Table_tr");
  if (rank === null) return "Table_tr";
  return rank <= 3 ? cx(`LeaderboardRankRow-${rank}`, "Table_tr") : "Table_tr";
}

function getWinnerRankClassname(rank: number | null, competition: CompetitionType | undefined) {
  if (rank === null) return undefined;
  if (!competition) return rank <= 3 ? `LeaderboardRank-${rank}` : undefined;
  return rank <= 10 ? `LeaderboardRank-TopCompetitor` : undefined;
}

const useBreakpoint = createBreakpoint({ XL: 1200, L: 1000, M: 800, S: 500 });

type LeaderboardAccountField = keyof LeaderboardAccount;

export function LeaderboardAccountsTable({
  accounts,
  activeCompetition,
  sortingEnabled = true,
  skeletonCount = 15,
}: {
  accounts: RemoteData<LeaderboardAccount>;
  activeCompetition: CompetitionType | undefined;
  sortingEnabled?: boolean;
  skeletonCount?: number;
}) {
  const currentAccount = useLeaderboardCurrentAccount();
  const perPage = 20;
  const { isLoading, data } = accounts;
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<LeaderboardAccountField>("totalQualifyingPnl");
  const [direction, setDirection] = useState<number>(1);
  const handleColumnClick = useCallback(
    (key: string) => {
      if (key === "wins") {
        setOrderBy(orderBy === "wins" ? "losses" : "wins");
        setDirection(1);
      } else if (key === orderBy) {
        setDirection((d: number) => -1 * d);
      } else {
        setOrderBy(key as LeaderboardAccountField);
        setDirection(1);
      }
    },
    [orderBy]
  );
  const isCompetitions = Boolean(activeCompetition);

  useLayoutEffect(() => {
    if (!isCompetitions) return;

    if (activeCompetition === "notionalPnl") {
      setOrderBy("totalQualifyingPnl");
      setDirection(1);
    }
    if (activeCompetition === "pnlPercentage") {
      setOrderBy("pnlPercentage");
      setDirection(1);
    }
  }, [activeCompetition, isCompetitions]);

  const [search, setSearch] = useState("");
  const setValue = useCallback((e) => setSearch(e.target.value), []);
  const handleKeyDown = useCallback(() => null, []);
  const ranks = useLeaderboardAccountsRanks();
  const term = useDebounce(search, 300);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const key = orderBy;

      if (typeof a[key] === "bigint" && typeof b[key] === "bigint") {
        return direction * ((a[key] as bigint) > (b[key] as bigint) ? -1 : 1);
      } else if (typeof a[key] === "number" && typeof b[key] === "number") {
        return direction * (a[key] > b[key] ? -1 : 1);
      } else {
        return 1;
      }
    });
  }, [data, direction, orderBy]);

  const filteredStats = useMemo(() => {
    const q = term.toLowerCase().trim();
    return sorted.filter((a) => a.account.toLowerCase().indexOf(q) >= 0);
  }, [sorted, term]);

  const indexFrom = (page - 1) * perPage;
  const activeRank = activeCompetition === "pnlPercentage" ? ranks.pnlPercentage : ranks.pnl;
  const rowsData = useMemo(
    () =>
      filteredStats.slice(indexFrom, indexFrom + perPage).map((leaderboardAccount, i) => ({
        account: leaderboardAccount,
        index: i,
        rank: activeRank.get(leaderboardAccount.account) ?? null,
      })),
    [activeRank, filteredStats, indexFrom]
  );
  const pinnedRowData = useMemo(() => {
    if (!currentAccount) return undefined;
    if (term) return undefined;

    const rank = activeRank.get(currentAccount.account) ?? null;
    return {
      account: currentAccount,
      index: 0,
      rank,
    };
  }, [activeRank, currentAccount, term]);
  const pageCount = Math.ceil(filteredStats.length / perPage);

  const getSortableClass = useCallback(
    (key: LeaderboardAccountField) =>
      sortingEnabled
        ? cx(
            orderBy === key || (key === "wins" && orderBy === "losses")
              ? direction > 0
                ? "sorted-asc"
                : "sorted-desc"
              : "sortable"
          )
        : undefined,
    [direction, orderBy, sortingEnabled]
  );

  const breakpoint = useBreakpoint();

  const content = isLoading ? (
    <TopAccountsSkeleton count={skeletonCount} />
  ) : (
    <>
      {pinnedRowData && (
        <TableRow
          account={pinnedRowData.account}
          index={-1}
          pinned
          rank={pinnedRowData.rank}
          activeCompetition={activeCompetition}
          breakpoint={breakpoint}
        />
      )}
      {rowsData.length ? (
        rowsData.map(({ account, index, rank }) => {
          return (
            <TableRow
              key={account.account}
              account={account}
              index={index}
              pinned={false}
              rank={rank}
              activeCompetition={activeCompetition}
              breakpoint={breakpoint}
            />
          );
        })
      ) : (
        <EmptyRow />
      )}
    </>
  );

  return (
    <div>
      <div className="TableBox__head">
        <SearchInput
          placeholder={t`Search Address`}
          className="LeaderboardSearch"
          value={search}
          setValue={setValue}
          onKeyDown={handleKeyDown}
          size="s"
        />
      </div>
      <div className="TableBox">
        <table className={cx("Exchange-list", "App-box", "Table")}>
          <tbody>
            <tr className="Exchange-list-header">
              <TableHeaderCell
                title={t`Rank`}
                width={6}
                tooltip={
                  activeCompetition
                    ? t`Only Addresses with over ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD.toBigInt())} are ranked.`
                    : undefined
                }
                tooltipPosition="left-bottom"
                columnName="rank"
              />
              <TableHeaderCell
                title={t`Address`}
                width={(p = "XL") => ({ XL: 16, L: 16, M: 16, S: 10 }[p] || 16)}
                tooltipPosition="left-bottom"
                columnName="account"
              />
              <TableHeaderCell
                title={t`PnL ($)`}
                width={12}
                tooltip={t`The total realized and unrealized profit and loss for the period, including fees and price impact.`}
                tooltipPosition="left-bottom"
                onClick={handleColumnClick}
                columnName="totalQualifyingPnl"
                className={getSortableClass("totalQualifyingPnl")}
              />
              <TableHeaderCell
                title={t`PnL (%)`}
                width={10}
                tooltip={
                  <Trans>
                    The PnL ($) compared to the capital used.
                    <br />
                    <br />
                    The capital used is calculated as the highest value of [
                    <i>sum of collateral of open positions - realized PnL + period start pending PnL</i>].
                  </Trans>
                }
                tooltipPosition="left-bottom"
                onClick={handleColumnClick}
                columnName="pnlPercentage"
                className={getSortableClass("pnlPercentage")}
              />
              <TableHeaderCell
                title={t`Avg. Size`}
                width={12}
                tooltip={t`Average Position Size.`}
                tooltipPosition="left-bottom"
                onClick={handleColumnClick}
                columnName="averageSize"
                className={getSortableClass("averageSize")}
              />
              <TableHeaderCell
                title={t`Avg. Lev.`}
                width={10}
                tooltip={t`Average Leverage used.`}
                tooltipPosition="left-bottom"
                onClick={handleColumnClick}
                columnName="averageLeverage"
                className={getSortableClass("averageLeverage")}
              />
              <TableHeaderCell
                title={t`Win/Loss`}
                width={10}
                tooltip={t`Wins and Losses for fully closed Positions.`}
                tooltipPosition="left-bottom"
                onClick={handleColumnClick}
                columnName="wins"
                className={cx("text-right", getSortableClass("wins"))}
              />
            </tr>
            {content}
          </tbody>
        </table>
      </div>
      <div className="TableBox__footer">
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}

const TableHeaderCell = memo(
  ({
    breakpoint,
    columnName,
    title,
    className,
    onClick,
    tooltip,
    tooltipPosition,
    width,
  }: {
    title: string;
    className?: string;
    tooltip?: ReactNode;
    tooltipPosition?: TooltipPosition;
    onClick?: (columnName: string) => void;
    columnName: string;
    width?: number | ((breakpoint?: string) => number);
    breakpoint?: string;
  }) => {
    const style = width
      ? {
          width: `${typeof width === "function" ? width(breakpoint) : width}%`,
        }
      : undefined;

    const handleClick = useCallback(() => onClick?.(columnName), [columnName, onClick]);
    const stopPropagation = useCallback((e) => e.stopPropagation(), []);
    const renderContent = useCallback(() => <div onClick={stopPropagation}>{tooltip}</div>, [stopPropagation, tooltip]);

    return (
      <th onClick={handleClick} className={cx("TableHeader", className)} style={style}>
        {tooltip ? (
          <TooltipWithPortal
            handle={<span className="TableHeaderTitle">{title}</span>}
            position={tooltipPosition || "right-bottom"}
            className="TableHeaderTooltip"
            renderContent={renderContent}
          />
        ) : (
          <span className="TableHeaderTitle">{title}</span>
        )}
      </th>
    );
  }
);

const TableRow = memo(
  ({
    account,
    pinned,
    rank,
    activeCompetition,
    breakpoint,
    index,
  }: {
    account: LeaderboardAccount;
    index: number;
    pinned: boolean;
    rank: number | null;
    activeCompetition: CompetitionType | undefined;
    breakpoint: string | undefined;
  }) => {
    const shouldRenderValue = rank !== null;
    const renderWinsLossesTooltipContent = useCallback(() => {
      if (!shouldRenderValue) return null;
      const winRate = `${((account.wins / (account.wins + account.losses)) * 100).toFixed(2)}%`;
      return (
        <div>
          <StatsTooltipRow label={t`Total trades`} showDollar={false} value={account.totalCount} />
          {account.wins + account.losses > 0 ? (
            <StatsTooltipRow label={t`Win Rate`} showDollar={false} value={winRate} />
          ) : null}
        </div>
      );
    }, [account.losses, account.totalCount, account.wins, shouldRenderValue]);

    return (
      <tr className={getRowClassname(rank, activeCompetition, pinned)} key={account.account}>
        <TableCell>
          <span className={getWinnerRankClassname(rank, activeCompetition)}>
            <RankInfo rank={rank} />
          </span>
        </TableCell>
        <TableCell>
          <AddressView size={20} address={account.account} breakpoint={breakpoint} />
        </TableCell>
        <TableCell>
          {shouldRenderValue ? (
            <TooltipWithPortal
              handle={
                <span className={signedValueClassName(account.totalQualifyingPnl)}>
                  {formatDelta(account.totalQualifyingPnl, { signed: true, prefix: "$" })}
                </span>
              }
              position={index > 7 ? "right-top" : "right-bottom"}
              className="nowrap"
              renderContent={() => (
                <div>
                  <StatsTooltipRow
                    label={t`Realized PnL`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.realizedPnl)}>
                        {formatDelta(account.realizedPnl, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <StatsTooltipRow
                    label={t`Unrealized PnL`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.unrealizedPnl)}>
                        {formatDelta(account.unrealizedPnl, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <StatsTooltipRow
                    label={t`Start Unrealized PnL`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.startUnrealizedPnl)}>
                        {formatDelta(account.startUnrealizedPnl, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Realized Fees`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.realizedFees * -1n)}>
                        {formatDelta(account.realizedFees * -1n, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <StatsTooltipRow
                    label={t`Unrealized Fees`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.unrealizedFees * -1n)}>
                        {formatDelta(account.unrealizedFees * -1n, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <StatsTooltipRow
                    label={t`Start Unrealized Fees`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.startUnrealizedFees * -1n)}>
                        {formatDelta(account.startUnrealizedFees * -1n, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                  <br />
                  <StatsTooltipRow
                    label={t`Realized Price Impact`}
                    showDollar={false}
                    value={
                      <span className={signedValueClassName(account.realizedPriceImpact)}>
                        {formatDelta(account.realizedPriceImpact, { signed: true, prefix: "$" })}
                      </span>
                    }
                  />
                </div>
              )}
            />
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell>
          {shouldRenderValue ? (
            <TooltipWithPortal
              handle={
                <span className={signedValueClassName(account.pnlPercentage)}>
                  {formatDelta(account.pnlPercentage, { signed: true, postfix: "%", decimals: 2 })}
                </span>
              }
              position={index > 7 ? "right-top" : "right-bottom"}
              className="nowrap"
              renderContent={() => (
                <StatsTooltipRow
                  label={t`Capital Used`}
                  showDollar={false}
                  value={<span>{formatUsd(account.maxCapital)}</span>}
                />
              )}
            />
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell>{shouldRenderValue ? formatUsd(account.averageSize) || "" : "-"}</TableCell>
        <TableCell>{shouldRenderValue ? `${formatAmount(account.averageLeverage, 4, 2)}x` : "-"}</TableCell>
        <TableCell className="text-right">
          {shouldRenderValue ? (
            <TooltipWithPortal
              handle={`${account.wins}/${account.losses}`}
              renderContent={renderWinsLossesTooltipContent}
            />
          ) : (
            "-"
          )}
        </TableCell>
      </tr>
    );
  }
);

const TableCell = memo(({ children, className }: { children: ReactNode; className?: string }) => {
  return <td className={className}>{children}</td>;
});

const EmptyRow = memo(() => {
  return (
    <tr className="Table_tr">
      <td colSpan={7} className="Table_no-results-row">
        <Trans>No results found</Trans>
      </td>
    </tr>
  );
});

const RankInfo = memo(({ rank }: { rank: number | null }) => {
  const isCompetition = useLeaderboardIsCompetition();
  if (rank === null)
    return (
      <TooltipWithPortal
        handle={t`NA`}
        renderContent={() =>
          isCompetition
            ? t`You have not traded during the competition window.`
            : t`You have not traded during selected period.`
        }
      />
    );
  return <span>{rank}</span>;
});
