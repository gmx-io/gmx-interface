import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { getAddress, isAddress, isAddressEqual } from "viem";

import "./RewardsLeaderboardTab.scss";

import type { ContractsChainId } from "config/chains";
import { useGmxPrice } from "domain/legacy";
import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig, LeaderboardEntry } from "domain/synthetics/incentives/v2/types";
import { useEpochRolloverRevalidation } from "domain/synthetics/incentives/v2/useEpochRolloverRevalidation";
import {
  type IncentivesLeaderboardOrderBy,
  useIncentivesLeaderboard,
} from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import {
  LEADERBOARD_SEARCH_SCAN_LIMIT,
  useIncentivesLeaderboardSearch,
} from "domain/synthetics/incentives/v2/useIncentivesLeaderboardSearch";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { useDebounce } from "lib/debounce/useDebounce";
import { formatUsd, numberWithCommas } from "lib/numbers";
import { sendRewardsLeaderboardShareClickEvent } from "lib/userAnalytics/rewardsEvents";

import AddressView from "components/AddressView/AddressView";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { RewardsShare } from "components/RewardsShare/RewardsShare";
import SearchInput from "components/SearchInput/SearchInput";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter } from "components/Sorter/Sorter";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import Tabs from "components/Tabs/Tabs";

import ShareIcon from "img/ic_share_arrow_filled.svg?react";

import { RewardsTokenValue } from "./RewardsTokenValue";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const COL_RANK: CSSProperties = { width: "7%" };
const COL_ADDRESS: CSSProperties = { width: "19%" };
const COL_TRADING_VOLUME: CSSProperties = { width: "14%" };
const COL_REFERRAL_VOLUME: CSSProperties = { width: "14%" };
const COL_ES_GMX: CSSProperties = { width: "14%" };
const COL_GT: CSSProperties = { width: "12%" };
const COL_REWARDS: CSSProperties = { width: "12%" };
const COL_SHARE: CSSProperties = { width: "8%" };
const LEADERBOARD_ROW_CLASS_NAME = "h-40";
const LEADERBOARD_TD_CLASS_NAME = "!py-8";
const CURRENT_ACCOUNT_ROW_CLASS_NAME =
  "!bg-cold-blue-900 text-blue-100 [&_.AddressView-trader-id]:!text-typography-primary [&_.AddressView-trader-id_.text-typography-secondary]:!text-blue-100";

type LeaderboardPeriod = "current" | "previous" | "all";
type LeaderboardSortField = "tradingVolume" | "referralVolume" | "esGmxRewards" | "gtRewards" | "rewardsUsd";
type SortDirection = "asc" | "desc" | "unspecified";

function isSameAddress(first?: string, second?: string) {
  return Boolean(first && second && isAddress(first) && isAddress(second) && isAddressEqual(first, second));
}

// Whole addresses are filtered by the leaderboard query; shorter input falls back to a scan.
function toSearchAccount(value: string) {
  return isAddress(value, { strict: false }) ? getAddress(value) : undefined;
}

function RewardsLeaderboardSkeletonRow({ invisible, pinned = false }: { invisible?: boolean; pinned?: boolean }) {
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
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        <Skeleton width={56} inline />
      </TableTd>
    </tr>
  );
}

function RewardsLeaderboardPinnedSkeletonRow({ invisible }: { invisible?: boolean }) {
  return <RewardsLeaderboardSkeletonRow invisible={invisible} pinned />;
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
  gmxPrice,
  gtPrice,
  onShare,
  pinned = false,
}: {
  entry: LeaderboardEntry;
  account?: string;
  gmxPrice?: bigint;
  gtPrice?: bigint;
  onShare?: (entry: LeaderboardEntry) => void;
  pinned?: boolean;
}) {
  const isAccount = isSameAddress(entry.address, account);
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
        {formatUsd(entry.tradingVolume, { fallbackToZero: true, displayDecimals: 0 })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatUsd(entry.referralVolume, { fallbackToZero: true, displayDecimals: 0 })}
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        <RewardsTokenValue amount={entry.esGmxRewards} decimals={ES_GMX_DECIMALS} price={gmxPrice} />
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        <RewardsTokenValue amount={entry.gtRewards} decimals={GT_DECIMALS} price={gtPrice} />
      </TableTd>
      <TableTd className={cx(LEADERBOARD_TD_CLASS_NAME, "numbers")}>
        {formatUsd(entry.rewardsUsd, { fallbackToZero: true, displayDecimals: 2 })}
      </TableTd>
      <TableTd className={LEADERBOARD_TD_CLASS_NAME}>
        {isAccount && onShare ? (
          <button
            type="button"
            onClick={() => onShare(entry)}
            className="inline-flex items-center gap-4 whitespace-nowrap text-13 font-medium text-blue-100"
          >
            <ShareIcon className="size-12" />
            <Trans>Share</Trans>
          </button>
        ) : null}
      </TableTd>
    </TableTr>
  );
}

function EmptyPinnedLeaderboardRow({ account }: { account: string }) {
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
      <TableTd className={LEADERBOARD_TD_CLASS_NAME} />
    </TableTr>
  );
}

export function RewardsLeaderboardTab({
  chainId,
  account,
  config,
}: {
  chainId: ContractsChainId;
  account?: string;
  config?: IncentivesConfig;
}) {
  const { gmxPrice } = useGmxPrice(chainId, {}, false, { fetchAllChains: false });
  const { data: gtPrice } = useLatestGtPrice(chainId);
  const [period, setPeriod] = useState<LeaderboardPeriod>(() => (config ? "current" : "all"));
  const [orderBy, setOrderBy] = useState<IncentivesLeaderboardOrderBy>("rewardsUsd_DESC");
  const [page, setPage] = useState(1);
  const [searchAddress, setSearchAddress] = useState("");
  const [shareEntry, setShareEntry] = useState<LeaderboardEntry | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const hadConfigRef = useRef(Boolean(config));
  const hasSelectedPeriodRef = useRef(false);
  // Every search-driven state reads the debounced term so the table never mixes it with a newer input.
  const debouncedSearchTerm: string = useDebounce(searchAddress.trim(), SEARCH_DEBOUNCE_MS);
  const searchAccount = useMemo(() => toSearchAccount(debouncedSearchTerm), [debouncedSearchTerm]);
  const isPartialSearch = debouncedSearchTerm !== "" && searchAccount === undefined;
  const selectedPeriod = config ? period : "all";
  const epoch = !config
    ? undefined
    : selectedPeriod === "current"
      ? config.epochTimestamp
      : selectedPeriod === "previous"
        ? config.epochTimestamp - config.epochDuration
        : undefined;

  const { data, totalCount, error, loading, isValidating, mutate, endpoint } = useIncentivesLeaderboard(chainId, {
    epoch,
    where: searchAccount ? { account: searchAccount } : undefined,
    orderBy,
    enabled: !isPartialSearch,
    isMutable: selectedPeriod !== "previous",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const {
    data: searchData,
    totalCount: searchTotalCount,
    isTruncated: isSearchTruncated,
    error: searchError,
    loading: searchLoading,
    isValidating: searchValidating,
    mutate: mutateSearch,
  } = useIncentivesLeaderboardSearch(chainId, {
    epoch,
    term: debouncedSearchTerm,
    orderBy,
    enabled: isPartialSearch,
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
    orderBy,
    enabled: Boolean(account),
    isMutable: selectedPeriod !== "previous",
    limit: 1,
    offset: 0,
  });
  const pinnedEntry = pinnedEntries?.[0];
  const entries = isPartialSearch ? searchData : data;
  const entriesTotalCount = isPartialSearch ? searchTotalCount : totalCount;
  const entriesError = isPartialSearch ? searchError : error;
  const entriesLoading = isPartialSearch ? searchLoading : loading;
  const entriesValidating = isPartialSearch ? searchValidating : isValidating;
  const pageData = useMemo(() => entries ?? [], [entries]);
  const isPinnedEntryVisible = Boolean(account && pageData.some((entry) => isSameAddress(entry.address, account)));
  // Searching narrows the table to the matches, so the connected account is not pinned on top of them.
  const isSearchActive = debouncedSearchTerm !== "";
  const showPinnedRow = !isSearchActive && Boolean(pinnedEntry) && !isPinnedEntryVisible;
  const showEmptyPinnedRow =
    !isSearchActive &&
    Boolean(account) &&
    pinnedEntries !== undefined &&
    pinnedEntries.length === 0 &&
    !pinnedError &&
    !isPinnedEntryVisible;
  const hasNoSearchMatch = Boolean(
    debouncedSearchTerm && !entriesLoading && entries !== undefined && entries.length === 0
  );

  useEffect(() => setPage(1), [account, orderBy, searchAccount, selectedPeriod]);

  useEffect(() => {
    setIsShareOpen(false);
    setShareEntry(null);
  }, [account, config?.epochTimestamp, selectedPeriod]);

  useEffect(() => {
    if (!config && period !== "all") setPeriod("all");
  }, [config, period]);

  useEffect(() => {
    if (config && !hadConfigRef.current && !hasSelectedPeriodRef.current) {
      setPeriod("current");
      setPage(1);
    }

    hadConfigRef.current = Boolean(config);
  }, [config]);

  const epochTimestampRef = useRef(config?.epochTimestamp);

  useEffect(() => {
    if (epochTimestampRef.current === config?.epochTimestamp) return;

    epochTimestampRef.current = config?.epochTimestamp;
    if (selectedPeriod !== "all") setPage(1);
  }, [config?.epochTimestamp, selectedPeriod]);

  const revalidateMutableLeaderboard = useCallback(
    () => Promise.allSettled([mutate(), mutatePinned(), mutateSearch()]),
    [mutate, mutatePinned, mutateSearch]
  );

  useEpochRolloverRevalidation({
    epochTimestamp: selectedPeriod !== "previous" ? config?.epochTimestamp : undefined,
    enabled: Boolean(config) && selectedPeriod !== "previous" && page === 1,
    scopeKey: `${chainId}:${account ?? ""}:${selectedPeriod}:${orderBy}:${searchAccount ?? ""}:${endpoint ?? ""}`,
    revalidate: revalidateMutableLeaderboard,
  });

  const periodOptions = useMemo(() => {
    const allTimeOption = {
      value: "all" as const,
      label: (
        <span title={t`All-time totals include the provisional current epoch.`}>
          <Trans>All-time</Trans>
        </span>
      ),
    };

    if (!config) return [allTimeOption];

    return [
      {
        value: "current" as const,
        label: (
          <span title={t`Current epoch values are provisional.`}>
            <Trans>Volume this epoch</Trans>
          </span>
        ),
      },
      {
        value: "previous" as const,
        label: <Trans>Last epoch</Trans>,
      },
      allTimeOption,
    ];
  }, [config]);
  const handlePeriodChange = useCallback((value: LeaderboardPeriod) => {
    hasSelectedPeriodRef.current = true;
    setPeriod(value);
    setPage(1);
  }, []);
  const handleSearchAddressChange = useCallback((value: string) => {
    setSearchAddress(value);
    setPage(1);
  }, []);
  const handleShare = useCallback(
    (entry: LeaderboardEntry) => {
      sendRewardsLeaderboardShareClickEvent(selectedPeriod);
      setShareEntry(entry);
      setIsShareOpen(true);
    },
    [selectedPeriod]
  );
  const getSorterProps = useCallback(
    (field: LeaderboardSortField) => {
      const direction: SortDirection = orderBy.startsWith(`${field}_`)
        ? orderBy.endsWith("_ASC")
          ? "asc"
          : "desc"
        : "unspecified";

      return {
        direction,
        onChange: (nextDirection: SortDirection) => {
          setOrderBy(nextDirection === "unspecified" ? "rewardsUsd_DESC" : toLeaderboardOrderBy(field, nextDirection));
          setPage(1);
        },
      };
    },
    [orderBy]
  );

  const pageCount =
    entriesTotalCount === undefined ? page : Math.max(page, 1, Math.ceil(entriesTotalCount / PAGE_SIZE));
  const hasInitialError = Boolean(entriesError && entries === undefined);
  const hasCachedError = Boolean(entriesError && entries !== undefined);
  const isInitialLoading = entriesLoading && entries === undefined;
  const showEmpty =
    !debouncedSearchTerm &&
    !entriesLoading &&
    entries !== undefined &&
    entries.length === 0 &&
    !showPinnedRow &&
    !showEmptyPinnedRow;
  const visibleMainRowCount = hasNoSearchMatch ? 1 : pageData.length;
  const pinnedRow =
    !isSearchActive && account && pinnedEntries === undefined && !pinnedError && !isPinnedEntryVisible ? (
      <TableListSkeleton count={1} Structure={RewardsLeaderboardPinnedSkeletonRow} />
    ) : showPinnedRow && pinnedEntry ? (
      <LeaderboardRow
        entry={pinnedEntry}
        account={account}
        gmxPrice={gmxPrice}
        gtPrice={gtPrice?.priceUsd}
        onShare={handleShare}
        pinned
      />
    ) : showEmptyPinnedRow && account ? (
      <EmptyPinnedLeaderboardRow account={account} />
    ) : null;

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 p-20">
        <h3 className="mb-12 text-16 font-medium text-typography-primary">
          <Trans>Leaderboard</Trans>
        </h3>

        <div className="flex items-center justify-between gap-16 max-md:flex-col max-md:items-stretch">
          <SearchInput
            value={searchAddress}
            setValue={handleSearchAddressChange}
            placeholder={t`Search address`}
            autoFocus={false}
            qa="rewards-leaderboard-search"
            className="w-full max-w-[260px] max-md:max-w-none"
          />
          <Tabs<LeaderboardPeriod>
            type="inline"
            options={periodOptions}
            selectedValue={selectedPeriod}
            onChange={handlePeriodChange}
            className="shrink-0"
          />
        </div>
      </div>

      {pinnedError && !isSearchActive ? (
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
          {isPartialSearch && isSearchTruncated ? (
            <div className="px-20 pb-8 pt-12">
              <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
                <Trans>
                  Partial search covers the top {numberWithCommas(LEADERBOARD_SEARCH_SCAN_LIMIT)} accounts. Search by
                  full address to find any account.
                </Trans>
              </div>
            </div>
          ) : null}
          {hasCachedError ? (
            <div className="px-20 pb-8 pt-12">
              <div className="rounded-8 border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-20 p-12 text-13 leading-[1.3] text-typography-primary">
                <Trans>Leaderboard data could not be refreshed. Showing the latest loaded data.</Trans>
              </div>
            </div>
          ) : null}

          <TableScrollFadeContainer className="grow" ariaLabel={t`Rewards leaderboard table`}>
            <table className="w-full min-w-[1000px] table-fixed border-separate border-spacing-0 [&_td:last-child]:!text-left [&_th:last-child]:!text-left">
              <colgroup>
                <col style={COL_RANK} />
                <col style={COL_ADDRESS} />
                <col style={COL_TRADING_VOLUME} />
                <col style={COL_REFERRAL_VOLUME} />
                <col style={COL_ES_GMX} />
                <col style={COL_GT} />
                <col style={COL_REWARDS} />
                <col style={COL_SHARE} />
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
                  <TableTh />
                </TableTheadTr>
              </thead>
              <tbody>
                {isInitialLoading ? (
                  <>
                    {pinnedRow}
                    <TableListSkeleton count={PAGE_SIZE} Structure={RewardsLeaderboardSkeletonRow} />
                  </>
                ) : (
                  <>
                    {pinnedRow}
                    {hasNoSearchMatch ? (
                      <TableTr className={LEADERBOARD_ROW_CLASS_NAME}>
                        <TableTd colSpan={8} className={cx(LEADERBOARD_TD_CLASS_NAME, "text-typography-secondary")}>
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
                        gmxPrice={gmxPrice}
                        gtPrice={gtPrice?.priceUsd}
                        onShare={handleShare}
                      />
                    ))}
                    {entries !== undefined && visibleMainRowCount < PAGE_SIZE ? (
                      <TableListSkeleton
                        invisible
                        count={PAGE_SIZE - visibleMainRowCount}
                        Structure={RewardsLeaderboardSkeletonRow}
                      />
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </TableScrollFadeContainer>

          <div className="relative flex h-56 items-center justify-center px-8">
            <div className="text-caption absolute left-20 text-typography-secondary">
              {(entriesValidating && entries !== undefined) || (pinnedValidating && pinnedEntries !== undefined) ? (
                <Trans>Updating...</Trans>
              ) : null}
            </div>
            {entries !== undefined || page > 1 ? (
              <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
            ) : null}
          </div>
        </div>
      )}
      {shareEntry && account ? (
        <RewardsShare
          isOpen={isShareOpen}
          setIsOpen={setIsShareOpen}
          account={account}
          chainId={chainId}
          entry={shareEntry}
        />
      ) : null}
    </div>
  );
}
