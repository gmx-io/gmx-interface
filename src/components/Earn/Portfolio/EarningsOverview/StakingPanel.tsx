import { Trans } from "@lingui/macro";
import { ReactNode } from "react";
import Skeleton from "react-loading-skeleton";

import { useTreasuryProjection } from "domain/stake/useTreasuryProjection";
import { useChainId } from "lib/chains";
import { StakingProcessedData } from "lib/legacy";
import { formatBalanceAmount, formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Badge from "components/Badge/Badge";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { EarningsStat, formatFullPrecisionUsd, isAbbreviatedUsd, UsdStatValue } from "./EarningsStat";

function RewardsPausedBadge() {
  return (
    <TooltipWithPortal
      variant="none"
      handle={
        <Badge className="!bg-transparent border-1/2 border-dashed border-slate-600">
          <Trans>Rewards paused</Trans>
        </Badge>
      }
      content={
        <Trans>
          Staking rewards are paused. 27% of protocol fees are accumulating in the Treasury instead, to be distributed
          when GMX reaches $90, subject to DAO governance. Your share is based on staking power (duration × amount
          staked).
        </Trans>
      }
    />
  );
}

function TreasuryProjectionLabel() {
  return (
    <TooltipWithPortal
      handle={<Trans>Accumulating for you</Trans>}
      content={
        <Trans>
          Your projected share of the Treasury at today's staking power. A best-effort estimate only; actual
          distribution is subject to DAO governance.
        </Trans>
      }
    />
  );
}

function TreasuryProjectionValue({ skeletonWidth = 65 }: { skeletonWidth?: number }) {
  const { chainId } = useChainId();
  const { projectedRewardGmx, projectedRewardUsd, isTreasuryAccumulating, isLoading } = useTreasuryProjection(chainId);

  if (isLoading) {
    return <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={skeletonWidth} className="leading-base" />;
  }

  if (isTreasuryAccumulating) {
    return (
      <span className="text-typography-secondary">
        <Trans>Accumulating...</Trans>
      </span>
    );
  }

  if (projectedRewardUsd === undefined || projectedRewardGmx === undefined) {
    return <span className="text-typography-secondary">—</span>;
  }

  const isAbbreviated = isAbbreviatedUsd(projectedRewardUsd);

  return (
    <TooltipWithPortal
      handle={
        <span className="text-blue-100 numbers">
          {isAbbreviated ? "" : "~"}
          {formatUsd(projectedRewardUsd)}
        </span>
      }
      content={<TokenAmountWithUsd amount={projectedRewardGmx} usd={projectedRewardUsd} symbol="GMX" />}
    />
  );
}

function TokenAmountWithUsd({ amount, usd, symbol }: { amount: bigint; usd: bigint; symbol: string }) {
  if (!isAbbreviatedUsd(usd)) {
    return <AmountWithUsdBalance amount={amount} decimals={18} usd={usd} symbol={symbol} />;
  }

  return (
    <span className="numbers">
      {formatBalanceAmount(amount, 18, symbol, { showZero: true })} ({formatFullPrecisionUsd(usd)})
    </span>
  );
}

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

  return (
    <SyntheticsInfoRow
      label={label}
      value={
        isLoading ? (
          <UsdStatValue usd={undefined} isLoading skeletonWidth={60} />
        ) : isZero ? (
          <span className="text-slate-500 numbers">{formatUsd(0n)}</span>
        ) : (
          <TooltipWithPortal
            handle={<span className="numbers">{formatUsd(usd)}</span>}
            content={<TokenAmountWithUsd amount={amount ?? 0n} usd={usd ?? 0n} symbol={symbol} />}
          />
        )
      }
    />
  );
}

export function StakingPanel({
  processedData,
  lifetimeUsd,
  next7dUsd,
  nativeTokenSymbol,
}: {
  processedData: StakingProcessedData | undefined;
  lifetimeUsd: bigint | undefined;
  next7dUsd: bigint | undefined;
  nativeTokenSymbol: string;
}) {
  const isLoading = processedData === undefined;
  const isPaused = processedData?.isRewardsSuspended === true;

  return (
    <div className="flex h-full flex-col rounded-8 bg-slate-900">
      <div className="flex flex-col gap-12 p-20">
        <div className="flex items-center gap-8">
          <h3 className="text-body-large font-medium text-typography-primary">
            <Trans>Staking</Trans>
          </h3>
          {isPaused && <RewardsPausedBadge />}
        </div>

        <div className="flex gap-28">
          <EarningsStat label={<Trans>Lifetime rewards</Trans>}>
            <UsdStatValue usd={lifetimeUsd} isLoading={isLoading} />
          </EarningsStat>
          {isPaused ? (
            <EarningsStat label={<TreasuryProjectionLabel />}>
              <TreasuryProjectionValue />
            </EarningsStat>
          ) : (
            <EarningsStat label={<Trans>Est. next 7 days</Trans>}>
              <UsdStatValue usd={next7dUsd} isLoading={isLoading} highlightPositive />
            </EarningsStat>
          )}
        </div>
      </div>

      <div className="border-t-1/2 border-slate-600" />

      <div className="flex flex-col gap-8 p-20">
        <StakingRewardRow
          label={
            <TooltipWithPortal
              handle={<Trans>GMX rewards</Trans>}
              content={
                <Trans>
                  GMX paid out to your stake by protocol buybacks. Vested esGMX is not counted here: vesting converts
                  esGMX that is already counted in the esGMX rewards row, so counting it again would double count the
                  same reward.
                </Trans>
              }
            />
          }
          usd={processedData?.cumulativeGmxRewardsUsd}
          amount={processedData?.cumulativeGmxRewards}
          symbol="GMX"
          isLoading={isLoading}
        />
        <StakingRewardRow
          label={<Trans>esGMX rewards</Trans>}
          usd={processedData?.cumulativeEsGmxRewardsUsd}
          amount={processedData?.cumulativeEsGmxRewards}
          symbol="esGMX"
          isLoading={isLoading}
        />
        <StakingRewardRow
          label={<Trans>{nativeTokenSymbol} rewards</Trans>}
          usd={processedData?.cumulativeNativeTokenRewardsUsd}
          amount={processedData?.cumulativeNativeTokenRewards}
          symbol={nativeTokenSymbol}
          isLoading={isLoading}
        />
      </div>

      {!isPaused && (
        <div className="mt-auto">
          <div className="border-t-1/2 border-slate-600" />
          <div className="flex flex-col gap-8 p-20">
            <SyntheticsInfoRow
              label={<TreasuryProjectionLabel />}
              value={<TreasuryProjectionValue skeletonWidth={60} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
