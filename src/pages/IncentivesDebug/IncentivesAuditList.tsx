import { Trans } from "@lingui/macro";
import { useCallback, useState } from "react";
import Skeleton from "react-loading-skeleton";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import {
  IncentiveAuditOrderBy,
  useIncentiveAccountEpochAudit,
} from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";
import { formatAmount, formatUsd } from "lib/numbers";

import AddressView from "components/AddressView/AddressView";
import Loader from "components/Loader/Loader";
import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SummaryCard } from "./SummaryCard";

const PAGE_SIZE = 20;

function IncentivesAuditSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <tr className={invisible ? undefined : "odd:bg-fill-surfaceElevated50"}>
      <TableTd padding="compact">
        <Skeleton width={140} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={70} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={70} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={80} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={120} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
    </tr>
  );
}

// Sort fields are constrained to those exposed by the backend `IncentiveAccountEpochAuditOrderByInput`
// enum (each becomes `${field}_ASC` / `${field}_DESC`). `avgMultiplier`/`maxMultiplier` are not
// orderable server-side, so their columns no longer render a Sorter.
type AuditSortField =
  | "points"
  | "rewards"
  | "fees"
  | "volume"
  | "effectivePointsRatio"
  | "effectiveRewardsRatio";

type EpochOption = { timestamp: number; label: string };

export function IncentivesAuditList({
  chainId,
  selectedEpoch,
  epochs,
  onEpochChange,
  onAccountClick,
}: {
  chainId: number;
  selectedEpoch: number | "all" | undefined;
  epochs: EpochOption[];
  onEpochChange: (epoch: number | "all" | undefined) => void;
  onAccountClick: (account: string) => void;
}) {
  const [page, setPage] = useState(1);

  const { orderBy, direction, getSorterProps } = useSorterHandlers<AuditSortField>("incentives-audit-list", {
    orderBy: "effectiveRewardsRatio",
    direction: "desc",
  });

  // The FE sort field names line up 1:1 with the backend enum prefixes; we just
  // append `_ASC` / `_DESC`. When the user clears the sort, fall back to the
  // backend default of `effectiveRewardsRatio_DESC`.
  const apiOrderBy: IncentiveAuditOrderBy =
    direction === "unspecified" || orderBy === "unspecified"
      ? "effectiveRewardsRatio_DESC"
      : (`${orderBy}_${direction === "asc" ? "ASC" : "DESC"}` as IncentiveAuditOrderBy);

  // Gate the query: before the incentives config resolves, selectedEpoch is
  // undefined. Without this, the hook would fire a full-range (no-epoch)
  // query that's immediately discarded once the epoch becomes known.
  // "all" is a user-picked sentinel that omits epochTimestamp for an all-time view.
  const { data, totalCount, summary, error, loading } = useIncentiveAccountEpochAudit(chainId, {
    where: selectedEpoch === "all" || selectedEpoch === undefined ? undefined : { epochTimestamp: selectedEpoch },
    orderBy: apiOrderBy,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    enabled: selectedEpoch !== undefined,
  });

  const pageCount = totalCount === undefined ? page : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const isInitialLoading = loading && !data;
  const shouldShowTable = isInitialLoading || (data && data.length > 0);

  const handleEpochSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val === "all") {
        onEpochChange("all");
      } else if (val) {
        onEpochChange(Number(val));
      } else {
        onEpochChange(undefined);
      }
      setPage(1);
    },
    [onEpochChange]
  );

  if (selectedEpoch === undefined) {
    return (
      <div className="mt-16 flex items-center justify-center p-40">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mt-16 flex flex-col gap-16">
      <div className="flex items-center gap-12">
        <label className="text-14 font-medium text-typography-primary">
          <Trans>Epoch</Trans>
        </label>
        <select
          className="rounded-8 border border-slate-600 bg-slate-800 px-12 py-8 text-14 text-typography-primary hover:bg-fill-surfaceElevatedHover"
          value={selectedEpoch}
          onChange={handleEpochSelect}
        >
          <option value="all">All Time</option>
          {epochs.map((ep) => (
            <option key={ep.timestamp} value={ep.timestamp}>
              {ep.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
        <SummaryCard label={<Trans>Loaded Count</Trans>} value={summary?.loadedCount ?? "..."} />
        <SummaryCard
          label={<Trans>Avg Points Ratio</Trans>}
          value={summary ? summary.avgPointsRatio.toFixed(4) : "..."}
          highlight={summary ? summary.avgPointsRatio > 1 : false}
        />
        <SummaryCard
          label={<Trans>Avg Rewards Ratio</Trans>}
          value={summary ? summary.avgRewardsRatio.toFixed(4) : "..."}
          highlight={summary ? summary.avgRewardsRatio > 1 : false}
        />
        <SummaryCard
          label={<Trans>Total Points</Trans>}
          value={summary ? formatAmount(summary.totalPoints, 18, 4, true) : "..."}
        />
        <SummaryCard
          label={<Trans>Total Rewards</Trans>}
          value={summary ? `${formatAmount(summary.totalRewards, 18, 4, true)} GMX` : "..."}
        />
      </div>

      <div className="rounded-8 bg-slate-900">
        {error && (
          <div className="flex items-center justify-center p-24 text-red-500">
            <Trans>Error loading audit data</Trans>
          </div>
        )}

        {shouldShowTable && (
          <>
            <TableScrollFadeContainer>
              <Table className="min-w-[1200px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                <thead>
                  <TableTheadTr>
                    <TableTh padding="compact">
                      <Trans>Account</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("points")}>
                        <Trans>Points</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("rewards")}>
                        <Trans>Rewards</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("fees")}>
                        <Trans>Fees</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("volume")}>
                        <Trans>Volume</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Avg Mult.</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Max Mult.</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Vol. Tier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Stk. Tier</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Trans>Boosts</Trans>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("effectivePointsRatio")}>
                        <Trans>Eff. Pts Ratio</Trans>
                      </Sorter>
                    </TableTh>
                    <TableTh padding="compact">
                      <Sorter {...getSorterProps("effectiveRewardsRatio")}>
                        <Trans>Eff. Rwd Ratio</Trans>
                      </Sorter>
                    </TableTh>
                  </TableTheadTr>
                </thead>
                <tbody>
                  {isInitialLoading ? (
                    <TableListSkeleton count={PAGE_SIZE} Structure={IncentivesAuditSkeletonRow} />
                  ) : (
                    data?.map((entry) => (
                      <TableTr key={entry.id} hoverable onClick={() => onAccountClick(entry.account)}>
                        <TableTd padding="compact">
                          <AddressView size={20} address={entry.account} breakpoint="XL" noLink />
                        </TableTd>
                        <TableTd padding="compact">{formatAmount(entry.points, 18, 4, true)}</TableTd>
                        <TableTd padding="compact">{formatAmount(entry.rewards, 18, 4, true)}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.fees, { displayDecimals: 2 })}</TableTd>
                        <TableTd padding="compact">{formatUsd(entry.volume, { displayDecimals: 0 })}</TableTd>
                        <TableTd padding="compact">{formatMultiplier(entry.avgMultiplier)}</TableTd>
                        <TableTd padding="compact">{formatMultiplier(entry.maxMultiplier)}</TableTd>
                        <TableTd padding="compact">
                          {entry.volumeTier ? getVolumeTierBadge(entry.volumeTier) : "-"}
                        </TableTd>
                        <TableTd padding="compact">
                          {entry.stakingTier ? getStakingTierBadge(entry.stakingTier) : "-"}
                        </TableTd>
                        <TableTd padding="compact">
                          {entry.boostIds.length > 0 ? entry.boostIds.map(getBoostLabel).join(", ") : "-"}
                        </TableTd>
                        <TableTd padding="compact">{entry.effectivePointsRatio.toFixed(4)}</TableTd>
                        <TableTd padding="compact">{entry.effectiveRewardsRatio.toFixed(4)}</TableTd>
                      </TableTr>
                    ))
                  )}
                  {data && data.length < PAGE_SIZE && (
                    <TableListSkeleton
                      invisible
                      count={PAGE_SIZE - data.length}
                      Structure={IncentivesAuditSkeletonRow}
                    />
                  )}
                </tbody>
              </Table>
            </TableScrollFadeContainer>
            <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </>
        )}

        {data && data.length === 0 && !loading && (
          <div className="flex items-center justify-center p-24 text-typography-secondary">
            <Trans>No audit entries found for this epoch.</Trans>
          </div>
        )}
      </div>
    </div>
  );
}
