import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { type HTMLProps, useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import {
  STAKING_TIER_BADGES,
  VOLUME_TIER_BADGES,
  BOOST_LABELS,
  formatMultiplier,
} from "domain/synthetics/incentives/constants";
import type { EpochStats, IncentivesConfig, StakingTierId, VolumeTierId } from "domain/synthetics/incentives/types";
import { useMarkets } from "domain/synthetics/markets";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { formatAmount, formatAmountHuman } from "lib/numbers";
import { convertTokenAddress, getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";

import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { useCurrentUnixTimestamp, getCurrentEpochEndTime } from "./epochTiming";
import { FeaturedMarketsTooltipContent } from "./FeaturedMarketsTooltipContent";
import { getBoostDescription, getVolumeTierPersistenceEpochs } from "./incentivesText";
import { VolumeTierIcon, StakingTierIcon, BoostTierIcon } from "./tierIcons";

type TierTab = "volume" | "staking" | "boosts";

type Props = {
  chainId: number;
  isLoading?: boolean;
  config?: IncentivesConfig;
  currentEpochStats?: EpochStats;
  effectiveVolumeTier?: VolumeTierId | null;
  effectiveStakingTier?: StakingTierId | null;
  projectedVolumeTier?: VolumeTierId | null;
};

const USD_DECIMALS = 30;

const tierLevelTableClassName =
  "w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-4 [&_td:first-child]:!pl-8 [&_th:first-child]:!pl-8";
const tierLevelRowClassName =
  "[&:nth-child(odd)>td]:bg-slate-800 [&>td]:!py-7 [&>td:first-child]:rounded-l-8 [&>td:last-child]:rounded-r-8";

function TierLevelTableTr({ className, ...props }: HTMLProps<HTMLTableRowElement>) {
  return <tr {...props} className={cx(tierLevelRowClassName, className)} />;
}

function formatVolumeTierThreshold(threshold: bigint) {
  return formatAmountHuman(threshold, USD_DECIMALS, true, 0).replace(/[kmb]$/i, (suffix) => suffix.toUpperCase());
}

export function TierLevelsSection({
  chainId,
  isLoading = false,
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
  const showTableLoading = isLoading || !config;

  const tabOptions = useMemo(
    () => [
      { value: "volume" as const, label: <Trans>Volume Tiers</Trans> },
      { value: "staking" as const, label: <Trans>Staking Tiers</Trans> },
      { value: "boosts" as const, label: <Trans>Activity Boosts</Trans> },
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
      <div className="flex p-20 pb-0">
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
        regularOptionClassname="!px-0 text-16 !pb-14 lg:text-24 lg:!pb-18 !pt-12 leading-[1.1]"
      />

      <div>
        <div className="max-w-[600px] p-20 pb-8 text-14 text-typography-secondary">
          <p className="font-medium text-typography-primary">{descriptions[activeTab].short}</p>
          <div
            className={cx(
              "grid transition-all duration-200 ease-out",
              showMore ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
            )}
            aria-hidden={!showMore}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="mt-8">{descriptions[activeTab].long}</p>
              {activeTab === "volume" && hasDowngradingCoefficients && (
                <p className="mt-8">
                  <DowngradingCoefficientsTooltip chainId={chainId} coefficients={config!.downgradingCoefficients} />
                </p>
              )}
            </div>
          </div>
          <button
            className="gmx-hover:text-blue-200 mt-4 inline-flex items-center gap-4 text-14 font-medium text-blue-300 transition-colors duration-200"
            onClick={handleToggleMore}
            aria-expanded={showMore}
            aria-label={showMore ? t`Show less` : t`Show more`}
          >
            <span aria-hidden="true" className="relative inline-grid w-max justify-items-start">
              <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
                {showMore ? <Trans>Show less</Trans> : <Trans>Show more</Trans>}
              </span>
              <span
                className={cx(
                  "absolute left-0 top-0 whitespace-nowrap transition-all duration-200",
                  showMore ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                )}
              >
                <Trans>Show more</Trans>
              </span>
              <span
                className={cx(
                  "absolute left-0 top-0 whitespace-nowrap transition-all duration-200",
                  showMore ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                )}
              >
                <Trans>Show less</Trans>
              </span>
            </span>
            <ChevronDownIcon
              className={cx("h-16 w-16 transition-transform duration-200", { "rotate-180": showMore })}
            />
          </button>
        </div>

        <div className="px-12 pb-8">
          {activeTab === "volume" && (
            <VolumeTiersTable
              config={config}
              isLoading={showTableLoading}
              currentTier={effectiveVolumeTier ?? currentEpochStats?.volumeTier}
              projectedTier={projectedVolumeTier}
            />
          )}
          {activeTab === "staking" && (
            <StakingTiersTable
              config={config}
              isLoading={showTableLoading}
              currentTier={effectiveStakingTier ?? currentEpochStats?.stakingTier}
            />
          )}
          {activeTab === "boosts" && (
            <BoostsTable
              chainId={chainId}
              config={config}
              isLoading={showTableLoading}
              activeBoosts={currentEpochStats?.boostIds}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function VolumeTiersTable({
  config,
  isLoading,
  currentTier,
  projectedTier,
}: {
  config?: IncentivesConfig;
  isLoading?: boolean;
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
    <table className={tierLevelTableClassName}>
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
        {isLoading ? (
          <TableListSkeleton count={5} Structure={TierLevelsSkeletonRow} />
        ) : (
          config?.volumeTiers.map((tier) => {
            const isActive = currentTier === tier.tier;
            return (
              <TierLevelTableTr key={tier.tier}>
                <TableTd padding="compact">
                  <span className="flex items-center gap-8 font-medium">
                    <div className="p-1">
                      <VolumeTierIcon tierId={tier.tier} active={isActive} />
                    </div>

                    <span className="text-typography-primary">{VOLUME_TIER_BADGES[tier.tier]()}</span>
                    {isActive && (
                      <span className="font-medium text-green-500">
                        <Trans>Active</Trans> ✓
                      </span>
                    )}
                  </span>
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatVolumeTierThreshold(tier.threshold)}
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatMultiplier(tier.multiplier)}
                </TableTd>
                <TableTd padding="compact">
                  {isActive && isDowngrading && daysRemaining > 0 && <ExpiresInLabel daysRemaining={daysRemaining} />}
                </TableTd>
              </TierLevelTableTr>
            );
          })
        )}
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
                className="flex items-center justify-between gap-16 text-12 text-typography-primary"
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

function StakingTiersTable({
  config,
  isLoading,
  currentTier,
}: {
  config?: IncentivesConfig;
  isLoading?: boolean;
  currentTier?: string | null;
}) {
  return (
    <table className={tierLevelTableClassName}>
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
        {isLoading ? (
          <TableListSkeleton count={5} Structure={TierLevelsSkeletonRow} />
        ) : (
          config?.stakingTiers.map((tier) => {
            const isActive = currentTier === tier.tier;
            return (
              <TierLevelTableTr key={tier.tier}>
                <TableTd padding="compact">
                  <span className="flex items-center gap-8">
                    <div className="p-1">
                      <StakingTierIcon tierId={tier.tier} active={isActive} />
                    </div>
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
              </TierLevelTableTr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function BoostsTable({
  chainId,
  config,
  isLoading,
  activeBoosts,
}: {
  chainId: number;
  config?: IncentivesConfig;
  isLoading?: boolean;
  activeBoosts?: string[];
}) {
  const featuredMarketTokens = config?.featuredMarketTokens ?? [];

  return (
    <table className={tierLevelTableClassName}>
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
        {isLoading ? (
          <TableListSkeleton count={3} Structure={TierLevelsSkeletonRow} />
        ) : (
          config?.boosts.map((boost) => {
            const isActive = activeBoosts?.includes(boost.boost);
            const description = getBoostDescription(boost.boost, config);
            const isFeaturedMarkets = boost.boost === "FeaturedMarkets" && featuredMarketTokens.length > 0;
            return (
              <TierLevelTableTr key={boost.boost}>
                <TableTd padding="compact" className="text-typography-primary">
                  <span className="flex items-center gap-8 font-medium">
                    <div className="p-1">
                      <BoostTierIcon boostId={boost.boost} active={!!isActive} />
                    </div>
                    {BOOST_LABELS[boost.boost]()}
                  </span>
                </TableTd>
                <TableTd padding="compact" className="text-typography-secondary">
                  <>
                    {description}{" "}
                    {isFeaturedMarkets && (
                      <TooltipWithPortal
                        variant="iconStroke"
                        handle={<Trans>Featured markets.</Trans>}
                        content={
                          <FeaturedMarketsTooltipContent
                            chainId={chainId}
                            featuredMarketTokens={featuredMarketTokens}
                          />
                        }
                      />
                    )}
                  </>
                </TableTd>
                <TableTd padding="compact" className="text-primary">
                  +{formatMultiplier(boost.multiplier)}
                </TableTd>
                <TableTd padding="compact">
                  <span className={isActive ? "text-green-500" : "text-typography-secondary"}>
                    {isActive ? <Trans>Active</Trans> : <Trans>Inactive</Trans>}
                  </span>
                </TableTd>
              </TierLevelTableTr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function TierLevelsSkeletonRow({ invisible }: { invisible?: boolean }) {
  return (
    <TierLevelTableTr className={invisible ? "[&>td]:!bg-transparent" : undefined}>
      <TableTd padding="compact">
        <div className="flex items-center gap-8">
          <Skeleton width={20} height={20} borderRadius={6} inline />
          <Skeleton width={120} inline />
        </div>
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={90} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={58} inline />
      </TableTd>
      <TableTd padding="compact">
        <Skeleton width={82} inline />
      </TableTd>
    </TierLevelTableTr>
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
