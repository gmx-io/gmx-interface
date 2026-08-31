import { Trans } from "@lingui/macro";
import { ReactNode } from "react";

import { StakingProcessedData } from "lib/legacy";
import { formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Badge from "components/Badge/Badge";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { EarningsStat, Last7dStatValue, UsdStatValue } from "./EarningsStat";
import { EarningsOrigin, OriginChips } from "./OriginChips";

function StakingRewardRow({
  label,
  usd,
  amount,
  symbol,
  isLoading,
}: {
  label: ReactNode;
  usd: bigint | undefined;
  amount: bigint | undefined;
  symbol: string;
  isLoading: boolean;
}) {
  const isZero = !isLoading && (usd ?? 0n) === 0n;

  const usdElement = (
    <UsdStatValue usd={isLoading ? undefined : (usd ?? 0n)} isLoading={isLoading} />
  );

  return (
    <SyntheticsInfoRow
      label={label}
      value={
        isZero || isLoading ? (
          <span className="text-slate-500 numbers">{isLoading ? usdElement : formatUsd(0n)}</span>
        ) : (
          <TooltipWithPortal
            handle={<span className="numbers">{formatUsd(usd)}</span>}
            content={<AmountWithUsdBalance amount={amount} decimals={18} usd={usd} symbol={symbol} />}
          />
        )
      }
    />
  );
}

export function StakingPanel({
  processedData,
  last7dUsd,
  origins,
  nativeTokenSymbol,
}: {
  processedData: StakingProcessedData | undefined;
  last7dUsd: bigint | undefined;
  origins: EarningsOrigin[];
  nativeTokenSymbol: string;
}) {
  const isLoading = processedData === undefined;
  const isPaused = processedData?.isRewardsSuspended === true;

  return (
    <div className="flex flex-col rounded-8 bg-slate-900">
      <div className="flex flex-col gap-12 p-20">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            <h3 className="text-body-large font-medium text-typography-primary">
              <Trans>Staking</Trans>
            </h3>
            {isPaused && (
              <Badge className="border-1/2 border-dashed border-slate-600 !bg-transparent">
                <Trans>Paused</Trans>
              </Badge>
            )}
          </div>
          <OriginChips origins={origins} />
        </div>

        <div className="flex gap-28">
          <EarningsStat label={<Trans>Lifetime rewards</Trans>}>
            <UsdStatValue usd={processedData?.cumulativeTotalRewardsUsd ?? (isLoading ? undefined : 0n)} isLoading={isLoading} />
          </EarningsStat>
          <EarningsStat label={<Trans>Last 7 days</Trans>}>
            <Last7dStatValue usd={last7dUsd} isLoading={isLoading} />
          </EarningsStat>
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-col gap-8 p-20">
        <StakingRewardRow
          label={<Trans>GMX</Trans>}
          usd={processedData?.cumulativeGmxRewardsUsd}
          amount={processedData?.cumulativeGmxRewards}
          symbol="GMX"
          isLoading={isLoading}
        />
        <StakingRewardRow
          label={<Trans>esGMX</Trans>}
          usd={processedData?.cumulativeEsGmxRewardsUsd}
          amount={processedData?.cumulativeEsGmxRewards}
          symbol="esGMX"
          isLoading={isLoading}
        />
        <StakingRewardRow
          label={<Trans>Native ETH / AVAX</Trans>}
          usd={processedData?.cumulativeNativeTokenRewardsUsd}
          amount={processedData?.cumulativeNativeTokenRewards}
          symbol={nativeTokenSymbol}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
