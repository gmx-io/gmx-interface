import { Trans } from "@lingui/macro";
import { format } from "date-fns";
import { ReactNode, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";
import { formatAmount, formatUsd } from "lib/numbers";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Loader from "components/Loader/Loader";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

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

  const {
    data: auditData,
    error: auditError,
    loading: auditLoading,
  } = useIncentiveAccountEpochAudit(chainId, {
    account,
    limit: 1000,
  });

  const { data: status, loading: statusLoading } = useAccountIncentiveStatus(chainId, { account });
  const { data: dashboard } = useAccountIncentiveDashboard(chainId, { account });
  const { data: rewardsHistory } = useAccountRewardsHistory(chainId, { account });

  const totals = useMemo(() => {
    const totalPointsEarned = rewardsHistory?.length
      ? rewardsHistory.reduce((sum, e) => sum + e.pointsEarned, 0n)
      : undefined;
    const totalRewardsEarned = rewardsHistory?.length
      ? rewardsHistory.reduce((sum, e) => sum + e.rewardsEarned, 0n)
      : undefined;
    const totalFees = auditData?.length ? auditData.reduce((sum, e) => sum + e.fees, 0n) : undefined;
    const totalVolume = auditData?.length ? auditData.reduce((sum, e) => sum + e.volume, 0n) : undefined;

    return { totalPointsEarned, totalRewardsEarned, totalFees, totalVolume };
  }, [rewardsHistory, auditData]);

  const accountUrl = buildAccountDashboardUrl(account, chainId, 2);

  return (
    <div className="mt-16 flex flex-col gap-16">
      {/* Header */}
      <div className="rounded-8 bg-slate-900 p-20">
        <button className="hover:text-blue-200 text-body-medium mb-12 text-blue-300" onClick={onBack}>
          &larr; <Trans>Back to list</Trans>
        </button>
        <div className="flex items-center gap-12">
          <span className="break-all font-mono text-[1.6rem] font-medium text-typography-primary">{account}</span>
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

      {/* Totals Cards */}
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

      {/* Current Epoch Status */}
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
              label={<Trans>Rewards Balance</Trans>}
              value={dashboard ? `${formatAmount(dashboard.rewardsBalance, 18, 4, true)} GMX` : "..."}
            />
          </div>
        )}
      </Section>

      {/* Audit Data */}
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
        {auditData && auditData.length > 0 && (
          <TableScrollFadeContainer>
            <Table className="min-w-[1400px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead>
                <TableTheadTr>
                  <TableTh padding="compact">
                    <Trans>Epoch</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Points</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Rewards</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Fees</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Volume</Trans>
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
                    <Trans>Eff. Pts Ratio</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Eff. Rwd Ratio</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Pt. Records</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Rwd. Records</Trans>
                  </TableTh>
                  <TableTh padding="compact">
                    <Trans>Last Received</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {auditData.map((entry) => (
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
                    <TableTd padding="compact">{entry.pointRecordsCount}</TableTd>
                    <TableTd padding="compact">{entry.rewardRecordsCount}</TableTd>
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

function SummaryCard({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="rounded-8 bg-slate-900 p-16">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="text-body-large mt-4 font-medium text-typography-primary">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      {title && (
        <div className="border-b-1/2 border-slate-600 px-20 py-16">
          <h3 className="text-body-large font-medium text-typography-primary">{title}</h3>
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
      <div className="text-body-medium mt-2 font-medium text-typography-primary">{value}</div>
    </div>
  );
}
