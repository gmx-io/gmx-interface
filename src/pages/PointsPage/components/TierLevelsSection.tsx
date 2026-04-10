import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";

import {
  STAKING_TIER_BADGES,
  VOLUME_TIER_BADGES,
  BOOST_LABELS,
  BOOST_DESCRIPTIONS,
  formatMultiplier,
} from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, VolumeDowngradingCoefficient } from "domain/synthetics/incentives/types";
import { formatAmount } from "lib/numbers";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { VolumeTierIcon, StakingTierIcon, BoostTierIcon } from "./tierIcons";

type TierTab = "volume" | "staking" | "boosts";

type Props = {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
};

export function TierLevelsSection({ config, currentEpochStats }: Props) {
  const [activeTab, setActiveTab] = useState<TierTab>("volume");
  const [showMore, setShowMore] = useState(false);

  const handleToggleMore = useCallback(() => setShowMore((v) => !v), []);

  const tabOptions = useMemo(
    () => [
      { value: "volume" as const, label: <Trans>Volume Tiers</Trans> },
      { value: "staking" as const, label: <Trans>Staking Tiers</Trans> },
      { value: "boosts" as const, label: <Trans>Activity Boost</Trans> },
    ],
    []
  );

  const descriptions: Record<TierTab, { short: string; long: string }> = {
    volume: {
      short: t`Your Volume Tier is based on how much you trade and determines your points multiplier.`,
      long: t`Every week, your trading volume places you into a Volume Tier, which is active for 4 weeks. Higher tiers earn more points per dollar of trading fees paid. Volume tiers update automatically each week based on your activity. Trading more consistently helps you stay in higher tiers and earn rewards faster.`,
    },
    staking: {
      short: t`Your Staking Tier boosts your points earnings when you stake GMX.`,
      long: t`Staking GMX unlocks additional multipliers — the more GMX you stake, the higher your Staking Tier and points multiplier. Staked GMX must remain locked for a minimum period to keep the boost active.`,
    },
    boosts: {
      short: t`Boosts are multipliers earned through specific trading activity.`,
      long: t`Boosts apply to individual trades and reward specific behaviors, such as trading on new chains or selected markets. Multiple boosts can stack on a single trade, up to a maximum cap. Boosts do not last forever and only apply when the qualifying action is performed.`,
    },
  };

  return (
    <div className="overflow-hidden rounded-8 bg-slate-900">
      <div className="p-20 pb-0">
        <span className="text-caption text-typography-disabled">
          <Trans>Tiers</Trans>
        </span>
      </div>

      <Tabs<TierTab>
        type="block"
        options={tabOptions}
        selectedValue={activeTab}
        onChange={setActiveTab}
        className="px-20"
        tabsWrapperClassName="gap-16"
        regularOptionClassname="!px-0 text-24 !pb-18"
      />

      <div>
        <p className="text-body-small p-20 pb-0 text-typography-secondary">
          <span className="font-medium text-typography-primary">{descriptions[activeTab].short}</span>{" "}
          {showMore && <span>{descriptions[activeTab].long}</span>}{" "}
          <button className="text-body-small font-medium text-blue-300" onClick={handleToggleMore}>
            {showMore ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}
          </button>
        </p>

        <div className="mt-16">
          {activeTab === "volume" && <VolumeTiersTable config={config} currentTier={currentEpochStats?.volumeTier} />}
          {activeTab === "staking" && (
            <StakingTiersTable config={config} currentTier={currentEpochStats?.stakingTier} />
          )}
          {activeTab === "boosts" && <BoostsTable config={config} activeBoosts={currentEpochStats?.boostIds} />}
        </div>
      </div>
    </div>
  );
}

function VolumeTiersTable({ config, currentTier }: { config?: IncentivesConfig; currentTier?: string | null }) {
  const currentCoefficients = useCurrentDowngradingCoefficients(config);

  return (
    <table className="w-full">
      <thead>
        <TableTheadTr>
          <TableTh padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh padding="compact">
            <span className="inline-flex items-center gap-4">
              <Trans>Volume</Trans>
              {currentCoefficients && currentCoefficients.length > 0 && (
                <VolumeDowngradingCoefficientsTooltip coefficients={currentCoefficients} />
              )}
            </span>
          </TableTh>
          <TableTh padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {config?.volumeTiers.map((tier) => {
          const isActive = currentTier === tier.tier;
          return (
            <TableTr key={tier.tier}>
              <TableTd padding="compact">
                <span className="flex items-center gap-8 font-medium">
                  <VolumeTierIcon tierId={tier.tier} active={isActive} />
                  <span className="text-typography-primary">{VOLUME_TIER_BADGES[tier.tier]()}</span>
                  {isActive && (
                    <span className="font-medium text-green-500">
                      <Trans>Active</Trans> ✓
                    </span>
                  )}
                </span>
              </TableTd>
              <TableTd padding="compact" className="text-typography-primary">
                ${formatAmount(tier.threshold, 30, 0, true)}
              </TableTd>
              <TableTd padding="compact" className="text-typography-primary">
                +{formatMultiplier(tier.multiplier)}
              </TableTd>
            </TableTr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Returns the most recent (by epochTimestamp) set of downgrading coefficients,
 * falling back to the first entry when the current epoch is unknown.
 */
function useCurrentDowngradingCoefficients(config?: IncentivesConfig): VolumeDowngradingCoefficient[] | undefined {
  return useMemo(() => {
    const epochs = config?.volumeDowngradingCoefficients;
    if (!epochs || epochs.length === 0) return undefined;

    const currentEpochTs = config?.epochTimestamp ?? 0;

    // Pick the latest epoch whose timestamp is <= the current epoch timestamp.
    // If none qualifies (e.g. all are in the future), return the first entry.
    const sorted = [...epochs].sort((a, b) => b.epochTimestamp - a.epochTimestamp);
    const match = sorted.find((e) => e.epochTimestamp <= currentEpochTs) ?? sorted[sorted.length - 1];
    return match?.coefficients;
  }, [config]);
}

function VolumeDowngradingCoefficientsTooltip({ coefficients }: { coefficients: VolumeDowngradingCoefficient[] }) {
  return (
    <TooltipWithPortal
      handle={undefined}
      content={
        <div>
          <p className="mb-8 font-medium">
            <Trans>Volume Coefficients</Trans>
          </p>
          <p className="mb-8 text-14 text-typography-secondary">
            <Trans>
              Some markets have reduced volume coefficients. Volume on these markets is counted at a lower rate for tier
              calculations because they typically involve higher leverage and generate fewer fees.
            </Trans>
          </p>
          <div className="flex flex-col gap-4">
            {coefficients.map((c) => (
              <div key={c.market} className="flex items-center justify-between gap-16 text-14">
                <span className="text-typography-primary">{c.market}</span>
                <span className="text-typography-secondary">{c.coefficient}x</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function StakingTiersTable({ config, currentTier }: { config?: IncentivesConfig; currentTier?: string | null }) {
  return (
    <table className="w-full">
      <thead>
        <TableTheadTr>
          <TableTh padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh padding="compact">
            <Trans>GMX Staked</Trans>
          </TableTh>
          <TableTh padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {config?.stakingTiers.map((tier) => {
          const isActive = currentTier === tier.tier;
          return (
            <TableTr key={tier.tier}>
              <TableTd padding="compact">
                <span className="flex items-center gap-8">
                  <StakingTierIcon tierId={tier.tier} active={isActive} />
                  <span className="font-medium text-typography-primary">{STAKING_TIER_BADGES[tier.tier]()}</span>
                  {isActive && (
                    <span className="font-medium text-green-500">
                      <Trans>Active</Trans> ✓
                    </span>
                  )}
                </span>
              </TableTd>
              <TableTd padding="compact" className="text-typography-primary">
                {formatAmount(tier.threshold, 18, 0, true)} GMX
              </TableTd>
              <TableTd padding="compact" className="text-typography-primary">
                +{formatMultiplier(tier.multiplier)}
              </TableTd>
            </TableTr>
          );
        })}
      </tbody>
    </table>
  );
}

function BoostsTable({ config, activeBoosts }: { config?: IncentivesConfig; activeBoosts?: string[] }) {
  return (
    <table className="w-full">
      <thead>
        <TableTheadTr>
          <TableTh padding="compact">
            <Trans>Boost Name</Trans>
          </TableTh>
          <TableTh padding="compact" className="hidden sm:table-cell">
            <Trans>About</Trans>
          </TableTh>
          <TableTh padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh padding="compact">
            <Trans>Status</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {config?.boosts.map((boost) => {
          const isActive = activeBoosts?.includes(boost.boost);
          return (
            <TableTr key={boost.boost}>
              <TableTd padding="compact" className="text-typography-primary">
                <span className="flex items-center gap-8 font-medium">
                  <BoostTierIcon boostId={boost.boost} active={!!isActive} />
                  {BOOST_LABELS[boost.boost]()}
                </span>
              </TableTd>
              <TableTd padding="compact" className="hidden text-typography-primary sm:table-cell">
                {BOOST_DESCRIPTIONS[boost.boost]()}
              </TableTd>
              <TableTd padding="compact" className="text-primary">
                +{formatMultiplier(boost.multiplier)}
              </TableTd>
              <TableTd padding="compact">
                <span className={isActive ? "text-green-500" : "text-typography-secondary"}>
                  {isActive ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
                </span>
              </TableTd>
            </TableTr>
          );
        })}
      </tbody>
    </table>
  );
}
