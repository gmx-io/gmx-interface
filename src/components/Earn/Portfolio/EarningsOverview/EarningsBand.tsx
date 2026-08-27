import { Trans } from "@lingui/macro";

import { StakingProcessedData } from "lib/legacy";
import { formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ClaimRewardsButton } from "../ClaimRewardsButton";
import { EarningsStat, UsdStatValue } from "./EarningsStat";
import { LifetimeEarningsBreakdown, LifetimeEarningsTooltipContent } from "./LifetimeEarningsTooltip";
import { EarningsOrigin, OriginChip, OriginChips } from "./OriginChips";

const MOBILE_ROW_CLASS_NAME = "max-md:flex-row max-md:items-center max-md:justify-between";

export type InvestmentValueBreakdown = {
  stakedGmxUsd: bigint;
  stakedEsGmxUsd: bigint;
  gmUsd: bigint;
  glvUsd: bigint;
  totalUsd: bigint;
};

function TotalValue({ breakdown, isLoading }: { breakdown: InvestmentValueBreakdown | undefined; isLoading: boolean }) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} />;

  if (!breakdown) {
    return valueElement;
  }

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>Staked GMX:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatUsd(breakdown.stakedGmxUsd)}</span>}
          />
          <StatsTooltipRow
            label={<Trans>Staked esGMX:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatUsd(breakdown.stakedEsGmxUsd)}</span>}
          />
          <StatsTooltipRow
            label={<Trans>GM:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatUsd(breakdown.gmUsd)}</span>}
          />
          <StatsTooltipRow
            label={<Trans>GLV:</Trans>}
            showDollar={false}
            value={<span className="numbers">{formatUsd(breakdown.glvUsd)}</span>}
          />
        </div>
      }
    />
  );
}

function LifetimeEarnedValue({
  breakdown,
  isLoading,
  nativeTokenSymbol,
  isLpUnavailable,
}: {
  breakdown: LifetimeEarningsBreakdown | undefined;
  isLoading: boolean;
  nativeTokenSymbol: string;
  isLpUnavailable: boolean;
}) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} />;

  if (!breakdown) {
    return valueElement;
  }

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <LifetimeEarningsTooltipContent
          breakdown={breakdown}
          nativeTokenSymbol={nativeTokenSymbol}
          isLpUnavailable={isLpUnavailable}
        />
      }
    />
  );
}

function PendingClaimableValue({
  processedData,
  nativeTokenSymbol,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
}) {
  const isLoading = processedData === undefined;

  const valueElement = (
    <UsdStatValue usd={processedData?.totalRewardsUsd ?? (isLoading ? undefined : 0n)} isLoading={isLoading} />
  );

  if (isLoading) {
    return valueElement;
  }

  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;
  const hasEsGmxRewards = (processedData?.totalEsGmxRewards ?? 0n) > 0n;

  return (
    <TooltipWithPortal
      handle={valueElement}
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>GMX staked rewards:</Trans>}
            showDollar={false}
            value={
              <AmountWithUsdBalance
                amount={processedData?.extendedGmxTrackerRewards ?? 0n}
                decimals={18}
                usd={processedData?.extendedGmxTrackerRewardsUsd ?? 0n}
                symbol="GMX"
              />
            }
          />
          <StatsTooltipRow
            label={<Trans>Vested claimable GMX:</Trans>}
            showDollar={false}
            value={
              <AmountWithUsdBalance
                amount={processedData?.totalVesterRewards ?? 0n}
                decimals={18}
                usd={processedData?.totalVesterRewardsUsd ?? 0n}
                symbol="GMX"
              />
            }
          />
          {hasEsGmxRewards && (
            <StatsTooltipRow
              label={<Trans>esGMX rewards:</Trans>}
              showDollar={false}
              value={
                <AmountWithUsdBalance
                  amount={processedData?.totalEsGmxRewards ?? 0n}
                  decimals={18}
                  usd={processedData?.totalEsGmxRewardsUsd ?? 0n}
                  symbol="esGMX"
                />
              }
            />
          )}
          {hasNativeRewards && (
            <StatsTooltipRow
              label={<Trans>{nativeTokenSymbol} rewards:</Trans>}
              showDollar={false}
              value={
                <AmountWithUsdBalance
                  amount={processedData?.totalNativeTokenRewards ?? 0n}
                  decimals={18}
                  usd={processedData?.totalNativeTokenRewardsUsd ?? 0n}
                  symbol={nativeTokenSymbol}
                />
              }
            />
          )}
        </div>
      }
    />
  );
}

export function EarningsBand({
  lifetimeBreakdown,
  isEarningsLoading,
  isLpUnavailable,
  investmentBreakdown,
  isInvestmentValueLoading,
  processedData,
  mutateProcessedData,
  nativeTokenSymbol,
  connectedOrigins,
}: {
  lifetimeBreakdown: LifetimeEarningsBreakdown | undefined;
  isEarningsLoading: boolean;
  isLpUnavailable: boolean;
  investmentBreakdown: InvestmentValueBreakdown | undefined;
  isInvestmentValueLoading: boolean;
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
  nativeTokenSymbol: string;
  connectedOrigins: EarningsOrigin[];
}) {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <div className="flex items-center justify-between gap-8">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>Summary</Trans>
        </h3>
        <OriginChips origins={connectedOrigins} />
      </div>

      <div className="flex items-end gap-x-40 gap-y-12 max-md:flex-col max-md:items-stretch">
        <EarningsStat
          className={`max-md:order-1 ${MOBILE_ROW_CLASS_NAME}`}
          label={
            <>
              <Trans>Total value</Trans>
              <OriginChip>
                <Trans>All chains</Trans>
              </OriginChip>
            </>
          }
        >
          <TotalValue breakdown={investmentBreakdown} isLoading={isInvestmentValueLoading} />
        </EarningsStat>

        <EarningsStat
          className={`max-md:order-3 ${MOBILE_ROW_CLASS_NAME}`}
          label={<Trans>Total lifetime earned</Trans>}
        >
          <LifetimeEarnedValue
            breakdown={lifetimeBreakdown}
            isLoading={isEarningsLoading}
            nativeTokenSymbol={nativeTokenSymbol}
            isLpUnavailable={isLpUnavailable}
          />
        </EarningsStat>

        <EarningsStat
          className={`max-md:order-2 ${MOBILE_ROW_CLASS_NAME}`}
          label={<Trans>Total pending claimable</Trans>}
        >
          <PendingClaimableValue processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
        </EarningsStat>

        <ClaimRewardsButton
          className="ml-auto shrink-0 max-md:order-2 max-md:ml-0"
          processedData={processedData}
          mutateProcessedData={mutateProcessedData}
        />
      </div>
    </div>
  );
}
