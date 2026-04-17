import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";

import {
  STAKING_TIER_BADGES,
  VOLUME_TIER_BADGES,
  BOOST_LABELS,
  formatMultiplier,
} from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";
import { useMarkets } from "domain/synthetics/markets";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { formatAmount } from "lib/numbers";
import { convertTokenAddress, getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";

import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { useCurrentUnixTimestamp, getCurrentEpochEndTime } from "./epochTiming";
import { getBoostDescription, getVolumeTierPersistenceEpochs } from "./incentivesText";
import { VolumeTierIcon, StakingTierIcon, BoostTierIcon } from "./tierIcons";

type TierTab = "volume" | "staking" | "boosts";

type Props = {
  chainId: number;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  effectiveVolumeTier?: VolumeTierId | null;
  effectiveStakingTier?: StakingTierId | null;
  projectedVolumeTier?: VolumeTierId | null;
};

export function TierLevelsSection({
  chainId,
  config,
  currentEpochStats,
  effectiveVolumeTier,
  effectiveStakingTier,
  projectedVolumeTier,
}: Props) {
  const [activeTab, setActiveTab] = useState<TierTab>("volume");
  const [showMore, setShowMore] = useState(false);
  const volumeTierPersistenceEpochs = getVolumeTierPersistenceEpochs(config);
  const hasDowngradingCoefficients =
    config?.downgradingCoefficients && Object.keys(config.downgradingCoefficients).length > 0;

  const handleToggleMore = useCallback(() => setShowMore((v) => !v), []);

  const tabOptions = useMemo(
    () => [
      { value: "volume" as const, label: <Trans>Volume Tiers</Trans> },
      { value: "staking" as const, label: <Trans>Staking Tiers</Trans> },
      { value: "boosts" as const, label: <Trans>Activity Boost</Trans> },
    ],
    []
  );

  const descriptions: Record<TierTab, { short: string; long: string }> = useMemo(
    () => ({
      volume: {
        short: t`Your Volume Tier is based on how much you trade and determines your points multiplier.`,
        long: t`Every week, your trading volume places you into a Volume Tier, which is active for ${volumeTierPersistenceEpochs} weeks. Higher tiers earn more points per dollar of trading fees paid. Volume tiers update automatically each week based on your activity. Trading more consistently helps you stay in higher tiers and earn rewards faster.`,
      },
      staking: {
        short: t`Your Staking Tier boosts your points earnings when you stake GMX.`,
        long: t`Staking GMX unlocks additional multipliers — the more GMX you stake, the higher your Staking Tier and points multiplier. Staked GMX must remain locked for a minimum period to keep the boost active.`,
      },
      boosts: {
        short: t`Boosts are multipliers earned through specific trading activity.`,
        long: t`Boosts apply to individual trades and reward specific behaviors, such as trading on new chains or selected markets. Multiple boosts can stack on a single trade, up to a maximum cap. Boosts do not last forever and only apply when the qualifying action is performed.`,
      },
    }),
    [volumeTierPersistenceEpochs]
  );

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
        regularOptionClassname="!px-0 text-16 !pb-14 lg:text-24 lg:!pb-18"
      />

      <div>
        <div className="p-20 pb-0 text-14 text-typography-secondary">
          <p className="font-medium text-typography-primary">{descriptions[activeTab].short}</p>
          {showMore && (
            <>
              <p className="mt-8">{descriptions[activeTab].long}</p>
              {activeTab === "volume" && hasDowngradingCoefficients && (
                <p className="mt-8">
                  <DowngradingCoefficientsTooltip chainId={chainId} coefficients={config!.downgradingCoefficients} />
                </p>
              )}
            </>
          )}
          <button className="mt-8 flex items-center gap-4 text-14 font-medium text-blue-300" onClick={handleToggleMore}>
            {showMore ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}
            <ChevronDownIcon className={showMore ? "h-16 w-16 rotate-180" : "h-16 w-16"} />
          </button>
        </div>

        <div className="mt-16 px-12 pb-12">
          {activeTab === "volume" && (
            <VolumeTiersTable
              config={config}
              currentTier={effectiveVolumeTier ?? currentEpochStats?.volumeTier}
              projectedTier={projectedVolumeTier}
            />
          )}
          {activeTab === "staking" && (
            <StakingTiersTable config={config} currentTier={effectiveStakingTier ?? currentEpochStats?.stakingTier} />
          )}
          {activeTab === "boosts" && <BoostsTable config={config} activeBoosts={currentEpochStats?.boostIds} />}
        </div>
      </div>
    </div>
  );
}

function VolumeTiersTable({
  config,
  currentTier,
  projectedTier,
}: {
  config?: IncentivesConfig;
  currentTier?: string | null;
  projectedTier?: VolumeTierId | null;
}) {
  const now = useCurrentUnixTimestamp(60_000);
  const epochEnd = getCurrentEpochEndTime(config, now);
  const daysRemaining = epochEnd > now ? Math.ceil((epochEnd - now) / 86400) : 0;

  const currentTierIndex = config?.volumeTiers.findIndex((t) => t.tier === currentTier) ?? -1;
  const projectedTierIndex = projectedTier ? config?.volumeTiers.findIndex((t) => t.tier === projectedTier) ?? -1 : -1;
  const isDowngrading =
    (currentTierIndex >= 0 && projectedTierIndex >= 0 && projectedTierIndex < currentTierIndex) ||
    (currentTier && projectedTier === null);

  return (
    <table className="w-full table-fixed">
      <thead>
        <TableTheadTr>
          <TableTh width="40%" padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh width="25%" padding="compact">
            <span className="inline-flex items-center gap-4">
              <Trans>Volume</Trans>
            </span>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh width="120px" padding="compact" />
        </TableTheadTr>
      </thead>
      <tbody>
        {config?.volumeTiers.map((tier) => {
          const isActive = currentTier === tier.tier;
          return (
            <TableTr key={tier.tier} className="overflow-hidden rounded-8">
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
                {formatMultiplier(tier.multiplier)}
              </TableTd>
              <TableTd padding="compact">
                {isActive && isDowngrading && daysRemaining > 0 && <ExpiresInLabel daysRemaining={daysRemaining} />}
              </TableTd>
            </TableTr>
          );
        })}
      </tbody>
    </table>
  );
}

function DowngradingCoefficientsTooltip({
  chainId,
  coefficients,
}: {
  chainId: number;
  coefficients: Record<string, bigint>;
}) {
  const { marketsData } = useMarkets(chainId);

  const items = useMemo(() => {
    return Object.entries(coefficients).map(([marketAddress, coefficient]) => {
      const market = marketsData?.[marketAddress];

      let symbol: string | undefined;
      let name = marketAddress;

      if (market) {
        const indexToken = getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
        symbol = getNormalizedTokenSymbol(indexToken.symbol);
        name = getMarketIndexName({ indexToken, isSpotOnly: market.isSpotOnly });
      }

      return { marketAddress, symbol, name, coefficient };
    });
  }, [chainId, coefficients, marketsData]);

  return (
    <TooltipWithPortal
      variant="iconStroke"
      handle={<Trans>Trading volume on RWA pairs is counted with a reduced coefficient</Trans>}
      content={
        <div>
          <p className="mb-8 text-12 text-typography-secondary">
            <Trans>Volume on the following pairs is weighted with a reduced coefficient:</Trans>
          </p>
          <div className="flex flex-col gap-4">
            {items.map(({ marketAddress, symbol, name, coefficient }) => (
              <div
                key={marketAddress}
                className="flex items-center justify-between gap-16 text-12 text-14 text-typography-primary"
              >
                <span className="flex items-center gap-4 font-medium">
                  {symbol && <TokenIcon symbol={symbol} displaySize={16} />}
                  {name}
                </span>
                <span>{Number(formatAmount(coefficient, 2, 2))}x</span>
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
    <table className="w-full table-fixed">
      <thead>
        <TableTheadTr>
          <TableTh width="40%" padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh width="25%" padding="compact">
            <Trans>GMX Staked</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh width="120px" padding="compact" />
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
                {formatMultiplier(tier.multiplier)}
              </TableTd>
              <TableTd padding="compact" />
            </TableTr>
          );
        })}
      </tbody>
    </table>
  );
}

function BoostsTable({ config, activeBoosts }: { config?: IncentivesConfig; activeBoosts?: string[] }) {
  return (
    <table className="w-full table-fixed">
      <thead>
        <TableTheadTr>
          <TableTh width="20%" padding="compact">
            <Trans>Boost Name</Trans>
          </TableTh>
          <TableTh width="40%" padding="compact">
            <Trans>About</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
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
              <TableTd padding="compact" className="text-typography-primary">
                {getBoostDescription(boost.boost, config)}
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

function ExpiresInLabel({ daysRemaining }: { daysRemaining: number }) {
  return (
    <span className="inline-flex items-center gap-4 whitespace-nowrap rounded-full bg-yellow-500/15 px-8 py-2 text-12 font-medium text-yellow-500">
      <svg className="size-14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 1.5" />
        <path
          d="M8 4.5V8L10.5 9.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Trans>
        Expires in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
      </Trans>
    </span>
  );
}
