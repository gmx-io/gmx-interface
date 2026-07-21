import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { format } from "date-fns";
import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { isAddress } from "viem";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";
import { useIncentiveAccountEpochAudit } from "domain/synthetics/incentives/v2/useIncentiveAccountEpochAudit";
import { formatEpochLabel, formatMultiplier } from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatUsd } from "lib/numbers";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";

import Loader from "components/Loader/Loader";
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

const DETAIL_LIMIT = 1000;

export function IncentivesAuditDetail({
  chainId,
  account,
  config,
  onBack,
}: {
  chainId: number;
  account: string;
  config: IncentivesConfig;
  onBack: () => void;
}) {
  const { i18n } = useLingui();
  const [, copyToClipboard] = useCopyToClipboard();
  const isValidAccount = isAddress(account);

  const {
    data: auditData,
    totalCount,
    summary,
    error: auditError,
    loading: auditLoading,
  } = useIncentiveAccountEpochAudit(chainId, {
    where: { account },
    orderBy: "epochTimestamp_DESC",
    limit: DETAIL_LIMIT,
    enabled: isValidAccount,
  });
  const {
    data: status,
    error: statusError,
    loading: statusLoading,
  } = useAccountIncentiveStatus(chainId, { account, enabled: isValidAccount });

  const handleCopy = useCallback(() => copyToClipboard(account), [account, copyToClipboard]);
  const accountUrl = buildAccountDashboardUrl(account, chainId, 2);
  const hasStatusEpochMismatch = status && status.epochTimestamp !== config.epochTimestamp;
  const hasLoadedAudit = auditData !== undefined;

  return (
    <div className="flex flex-col gap-16">
      <div className="rounded-8 bg-slate-900 p-20">
        <button className="hover:text-blue-200 mb-12 text-14 text-blue-300" onClick={onBack}>
          &larr; <Trans>Back to account list</Trans>
        </button>
        <div className="flex flex-wrap items-center gap-12">
          <span className="break-all font-mono text-16 font-medium text-typography-primary">{account}</span>
          <button
            className="text-caption shrink-0 rounded-4 border border-slate-600 px-8 py-4 text-typography-secondary hover:border-slate-500 hover:text-typography-primary"
            onClick={handleCopy}
          >
            <Trans>Copy</Trans>
          </button>
          {isValidAccount ? (
            <Link
              to={accountUrl}
              className="hover:text-blue-200 text-caption shrink-0 rounded-4 border border-slate-600 px-8 py-4 text-blue-300 hover:border-blue-300"
            >
              <Trans>Account page</Trans> &rarr;
            </Link>
          ) : null}
        </div>
        {!isValidAccount ? (
          <div className="mt-12 text-14 text-red-500">
            <Trans>This is not a valid Ethereum address.</Trans>
          </div>
        ) : null}
      </div>

      {isValidAccount ? (
        <>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 xl:grid-cols-7">
            <SummaryCard label={<Trans>Epoch rows</Trans>} value={totalCount ?? "…"} />
            <SummaryCard
              label={<Trans>Eligible fees</Trans>}
              value={
                summary ? formatUsd(summary.totalFees, { displayDecimals: 2 }) : hasLoadedAudit ? formatUsd(0n) : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
            <SummaryCard
              label={<Trans>Trading volume</Trans>}
              value={
                summary
                  ? formatUsd(summary.totalTradingVolume, { displayDecimals: 0 })
                  : hasLoadedAudit
                    ? formatUsd(0n, { displayDecimals: 0 })
                    : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
            <SummaryCard
              label={<Trans>Referral volume</Trans>}
              value={
                summary
                  ? formatUsd(summary.totalReferralVolume, { displayDecimals: 0 })
                  : hasLoadedAudit
                    ? formatUsd(0n, { displayDecimals: 0 })
                    : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
            <SummaryCard
              label={<Trans>esGMX accrued</Trans>}
              value={
                summary
                  ? formatAmount(summary.totalEsGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })
                  : hasLoadedAudit
                    ? formatAmount(0n, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })
                    : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
            <SummaryCard
              label={<Trans>GT allocated</Trans>}
              value={
                summary
                  ? formatAmount(summary.totalGtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })
                  : hasLoadedAudit
                    ? formatAmount(0n, GT_DECIMALS, 4, true, { trimTrailingZeros: true })
                    : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
            <SummaryCard
              label={<Trans>Rewards USD</Trans>}
              value={
                summary
                  ? formatUsd(summary.totalRewardsUsd, { displayDecimals: 2 })
                  : hasLoadedAudit
                    ? formatUsd(0n)
                    : "…"
              }
              note={<Trans>Loaded history</Trans>}
            />
          </div>

          <Section title={<Trans>Current indexed account snapshot</Trans>}>
            {statusLoading && !status ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Loader />
              </div>
            ) : statusError && !status ? (
              <div className="p-20 text-center text-red-500">
                <Trans>Unable to load the current account snapshot.</Trans>
              </div>
            ) : status ? (
              <>
                {statusError ? (
                  <div className="border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
                    <Trans>The account snapshot could not be refreshed. Showing the latest loaded snapshot.</Trans>
                  </div>
                ) : null}
                {hasStatusEpochMismatch ? (
                  <div className="border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
                    <Trans>The account snapshot and active configuration refer to different epochs.</Trans>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-x-24 gap-y-16 p-20 md:grid-cols-4 xl:grid-cols-6">
                  <KV
                    label={<Trans>Persistent multiplier</Trans>}
                    value={formatMultiplier(status.multiplier, config.multiplierDecimals)}
                  />
                  <KV label={<Trans>Active volume tier</Trans>} value={formatVolumeTier(status.volumeTier)} />
                  <KV label={<Trans>Active staking tier</Trans>} value={formatStakingTier(status.stakingTier)} />
                  <KV
                    label={<Trans>Projected volume tier</Trans>}
                    value={formatVolumeTier(status.projectedVolumeTier)}
                  />
                  <KV
                    label={<Trans>Projected staking tier</Trans>}
                    value={formatStakingTier(status.projectedStakingTier)}
                  />
                  <KV label={<Trans>Tier volume</Trans>} value={formatUsd(status.tierVolume, { displayDecimals: 0 })} />
                  <KV
                    label={<Trans>Trading volume</Trans>}
                    value={formatUsd(status.tradingVolume, { displayDecimals: 0 })}
                  />
                  <KV
                    label={<Trans>Referral volume</Trans>}
                    value={formatUsd(status.referralVolume, { displayDecimals: 0 })}
                  />
                  <KV
                    label={<Trans>Staked GMX + esGMX</Trans>}
                    value={`${formatAmount(status.currentStakedBalance, ES_GMX_DECIMALS, 2, true, {
                      trimTrailingZeros: true,
                    })} GMX + esGMX`}
                  />
                  <KV
                    label={<Trans>Current esGMX</Trans>}
                    value={formatAmount(status.esGmxRewards, ES_GMX_DECIMALS, 4, true, {
                      trimTrailingZeros: true,
                    })}
                  />
                  <KV
                    label={<Trans>Current GT</Trans>}
                    value={formatAmount(status.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
                  />
                  <KV
                    label={<Trans>Current rewards USD</Trans>}
                    value={formatUsd(status.rewardsUsd, { displayDecimals: 2 })}
                  />
                  <KV label={<Trans>Boost IDs</Trans>} value={formatBoosts(status.boostIds)} />
                  <KV
                    label={<Trans>Snapshot epoch</Trans>}
                    value={`${formatEpochLabel(status.epochTimestamp, config.epochDuration, i18n.locale)} (${status.epochTimestamp})`}
                  />
                  {status.manualRewardCapUsd > 0n ? (
                    <>
                      <KV
                        label={<Trans>Indexed manual reward cap</Trans>}
                        value={formatUsd(status.manualRewardCapUsd, { displayDecimals: 2 })}
                      />
                      <KV
                        label={<Trans>Indexed manual reward consumed</Trans>}
                        value={formatUsd(status.manualRewardConsumedUsd, { displayDecimals: 2 })}
                      />
                      <KV
                        label={<Trans>Indexed manual reward remaining</Trans>}
                        value={formatUsd(status.manualRewardRemainingUsd, { displayDecimals: 2 })}
                      />
                    </>
                  ) : null}
                </div>
                <div className="text-caption border-t-1/2 border-slate-600 px-20 py-12 text-typography-secondary">
                  <Trans>
                    FeaturedMarkets and BalancingTrades indicate qualifying activity observed in this epoch;
                    LifetimeTrading and ManualAllocation are persistent boosts.
                  </Trans>
                </div>
              </>
            ) : (
              <div className="p-20 text-center text-typography-secondary">
                <Trans>No account snapshot was returned.</Trans>
              </div>
            )}
          </Section>

          <Section title={<Trans>Per-epoch diagnostic audit</Trans>}>
            {auditError && auditData !== undefined ? (
              <div className="border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
                <Trans>Audit history could not be refreshed. Showing the latest loaded history.</Trans>
              </div>
            ) : null}
            {auditError && auditData === undefined ? (
              <div className="p-24 text-center text-red-500">
                <Trans>Error loading audit history.</Trans>
              </div>
            ) : auditLoading && auditData === undefined ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader />
              </div>
            ) : auditData && auditData.length ? (
              <>
                {totalCount !== undefined && totalCount > DETAIL_LIMIT ? (
                  <div className="border-l-2 border-l-yellow-300 bg-yellow-300 bg-opacity-10 p-12 text-13 text-typography-secondary">
                    <Trans>
                      Showing the newest {DETAIL_LIMIT} of {totalCount} epochs.
                    </Trans>
                  </div>
                ) : null}
                <TableScrollFadeContainer ariaLabel="Incentives V2 account epoch audit">
                  <Table className="min-w-[1900px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <TableTheadTr>
                        <TableTh padding="compact">
                          <Trans>Epoch</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>Eligible fees</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>Trading volume</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>Tier volume</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>Referral volume</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>esGMX</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>GT</Trans>
                        </TableTh>
                        <TableTh padding="compact">
                          <Trans>Rewards USD</Trans>
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
                          <Trans>Effective trading reward rate</Trans>
                        </TableTh>
                      </TableTheadTr>
                    </thead>
                    <tbody>
                      {auditData.map((entry) => (
                        <TableTr key={entry.id}>
                          <TableTd padding="compact" title={String(entry.epochTimestamp)}>
                            {format(new Date(entry.epochTimestamp * 1000), "MMM d, yyyy HH:mm")}
                          </TableTd>
                          <TableTd padding="compact">{formatUsd(entry.fees, { displayDecimals: 2 })}</TableTd>
                          <TableTd padding="compact">{formatUsd(entry.tradingVolume, { displayDecimals: 0 })}</TableTd>
                          <TableTd padding="compact">{formatUsd(entry.tierVolume, { displayDecimals: 0 })}</TableTd>
                          <TableTd padding="compact">{formatUsd(entry.referralVolume, { displayDecimals: 0 })}</TableTd>
                          <TableTd padding="compact">
                            {formatAmount(entry.esGmxRewards, ES_GMX_DECIMALS, 4, true, {
                              trimTrailingZeros: true,
                            })}
                          </TableTd>
                          <TableTd padding="compact">
                            {formatAmount(entry.gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })}
                          </TableTd>
                          <TableTd padding="compact">{formatUsd(entry.rewardsUsd, { displayDecimals: 2 })}</TableTd>
                          <TableTd padding="compact">
                            {formatUsd(entry.manualRewardsUsd, { displayDecimals: 2 })}
                          </TableTd>
                          <TableTd padding="compact">
                            {formatAuditMultiplier(entry.avgMultiplier, config.multiplierDecimals)}
                          </TableTd>
                          <TableTd padding="compact">
                            {formatAuditMultiplier(entry.maxMultiplier, config.multiplierDecimals)}
                          </TableTd>
                          <TableTd padding="compact">{formatVolumeTier(entry.volumeTier)}</TableTd>
                          <TableTd padding="compact">{formatStakingTier(entry.stakingTier)}</TableTd>
                          <TableTd padding="compact">{formatBoosts(entry.boostIds)}</TableTd>
                          <TableTd padding="compact">
                            {formatEffectiveRewardsRatio(entry.effectiveRewardsRatio)}
                          </TableTd>
                        </TableTr>
                      ))}
                    </tbody>
                  </Table>
                </TableScrollFadeContainer>
              </>
            ) : (
              <div className="p-24 text-center text-typography-secondary">
                <Trans>No audit entries found for this account.</Trans>
              </div>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 px-20 py-16">
        <h2 className="text-16 font-medium text-typography-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className="mt-2 break-words text-14 font-medium text-typography-primary">{value}</div>
    </div>
  );
}
