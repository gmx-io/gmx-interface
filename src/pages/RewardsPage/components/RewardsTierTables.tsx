import { plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { type HTMLProps, useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { Link } from "react-router-dom";

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
import { formatAmount, formatAmountHuman, USD_DECIMALS } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { sendRewardsNavigationEvent } from "lib/userAnalytics/rewardsEvents";
import { convertTokenAddress, getNormalizedTokenSymbol, getToken, isValidTokenSafe } from "sdk/configs/tokens";

import { TableListSkeleton } from "components/Skeleton/Skeleton";
import { TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import Tabs from "components/Tabs/Tabs";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ExpiresInIcon from "img/ic_clock_dashed.svg?react";
import InfoIconStroke from "img/ic_info_circle_stroke.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";

import { BoostTierIcon, ReferralBoostIcon, StakingTierIcon, VolumeTierIcon } from "./RewardsTierIcons";
import {
  type AccountDataState,
  boostLabels,
  stakingTierLabels,
  StatusLabel,
  volumeTierLabels,
} from "./rewardsTiersShared";

type TierTab = "volume" | "staking" | "boosts";

const tierLevelTableClassName =
  "w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-4 [&_td:first-child]:!pl-8 [&_td:last-child]:!text-left [&_th:first-child]:!pl-8 [&_th:last-child]:!text-left";
const tierLevelRowClassName =
  "[&:nth-child(odd)>td]:bg-slate-800/50 [&>td]:!py-7 [&>td:first-child]:rounded-l-8 [&>td:last-child]:rounded-r-8";

function TierLevelTableTr({ className, ...props }: HTMLProps<HTMLTableRowElement>) {
  return <tr {...props} className={cx(tierLevelRowClassName, className)} />;
}

function formatCompactUsd(threshold: bigint) {
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
  const tabOptions = useMemo(
    () => [
      { value: "volume" as const, label: <Trans>Volume Tiers</Trans> },
      { value: "staking" as const, label: <Trans>Staking Tiers</Trans> },
      { value: "boosts" as const, label: <Trans>Activity Boosts</Trans> },
    ],
    []
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
        <div className="max-w-[620px] p-20 pb-8 text-14 text-typography-secondary">
          {activeTab === "volume" ? (
            <div className="inline-flex items-center gap-4">
              <Trans>Your epoch trading volume sets your Volume Tier and determines your multiplier.</Trans>
              <VolumeTierDescriptionTooltip
                chainId={chainId}
                config={config}
                coefficients={config.downgradingCoefficients}
              />
            </div>
          ) : activeTab === "staking" ? (
            <p>
              <Trans>Your Staking Tier is based on staked GMX and determines your staking multiplier.</Trans>
            </p>
          ) : (
            <p>
              <Trans>
                Activity Boosts are multiplier adjustments earned and applied exclusively to qualifying activity.
              </Trans>
            </p>
          )}
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
                  {formatCompactUsd(tier.threshold)}
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
            <Trans>GMX staked</Trans>
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
                  {formatAmount(tier.threshold, ES_GMX_DECIMALS, 0, true)} GMX
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
  return (
    <table className={cx(tierLevelTableClassName, "min-w-[820px]")}>
      <thead>
        <TableTheadTr>
          <TableTh width="20%" padding="compact">
            <Trans>Boost Name</Trans>
          </TableTh>
          <TableTh width="45%" padding="compact">
            <Trans>About</Trans>
          </TableTh>
          <TableTh width="15%" padding="compact">
            <Trans>Boost</Trans>
          </TableTh>
          <TableTh width="160px" padding="compact">
            <Trans>Status</Trans>
          </TableTh>
        </TableTheadTr>
      </thead>
      <tbody>
        {statusState === "loading" ? (
          <TableListSkeleton count={config.boosts.length + 1} Structure={TierLevelsSkeletonRow} />
        ) : (
          <>
            {config.boosts.map((boost) => {
              const transient = boost.boost === "FeaturedMarkets" || boost.boost === "BalancingTrades";
              const manualAvailable =
                boost.boost !== "ManualAllocation" || (status?.manualRewardRemainingUsd ?? 0n) > 0n;
              const isListed = Boolean(status?.boostIds.includes(boost.boost));
              const isActivePersistent = !transient && isListed && manualAvailable;
              const isQualifiedThisEpoch = transient && isListed;
              const isHighlighted = isActivePersistent || isQualifiedThisEpoch;

              return (
                <TierLevelTableTr key={boost.boost}>
                  <TableTd padding="compact" className="text-typography-primary">
                    <span className="flex items-center gap-8 font-medium">
                      <div className="p-1">
                        <BoostTierIcon boostId={boost.boost} active={isHighlighted} />
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
                      active={isActivePersistent}
                      qualified={transient ? isQualifiedThisEpoch : undefined}
                    />
                  </TableTd>
                </TierLevelTableTr>
              );
            })}
            <TierLevelTableTr>
              <TableTd padding="compact" className="text-typography-primary">
                <span className="flex items-center gap-8 font-medium">
                  <div className="p-1">
                    <ReferralBoostIcon active={(status?.referralVolume ?? 0n) > 0n} />
                  </div>
                  <Trans>Referral Volume</Trans>
                </span>
              </TableTd>
              <TableTd padding="compact" className="text-typography-secondary">
                <Trans>Receive 50% of the rewards earned by every trader you invite.</Trans>
              </TableTd>
              <TableTd padding="compact" className="text-typography-primary">
                <Trans>50% of rewards</Trans>
              </TableTd>
              <TableTd padding="compact">
                <StatusLabel state={statusState} active={(status?.referralVolume ?? 0n) > 0n} />
              </TableTd>
            </TierLevelTableTr>
          </>
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
        <Trans>Applies to eligible trades in featured markets.</Trans>{" "}
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
        {formatCompactUsd(config.balancingTradesThreshold)}.
      </Trans>
    );
  }

  if (boost.boost === "LifetimeTrading") {
    return (
      <Trans>Permanent after reaching {formatCompactUsd(config.lifetimeVolumeThreshold)} in lifetime volume.</Trans>
    );
  }

  return <Trans>Available to eligible historical users until the incremental reward cap is consumed.</Trans>;
}

function FeaturedMarketsTooltip({ chainId, indexTokenAddresses }: { chainId: number; indexTokenAddresses: string[] }) {
  const { marketsData } = useMarkets(chainId);
  const items = useMemo(
    () =>
      indexTokenAddresses.map((address) => {
        if (!isValidTokenSafe(chainId, address)) {
          return { address, symbol: undefined, tradeSymbol: undefined, marketAddress: undefined, name: address };
        }

        const token = getToken(chainId, address);
        const market = Object.values(marketsData ?? {}).find(
          (candidate) => !candidate.isSpotOnly && candidate.indexTokenAddress === address
        );
        const symbol = getNormalizedTokenSymbol(token.symbol) ?? token.symbol;

        return {
          address,
          symbol,
          tradeSymbol: market ? token.symbol : undefined,
          marketAddress: market?.marketTokenAddress,
          name: market ? getMarketIndexName({ indexToken: token, isSpotOnly: false }) : symbol,
        };
      }),
    [chainId, indexTokenAddresses, marketsData]
  );

  return (
    <TooltipWithPortal
      variant="none"
      handle={
        <button type="button" className="inline-flex items-center gap-2 text-left">
          <span>
            <Trans>Featured markets:</Trans> {items.map((item) => item.symbol ?? item.address).join(", ")}.
          </span>
          <InfoIconStroke className="size-16 shrink-0" />
        </button>
      }
      content={
        <div className="flex flex-col gap-8">
          {items.map(({ address, symbol, tradeSymbol, marketAddress, name }) =>
            tradeSymbol ? (
              <Link
                key={address}
                to={`/trade/long?market=${tradeSymbol}`}
                onClick={() =>
                  sendRewardsNavigationEvent({
                    source: "FeaturedMarket",
                    marketAddress,
                    marketName: name,
                  })
                }
                className="flex items-center gap-8 text-12 font-medium text-typography-secondary !no-underline"
              >
                <TokenIcon symbol={symbol} displaySize={16} />
                <span className="text-typography-primary">{name}</span>
                <NewLinkIcon className="size-12 shrink-0" />
              </Link>
            ) : (
              <div key={address} className="flex items-center gap-4 text-12 font-medium text-typography-primary">
                {symbol ? <TokenIcon symbol={symbol} displaySize={16} /> : null}
                {name}
              </div>
            )
          )}
        </div>
      }
    />
  );
}

function VolumeTierDescriptionTooltip({
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
      variant="none"
      handle={
        <button type="button" aria-label={t`Volume Tier details`} className="flex size-16 items-center justify-center">
          <InfoIconStroke className="size-16" />
        </button>
      }
      tooltipClassName="!max-w-[280px]"
      className="h-16"
      position="bottom-start"
      content={
        <div className="flex flex-col gap-8 text-12 font-normal text-typography-secondary">
          <p>
            <Trans>
              A tier applies in the epoch it is achieved and for {config.volumeTierPersistenceEpochs} following epochs.
            </Trans>
          </p>
          <p>
            <Trans>Trading volume on configured markets is counted with a reduced coefficient.</Trans>
          </p>
          {items.length > 0 ? (
            <div className="flex flex-col gap-8">
              {items.map(({ marketAddress, symbol, name, coefficient }) => (
                <div
                  key={marketAddress}
                  className="flex items-center justify-between gap-16 font-medium text-typography-primary"
                >
                  <span className="flex items-center gap-4">
                    {symbol ? <TokenIcon symbol={symbol} displaySize={16} /> : null}
                    {name}
                  </span>
                  <span>{formatMultiplier(coefficient, config.multiplierDecimals)}</span>
                </div>
              ))}
            </div>
          ) : null}
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
