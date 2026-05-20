import { Trans } from "@lingui/macro";
import { format } from "date-fns";
import { ReactNode, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import { getBoostLabel, getStakingTierBadge, getVolumeTierBadge } from "domain/synthetics/incentives/constants";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useAccountNetPositionFeesLast4Months } from "domain/synthetics/incentives/useAccountNetPositionFeesLast4Months";
import { useAccountTotalEarnedRewards } from "domain/synthetics/incentives/useAccountTotalEarnedRewards";
import { AuditEntry, useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";
import { formatMultiplier } from "domain/synthetics/incentives/utils";
import { formatAmount, formatUsd } from "lib/numbers";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Loader from "components/Loader/Loader";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SummaryCard } from "./SummaryCard";

type AuditDetailSortField =
  | "epoch"
  | "points"
  | "rewards"
  | "fees"
  | "volume"
  | "avgMultiplier"
  | "maxMultiplier"
  | "effectivePointsRatio"
  | "effectiveRewardsRatio"
  | "lastReceivedAt";

export function IncentivesAuditDetail({
  chainId,
  account,
  onBack,
}: {
  chainId: number;
  account: string;
  onBack: () => void;
}) {
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopy = useCallback(() => {
    copyToClipboard(account);
  }, [copyToClipboard, account]);

  // The Detail page loads up to 1000 rows for one account and sorts client-side, so
  // we don't pass a server `orderBy` here. The default (`fees_DESC`) is fine — the
  // useMemo below resorts on every direction change.
  const {
    data: auditData,
    error: auditError,
    loading: auditLoading,
  } = useIncentiveAccountEpochAudit(chainId, {
    where: { account },
    limit: 1000,
  });

  const { data: status, loading: statusLoading } = useAccountIncentiveStatus(chainId, { account });
  const { data: totalEarnedRewards, loading: totalEarnedRewardsLoading } = useAccountTotalEarnedRewards(chainId, {
    account,
  });
  const { data: netPositionFeesLast4Months, loading: netPositionFeesLoading } = useAccountNetPositionFeesLast4Months(
    chainId,
    { account }
  );

  const { orderBy, direction, getSorterProps } = useSorterHandlers<AuditDetailSortField>("incentives-audit-detail", {
    orderBy: "epoch",
    direction: "desc",
  });

  const sortedAuditData = useMemo(() => {
    if (!auditData) return undefined;

    const effectiveOrderBy: AuditDetailSortField =
      orderBy === "unspecified" || direction === "unspecified" ? "epoch" : orderBy;
    const effectiveDirection = orderBy === "unspecified" || direction === "unspecified" ? "desc" : direction;

    const getValue = (entry: AuditEntry, field: AuditDetailSortField): bigint | number => {
      switch (field) {
        case "epoch":
          return entry.epochTimestamp;
        case "points":
          return entry.points;
        case "rewards":
          return entry.rewards;
        case "fees":
          return entry.fees;
        case "volume":
          return entry.volume;
        case "avgMultiplier":
          return entry.avgMultiplier;
        case "maxMultiplier":
          return entry.maxMultiplier;
        case "effectivePointsRatio":
          return entry.effectivePointsRatio;
        case "effectiveRewardsRatio":
          return entry.effectiveRewardsRatio;
        case "lastReceivedAt":
          return entry.lastReceivedAt;
      }
    };

    return [...auditData].sort((a, b) => {
      const aVal = getValue(a, effectiveOrderBy);
      const bVal = getValue(b, effectiveOrderBy);
      if (aVal < bVal) return effectiveDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return effectiveDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [auditData, orderBy, direction]);

  const totals = useMemo(() => {
    const totalPointsEarned = auditData?.length ? auditData.reduce((sum, e) => sum + e.points, 0n) : undefined;
    const totalRewardsEarned = auditData?.length ? auditData.reduce((sum, e) => sum + e.rewards, 0n) : undefined;
    const totalFees = auditData?.length ? auditData.reduce((sum, e) => sum + e.fees, 0n) : undefined;
    const totalVolume = auditData?.length ? auditData.reduce((sum, e) => sum + e.volume, 0n) : undefined;

    return { totalPointsEarned, totalRewardsEarned, totalFees, totalVolume };
  }, [auditData]);

  const accountUrl = buildAccountDashboardUrl(account, chainId, 2);

  return (
    <div className="mt-16 flex flex-col gap-16">
      <div className="rounded-8 bg-slate-900 p-20">
        <button className="hover:text-blue-200 mb-12 text-14 text-blue-300" onClick={onBack}>
          &larr; <Trans>Back to list</Trans>
        </button>
        <div className="flex items-center gap-12">
          <span className="break-all font-mono text-16 font-medium text-typography-primary">{account}</span>
          <button
            className="text-caption shrink-0 rounded-4 border border-slate-600 px-8 py-4 text-typography-secondary hover:border-slate-500 hover:text-typography-primary"
            onClick={handleCopy}
          >
            <Trans>Copy</Trans>
          </button>
          <Link
            to={accountUrl}
            className="hover:text-blue-200 text-caption shrink-0 rounded-4 border border-slate-600 px-8 py-4 text-blue-300 hover:border-blue-300"
          >
            <Trans>Account Page</Trans> &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <SummaryCard
          label={<Trans>Total Points Earned</Trans>}
          value={totals.totalPointsEarned !== undefined ? formatAmount(totals.totalPointsEarned, 18, 4, true) : "..."}
        />
        <SummaryCard
          label={<Trans>Total Rewards Earned</Trans>}
          value={
            totals.totalRewardsEarned !== undefined
              ? `${formatAmount(totals.totalRewardsEarned, 18, 4, true)} GMX`
              : "..."
          }
        />
        <SummaryCard
          label={<Trans>Total Fees Paid</Trans>}
          value={totals.totalFees !== undefined ? formatUsd(totals.totalFees, { displayDecimals: 2 }) ?? "0" : "..."}
        />
        <SummaryCard
          label={<Trans>Total Volume</Trans>}
          value={
            totals.totalVolume !== undefined ? formatUsd(totals.totalVolume, { displayDecimals: 0 }) ?? "0" : "..."
          }
        />
      </div>

      <Section title={<Trans>Current Epoch Status</Trans>}>
        {statusLoading && !status && (
          <div className="flex items-center justify-center p-16">
            <Loader />
          </div>
        )}
        {!statusLoading && !status && (
          <div className="p-16 text-center text-typography-secondary">
            <Trans>No status data available</Trans>
          </div>
        )}
        {status && (
          <div className="grid grid-cols-2 gap-x-24 gap-y-12 p-20 md:grid-cols-4">
            <KV label={<Trans>Multiplier</Trans>} value={formatMultiplier(status.multiplier)} />
            <KV
              label={<Trans>Volume Tier</Trans>}
              value={status.volumeTier ? getVolumeTierBadge(status.volumeTier) : "-"}
            />
            <KV
              label={<Trans>Staking Tier</Trans>}
              value={status.stakingTier ? getStakingTierBadge(status.stakingTier) : "-"}
            />
            <KV
              label={<Trans>Traded Volume</Trans>}
              value={formatUsd(status.tradedVolume, { displayDecimals: 0 }) ?? "0"}
            />
            <KV
              label={<Trans>Projected Vol. Tier</Trans>}
              value={status.projectedVolumeTier ? getVolumeTierBadge(status.projectedVolumeTier) : "-"}
            />
            <KV
              label={<Trans>Projected Stk. Tier</Trans>}
              value={status.projectedStakingTier ? getStakingTierBadge(status.projectedStakingTier) : "-"}
            />
            <KV
              label={<Trans>Epoch</Trans>}
              value={format(new Date(status.epochTimestamp * 1000), "MMM d, yyyy HH:mm")}
            />
            <KV label={<Trans>Points Balance</Trans>} value={formatAmount(status.pointsBalance, 18, 4, true)} />
            <KV
              label={<Trans>Total Rewards Earned</Trans>}
              value={
                totalEarnedRewards !== undefined
                  ? `${formatAmount(totalEarnedRewards, 18, 4, true)} GMX`
                  : totalEarnedRewardsLoading
                    ? "..."
                    : "-"
              }
            />
            <KV
              label={<Trans>Net Position Fees (4mo)</Trans>}
              value={
                netPositionFeesLast4Months !== undefined
                  ? formatUsd(netPositionFeesLast4Months, { displayDecimals: 2 }) ?? "0"
                  : netPositionFeesLoading
                    ? "..."
                    : "-"
              }
            />
          </div>
        )}
      </Section>

      <Section title={<Trans>Audit Data</Trans>}>
        {auditError && (
          <div className="p-16 text-center text-red-500">
            <Trans>Error loading audit data</Trans>
          </div>
        )}
        {auditLoading && !auditData && (
          <div className="flex items-center justify-center p-24">
            <Loader />
          </div>
        )}
        {sortedAuditData && sortedAuditData.length > 0 && (
          <TableScrollFadeContainer>
            <Table className="min-w-[1400px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead>
                <TableTheadTr>
                  <TableTh padding="compact">
                    <Sorter {...getSorterProps("epoch")}>
                      <Trans>Epoch</Trans>
                    </Sorter>
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
                      <Trans>Eff. Pts Ratio</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh padding="compact">
                    <Sorter {...getSorterProps("effectiveRewardsRatio")}>
                      <Trans>Eff. Rwd Ratio</Trans>
                    </Sorter>
                  </TableTh>
                  <TableTh padding="compact">
                    <Sorter {...getSorterProps("lastReceivedAt")}>
                      <Trans>Last Received</Trans>
                    </Sorter>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {sortedAuditData.map((entry) => (
                  <TableTr key={entry.id}>
                    <TableTd padding="compact">
                      {format(new Date(entry.epochTimestamp * 1000), "MMM d, yyyy HH:mm")}
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
                    <TableTd padding="compact">
                      {entry.lastReceivedAt ? format(new Date(entry.lastReceivedAt * 1000), "MMM d, HH:mm") : "-"}
                    </TableTd>
                  </TableTr>
                ))}
              </tbody>
            </Table>
          </TableScrollFadeContainer>
        )}
        {auditData && auditData.length === 0 && !auditLoading && (
          <div className="p-16 text-center text-typography-secondary">
            <Trans>No audit entries found for this account.</Trans>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      {title && (
        <div className="border-b-1/2 border-slate-600 px-20 py-16">
          <h3 className="text-16 font-medium text-typography-primary">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function KV({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="mt-2 text-14 font-medium text-typography-primary">{value}</div>
    </div>
  );
}
