import { Trans } from "@lingui/macro";
import { format } from "date-fns";
import { ReactNode, useCallback } from "react";
import { useCopyToClipboard } from "react-use";

import {
  formatMultiplier,
  getBoostLabel,
  getStakingTierBadge,
  getVolumeTierBadge,
} from "domain/synthetics/incentives/constants";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/useAccountIncentiveStatus";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/useIncentiveAccountEpochAudit";
import { formatAmount, formatUsd } from "lib/numbers";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

type EpochOption = { timestamp: number; label: string };

export function IncentivesAuditDetail({
  chainId,
  account,
  selectedEpoch,
  epochs,
  onEpochChange,
  onBack,
}: {
  chainId: number;
  account: string;
  selectedEpoch: number | undefined;
  epochs: EpochOption[];
  onEpochChange: (epoch: number | undefined) => void;
  onBack: () => void;
}) {
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopy = useCallback(() => {
    copyToClipboard(account);
  }, [copyToClipboard, account]);

  const handleEpochSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onEpochChange(val === "" ? undefined : Number(val));
    },
    [onEpochChange]
  );

  // Audit data
  const {
    data: auditData,
    error: auditError,
    loading: auditLoading,
  } = useIncentiveAccountEpochAudit(chainId, {
    epochTimestamp: selectedEpoch,
    account,
    limit: 100,
  });

  // Live status
  const { data: status, loading: statusLoading } = useAccountIncentiveStatus(chainId, { account });

  // Dashboard
  const { data: dashboard, loading: dashboardLoading } = useAccountIncentiveDashboard(chainId, { account });

  return (
    <div className="flex flex-col gap-24">
      {/* Header */}
      <Section>
        <div className="flex flex-col gap-8">
          <button className="text-body-medium self-start text-blue-300 hover:underline" onClick={onBack}>
            &larr; <Trans>Back to list</Trans>
          </button>
          <div className="flex items-center gap-8">
            <span className="text-h2 break-all font-mono">{account}</span>
            <button
              className="text-caption rounded-4 border border-gray-700 px-8 py-4 hover:bg-slate-700"
              onClick={handleCopy}
            >
              <Trans>Copy</Trans>
            </button>
          </div>
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
        </div>
      </Section>

      {/* Audit Data */}
      <Section title={<Trans>Audit Data</Trans>}>
        {auditError && (
          <div className="text-body-medium text-red-500">
            <Trans>Error loading audit data</Trans>
          </div>
        )}
        {auditLoading && (
          <div className="text-body-medium text-typography-secondary">
            <Trans>Loading...</Trans>
          </div>
        )}
        {auditData && auditData.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
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
                    <TableTd padding="compact">{format(new Date(entry.epochTimestamp * 1000), "MMM d, yyyy")}</TableTd>
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
          </div>
        )}
        {auditData && auditData.length === 0 && !auditLoading && (
          <div className="text-body-medium text-typography-secondary">
            <Trans>No audit entries found for this account.</Trans>
          </div>
        )}
      </Section>

      {/* Live Status */}
      <Section title={<Trans>Live Status</Trans>}>
        {statusLoading && (
          <div className="text-body-medium text-typography-secondary">
            <Trans>Loading...</Trans>
          </div>
        )}
        {status && (
          <div className="grid grid-cols-2 gap-x-24 gap-y-8 md:grid-cols-3">
            <KV label={<Trans>Multiplier</Trans>} value={formatMultiplier(status.multiplier)} />
            <KV
              label={<Trans>Volume Tier</Trans>}
              value={status.volumeTier ? getVolumeTierBadge(status.volumeTier) : "-"}
            />
            <KV
              label={<Trans>Projected Volume Tier</Trans>}
              value={status.projectedVolumeTier ? getVolumeTierBadge(status.projectedVolumeTier) : "-"}
            />
            <KV
              label={<Trans>Staking Tier</Trans>}
              value={status.stakingTier ? getStakingTierBadge(status.stakingTier) : "-"}
            />
            <KV
              label={<Trans>Projected Staking Tier</Trans>}
              value={status.projectedStakingTier ? getStakingTierBadge(status.projectedStakingTier) : "-"}
            />
            <KV label={<Trans>Points Balance</Trans>} value={formatAmount(status.pointsBalance, 18, 4, true)} />
            <KV
              label={<Trans>Traded Volume</Trans>}
              value={formatUsd(status.tradedVolume, { displayDecimals: 0 }) ?? "0"}
            />
            <KV label={<Trans>Epoch</Trans>} value={format(new Date(status.epochTimestamp * 1000), "MMM d, yyyy")} />
          </div>
        )}
      </Section>

      {/* Dashboard */}
      <Section title={<Trans>Dashboard</Trans>}>
        {dashboardLoading && (
          <div className="text-body-medium text-typography-secondary">
            <Trans>Loading...</Trans>
          </div>
        )}
        {dashboard && (
          <div className="flex flex-col gap-16">
            <div className="grid grid-cols-2 gap-x-24 gap-y-8">
              <KV label={<Trans>Points Balance</Trans>} value={formatAmount(dashboard.pointsBalance, 18, 4, true)} />
              <KV label={<Trans>Rewards Balance</Trans>} value={formatAmount(dashboard.rewardsBalance, 18, 4, true)} />
            </div>

            {dashboard.recentStats.length > 0 && (
              <div className="overflow-x-auto">
                <div className="text-body-medium mb-8 font-medium">
                  <Trans>Recent Epoch Stats</Trans>
                </div>
                <Table>
                  <thead>
                    <TableTheadTr>
                      <TableTh padding="compact">
                        <Trans>Epoch</Trans>
                      </TableTh>
                      <TableTh padding="compact">
                        <Trans>Multiplier</Trans>
                      </TableTh>
                      <TableTh padding="compact">
                        <Trans>Vol. Tier</Trans>
                      </TableTh>
                      <TableTh padding="compact">
                        <Trans>Stk. Tier</Trans>
                      </TableTh>
                      <TableTh padding="compact">
                        <Trans>Traded Volume</Trans>
                      </TableTh>
                      <TableTh padding="compact">
                        <Trans>Boosts</Trans>
                      </TableTh>
                    </TableTheadTr>
                  </thead>
                  <tbody>
                    {dashboard.recentStats.map((stat) => (
                      <TableTr key={stat.epochTimestamp}>
                        <TableTd padding="compact">
                          {format(new Date(stat.epochTimestamp * 1000), "MMM d, yyyy")}
                        </TableTd>
                        <TableTd padding="compact">{formatMultiplier(stat.multiplier)}</TableTd>
                        <TableTd padding="compact">
                          {stat.volumeTier ? getVolumeTierBadge(stat.volumeTier) : "-"}
                        </TableTd>
                        <TableTd padding="compact">
                          {stat.stakingTier ? getStakingTierBadge(stat.stakingTier) : "-"}
                        </TableTd>
                        <TableTd padding="compact">{formatUsd(stat.tradedVolume, { displayDecimals: 0 })}</TableTd>
                        <TableTd padding="compact">
                          {stat.boostIds.length > 0 ? stat.boostIds.map(getBoostLabel).join(", ") : "-"}
                        </TableTd>
                      </TableTr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      {title && <h3 className="text-h2">{title}</h3>}
      {children}
    </div>
  );
}

function KV({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="text-body-medium mt-2 font-mono">{value}</div>
    </div>
  );
}
