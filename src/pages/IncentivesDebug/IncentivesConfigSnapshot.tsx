import { Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { format } from "date-fns";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type { IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import {
  formatEpochLabel,
  formatFactorPercentage,
  formatManualAllocationVolumeRange,
  formatMultiplier,
} from "domain/synthetics/incentives/v2/utils";
import { formatAmount, formatUsd } from "lib/numbers";

import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { SummaryCard } from "./SummaryCard";

function formatDuration(seconds: number) {
  if (seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;

  return `${seconds}s`;
}

function formatTimestamp(timestamp: number) {
  return `${format(new Date(timestamp * 1000), "MMM d, yyyy HH:mm:ss")} (${timestamp})`;
}

export function IncentivesConfigSnapshot({ config, endpoint }: { config: IncentivesConfig; endpoint?: string }) {
  const { i18n } = useLingui();

  return (
    <section className="rounded-8 bg-slate-900">
      <div className="border-b-1/2 border-slate-600 px-20 py-16">
        <h2 className="text-16 font-medium text-typography-primary">
          <Trans>Active V2 Configuration</Trans>
        </h2>
        <div className="text-caption mt-4 break-all font-mono text-typography-secondary">
          {endpoint ?? <Trans>No endpoint</Trans>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 p-16 md:grid-cols-4 xl:grid-cols-6">
        <SummaryCard
          label={<Trans>Current epoch</Trans>}
          value={formatEpochLabel(config.epochTimestamp, config.epochDuration, i18n.locale)}
          note={formatTimestamp(config.epochTimestamp)}
        />
        <SummaryCard label={<Trans>Epoch duration</Trans>} value={formatDuration(config.epochDuration)} />
        <SummaryCard
          label={<Trans>Maximum multiplier</Trans>}
          value={formatMultiplier(config.maxMultiplier, config.multiplierDecimals)}
        />
        <SummaryCard label={<Trans>Fee share</Trans>} value={formatFactorPercentage(config.feeShareFactor)} />
        <SummaryCard
          label={<Trans>Reward shares</Trans>}
          value={`esGMX ${formatFactorPercentage(config.esGmxShareFactor)} · GT ${formatFactorPercentage(config.gtShareFactor)}`}
        />
        <SummaryCard
          label={<Trans>Referral reward share</Trans>}
          value={formatFactorPercentage(config.referralRewardShareFactor)}
        />
      </div>

      <details className="border-t-1/2 border-slate-600 px-20 py-16">
        <summary className="cursor-pointer text-14 font-medium text-typography-primary">
          <Trans>Configuration details</Trans>
        </summary>

        <div className="mt-16 grid grid-cols-1 gap-16 xl:grid-cols-2">
          <ConfigTable
            title={<Trans>Volume tiers</Trans>}
            firstHeader={<Trans>Tier</Trans>}
            secondHeader={<Trans>Volume threshold</Trans>}
            thirdHeader={<Trans>Multiplier</Trans>}
          >
            {config.volumeTiers.map((tier) => (
              <TableTr key={tier.tier}>
                <TableTd padding="compact">{tier.tier}</TableTd>
                <TableTd padding="compact">{formatUsd(tier.threshold, { displayDecimals: 0 })}</TableTd>
                <TableTd padding="compact">{formatMultiplier(tier.multiplier, config.multiplierDecimals)}</TableTd>
              </TableTr>
            ))}
          </ConfigTable>

          <ConfigTable
            title={<Trans>Staking tiers</Trans>}
            firstHeader={<Trans>Tier</Trans>}
            secondHeader={<Trans>GMX threshold</Trans>}
            thirdHeader={<Trans>Multiplier</Trans>}
          >
            {config.stakingTiers.map((tier) => (
              <TableTr key={tier.tier}>
                <TableTd padding="compact">{tier.tier}</TableTd>
                <TableTd padding="compact">
                  {formatAmount(tier.threshold, ES_GMX_DECIMALS, 2, true, { trimTrailingZeros: true })} GMX
                </TableTd>
                <TableTd padding="compact">{formatMultiplier(tier.multiplier, config.multiplierDecimals)}</TableTd>
              </TableTr>
            ))}
          </ConfigTable>

          <ConfigTable
            title={<Trans>Boosts</Trans>}
            firstHeader={<Trans>Boost ID</Trans>}
            secondHeader={<Trans>Scope</Trans>}
            thirdHeader={<Trans>Multiplier</Trans>}
          >
            {config.boosts.map((boost) => (
              <TableTr key={boost.boost}>
                <TableTd padding="compact">{boost.boost}</TableTd>
                <TableTd padding="compact">
                  {boost.boost === "FeaturedMarkets" || boost.boost === "BalancingTrades" ? (
                    <Trans>Per qualifying trade</Trans>
                  ) : (
                    <Trans>Persistent</Trans>
                  )}
                </TableTd>
                <TableTd padding="compact">{formatMultiplier(boost.multiplier, config.multiplierDecimals)}</TableTd>
              </TableTr>
            ))}
          </ConfigTable>

          <ConfigTable
            title={<Trans>Manual allocation caps</Trans>}
            firstHeader={<Trans>Tier</Trans>}
            secondHeader={<Trans>Historical volume</Trans>}
            thirdHeader={<Trans>Reward cap</Trans>}
          >
            {config.manualAllocationTiers.map((tier, index) => (
              <TableTr key={`${tier.minVolume}:${tier.maxVolume ?? "max"}`}>
                <TableTd padding="compact">{index + 1}</TableTd>
                <TableTd padding="compact">{formatManualAllocationVolumeRange(tier.minVolume, tier.maxVolume)}</TableTd>
                <TableTd padding="compact">{formatUsd(tier.rewardCapUsd, { displayDecimals: 0 })}</TableTd>
              </TableTr>
            ))}
          </ConfigTable>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-24 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
          <ConfigValue label={<Trans>Program start</Trans>} value={formatTimestamp(config.programStartTimestamp)} />
          <ConfigValue
            label={<Trans>Configuration version start</Trans>}
            value={formatTimestamp(config.epochStartTimestamp)}
          />
          <ConfigValue
            label={<Trans>Volume tier persistence</Trans>}
            value={<Trans>{config.volumeTierPersistenceEpochs} epochs after qualification</Trans>}
          />
          <ConfigValue
            label={<Trans>Balancing trade threshold</Trans>}
            value={formatUsd(config.balancingTradesThreshold, { displayDecimals: 0 })}
          />
          <ConfigValue
            label={<Trans>Lifetime volume threshold</Trans>}
            value={formatUsd(config.lifetimeVolumeThreshold, { displayDecimals: 0 })}
          />
          <ConfigValue
            label={<Trans>Featured index tokens</Trans>}
            value={config.featuredMarketIndexTokens.length ? config.featuredMarketIndexTokens.join(", ") : "-"}
            mono
          />
          <ConfigValue
            label={<Trans>Downgrading coefficients</Trans>}
            value={
              config.downgradingCoefficients.length
                ? config.downgradingCoefficients
                    .map(
                      ({ market, coefficient }) =>
                        `${market}: ${formatMultiplier(coefficient, config.multiplierDecimals)}`
                    )
                    .join(", ")
                : "-"
            }
            mono
          />
        </div>
      </details>
    </section>
  );
}

function ConfigTable({
  title,
  firstHeader,
  secondHeader,
  thirdHeader,
  children,
}: {
  title: React.ReactNode;
  firstHeader: React.ReactNode;
  secondHeader: React.ReactNode;
  thirdHeader: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-8 border border-slate-600">
      <div className="border-b-1/2 border-slate-600 px-12 py-8 text-14 font-medium text-typography-primary">
        {title}
      </div>
      <TableScrollFadeContainer>
        <Table className="min-w-[420px]">
          <thead>
            <TableTheadTr>
              <TableTh padding="compact">{firstHeader}</TableTh>
              <TableTh padding="compact">{secondHeader}</TableTh>
              <TableTh padding="compact">{thirdHeader}</TableTh>
            </TableTheadTr>
          </thead>
          <tbody>{children}</tbody>
        </Table>
      </TableScrollFadeContainer>
    </div>
  );
}

function ConfigValue({ label, value, mono }: { label: React.ReactNode; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-caption text-typography-secondary">{label}</div>
      <div className={`mt-2 break-all text-13 text-typography-primary ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
