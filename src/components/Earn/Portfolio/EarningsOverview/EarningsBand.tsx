import { Trans } from "@lingui/macro";

import { StakingProcessedData } from "lib/legacy";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import type { EarningAttributionScope } from "components/EarningValue/EarningValue";
import { NumericValue } from "components/NumericValue/NumericValue";
import StandardTooltip from "components/Tooltip/StandardTooltip";
import { TooltipContent, TooltipFootnote, TooltipRow, TooltipRows } from "components/Tooltip/TooltipBlocks";

import { ClaimRewardsButton } from "../ClaimRewardsButton";
import { EarningsStat, formatUsdExpandedParts, UsdStatValue } from "./EarningsStat";
import { LifetimeEarningsBreakdown, LifetimeEarningsTooltipContent } from "./LifetimeEarningsTooltip";

const MOBILE_ROW_CLASS_NAME = "max-md:flex-row max-md:items-center max-md:justify-between";

export type InvestmentValueBreakdown = {
  stakedGmxUsd: bigint;
  stakedEsGmxUsd: bigint;
  gmUsd: bigint;
  glvUsd: bigint;
  totalUsd: bigint;
};

function TotalValue({
  breakdown,
  isLoading,
  chainName,
}: {
  breakdown: InvestmentValueBreakdown | undefined;
  isLoading: boolean;
  chainName: string;
}) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} />;

  if (!breakdown) {
    return valueElement;
  }

  return (
    <StandardTooltip
      handle={valueElement}
      content={
        <TooltipContent>
          <TooltipRows>
            <TooltipRow
              label={<Trans>Staked GMX</Trans>}
              value={<NumericValue parts={formatUsdExpandedParts(breakdown.stakedGmxUsd)} className="numbers" />}
            />
            <TooltipRow
              label={<Trans>Staked esGMX</Trans>}
              value={<NumericValue parts={formatUsdExpandedParts(breakdown.stakedEsGmxUsd)} className="numbers" />}
            />
            <TooltipRow
              label={<Trans>GM</Trans>}
              value={<NumericValue parts={formatUsdExpandedParts(breakdown.gmUsd)} className="numbers" />}
            />
            <TooltipRow
              label={<Trans>GLV</Trans>}
              value={<NumericValue parts={formatUsdExpandedParts(breakdown.glvUsd)} className="numbers" />}
            />
          </TooltipRows>
          <TooltipFootnote>
            <Trans>
              Staked GMX and esGMX are counted on {chainName} only. GM and GLV are counted across your wallet, GMX
              Account and source chains.
            </Trans>
          </TooltipFootnote>
        </TooltipContent>
      }
    />
  );
}

function LifetimeEarnedValue({
  breakdown,
  isLoading,
  nativeTokenSymbol,
  isLpUnavailable,
  lpAttributionScope,
}: {
  breakdown: LifetimeEarningsBreakdown | undefined;
  isLoading: boolean;
  nativeTokenSymbol: string;
  isLpUnavailable: boolean;
  lpAttributionScope: EarningAttributionScope | undefined;
}) {
  const valueElement = <UsdStatValue usd={breakdown?.totalUsd} isLoading={isLoading} />;

  if (!breakdown) {
    return valueElement;
  }

  return (
    <StandardTooltip
      handle={valueElement}
      content={
        <LifetimeEarningsTooltipContent
          breakdown={breakdown}
          nativeTokenSymbol={nativeTokenSymbol}
          isLpUnavailable={isLpUnavailable}
          lpAttributionScope={lpAttributionScope}
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
    <StandardTooltip
      handle={valueElement}
      content={
        <TooltipRows>
          <TooltipRow
            label={<Trans>GMX staked rewards</Trans>}
            value={
              <AmountWithUsdBalance
                amount={processedData?.extendedGmxTrackerRewards ?? 0n}
                decimals={18}
                usd={processedData?.extendedGmxTrackerRewardsUsd ?? 0n}
                symbol="GMX"
              />
            }
          />
          <TooltipRow
            label={<Trans>Vested claimable GMX</Trans>}
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
            <TooltipRow
              label={<Trans>esGMX rewards</Trans>}
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
            <TooltipRow
              label={<Trans>{nativeTokenSymbol} rewards</Trans>}
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
        </TooltipRows>
      }
    />
  );
}

export function EarningsBand({
  lifetimeBreakdown,
  isEarningsLoading,
  isLpUnavailable,
  lpAttributionScope,
  investmentBreakdown,
  isInvestmentValueLoading,
  processedData,
  mutateProcessedData,
  nativeTokenSymbol,
  chainName,
}: {
  lifetimeBreakdown: LifetimeEarningsBreakdown | undefined;
  isEarningsLoading: boolean;
  isLpUnavailable: boolean;
  lpAttributionScope: EarningAttributionScope | undefined;
  investmentBreakdown: InvestmentValueBreakdown | undefined;
  isInvestmentValueLoading: boolean;
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
  nativeTokenSymbol: string;
  chainName: string;
}) {
  return (
    <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
      <h3 className="text-body-large font-medium text-typography-primary">
        <Trans>Summary</Trans>
      </h3>

      <div className="flex items-end gap-x-40 gap-y-12 max-md:flex-col max-md:items-stretch">
        <EarningsStat
          className={`max-md:order-1 ${MOBILE_ROW_CLASS_NAME}`}
          label={<Trans>Total portfolio value</Trans>}
        >
          <TotalValue breakdown={investmentBreakdown} isLoading={isInvestmentValueLoading} chainName={chainName} />
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
            lpAttributionScope={lpAttributionScope}
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
