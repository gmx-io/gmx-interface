import { t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { isAddress } from "viem";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  type IncentiveAuditOrderBy,
  useIncentiveAccountEpochAudit,
} from "domain/synthetics/incentives/v2/useIncentiveAccountEpochAudit";
import { formatAmount, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import Button from "components/Button/Button";
import Loader from "components/Loader/Loader";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import SearchInput from "components/SearchInput/SearchInput";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SummaryCard } from "./SummaryCard";
import {
  formatAuditMultiplier,
  formatBoosts,
  formatEffectiveRewardsRatio,
  formatStakingTier,
  formatVolumeTier,
} from "./utils";

const PAGE_SIZE = 20;
const SKELETON_WIDTHS = [140, 80, 90, 90, 90, 80, 70, 70, 80, 80, 70, 80, 100, 130, 80];

type EpochOption = { timestamp: number; label: string };
type AuditSortField = "fees" | "tradingVolume" | "referralVolume" | "rewardsUsd" | "effectiveRewardsRatio";
type AuditSortDirection = "asc" | "desc" | "unspecified";

function IncentivesAuditSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <tr className={invisible ? undefined : "odd:bg-fill-surfaceElevated50"}>
      {SKELETON_WIDTHS.map((width, index) => (
        <TableTd key={index} padding="compact">
          <Skeleton width={width} inline />
        </TableTd>
      ))}
    </tr>
  );
}

export function IncentivesAuditList({
  chainId,
  config,
  selectedEpoch,
  epochs,
  onEpochChange,
  onAccountClick,
}: {
  chainId: number;
  config: IncentivesConfig;
  selectedEpoch: number | "all" | undefined;
  epochs: EpochOption[];
  onEpochChange: (epoch: number | "all" | undefined) => void;
  onAccountClick: (account: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [accountSearch, setAccountSearch] = useState("");
  const [sort, setSort] = useState<{ orderBy: AuditSortField | "unspecified"; direction: AuditSortDirection }>({
    orderBy: "rewardsUsd",
    direction: "desc",
  });

  const apiOrderBy: IncentiveAuditOrderBy =
    sort.direction === "unspecified" || sort.orderBy === "unspecified"
      ? "rewardsUsd_DESC"
      : `${sort.orderBy}_${sort.direction === "asc" ? "ASC" : "DESC"}`;

  const getSorterProps = (field: AuditSortField) => ({
    direction: sort.orderBy === field ? sort.direction : ("unspecified" as const),
    onChange: (direction: AuditSortDirection) => {
      setPage(1);
      setSort({ orderBy: direction === "unspecified" ? "unspecified" : field, direction });
    },
  });

  const { data, totalCount, summary, error, loading, isValidating } = useIncentiveAccountEpochAudit(chainId, {
    where: selectedEpoch === "all" || selectedEpoch === undefined ? undefined : { epochTimestamp: selectedEpoch },
    orderBy: apiOrderBy,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    enabled: selectedEpoch !== undefined,
  });

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isInitialLoading = loading && data === undefined;
  const hasInitialError = Boolean(error && data === undefined);
  const hasCachedError = Boolean(error && data !== undefined);
  const showEmpty = !loading && data !== undefined && data.length === 0;
  const hasLoadedPage = data !== undefined;

  const handleEpochSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setPage(1);
      onEpochChange(value === "all" ? "all" : value ? Number(value) : undefined);
    },
    [onEpochChange]
  );
  const searchedAccount = accountSearch.trim();
  const canInspectAccount = isAddress(searchedAccount);
  const handleInspectAccount = useCallback(() => {
    if (isAddress(searchedAccount)) onAccountClick(searchedAccount);
  }, [onAccountClick, searchedAccount]);
  const handleAccountSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") handleInspectAccount();
    },
    [handleInspectAccount]
  );

  if (selectedEpoch === undefined) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-8 bg-slate-900">
        <Loader />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-16">
      <div className="flex flex-wrap items-center justify-between gap-12">
        <div className="flex items-center gap-12">
          <label className="text-14 font-medium text-typography-primary" htmlFor="incentives-audit-epoch">
            <Trans>Epoch</Trans>
          </label>
          <select
            id="incentives-audit-epoch"
            className="rounded-8 border border-slate-600 bg-slate-800 px-12 py-8 text-14 text-typography-primary hover:bg-fill-surfaceElevatedHover"
            value={selectedEpoch}
            onChange={handleEpochSelect}
          >
            <option value="all">
              <Trans>All time (aggregated by account)</Trans>
            </option>
            {epochs.map((epoch) => (
              <option key={epoch.timestamp} value={epoch.timestamp}>
                {epoch.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[320px] flex-wrap items-center justify-end gap-8 max-md:w-full">
          {isValidating && data ? (
            <div className="text-caption mr-4 text-typography-secondary">
              <Trans>Updating indexed audit data…</Trans>
            </div>
          ) : null}
          <SearchInput
            value={accountSearch}
            setValue={setAccountSearch}
            placeholder={t`Account address`}
            autoFocus={false}
            qa="incentives-audit-account-search"
            className="max-w-[360px]"
            onKeyDown={handleAccountSearchKeyDown}
          />
          <Button
            variant="secondary"
            className="!h-32 !min-h-32"
            disabled={!canInspectAccount}
            onClick={handleInspectAccount}
          >
            <Trans>Inspect account</Trans>
          </Button>
        </div>
      </div>

      {selectedEpoch === "all" ? (
        <div className="rounded-8 border-l-2 border-l-blue-300 bg-blue-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
          <Trans>
            All-time rows are aggregated by account. Epoch-specific tiers and boosts are intentionally blank in this
            view.
          </Trans>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          label={<Trans>Accounts</Trans>}
          value={totalCount ?? "…"}
          note={
            summary ? (
              <Trans>{summary.loadedCount} loaded on this page</Trans>
            ) : hasLoadedPage ? (
              <Trans>0 loaded on this page</Trans>
            ) : undefined
          }
        />
        <SummaryCard
          label={<Trans>Eligible fees on page</Trans>}
          value={summary ? formatUsd(summary.totalFees, { displayDecimals: 2 }) : hasLoadedPage ? formatUsd(0n) : "…"}
        />
        <SummaryCard
          label={<Trans>Trading volume on page</Trans>}
          value={
            summary
              ? formatUsd(summary.totalTradingVolume, { displayDecimals: 0 })
              : hasLoadedPage
                ? formatUsd(0n, { displayDecimals: 0 })
                : "…"
          }
        />
        <SummaryCard
          label={<Trans>Referral volume on page</Trans>}
          value={
            summary
              ? formatUsd(summary.totalReferralVolume, { displayDecimals: 0 })
              : hasLoadedPage
                ? formatUsd(0n, { displayDecimals: 0 })
                : "…"
          }
        />
        <SummaryCard
          label={<Trans>Rewards USD on page</Trans>}
          value={
            summary ? formatUsd(summary.totalRewardsUsd, { displayDecimals: 2 }) : hasLoadedPage ? formatUsd(0n) : "…"
          }
        />
        <SummaryCard
          label={<Trans>Average effective trading reward rate</Trans>}
          value={summary ? formatEffectiveRewardsRatio(summary.avgEffectiveRewardsRatio) : hasLoadedPage ? "-" : "…"}
          note={<Trans>Unweighted average of loaded rows</Trans>}
        />
      </div>

      <div className="overflow-hidden rounded-8 bg-slate-900">
        {hasCachedError ? (
          <div className="border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
            <Trans>Audit data could not be refreshed. Showing the latest loaded page.</Trans>
          </div>
        ) : null}

        {hasInitialError ? (
          <div className="p-24 text-center text-red-500">
            <Trans>Error loading audit data.</Trans>
          </div>
        ) : showEmpty ? (
          <div className="p-24 text-center text-typography-secondary">
            <Trans>No audit entries found for this epoch.</Trans>
          </div>
        ) : (
          <>
            <TableScrollFadeContainer ariaLabel="Incentives V2 account audit">
              <Table className="min-w-[1920px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <thead>
                  <TableTheadTr>
                    <TableTh padding="compact">
                      <Trans>Account</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("fees")}>
                        <Trans>Eligible fees</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("tradingVolume")}>
                        <Trans>Trading volume</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Tier volume</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("referralVolume")}>
                        <Trans>Referral volume</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>esGMX</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>GT</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("rewardsUsd")}>
                        <Trans>Rewards USD</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Manual reward subset USD</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Avg multiplier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Max multiplier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Volume tier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Staking tier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Observed boosts</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("effectiveRewardsRatio")}>
                        <Trans>Effective trading reward rate</Trans>
                      </Sorter>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isInitialLoading ? (
                    <TableListSkeleton count={PAGE_SIZE} Structure={IncentivesAuditSkeletonRow} />
                  ) : (
                    data?.map((entry) => (
                      <TableTr key={entry.id} hoverable>
                        <TableTd padding="compact">
                          <button type="button" className="text-left" onClick={() => onAccountClick(entry.account)}>
                            <AddressView size={20} address={entry.account} breakpoint="XL" noLink />
                          </button>
                        </TableTd>
                        <TableTd padding="compact">{formatUsd(entry.fees, { displayDecimals: 2 })}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.tradingVolume, { displayDecimals: 0 })}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.tierVolume, { displayDecimals: 0 })}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.referralVolume, { displayDecimals: 0 })}</TableTd>
                        <TableTd padding="compact">
                          {formatAmount(entry.esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })}
                        </TableTd>
                        <TableTd padding="compact">
                          {formatAmount(entry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
                        </TableTd>
                        <TableTd padding="compact">{formatUsd(entry.rewardsUsd, { displayDecimals: 2 })}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.manualRewardsUsd, { displayDecimals: 2 })}</TableTd>
                        <TableTd padding="compact">
                          {formatAuditMultiplier(entry.avgMultiplier, config.multiplierDecimals)}
                        </TableTd>
                        <TableTd padding="compact">
                          {formatAuditMultiplier(entry.maxMultiplier, config.multiplierDecimals)}
                        </TableTd>
                        <TableTd padding="compact">{formatVolumeTier(entry.volumeTier)}</TableTd>
                        <TableTd padding="compact">{formatStakingTier(entry.stakingTier)}</TableTd>
                        <TableTd padding="compact">{formatBoosts(entry.boostIds)}</TableTd>
                        <TableTd padding="compact">{formatEffectiveRewardsRatio(entry.effectiveRewardsRatio)}</TableTd>
                      </TableTr>
                    ))
                  )}
                  {data && data.length < PAGE_SIZE ? (
                    <TableListSkeleton
                      invisible
                      count={PAGE_SIZE - data.length}
                      Structure={IncentivesAuditSkeletonRow}
                    />
                  ) : null}
                </tbody>
              </Table>
            </TableScrollFadeContainer>
            <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}
