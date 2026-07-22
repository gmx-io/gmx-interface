import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { isAddress } from "viem";

import "./RewardsLeaderboardTab.scss";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useEpochRolloverRevalidation } from "domain/synthetics/incentives/v2/useEpochRolloverRevalidation";
import {
  type IncentivesLeaderboardOrderBy,
  useIncentivesLeaderboard,
} from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import { formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import AllTimeIcon from "img/ic_clock_dashed.svg?react";

const PAGE_SIZE = 20;

const COL_RANK: CSSProperties = { width: "8%" };
const COL_ADDRESS: CSSProperties = { width: "18%" };
const COL_TRADING_VOLUME: CSSProperties = { width: "14%" };
const COL_REFERRAL_VOLUME: CSSProperties = { width: "14%" };
const COL_ES_GMX: CSSProperties = { width: "12%" };
const COL_GT: CSSProperties = { width: "12%" };
const COL_REWARDS: CSSProperties = { width: "12%" };
const COL_MULTIPLIER: CSSProperties = { width: "10%" };
const LEADERBOARD_ROW_CLASS_NAME = "h-40";
const LEADERBOARD_TD_CLASS_NAME = "!py-8";
const CURRENT_ACCOUNT_ROW_CLASS_NAME =
  "!bg-cold-blue-900 text-blue-100 [&_.AddressView-trader-id]:!text-typography-primary [&_.AddressView-trader-id_.text-typography-secondary]:!text-blue-100";

type LeaderboardPeriod = "current" | "previous" | "all";
type LeaderboardSortField =
  | "tradingVolume"
  | "referralVolume"
  | "esGmxRewards"
  | "gtRewards"
  | "rewardsUsd"
  | "multiplier";
type SortDirection = "asc" | "desc" | "unspecified";

function RewardsLeaderboardSkeletonRow({
  invisible,
  showMultiplier = true,
  pinned = false,
}: {
  invisible?: boolean;
  showMultiplier?: boolean;
  pinned?: boolean;
}) {
  return (
    <tr
      className={cx(
        LEADERBOARD_ROW_CLASS_NAME,
        pinned ? "!bg-cold-blue-900" : !invisible && "odd:bg-fill-surfaceElevated50"
      )}
    >
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={40} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <div className="flex items-center gap-6 py-[1.5px]">
          <Skeleton circle width={20} height={20} inline className="!block" />
          <Skeleton width={120} inline className="!block" />
        </div>
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={70} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={70} inline />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={90} inline />
      </TableTd>
      {showMultiplier ? (
        <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
          <Skeleton width={56} inline />
        </TableTd>
      ) : null}
    </tr>
  );
}

function RewardsLeaderboardSkeletonRowWithoutMultiplier({ invisible }: { invisible?: boolean }) {
  return <RewardsLeaderboardSkeletonRow invisible={invisible} showMultiplier={false} />;
}

function RewardsLeaderboardPinnedSkeletonRow({ invisible }: { invisible?: boolean }) {
  return <RewardsLeaderboardSkeletonRow invisible={invisible} pinned />;
}

function RewardsLeaderboardPinnedSkeletonRowWithoutMultiplier({ invisible }: { invisible?: boolean }) {
  return <RewardsLeaderboardSkeletonRow invisible={invisible} showMultiplier={false} pinned />;
}

function getRankClassName(rank: number | null) {
  if (rank !== null && rank <= 3) return `RewardsLeaderboardRank-${rank}`;
  return undefined;
}

function toLeaderboardOrderBy(
  field: LeaderboardSortField,
  direction: Exclude<SortDirection, "unspecified">
): IncentivesLeaderboardOrderBy {
  return `${field}_${direction === "asc" ? "ASC" : "DESC"}` as IncentivesLeaderboardOrderBy;
}

function LeaderboardRow({
  entry,
  account,
  config,
  showMultiplier,
  pinned = false,
}: {
  entry: LeaderboardEntry;
  account?: string;
  config: IncentivesConfig;
  showMultiplier: boolean;
  pinned?: boolean;
}) {
  const isAccount = entry.address === account;
  const isHighlighted = pinned || isAccount;

  return (
    <TableTr
      data-testid={pinned ? "leaderboard-pinned-row" : undefined}
      hoverable={!isHighlighted}
      className={cx(LEADERBOARD_ROW_CLASS_NAME, isHighlighted && CURRENT_ACCOUNT_ROW_CLASS_NAME)}
    >
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "relative")}>
        <span
          className={cx("font-medium numbers after:!top-7", getRankClassName(entry.rank), {
            "text-typography-secondary": !isHighlighted,
          })}
        >
          {entry.rank}
        </span>
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME} title={entry.address}>
        <AddressView size={20} address={entry.address} breakpoint="XL" />
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatUsd(entry.tradingVolume, { fallbackToZero: true, displayDecimals: 2 })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatUsd(entry.referralVolume, { fallbackToZero: true, displayDecimals: 2 })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatAmount(entry.esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatAmount(entry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatUsd(entry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 })}
      </TableTd>
      {showMultiplier ? (
        <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
          {entry.multiplier !== null ? formatMultiplier(entry.multiplier, config.multiplierDecimals) : "-"}
        </TableTd>
      ) : null}
    </TableTr>
  );
}

function EmptyPinnedLeaderboardRow({ account, showMultiplier }: { account: string; showMultiplier: boolean }) {
  return (
    <TableTr
      data-testid="leaderboard-pinned-row"
      className={cx(LEADERBOARD_ROW_CLASS_NAME, CURRENT_ACCOUNT_ROW_CLASS_NAME)}
    >
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "relative")}>
        <span className="numbers">{t`N/A`}</span>
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME} title={account}>
        <AddressView size={20} address={account} breakpoint="XL" />
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd>
      {showMultiplier ? <TableTd className={LEADERBOARD_TD_CLASS_NAME}>-</TableTd> : null}
    </TableTr>
  );
}

export function RewardsLeaderboardTab({
  chainId,
  account,
  config,
}: {
  chainId: number;
  account?: string;
  config: IncentivesConfig;
}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("current");
  const [orderBy, setOrderBy] = useState<IncentivesLeaderboardOrderBy>("tradingVolume_DESC");
  const [page, setPage] = useState(1);
  const [searchAddress, setSearchAddress] = useState("");
  const searchAccount = useMemo(() => {
    const value = searchAddress.trim();

    return isAddress(value) ? value : undefined;
  }, [searchAddress]);
  const epoch =
    period === "current"
      ? config.epochTimestamp
      : period === "previous"
        ? config.epochTimestamp - config.epochDuration
        : undefined;
  const showMultiplier = period !== "all";
  const effectiveOrderBy =
    !showMultiplier && orderBy.startsWith("multiplier_")
      ? orderBy.endsWith("_ASC")
        ? "tradingVolume_ASC"
        : "tradingVolume_DESC"
      : orderBy;

  const { data, totalCount, error, loading, isValidating, mutate, endpoint } = useIncentivesLeaderboard(chainId, {
    epoch,
    where: searchAccount ? { account: searchAccount } : undefined,
    orderBy: effectiveOrderBy,
    isMutable: period !== "previous",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const {
    data: pinnedEntries,
    error: pinnedError,
    isValidating: pinnedValidating,
    mutate: mutatePinned,
  } = useIncentivesLeaderboard(chainId, {
    epoch,
    where: account ? { account } : undefined,
    orderBy: effectiveOrderBy,
    enabled: Boolean(account),
    isMutable: period !== "previous",
    limit: 1,
    offset: 0,
  });
  const pinnedEntry = pinnedEntries?.[0];
  const pageData = useMemo(() => data ?? [], [data]);
  const isPinnedEntryVisible = Boolean(account && pageData.some((entry) => entry.address === account));
  const showPinnedRow = Boolean(pinnedEntry) && !isPinnedEntryVisible;
  const showEmptyPinnedRow =
    Boolean(account) &&
    pinnedEntries !== undefined &&
    pinnedEntries.length === 0 &&
    !pinnedError &&
    !isPinnedEntryVisible;
  const hasNoSearchMatch = Boolean(searchAccount && !loading && data !== undefined && data.length === 0);

  useEffect(() => setPage(1), [account, effectiveOrderBy, period, searchAccount]);

  useEffect(() => {
    if (!showMultiplier && orderBy.startsWith("multiplier_")) {
      setOrderBy(orderBy.endsWith("_ASC") ? "tradingVolume_ASC" : "tradingVolume_DESC");
    }
  }, [orderBy, showMultiplier]);

  const epochTimestampRef = useRef(config.epochTimestamp);

  useEffect(() => {
    if (epochTimestampRef.current === config.epochTimestamp) return;

    epochTimestampRef.current = config.epochTimestamp;
    if (period !== "all") setPage(1);
  }, [config.epochTimestamp, period]);

  const revalidateMutableLeaderboard = useCallback(
    () => Promise.allSettled([mutate(), mutatePinned()]),
    [mutate, mutatePinned]
  );

  useEpochRolloverRevalidation({
    epochTimestamp: period !== "previous" ? config.epochTimestamp : undefined,
    enabled: period !== "previous" && page === 1,
    scopeKey: `${chainId}:${account ?? ""}:${period}:${effectiveOrderBy}:${searchAccount ?? ""}:${endpoint ?? ""}`,
    revalidate: revalidateMutableLeaderboard,
  });

  const periodOptions = useMemo(
    () => [
      {
        value: "current" as const,
        label: (
          <span title={t`Current epoch values are provisional.`}>
            <Trans>Volume this epoch</Trans>
          </span>
        ),
        className: {
          active: "!rounded-full !bg-fill-accent !text-typography-primary",
          regular:
            "!rounded-full !border-1/2 !border-solid !border-fill-accent !bg-transparent !text-typography-secondary",
        },
      },
      {
        value: "previous" as const,
        label: <Trans>Last epoch</Trans>,
        className: {
          active: "!rounded-full !bg-fill-accent !text-typography-primary",
          regular:
            "!rounded-full !border-1/2 !border-solid !border-fill-accent !bg-transparent !text-typography-secondary",
        },
      },
      {
        value: "all" as const,
        label: (
          <span title={t`All-time totals include the provisional current epoch.`}>
            <Trans>All-time</Trans>
          </span>
        ),
        icon: <AllTimeIcon className="size-12" />,
        className: {
          active: "!rounded-full !bg-fill-accent !text-typography-primary",
          regular:
            "!rounded-full !border-1/2 !border-solid !border-fill-accent !bg-transparent !text-typography-secondary",
        },
      },
    ],
    []
  );
  const handlePeriodChange = useCallback((value: LeaderboardPeriod) => {
    setPeriod(value);
    setPage(1);
  }, []);
  const handleSearchAddressChange = useCallback((value: string) => {
    setSearchAddress(value);

    const normalizedValue = value.trim();
    if (!normalizedValue || isAddress(normalizedValue)) setPage(1);
  }, []);
  const getSorterProps = useCallback(
    (field: LeaderboardSortField) => {
      const direction: SortDirection = effectiveOrderBy.startsWith(`${field}_`)
        ? effectiveOrderBy.endsWith("_ASC")
          ? "asc"
          : "desc"
        : "unspecified";

      return {
        direction,
        onChange: (nextDirection: SortDirection) => {
          setOrderBy(
            nextDirection === "unspecified" ? "tradingVolume_DESC" : toLeaderboardOrderBy(field, nextDirection)
          );
          setPage(1);
        },
      };
    },
    [effectiveOrderBy]
  );

  const pageCount = totalCount === undefined ? page : Math.max(page, 1, Math.ceil(totalCount / PAGE_SIZE));
  const hasInitialError = Boolean(error && data === undefined);
  const hasCachedError = Boolean(error && data !== undefined);
  const isInitialLoading = loading && data === undefined;
  const showEmpty =
    !searchAccount && !loading && data !== undefined && data.length === 0 && !showPinnedRow && !showEmptyPinnedRow;
  const visibleMainRowCount = hasNoSearchMatch ? 1 : pageData.length;
  const pinnedRow =
    account && pinnedEntries === undefined && !pinnedError && !isPinnedEntryVisible ? (
      <TableListSkeleton
        count={1}
        Structure={
          showMultiplier ? RewardsLeaderboardPinnedSkeletonRow : RewardsLeaderboardPinnedSkeletonRowWithoutMultiplier
        }
      />
    ) : showPinnedRow && pinnedEntry ? (
      <LeaderboardRow entry={pinnedEntry} account={account} config={config} showMultiplier={showMultiplier} pinned />
    ) : showEmptyPinnedRow && account ? (
      <EmptyPinnedLeaderboardRow account={account} showMultiplier={showMultiplier} />
    ) : null;

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 p-20">
        <h3 className="mb-12 text-16 font-medium text-typography-primary">
          <Trans>Leaderboard</Trans>
        </h3>

        <div className="flex items-center justify-between gap-16 max-md:flex-col max-md:items-stretch">
          <Tabs<LeaderboardPeriod>
            type="inline"
            options={periodOptions}
            selectedValue={period}
            onChange={handlePeriodChange}
            className="shrink-0"
          />
          <SearchInput
            value={searchAddress}
            setValue={handleSearchAddressChange}
            placeholder={t`Search address`}
            autoFocus={false}
            qa="rewards-leaderboard-search"
            className="w-full max-w-[260px] max-md:max-w-none"
          />
        </div>
      </div>

      {pinnedError ? (
        <div className="px-20 pb-8 pt-12">
          <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
            <Trans>Your rank is temporarily unavailable.</Trans>
          </div>
        </div>
      ) : null}
      {hasInitialError ? (
        <>
          <div className="flex min-h-[164px] grow items-center justify-center p-24 text-center text-typography-secondary">
            <Trans>Leaderboard data is temporarily unavailable.</Trans>
          </div>
          {page > 1 ? <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} /> : null}
        </>
      ) : showEmpty ? (
        <>
          <div className="flex min-h-[164px] grow items-center justify-center p-24 text-center text-typography-secondary">
            <Trans>No leaderboard entries yet.</Trans>
          </div>
          {page > 1 ? <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} /> : null}
        </>
      ) : (
        <div className="flex grow flex-col rounded-b-8 bg-slate-900">
          {hasCachedError ? (
            <div className="px-20 pb-8 pt-12">
              <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
                <Trans>Leaderboard data could not be refreshed. Showing the latest loaded data.</Trans>
              </div>
            </div>
          ) : null}

          <TableScrollFadeContainer className="grow" ariaLabel={t`Rewards leaderboard table`}>
            <table
              className={cx(
                "w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-4 [&_td:last-child]:!text-left [&_th:last-child]:!text-left",
                showMultiplier ? "min-w-[1080px]" : "min-w-[920px]"
              )}
            >
              <colgroup>
                <col style={COL_RANK} />
                <col style={COL_ADDRESS} />
                <col style={COL_TRADING_VOLUME} />
                <col style={COL_REFERRAL_VOLUME} />
                <col style={COL_ES_GMX} />
                <col style={COL_GT} />
                <col style={COL_REWARDS} />
                {showMultiplier ? <col style={COL_MULTIPLIER} /> : null}
              </colgroup>
              <thead>
                <TableTheadTr>
                  <TableTh>
                    <Trans>Rank</Trans>
                  </TableTh>
                  <TableTh>
                    <Trans>Address</Trans>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("tradingVolume")}>
                      <Trans>Volume</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("referralVolume")}>
                      <Trans>Referral volume</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("esGmxRewards")}>
                      <Trans>esGMX accrued</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("gtRewards")}>
                      <Trans>GT allocated</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh>
                    <Sorter {...getSorterProps("rewardsUsd")}>
                      <Trans>Rewards USD</Trans>
                    </Sorter>
                  </TableTh>
                  {showMultiplier ? (
                    <TableTh>
                      <Sorter {...getSorterProps("multiplier")}>
                        <Trans>Multiplier</Trans>
                      </Sorter>
                    </TableTh>
                  ) : null}
                </TableTheadTr>
              </thead>
              <tbody>
                {isInitialLoading ? (
                  <>
                    {pinnedRow}
                    <TableListSkeleton
                      count={PAGE_SIZE}
                      Structure={
                        showMultiplier ? RewardsLeaderboardSkeletonRow : RewardsLeaderboardSkeletonRowWithoutMultiplier
                      }
                    />
                  </>
                ) : (
                  <>
                    {pinnedRow}
                    {hasNoSearchMatch ? (
                      <TableTr className={LEADERBOARD_ROW_CLASS_NAME}>
                        <TableTd
                          colSpan={showMultiplier ? 8 : 7}
                          className={cx(LEADERBOARD_TD_CLASS_NAME, "text-typography-secondary")}
                        >
                          <div className="text-center">
                            <Trans>No results found</Trans>
                          </div>
                        </TableTd>
                      </TableTr>
                    ) : null}
                    {pageData.map((entry) => (
                      <LeaderboardRow
                        key={entry.address}
                        entry={entry}
                        account={account}
                        config={config}
                        showMultiplier={showMultiplier}
                      />
                    ))}
                    {data !== undefined && visibleMainRowCount < PAGE_SIZE ? (
                      <TableListSkeleton
                        invisible
                        count={PAGE_SIZE - visibleMainRowCount}
                        Structure={
                          showMultiplier
                            ? RewardsLeaderboardSkeletonRow
                            : RewardsLeaderboardSkeletonRowWithoutMultiplier
                        }
                      />
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>

          <div className="relative flex h-56 items-center justify-center px-8">
            <div className="text-caption absolute left-20 text-typography-secondary">
              {(isValidating && data !== undefined) || (pinnedValidating && pinnedEntries !== undefined) ? (
                <Trans>Updating...</Trans>
              ) : null}
            </div>
            {data !== undefined || page > 1 ? (
              <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
