import { plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type HTMLProps, useCallback, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";

import { ES_GMX_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import type {
  AccountIncentiveStatus,
  BoostConfig,
  DowngradingCoefficient,
  IncentivesConfig,
} from "domain/synthetics/incentives/v2/types";
import { formatMultiplier, formatMultiplierAdjustment } from "domain/synthetics/incentives/v2/utils";
import { useMarkets } from "domain/synthetics/markets";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { formatAmount, formatAmountHuman, formatUsd, USD_DECIMALS } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { convertTokenAddress, getNormalizedTokenSymbol, getToken, isValidTokenSafe } from "sdk/configs/tokens";

import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import ExpiresInIcon from "img/ic_clock_dashed.svg?react";

import { BoostTierIcon, StakingTierIcon, VolumeTierIcon } from "./RewardsTierIcons";
import {
  type AccountDataState,
  boostLabels,
  stakingTierLabels,
  StatusLabel,
  volumeTierLabels,
} from "./rewardsTiersShared";

type TierTab = "volume" | "staking" | "boosts";

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

export function RewardsTierTables({
  chainId,
  config,
  status,
  statusState,
}: {
  chainId: number;
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusState: AccountDataState;
}) {
  const [activeTab, setActiveTab] = useState<TierTab>("volume");
  const [showMore, setShowMore] = useState(false);
  const handleToggleMore = useCallback(() => setShowMore((value) => !value), []);
  const hasDowngradingCoefficients = config.downgradingCoefficients.length > 0;
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
        short: t`Your Volume Tier is based on your tier-eligible trading volume and determines your rewards multiplier.`,
        long: t`Each epoch, eligible trading volume determines your Volume Tier. Once achieved, a tier remains active for the current epoch and ${config.volumeTierPersistenceEpochs} following epochs. Higher tiers increase the rewards allocated for eligible fees.`,
      },
      staking: {
        short: t`Your Staking Tier increases your rewards multiplier based on staked GMX and esGMX.`,
        long: t`The combined indexed GMX and esGMX balance determines the tier projected for the next epoch. A higher staked balance unlocks higher tiers and larger multiplier adjustments.`,
      },
      boosts: {
        short: t`Activity Boosts are multiplier adjustments earned through qualifying activity.`,
        long: t`Your reward multiplier combines your Volume Tier, Staking Tier, and applicable Activity Boosts. The total multiplier is capped at ${formatMultiplier(config.maxMultiplier, config.multiplierDecimals)}.`,
      },
    }),
    [config.maxMultiplier, config.multiplierDecimals, config.volumeTierPersistenceEpochs]
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
              {activeTab === "volume" && hasDowngradingCoefficients ? (
                <div className="mt-8 inline-flex items-center gap-4">
                  <Trans>Trading volume on configured markets is counted with a reduced coefficient</Trans>
                  <DowngradingCoefficientsTooltip
                    chainId={chainId}
                    config={config}
                    coefficients={config.downgradingCoefficients}
                  />
                </div>
              ) : null}
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

        <div className="overflow-x-auto px-12 pb-8">
          {activeTab === "volume" ? (
            <VolumeTiersTable config={config} status={status} statusState={statusState} />
          ) : activeTab === "staking" ? (
            <StakingTiersTable config={config} status={status} statusState={statusState} />
          ) : (
            <BoostsTable chainId={chainId} config={config} status={status} statusState={statusState} />
          )}
        </div>
      </div>
    </div>
  );
}

function VolumeTiersTable({
  config,
  status,
  statusState,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusState: AccountDataState;
}) {
  const now = useCurrentUnixTimestamp(60_000);
  const daysRemaining = Math.max(Math.ceil((config.epochTimestamp + config.epochDuration - now) / 86_400), 0);
  const currentTierIndex = config.volumeTiers.findIndex((tier) => tier.tier === status?.volumeTier);
  const projectedTierIndex = status?.projectedVolumeTier
    ? config.volumeTiers.findIndex((tier) => tier.tier === status.projectedVolumeTier)
    : -1;
  const isDowngrading =
    (currentTierIndex >= 0 && projectedTierIndex >= 0 && projectedTierIndex < currentTierIndex) ||
    Boolean(status?.volumeTier && status.projectedVolumeTier === null);

  return (
    <table className={cx(tierLevelTableClassName, "min-w-[680px]")}>
      <thead>
        <TableTheadTr>
          <TableTh width="40%" padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh width="25%" padding="compact">
            <Trans>Volume</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh width="160px" padding="compact">
            <Trans>Status</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {statusState === "loading" ? (
          <TableListSkeleton count={5} Structure={TierLevelsSkeletonRow} />
        ) : (
          config.volumeTiers.map((tier) => {
            const active = status?.volumeTier === tier.tier;
            const projected = status?.projectedVolumeTier === tier.tier;

            return (
              <TierLevelTableTr key={tier.tier}>
                <TableTd padding="compact">
                  <span className="flex items-center gap-8 font-medium">
                    <div className="p-1">
                      <VolumeTierIcon tierId={tier.tier} active={active} />
                    </div>
                    <span className="text-typography-primary">{volumeTierLabels[tier.tier]}</span>
                    {active ? <span className="font-medium text-green-500">✓</span> : null}
                  </span>
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatVolumeTierThreshold(tier.threshold)}
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatMultiplierAdjustment(tier.multiplier, config.multiplierDecimals)}
                </TableTd>
                <TableTd padding="compact">
                  {active && isDowngrading && daysRemaining > 0 ? (
                    <ExpiresInLabel daysRemaining={daysRemaining} />
                  ) : (
                    <StatusLabel state={statusState} active={active} projected={projected} />
                  )}
                </TableTd>
              </TierLevelTableTr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function StakingTiersTable({
  config,
  status,
  statusState,
}: {
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusState: AccountDataState;
}) {
  return (
    <table className={cx(tierLevelTableClassName, "min-w-[680px]")}>
      <thead>
        <TableTheadTr>
          <TableTh width="40%" padding="compact">
            <Trans>Tier Name</Trans>
          </TableTh>
          <TableTh width="25%" padding="compact">
            <Trans>GMX + esGMX staked</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Multiplier</Trans>
          </TableTh>
          <TableTh width="160px" padding="compact">
            <Trans>Status</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {statusState === "loading" ? (
          <TableListSkeleton count={5} Structure={TierLevelsSkeletonRow} />
        ) : (
          config.stakingTiers.map((tier) => {
            const active = status?.stakingTier === tier.tier;
            const projected = status?.projectedStakingTier === tier.tier;

            return (
              <TierLevelTableTr key={tier.tier}>
                <TableTd padding="compact">
                  <span className="flex items-center gap-8">
                    <div className="p-1">
                      <StakingTierIcon tierId={tier.tier} active={active} />
                    </div>
                    <span className="font-medium text-typography-primary">{stakingTierLabels[tier.tier]}</span>
                    {active ? <span className="font-medium text-green-500">✓</span> : null}
                  </span>
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatAmount(tier.threshold, ES_GMX_DECIMALS, 0, true)} GMX + esGMX
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatMultiplierAdjustment(tier.multiplier, config.multiplierDecimals)}
                </TableTd>
                <TableTd padding="compact">
                  <StatusLabel state={statusState} active={active} projected={projected} />
                </TableTd>
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
  status,
  statusState,
}: {
  chainId: number;
  config: IncentivesConfig;
  status?: AccountIncentiveStatus;
  statusState: AccountDataState;
}) {
  const visibleBoosts = config.boosts.filter((boost) => boost.boost !== "ManualAllocation");

  return (
    <table className={cx(tierLevelTableClassName, "min-w-[820px]")}>
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
        {statusState === "loading" ? (
          <TableListSkeleton count={visibleBoosts.length} Structure={TierLevelsSkeletonRow} />
        ) : (
          visibleBoosts.map((boost) => {
            const transient = boost.boost === "FeaturedMarkets" || boost.boost === "BalancingTrades";
            const listed = Boolean(status?.boostIds.includes(boost.boost));

            return (
              <TierLevelTableTr key={boost.boost}>
                <TableTd padding="compact" className="text-typography-primary">
                  <span className="flex items-center gap-8 font-medium">
                    <div className="p-1">
                      <BoostTierIcon boostId={boost.boost} active={listed} />
                    </div>
                    {boostLabels[boost.boost]}
                  </span>
                </TableTd>
                <TableTd padding="compact" className="text-typography-secondary">
                  <BoostDescription chainId={chainId} boost={boost} config={config} />
                </TableTd>
                <TableTd padding="compact" className="text-typography-primary">
                  {formatMultiplierAdjustment(boost.multiplier, config.multiplierDecimals)}
                </TableTd>
                <TableTd padding="compact">
                  <StatusLabel
                    state={statusState}
                    active={!transient && listed}
                    qualified={transient ? listed : undefined}
                  />
                </TableTd>
              </TierLevelTableTr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function BoostDescription({
  chainId,
  boost,
  config,
}: {
  chainId: number;
  boost: BoostConfig;
  config: IncentivesConfig;
}) {
  if (boost.boost === "FeaturedMarkets") {
    return (
      <>
        <Trans>Applies to eligible trades in the configured featured markets.</Trans>{" "}
        {config.featuredMarketIndexTokens.length ? (
          <FeaturedMarketsTooltip chainId={chainId} indexTokenAddresses={config.featuredMarketIndexTokens} />
        ) : null}
      </>
    );
  }

  if (boost.boost === "BalancingTrades") {
    return (
      <Trans>
        Applies to qualifying balancing position increases of at least{" "}
        {formatUsd(config.balancingTradesThreshold, { displayDecimals: 0 })}.
      </Trans>
    );
  }

  if (boost.boost === "LifetimeTrading") {
    return (
      <Trans>
        Permanent after reaching {formatUsd(config.lifetimeVolumeThreshold, { displayDecimals: 0 })} in lifetime volume.
      </Trans>
    );
  }

  return null;
}

function FeaturedMarketsTooltip({ chainId, indexTokenAddresses }: { chainId: number; indexTokenAddresses: string[] }) {
  const items = indexTokenAddresses.map((address) => {
    if (!isValidTokenSafe(chainId, address)) return { address, symbol: undefined };

    const token = getToken(chainId, address);
    return { address, symbol: getNormalizedTokenSymbol(token.symbol) ?? token.symbol };
  });

  return (
    <TooltipWithPortal
      variant="iconStroke"
      handle={
        <span>
          <Trans>Featured markets:</Trans> {items.map((item) => item.symbol ?? item.address).join(", ")}.
        </span>
      }
      content={
        <div className="flex flex-col gap-8">
          {items.map(({ address, symbol }) => (
            <div key={address} className="flex items-center gap-4 text-12 font-medium text-typography-primary">
              {symbol ? <TokenIcon symbol={symbol} displaySize={16} /> : null}
              {symbol ?? address}
            </div>
          ))}
        </div>
      }
    />
  );
}

function DowngradingCoefficientsTooltip({
  chainId,
  config,
  coefficients,
}: {
  chainId: number;
  config: IncentivesConfig;
  coefficients: DowngradingCoefficient[];
}) {
  const { marketsData } = useMarkets(chainId);
  const items = useMemo(
    () =>
      coefficients.map(({ market: marketAddress, coefficient }) => {
        const market = marketsData?.[marketAddress];
        if (!market) return { marketAddress, coefficient, name: marketAddress, symbol: undefined };

        const indexTokenAddress = convertTokenAddress(chainId, market.indexTokenAddress, "native");
        if (!isValidTokenSafe(chainId, indexTokenAddress)) {
          return { marketAddress, coefficient, name: marketAddress, symbol: undefined };
        }

        const indexToken = getToken(chainId, indexTokenAddress);
        return {
          marketAddress,
          coefficient,
          symbol: getNormalizedTokenSymbol(indexToken.symbol),
          name: getMarketIndexName({ indexToken, isSpotOnly: market.isSpotOnly }),
        };
      }),
    [chainId, coefficients, marketsData]
  );

  return (
    <TooltipWithPortal
      variant="iconStroke"
      handle={null}
      tooltipClassName="!max-w-[280px]"
      className="h-16"
      position="bottom-start"
      content={
        <div>
          <p className="mb-8 text-12 font-normal text-typography-secondary">
            <Trans>Volume on the following pairs is weighted with a reduced coefficient:</Trans>
          </p>
          <div className="flex flex-col gap-8">
            {items.map(({ marketAddress, symbol, name, coefficient }) => (
              <div
                key={marketAddress}
                className="flex items-center justify-between gap-16 text-12 font-medium text-typography-primary"
              >
                <span className="flex items-center gap-4">
                  {symbol ? <TokenIcon symbol={symbol} displaySize={16} /> : null}
                  {name}
                </span>
                <span>{formatMultiplier(coefficient, config.multiplierDecimals)}</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
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
      <ExpiresInIcon className="size-14" />
      {plural(daysRemaining, { one: "Expires in # day", other: "Expires in # days" })}
    </span>
  );
}
