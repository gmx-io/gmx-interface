import { Trans, t } from "@lingui/macro";
import cx from "classnames";
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

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type TierTab = "volume" | "staking" | "boosts";

type Props = {
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
};

export function TierLevelsSection({ config, currentEpochStats }: Props) {
  const [activeTab, setActiveTab] = useState<TierTab>("volume");
  const [showMore, setShowMore] = useState(false);

  const handleToggleMore = useCallback(() => setShowMore((v) => !v), []);

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
    <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950">
      <div className="px-16 pt-12">
        <span className="text-caption font-semibold uppercase tracking-wider text-typography-secondary">
          <Trans>Tiers</Trans>
        </span>
      </div>

      <div className="flex gap-20 border-b-1/2 border-slate-600 px-16 pt-16">
        {(["volume", "staking", "boosts"] as TierTab[]).map((tab) => (
          <button
            key={tab}
            className={cx(
              "text-body-medium cursor-pointer border-b-2 pb-12 font-semibold transition-all",
              activeTab === tab
                ? "border-blue-300 text-typography-primary"
                : "border-transparent text-typography-secondary hover:text-typography-primary"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "volume" && <Trans>Volume Tiers</Trans>}
            {tab === "staking" && <Trans>Staking Tiers</Trans>}
            {tab === "boosts" && <Trans>Activity Boost</Trans>}
          </button>
        ))}
      </div>

      <div className="p-16">
        <p className="text-body-small text-typography-secondary">
          {descriptions[activeTab].short} {showMore && <span>{descriptions[activeTab].long}</span>}
        </p>
        <button
          className="text-body-small mt-4 font-medium text-blue-300 hover:text-blue-400"
          onClick={handleToggleMore}
        >
          {showMore ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}
        </button>

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
        <tr className="text-caption text-typography-secondary">
          <th className="pb-8 text-left font-medium">
            <Trans>Tier Name</Trans>
          </th>
          <th className="pb-8 text-left font-medium">
            <span className="inline-flex items-center gap-4">
              <Trans>Volume</Trans>
              {currentCoefficients && currentCoefficients.length > 0 && (
                <VolumeDowngradingCoefficientsTooltip coefficients={currentCoefficients} />
              )}
            </span>
          </th>
          <th className="pb-8 text-right font-medium">
            <Trans>Multiplier</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {config?.volumeTiers.map((tier) => {
          const isActive = currentTier === tier.tier;
          return (
            <tr key={tier.tier} className="border-t-1/2 border-slate-700">
              <td className="text-body-small py-10">
                <span className="flex items-center gap-8">
                  <span className="text-typography-primary">{VOLUME_TIER_BADGES[tier.tier]()}</span>
                  {isActive && (
                    <span className="text-caption font-medium text-green-500">
                      <Trans>Active</Trans> ✓
                    </span>
                  )}
                </span>
              </td>
              <td className="text-body-small py-10 text-typography-secondary">
                ${formatAmount(tier.threshold, 30, 0, true)}
              </td>
              <td className="text-body-small py-10 text-right text-blue-300">+{formatMultiplier(tier.multiplier)}</td>
            </tr>
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
          <p className="mb-8 font-semibold">
            <Trans>Volume Coefficients</Trans>
          </p>
          <p className="text-body-small mb-8 text-typography-secondary">
            <Trans>
              Some markets have reduced volume coefficients. Volume on these markets is counted at a lower rate for tier
              calculations because they typically involve higher leverage and generate fewer fees.
            </Trans>
          </p>
          <div className="flex flex-col gap-4">
            {coefficients.map((c) => (
              <div key={c.market} className="text-body-small flex items-center justify-between gap-16">
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
        <tr className="text-caption text-typography-secondary">
          <th className="pb-8 text-left font-medium">
            <Trans>Tier Name</Trans>
          </th>
          <th className="pb-8 text-left font-medium">
            <Trans>GMX Staked</Trans>
          </th>
          <th className="pb-8 text-right font-medium">
            <Trans>Multiplier</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {config?.stakingTiers.map((tier) => {
          const isActive = currentTier === tier.tier;
          return (
            <tr key={tier.tier} className="border-t-1/2 border-slate-700">
              <td className="text-body-small py-10">
                <span className="flex items-center gap-8">
                  <span className="text-typography-primary">{STAKING_TIER_BADGES[tier.tier]()}</span>
                  {isActive && (
                    <span className="text-caption font-medium text-green-500">
                      <Trans>Active</Trans> ✓
                    </span>
                  )}
                </span>
              </td>
              <td className="text-body-small py-10 text-typography-secondary">
                {formatAmount(tier.threshold, 18, 0, true)} GMX
              </td>
              <td className="text-body-small py-10 text-right text-blue-300">+{formatMultiplier(tier.multiplier)}</td>
            </tr>
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
        <tr className="text-caption text-typography-secondary">
          <th className="pb-8 text-left font-medium">
            <Trans>Boost Name</Trans>
          </th>
          <th className="hidden pb-8 text-left font-medium sm:table-cell">
            <Trans>About</Trans>
          </th>
          <th className="pb-8 text-left font-medium">
            <Trans>Multiplier</Trans>
          </th>
          <th className="pb-8 text-right font-medium">
            <Trans>Status</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {config?.boosts.map((boost) => {
          const isActive = activeBoosts?.includes(boost.boost);
          return (
            <tr key={boost.boost} className="border-t-1/2 border-slate-700">
              <td className="text-body-small py-10 text-typography-primary">{BOOST_LABELS[boost.boost]()}</td>
              <td className="text-body-small hidden py-10 text-typography-secondary sm:table-cell">
                {BOOST_DESCRIPTIONS[boost.boost]()}
              </td>
              <td className="text-body-small py-10 text-blue-300">+{formatMultiplier(boost.multiplier)}</td>
              <td className="text-body-small py-10 text-right">
                <span className={isActive ? "text-green-500" : "text-typography-secondary"}>
                  {isActive ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
