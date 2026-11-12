import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { SortDirection } from "context/SorterContext/types";
import {
  useLeaderboardAccountsRanks,
  useLeaderboardCurrentAccount,
  useLeaderboardIsCompetition,
  useLeaderboardTimeframeTypeState,
} from "context/SyntheticsStateContext/hooks/leaderboardHooks";
import { CompetitionType, LeaderboardAccount, RemoteData } from "domain/synthetics/leaderboard";
import { MIN_COLLATERAL_USD_IN_LEADERBOARD } from "domain/synthetics/leaderboard/constants";
import { useDebounce } from "lib/debounce/useDebounce";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { LeverageValue } from "components/NumericValue/LeverageValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import { UsdValue } from "components/NumericValue/UsdValue";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TopAccountsSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import StandardTooltip, { type StandardTooltipPosition } from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipDivider, TooltipRow, TooltipRows } from "components/Tooltip/TooltipBlocks";

import {
  compareLeaderboardValues,
  formatDelta,
  formatDeltaUsdSignedParts,
  getLeaderboardRealizedPnl,
  getSignedValueClassName,
} from "./shared";

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
  searchAddress,
}: {
  accounts: RemoteData<LeaderboardAccount>;
  activeCompetition: CompetitionType | undefined;
  searchAddress: string | undefined;
}) {
  const currentAccount = useLeaderboardCurrentAccount();
  const { isLoading, data } = accounts;
  const [page, setPage] = useState(1);
  const { orderBy, direction, getSorterProps, setDirection, setOrderBy } = useSorterHandlers<LeaderboardAccountField>(
    "leaderboard-accounts-table",
    {
      orderBy: "totalQualifyingPnl",
      direction: "desc",
    }
  );

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

  const ranks = useLeaderboardAccountsRanks();
  const term = useDebounce(searchAddress, 300);

  useEffect(() => {
    setPage(1);
  }, [term]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let key = orderBy;
      if (key === "unspecified" || direction === "unspecified") {
        key = "totalQualifyingPnl";
      }

      let sortDirection: "asc" | "desc" = direction === "asc" ? "asc" : "desc";

      if (key === "wins" && direction === "asc") {
        key = "losses";
        sortDirection = "desc";
      }

      const aValue = a[key];
      const bValue = b[key];

      if (
        (typeof aValue === "bigint" && typeof bValue === "bigint") ||
        (typeof aValue === "number" && typeof bValue === "number")
      ) {
        return compareLeaderboardValues(aValue, bValue, sortDirection);
      }

      return 0;
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
      filteredStats.slice(indexFrom, indexFrom + PER_PAGE).map((leaderboardAccount) => ({
        account: leaderboardAccount,
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
      rank,
    };
  }, [activeRank, currentAccount, term]);
  const pageCount = Math.ceil(filteredStats.length / PER_PAGE);
  const isEmpty = !isLoading && !rowsData.length && !pinnedRowData;

  const content = isLoading ? (
    <TopAccountsSkeleton count={PER_PAGE} />
  ) : isEmpty ? null : (
    <>
      {pinnedRowData && (
        <TableRow
          account={pinnedRowData.account}
          pinned
          rank={pinnedRowData.rank}
          activeCompetition={activeCompetition}
        />
      )}
      {rowsData.map(({ account, rank }) => {
        return (
          <TableRow
            key={account.account}
            account={account}
            pinned={false}
            rank={rank}
            activeCompetition={activeCompetition}
          />
        );
      })}
      {rowsData.length < PER_PAGE && <TopAccountsSkeleton invisible count={PER_PAGE - rowsData.length} />}
    </>
  );

  return (
    <div className="rounded-b-8 bg-slate-900">
      <TableScrollFadeContainer>
        <table className="w-full min-w-[1000px]">
          <thead>
            <TableTheadTr className="text-body-medium">
              <TableHeaderCell
                title={t`RANK`}
                width={6}
                tooltip={
                  <Trans>
                    Minimum{" "}
                    {formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
                      displayDecimals: 0,
                    })}{" "}
                    capital required for rankings.
                    <br />
                    <br />
                    Capital = max(sum of margin of open positions - realized PnL + starting pending PnL).
                  </Trans>
                }
                tooltipPosition="bottom-start"
              />
              <TableHeaderCell title={t`ADDRESS`} width={16} tooltipPosition="bottom-end" />
              <TableHeaderCell
                title={t`PNL ($)`}
                width={12}
                tooltip={t`Total realized and unrealized PnL including fees and price impact`}
                tooltipPosition="bottom-end"
                {...getSorterProps("totalQualifyingPnl")}
              />
              <TableHeaderCell
                title={t`PNL (%)`}
                width={10}
                tooltip={t`PnL relative to capital used (return on capital)`}
                tooltipPosition="bottom-end"
                {...getSorterProps("pnlPercentage")}
              />
              <TableHeaderCell
                title={t`AVG. SIZE`}
                width={12}
                tooltip={t`Average position size`}
                tooltipPosition="bottom-end"
                {...getSorterProps("averageSize")}
              />
              <TableHeaderCell
                title={t`AVG. LEV.`}
                width={1}
                tooltip={t`Average leverage used`}
                tooltipPosition="bottom-end"
                {...getSorterProps("averageLeverage")}
              />
              <TableHeaderCell
                title={t`WIN/LOSS`}
                width={10}
                tooltip={t`Wins and losses for closed positions`}
                tooltipPosition="bottom-end"
                {...getSorterProps("wins")}
              />
            </TableTheadTr>
          </thead>
          <tbody>{content}</tbody>
        </table>
      </TableScrollFadeContainer>
      <EmptyTableContent isLoading={false} isEmpty={isEmpty} emptyText={<Trans>No results found</Trans>} />
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
    tooltipPosition?: StandardTooltipPosition;
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

    const isSortable = !!onChange;

    if (isSortable) {
      return (
        <TableTh style={style}>
          <Sorter direction={direction!} onChange={onChange}>
            {tooltip ? (
              <StandardTooltip
                handle={<span className="whitespace-nowrap">{title}</span>}
                position={tooltipPosition || "bottom"}
                content={tooltip}
                variant="iconStroke"
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
          <StandardTooltip
            handle={<span className="whitespace-nowrap">{title}</span>}
            position={tooltipPosition || "bottom"}
            content={tooltip}
            variant="iconStroke"
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
  }: {
    account: LeaderboardAccount;
    pinned: boolean;
    rank: number | null;
    activeCompetition: CompetitionType | undefined;
  }) => {
    const renderWinsLossesTooltipContent = useCallback(() => {
      const winRate = `${((account.wins / (account.wins + account.losses)) * 100).toFixed(2)}%`;
      return (
        <TooltipRows>
          <TooltipRow label={t`Total trades`} value={account.wins + account.losses} />
          {account.wins + account.losses > 0 ? <TooltipRow label={t`Win rate`} value={winRate} /> : null}
        </TooltipRows>
      );
    }, [account.losses, account.wins]);

    const renderPnlTooltipContent = useCallback(() => <LeaderboardPnlTooltipContent account={account} />, [account]);

    return (
      <TableTr hoverable={true} key={account.account}>
        <TableTd className={getCellClassname(rank, activeCompetition, pinned)}>
          <span className={cx("numbers", getWinnerRankClassname(rank, activeCompetition))}>
            <RankInfo rank={rank} hasSomeCapital={account.totalQualifyingPnl !== 0n} />
          </span>
        </TableTd>

        <TableTd>
          <AddressView size={20} address={account.account} breakpoint="XL" />
        </TableTd>
        <TableTd>
          <StandardTooltip
            handle={<NumericValue parts={formatDeltaUsdSignedParts(account.totalQualifyingPnl)} />}
            position="bottom"
            className="whitespace-nowrap"
            renderContent={renderPnlTooltipContent}
            handleClassName={cx("numbers", getSignedValueClassName(account.totalQualifyingPnl))}
          />
        </TableTd>
        <TableTd>
          <StandardTooltip
            handle={
              <span className="numbers">{formatDelta(account.pnlPercentage, { signed: true, decimals: 2 })} %</span>
            }
            position="bottom"
            className="whitespace-nowrap"
            handleClassName={cx("numbers", getSignedValueClassName(account.totalQualifyingPnl))}
            renderContent={() => <TooltipRow label={t`Capital used`} value={<UsdValue usd={account.maxCapital} />} />}
          />
        </TableTd>
        <TableTd
          className={cx("numbers", {
            "text-typography-secondary": account.averageSize === 0n,
          })}
        >
          <UsdValue usd={account.averageSize} />
        </TableTd>
        <TableTd
          className={cx("numbers", {
            "text-typography-secondary": account.averageLeverage === 0n,
          })}
        >
          <LeverageValue leverage={account.averageLeverage ?? 0n} />
        </TableTd>
        <TableTd className="text-right text-typography-secondary numbers">
          <StandardTooltip
            handle={
              <span
                className={cx("text-typography-primary numbers", {
                  "text-typography-secondary": account.wins === 0 && account.losses === 0,
                })}
              >
                {account.wins} <span className="text-typography-secondary">{t`/`}</span> {account.losses}
              </span>
            }
            renderContent={renderWinsLossesTooltipContent}
            handleClassName={cx("text-typography-primary numbers", {
              "text-typography-secondary": account.wins === 0 && account.losses === 0,
            })}
          />
        </TableTd>
      </TableTr>
    );
  }
);

const RankInfo = memo(({ rank, hasSomeCapital }: { rank: number | null; hasSomeCapital: boolean }) => {
  const isCompetition = useLeaderboardIsCompetition();

  const message = useMemo(() => {
    if (rank !== null) return null;

    let msg = t`No trades during the selected period`;
    if (hasSomeCapital)
      msg = t`Minimum ${formatUsd(MIN_COLLATERAL_USD_IN_LEADERBOARD, {
        displayDecimals: 0,
      })} capital required for rankings`;
    else if (isCompetition) msg = t`No eligible trades during the competition window`;
    return msg;
  }, [hasSomeCapital, isCompetition, rank]);
  const tooltipContent = useCallback(() => message, [message]);

  if (rank === null)
    return (
      <StandardTooltip handleClassName="text-typography-secondary" handle={t`N/A`} renderContent={tooltipContent} />
    );

  return <span className="font-medium text-typography-secondary numbers">{rank}</span>;
});

const LeaderboardPnlTooltipContent = memo(({ account }: { account: LeaderboardAccount }) => {
  const [isPnlAfterFees] = useLocalStorageSerializeKey("leaderboardPnlAfterFees", true);
  const [type] = useLeaderboardTimeframeTypeState();
  const isCompetition = useLeaderboardIsCompetition();
  const shouldShowStartValues = isCompetition || type !== "all";

  const realizedFees = useMemo(() => account.realizedFees * -1n, [account.realizedFees]);
  const realizedSwapFees = useMemo(() => account.realizedSwapFees * -1n, [account.realizedSwapFees]);
  const realizedPnl = useMemo(() => getLeaderboardRealizedPnl(account, isPnlAfterFees), [account, isPnlAfterFees]);

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
    <TooltipContent>
      <TooltipRows>
        <TooltipRow
          label={t`Realized PnL`}
          value={<NumericValue parts={formatDeltaUsdSignedParts(realizedPnl)} />}
          valueClassName={getSignedValueClassName(realizedPnl)}
        />
        <TooltipRow
          label={t`Unrealized PnL`}
          value={<NumericValue parts={formatDeltaUsdSignedParts(unrealizedPnl)} />}
          valueClassName={getSignedValueClassName(unrealizedPnl)}
        />
        {shouldShowStartValues && (
          <TooltipRow
            label={t`Start unrealized PnL`}
            value={<NumericValue parts={formatDeltaUsdSignedParts(startUnrealizedPnl)} />}
            valueClassName={getSignedValueClassName(startUnrealizedPnl)}
          />
        )}
      </TooltipRows>
      {!isPnlAfterFees && (
        <>
          <TooltipDivider />
          <TooltipRows>
            <TooltipRow
              label={t`Realized fees`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(realizedFees)} />}
              valueClassName={getSignedValueClassName(realizedFees)}
            />
            <TooltipRow
              label={t`Realized swap fees`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(realizedSwapFees)} />}
              valueClassName={getSignedValueClassName(realizedSwapFees)}
            />
            <TooltipRow
              label={t`Positive funding fees`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(account.positiveFundingFeesUsd)} />}
              valueClassName={getSignedValueClassName(account.positiveFundingFeesUsd)}
            />
            <TooltipRow
              label={t`Unrealized fees`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(unrealizedFees)} />}
              valueClassName={getSignedValueClassName(unrealizedFees)}
            />
            {shouldShowStartValues && (
              <TooltipRow
                label={t`Start unrealized fees`}
                value={<NumericValue parts={formatDeltaUsdSignedParts(startUnrealizedFees)} />}
                valueClassName={getSignedValueClassName(startUnrealizedFees)}
              />
            )}
          </TooltipRows>
          <TooltipDivider />
          <TooltipRows>
            <TooltipRow
              label={t`Realized price impact`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(account.realizedPriceImpact)} />}
              valueClassName={getSignedValueClassName(account.realizedPriceImpact)}
            />
            <TooltipRow
              label={t`Realized swap impact`}
              value={<NumericValue parts={formatDeltaUsdSignedParts(account.realizedSwapImpact)} />}
              valueClassName={getSignedValueClassName(account.realizedSwapImpact)}
            />
          </TooltipRows>
        </>
      )}
    </TooltipContent>
  );
});
