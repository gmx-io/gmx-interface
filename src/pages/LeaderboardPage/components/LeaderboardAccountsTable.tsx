import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  useLeaderboardAccountsRanks,
  useLeaderboardCurrentAccount,
  useLeaderboardIsCompetition,
  useLeaderboardTimeframeTypeState,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType, LeaderboardAccount, RemoteData } from "domain/synthetics/leaderboard";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { bigMath } from "lib/bigmath";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatUsd } from "lib/numbers";
import { useDebounce } from "lib/useDebounce";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { TopAccountsSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import type { SortDirection } from "components/Sorter/types";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import { TooltipPosition } from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

function getCellClassname(rank: number | null, competition: CompetitionType | undefined, pinned: boolean) {
  if (pinned) return cx("LeaderboardRankCell-Pinned relative");
  if (rank === null) return undefined;
  return rank <= 3 ? cx(`LeaderboardRankCell-${rank} relative`) : "relative";
}

function getWinnerRankClassname(rank: number | null, competition: CompetitionType | undefined) {
  if (rank === null) return undefined;
  if (rank <= 3) return `LeaderboardRank-${rank}`;
  if (competition && rank <= 18) return "LeaderboardRank-4";

  return undefined;
}

type LeaderboardAccountField = keyof LeaderboardAccount;

const PER_PAGE = 20;

export function LeaderboardAccountsTable({
  accounts,
  activeCompetition,
}: {
  accounts: RemoteData<LeaderboardAccount>;
  activeCompetition: CompetitionType | undefined;
}) {
  const currentAccount = useLeaderboardCurrentAccount();
  const { isLoading, data } = accounts;
  const [page, setPage] = useState(1);
  const { orderBy, direction, getSorterProps, setDirection, setOrderBy } = useSorterHandlers<LeaderboardAccountField>({
    initialOrderBy: "totalQualifyingPnl",
    initialDirection: "desc",
  });

  const isCompetitions = Boolean(activeCompetition);

  useLayoutEffect(() => {
    if (!isCompetitions) return;

    if (activeCompetition === "notionalPnl") {
      setOrderBy("totalQualifyingPnl");
      setDirection("desc");
    }
    if (activeCompetition === "pnlPercentage") {
      setOrderBy("pnlPercentage");
      setDirection("desc");
    }
  }, [activeCompetition, isCompetitions, setDirection, setOrderBy]);

  const [search, setSearch] = useState("");
  const handleKeyDown = useCallback(() => null, []);
  const ranks = useLeaderboardAccountsRanks();
  const term = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [term]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let key = orderBy;
      if (key === "unspecified" || direction === "unspecified") {
        key = "totalQualifyingPnl";
      }

      let directionMultiplier = direction === "asc" ? -1 : 1;

      if (key === "wins" && direction === "asc") {
        key = "losses";
        directionMultiplier = 1;
      }

      if (typeof a[key] === "bigint" && typeof b[key] === "bigint") {
        return directionMultiplier * ((a[key] as bigint) > (b[key] as bigint) ? -1 : 1);
      } else if (typeof a[key] === "number" && typeof b[key] === "number") {
        return directionMultiplier * (a[key] > b[key] ? -1 : 1);
      } else {
        return 1;
      }
    });
  }, [data, direction, orderBy]);

  const filteredStats = useMemo(() => {
    const q = term.toLowerCase().trim();
    return sorted.filter((a) => a.account.toLowerCase().indexOf(q) >= 0);
  }, [sorted, term]);

  const indexFrom = (page - 1) * PER_PAGE;
  const activeRank = activeCompetition === "pnlPercentage" ? ranks.pnlPercentage : ranks.pnl;
  const rowsData = useMemo(
    () =>
      filteredStats.slice(indexFrom, indexFrom + PER_PAGE).map((leaderboardAccount, i) => ({
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
  const pageCount = Math.ceil(filteredStats.length / PER_PAGE);

  const content = isLoading ? (
    <TopAccountsSkeleton count={PER_PAGE} />
  ) : (
    <>
      {pinnedRowData && (
        <TableRow
          account={pinnedRowData.account}
          index={-1}
          pinned
          rank={pinnedRowData.rank}
          activeCompetition={activeCompetition}
          big
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
            />
          );
        })
      ) : (
        <EmptyRow />
      )}
      {rowsData.length < PER_PAGE && <TopAccountsSkeleton invisible count={PER_PAGE - rowsData.length} />}
    </>
  );

  return (
    <div className="rounded-4 bg-slate-800">
      <div className="TableBox__head">
        <SearchInput
          placeholder={t`Search Address`}
          className="max-w-lg *:!text-14"
          value={search}
          setValue={setSearch}
          onKeyDown={handleKeyDown}
          size="s"
        />
      </div>
      <TableScrollFadeContainer>
        <table className="w-full min-w-[1000px]">
          <thead>
            <TableTheadTr bordered className="text-body-medium">
              <TableHeaderCell
                title={t`Rank`}
                width={6}
                tooltip={t`Only addresses with over ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
                  displayDecimals: 0,
                })} in "Capital Used" are ranked.`}
                tooltipPosition="bottom-start"
              />
              <TableHeaderCell title={t`Address`} width={16} tooltipPosition="bottom-end" />
              <TableHeaderCell
                title={t`PnL ($)`}
                width={12}
                tooltip={t`The total realized and unrealized profit and loss for the period, including fees and price impact.`}
                tooltipPosition="bottom-end"
                {...getSorterProps("totalQualifyingPnl")}
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
                tooltipPosition="bottom-end"
                {...getSorterProps("pnlPercentage")}
              />
              <TableHeaderCell
                title={t`Avg. Size`}
                width={12}
                tooltip={t`Average position size.`}
                tooltipPosition="bottom-end"
                {...getSorterProps("averageSize")}
              />
              <TableHeaderCell
                title={t`Avg. Lev.`}
                width={1}
                tooltip={t`Average leverage used.`}
                tooltipPosition="bottom-end"
                {...getSorterProps("averageLeverage")}
              />
              <TableHeaderCell
                title={t`Win/Loss`}
                width={10}
                tooltip={t`Wins and losses for fully closed positions.`}
                tooltipPosition="bottom-end"
                {...getSorterProps("wins")}
              />
            </TableTheadTr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      </TableScrollFadeContainer>
      <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

const TableHeaderCell = memo(
  ({
    breakpoint,
    title,
    direction,
    onChange,
    tooltip,
    tooltipPosition,
    width,
  }: {
    title: string;
    tooltip?: ReactNode;
    tooltipPosition?: TooltipPosition;
    direction?: SortDirection;
    onChange?: (direction: SortDirection) => void;
    width?: number | ((breakpoint?: string) => number);
    breakpoint?: string;
  }) => {
    const style =
      width !== undefined
        ? {
            width: `${typeof width === "function" ? width(breakpoint) : width}%`,
          }
        : undefined;

    const stopPropagation = useCallback((e) => e.stopPropagation(), []);

    const isSortable = !!onChange;

    if (isSortable) {
      return (
        <TableTh style={style}>
          <Sorter direction={direction!} onChange={onChange}>
            {tooltip ? (
              <TooltipWithPortal
                handle={<span className="whitespace-nowrap">{title}</span>}
                position={tooltipPosition || "bottom"}
                content={<div onClick={stopPropagation}>{tooltip}</div>}
              />
            ) : (
              <span className="whitespace-nowrap">{title}</span>
            )}
          </Sorter>
        </TableTh>
      );
    }

    return (
      <TableTh style={style}>
        {tooltip ? (
          <TooltipWithPortal
            handle={<span className="whitespace-nowrap">{title}</span>}
            position={tooltipPosition || "bottom"}
            content={<div onClick={stopPropagation}>{tooltip}</div>}
          />
        ) : (
          <span className="whitespace-nowrap">{title}</span>
        )}
      </TableTh>
    );
  }
);

const TableRow = memo(
  ({
    account,
    pinned,
    rank,
    activeCompetition,
    index,
    big,
  }: {
    account: LeaderboardAccount;
    index: number;
    pinned: boolean;
    rank: number | null;
    activeCompetition: CompetitionType | undefined;
    big?: boolean;
  }) => {
    const renderWinsLossesTooltipContent = useCallback(() => {
      const winRate = `${((account.wins / (account.wins + account.losses)) * 100).toFixed(2)}%`;
      return (
        <div>
          <StatsTooltipRow label={t`Total Trades`} showDollar={false} value={account.wins + account.losses} />
          {account.wins + account.losses > 0 ? (
            <StatsTooltipRow label={t`Win Rate`} showDollar={false} value={winRate} />
          ) : null}
        </div>
      );
    }, [account.losses, account.wins]);

    const renderPnlTooltipContent = useCallback(() => <LeaderboardPnlTooltipContent account={account} />, [account]);

    return (
      <TableTr bordered={false} key={account.account} className={big ? "text-body-medium" : undefined}>
        <TableTd className={getCellClassname(rank, activeCompetition, pinned)}>
          <span className={getWinnerRankClassname(rank, activeCompetition)}>
            <RankInfo rank={rank} hasSomeCapital={account.totalQualifyingPnl !== 0n} />
          </span>
        </TableTd>

        <TableTd>
          <AddressView big={big} size={20} address={account.account} breakpoint="XL" />
        </TableTd>
        <TableTd>
          <TooltipWithPortal
            handle={
              <span className={getSignedValueClassName(account.totalQualifyingPnl)}>
                {formatDelta(account.totalQualifyingPnl, { signed: true, prefix: "$" })}
              </span>
            }
            position={index > 7 ? "top" : "bottom"}
            className="whitespace-nowrap"
            renderContent={renderPnlTooltipContent}
          />
        </TableTd>
        <TableTd>
          <TooltipWithPortal
            handle={
              <span className={getSignedValueClassName(account.pnlPercentage)}>
                {formatDelta(account.pnlPercentage, { signed: true, postfix: "%", decimals: 2 })}
              </span>
            }
            position={index > 7 ? "top" : "bottom"}
            className="whitespace-nowrap"
            renderContent={() => (
              <StatsTooltipRow
                label={t`Capital Used`}
                showDollar={false}
                value={<span>{formatUsd(account.maxCapital)}</span>}
              />
            )}
          />
        </TableTd>
        <TableTd>{account.averageSize ? formatUsd(account.averageSize) : "$0.00"}</TableTd>
        <TableTd>{`${formatAmount(account.averageLeverage ?? 0n, 4, 2)}x`}</TableTd>
        <TableTd className="text-right">
          <TooltipWithPortal
            handle={`${account.wins}/${account.losses}`}
            renderContent={renderWinsLossesTooltipContent}
          />
        </TableTd>
      </TableTr>
    );
  }
);

const EmptyRow = memo(() => {
  return (
    <TableTr hoverable={false} bordered={false} className="h-47">
      <TableTd colSpan={7} className="align-top text-slate-100">
        <Trans>No results found</Trans>
      </TableTd>
    </TableTr>
  );
});

const RankInfo = memo(({ rank, hasSomeCapital }: { rank: number | null; hasSomeCapital: boolean }) => {
  const isCompetition = useLeaderboardIsCompetition();

  const message = useMemo(() => {
    if (rank !== null) return null;

    let msg = t`You have not traded during the selected period.`;
    if (hasSomeCapital)
      msg = t`You have yet to reach the minimum "Capital Used" of ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
        displayDecimals: 0,
      })} to qualify for the rankings.`;
    else if (isCompetition) msg = t`You do not have any eligible trade during the competition window.`;
    return msg;
  }, [hasSomeCapital, isCompetition, rank]);
  const tooltipContent = useCallback(() => message, [message]);

  if (rank === null)
    return <TooltipWithPortal handleClassName="text-red-500" handle={t`NA`} renderContent={tooltipContent} />;

  return <span>{rank}</span>;
});

const LeaderboardPnlTooltipContent = memo(({ account }: { account: LeaderboardAccount }) => {
  const [isPnlAfterFees] = useLocalStorageSerializeKey("leaderboardPnlAfterFees", true);
  const [type] = useLeaderboardTimeframeTypeState();
  const isCompetition = useLeaderboardIsCompetition();
  const shouldShowStartValues = isCompetition || type !== "all";

  const realizedFees = useMemo(() => account.realizedFees * -1n, [account.realizedFees]);
  const realizedPnl = useMemo(
    () => (isPnlAfterFees ? account.realizedPnl + realizedFees + account.realizedPriceImpact : account.realizedPnl),
    [account.realizedPnl, account.realizedPriceImpact, isPnlAfterFees, realizedFees]
  );

  const unrealizedFees = useMemo(() => account.unrealizedFees * -1n, [account.unrealizedFees]);
  const unrealizedPnl = useMemo(
    () => (isPnlAfterFees ? account.unrealizedPnl + unrealizedFees : account.unrealizedPnl),
    [account.unrealizedPnl, isPnlAfterFees, unrealizedFees]
  );

  const startUnrealizedFees = useMemo(() => account.startUnrealizedFees * -1n, [account.startUnrealizedFees]);
  const startUnrealizedPnl = useMemo(
    () => (isPnlAfterFees ? account.startUnrealizedPnl + startUnrealizedFees : account.startUnrealizedPnl),
    [account.startUnrealizedPnl, isPnlAfterFees, startUnrealizedFees]
  );

  return (
    <div>
      <StatsTooltipRow
        label={t`Realized PnL`}
        showDollar={false}
        value={
          <span className={getSignedValueClassName(realizedPnl)}>
            {formatDelta(realizedPnl, { signed: true, prefix: "$" })}
          </span>
        }
      />
      <StatsTooltipRow
        label={t`Unrealized PnL`}
        showDollar={false}
        value={
          <span className={getSignedValueClassName(unrealizedPnl)}>
            {formatDelta(unrealizedPnl, { signed: true, prefix: "$" })}
          </span>
        }
      />
      {shouldShowStartValues && (
        <StatsTooltipRow
          label={t`Start Unrealized PnL`}
          showDollar={false}
          value={
            <span className={getSignedValueClassName(startUnrealizedPnl)}>
              {formatDelta(startUnrealizedPnl, { signed: true, prefix: "$" })}
            </span>
          }
        />
      )}
      {!isPnlAfterFees && (
        <>
          <br />
          <StatsTooltipRow
            label={t`Realized Fees`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(realizedFees)}>
                {formatDelta(realizedFees, { signed: true, prefix: "$" })}
              </span>
            }
          />
          <StatsTooltipRow
            label={t`Unrealized Fees`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(unrealizedFees)}>
                {formatDelta(unrealizedFees, { signed: true, prefix: "$" })}
              </span>
            }
          />
          {shouldShowStartValues && (
            <StatsTooltipRow
              label={t`Start Unrealized Fees`}
              showDollar={false}
              value={
                <span className={getSignedValueClassName(startUnrealizedFees)}>
                  {formatDelta(startUnrealizedFees, { signed: true, prefix: "$" })}
                </span>
              }
            />
          )}
          <br />
          <StatsTooltipRow
            label={t`Realized Price Impact`}
            showDollar={false}
            value={
              <span className={getSignedValueClassName(account.realizedPriceImpact)}>
                {formatDelta(account.realizedPriceImpact, { signed: true, prefix: "$" })}
              </span>
            }
          />
        </>
      )}
    </div>
  );
});

function formatDelta(
  delta: bigint,
  {
    decimals = USD_DECIMALS,
    displayDecimals = 2,
    useCommas = true,
    ...p
  }: {
    decimals?: number;
    displayDecimals?: number;
    useCommas?: boolean;
    prefixoid?: string;
    signed?: boolean;
    prefix?: string;
    postfix?: string;
  } = {}
) {
  return `${p.prefixoid ? `${p.prefixoid} ` : ""}${p.signed ? (delta === 0n ? "" : delta > 0 ? "+" : "-") : ""}${
    p.prefix || ""
  }${formatAmount(p.signed ? bigMath.abs(delta) : delta, decimals, displayDecimals, useCommas)}${p.postfix || ""}`;
}

function getSignedValueClassName(num: bigint) {
  return num === 0n ? "" : num < 0 ? "negative" : "positive";
}
