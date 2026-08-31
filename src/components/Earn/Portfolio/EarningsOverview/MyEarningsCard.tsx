import { Trans } from "@lingui/macro";

import { StakingProcessedData } from "lib/legacy";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ClaimRewardsButton } from "../ClaimRewardsButton";
import { EarningsStat, Last7dStatValue, UsdStatValue } from "./EarningsStat";

const MOBILE_ROW_CLASS_NAME = "max-md:flex-row max-md:items-center max-md:justify-between";

function PendingClaimableValue({
  processedData,
  nativeTokenSymbol,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
}) {
  const isLoading = processedData === undefined;

  const valueElement = <UsdStatValue usd={processedData?.totalRewardsUsd ?? (isLoading ? undefined : 0n)} isLoading={isLoading} />;

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

export function MyEarningsCard({
  totalLifetimeUsd,
  last7dUsd,
  isEarningsLoading,
  investmentValueUsd,
  isInvestmentValueLoading,
  processedData,
  mutateProcessedData,
  nativeTokenSymbol,
}: {
  totalLifetimeUsd: bigint | undefined;
  last7dUsd: bigint | undefined;
  isEarningsLoading: boolean;
  investmentValueUsd: bigint | undefined;
  isInvestmentValueLoading: boolean;
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
  nativeTokenSymbol: string;
}) {
  return (
    <div className="flex grow flex-col rounded-8 bg-slate-900">
      <div className="flex grow flex-col gap-12 p-20">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>My earnings</Trans>
        </h3>

        <div className="flex items-start justify-between gap-16 max-lg:flex-col">
          <div className="flex gap-28 max-md:w-full max-md:flex-col max-md:gap-12">
            <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total lifetime earned</Trans>}>
              <UsdStatValue usd={totalLifetimeUsd} isLoading={isEarningsLoading} />
            </EarningsStat>
            <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Last 7 days</Trans>}>
              <Last7dStatValue usd={last7dUsd} isLoading={isEarningsLoading} />
            </EarningsStat>
            <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total pending claimable</Trans>}>
              <PendingClaimableValue processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
            </EarningsStat>
          </div>

          <ClaimRewardsButton
            className="shrink-0 max-lg:w-full"
            processedData={processedData}
            mutateProcessedData={mutateProcessedData}
          />
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-col gap-12 p-20">
        <h3 className="text-body-large font-medium text-typography-primary">
          <Trans>Investment Value</Trans>
        </h3>
        <EarningsStat className={MOBILE_ROW_CLASS_NAME} label={<Trans>Total Investment Value</Trans>}>
          <UsdStatValue usd={investmentValueUsd} isLoading={isInvestmentValueLoading} />
        </EarningsStat>
      </div>
    </div>
  );
}
