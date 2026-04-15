import { Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";
import { formatAmount, formatUsd } from "lib/numbers";

import { BottomTablePagination } from "components/Pagination/BottomTablePagination";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

const PAGE_SIZE = 20;

type AuditSortField =
  | "points"
  | "rewards"
  | "fees"
  | "volume"
  | "avgMultiplier"
  | "maxMultiplier"
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
  selectedEpoch: number | undefined;
  epochs: EpochOption[];
  onEpochChange: (epoch: number | undefined) => void;
  onAccountClick: (account: string) => void;
}) {
  const [page, setPage] = useState(0);

  const { orderBy, direction, getSorterProps } = useSorterHandlers<AuditSortField>("incentives-audit-list", {
    orderBy: "effectiveRewardsRatio",
    direction: "desc",
  });

  const sortField = direction === "unspecified" ? "effectiveRewardsRatio" : orderBy;
  const sortDirection = direction === "unspecified" ? "desc" : direction;

  const { data, summary, error, loading } = useIncentiveAccountEpochAudit(chainId, {
    epochTimestamp: selectedEpoch,
    orderBy: sortField,
    orderDirection: sortDirection,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const hasNextPage = data ? data.length === PAGE_SIZE : false;
  const pageCount = page + 1 + (hasNextPage ? 1 : 0);

  const handleEpochSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onEpochChange(val === "" ? undefined : Number(val));
      setPage(0);
    },
    [onEpochChange]
  );

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-16">
      {/* Epoch Selector */}
      <div className="flex items-center gap-8">
        <label className="text-body-medium text-typography-secondary">
          <Trans>Epoch:</Trans>
        </label>
        <select
          className="text-body-medium rounded-4 border border-gray-700 bg-slate-800 px-12 py-6"
          value={selectedEpoch ?? ""}
          onChange={handleEpochSelect}
        >
          <option value="">All Epochs</option>
          {epochs.map((ep) => (
            <option key={ep.timestamp} value={ep.timestamp}>
              {ep.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <SummaryCard label={<Trans>Loaded Count</Trans>} value={summary?.loadedCount ?? "-"} />
        <SummaryCard
          label={<Trans>Avg Points Ratio</Trans>}
          value={summary ? summary.avgPointsRatio.toFixed(4) : "-"}
        />
        <SummaryCard
          label={<Trans>Avg Rewards Ratio</Trans>}
          value={summary ? summary.avgRewardsRatio.toFixed(4) : "-"}
        />
        <SummaryCard
          label={<Trans>Total Rewards</Trans>}
          value={summary ? formatAmount(summary.totalRewards, 18, 4, true) : "-"}
        />
      </div>

      {/* Error / Loading State */}
      {error && (
        <div className="text-body-medium text-red-500">
          <Trans>Error loading audit data</Trans>
        </div>
      )}
      {loading && (
        <div className="text-body-medium text-typography-secondary">
          <Trans>Loading...</Trans>
        </div>
      )}

      {/* Data Table */}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
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
                  <Sorter {...getSorterProps("avgMultiplier")}>
                    <Trans>Avg Mult.</Trans>
                  </Sorter>
                </TableTh>
                <TableTh padding="compact">
                  <Sorter {...getSorterProps("maxMultiplier")}>
                    <Trans>Max Mult.</Trans>
                  </Sorter>
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
                    <Trans>Eff. Points Ratio</Trans>
                  </Sorter>
                </TableTh>
                <TableTh padding="compact">
                  <Sorter {...getSorterProps("effectiveRewardsRatio")}>
                    <Trans>Eff. Rewards Ratio</Trans>
                  </Sorter>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <TableTr key={entry.id} hoverable>
                  <TableTd padding="compact">
                    <button className="text-blue-300 hover:underline" onClick={() => onAccountClick(entry.account)}>
                      {truncateAddress(entry.account)}
                    </button>
                  </TableTd>
                  <TableTd padding="compact">{formatAmount(entry.points, 18, 4, true)}</TableTd>
                  <TableTd padding="compact">{formatAmount(entry.rewards, 18, 4, true)}</TableTd>
                  <TableTd padding="compact">{formatUsd(entry.fees, { displayDecimals: 2 })}</TableTd>
                  <TableTd padding="compact">{formatUsd(entry.volume, { displayDecimals: 0 })}</TableTd>
                  <TableTd padding="compact">{formatMultiplier(entry.avgMultiplier)}</TableTd>
                  <TableTd padding="compact">{formatMultiplier(entry.maxMultiplier)}</TableTd>
                  <TableTd padding="compact">{entry.volumeTier ? getVolumeTierBadge(entry.volumeTier) : "-"}</TableTd>
                  <TableTd padding="compact">
                    {entry.stakingTier ? getStakingTierBadge(entry.stakingTier) : "-"}
                  </TableTd>
                  <TableTd padding="compact">
                    {entry.boostIds.length > 0 ? entry.boostIds.map(getBoostLabel).join(", ") : "-"}
                  </TableTd>
                  <TableTd padding="compact">{entry.effectivePointsRatio.toFixed(4)}</TableTd>
                  <TableTd padding="compact">{entry.effectiveRewardsRatio.toFixed(4)}</TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
          <BottomTablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      {data && data.length === 0 && !loading && (
        <div className="text-body-medium text-typography-secondary">
          <Trans>No audit entries found for this epoch.</Trans>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="rounded-4 border border-gray-700 bg-slate-800 p-12">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="text-body-large mt-4 font-medium">{value}</div>
    </div>
  );
}
