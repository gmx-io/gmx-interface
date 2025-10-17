import { Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { getConstant } from "config/chains";
import { UserEarningsData } from "domain/synthetics/markets/types";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { getTotalGlvInfo, getTotalGmInfo } from "domain/synthetics/markets/utils";
import { useChainId } from "lib/chains";
import { StakingProcessedData } from "lib/legacy";
import { formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { ClaimRewardsButton } from "./ClaimRewardsButton";

export function RewardsBar({
  processedData,
  mutateProcessedData,
}: {
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
}) {
  const { chainId, srcChainId } = useChainId();
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });

  const userEarnings = useUserEarnings(chainId, srcChainId);

  const totalGmInfo = useMemo(() => getTotalGmInfo(marketTokensData), [marketTokensData]);
  const totalGlvInfo = useMemo(() => getTotalGlvInfo(marketTokensData), [marketTokensData]);

  const stakedGmxUsd = (processedData?.gmxInStakedGmxUsd ?? 0n) + (processedData?.esGmxInStakedGmxUsd ?? 0n);
  const totalInvestmentUsd = stakedGmxUsd + totalGmInfo.balanceUsd + totalGlvInfo.balanceUsd;

  return (
    <div className="rounded-8 bg-slate-900 p-20 text-typography-primary">
      <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-28 max-lg:flex-col max-lg:gap-16">
          <div className="flex shrink-0 gap-28 max-lg:grid max-lg:grid-cols-2 max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Investment Value</Trans>
              </span>
              <span className="text-body-large font-medium numbers">{formatUsd(totalInvestmentUsd)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Earned</Trans>
              </span>
              <TotalEarned
                processedData={processedData}
                nativeTokenSymbol={nativeTokenSymbol}
                userEarnings={userEarnings}
              />
            </div>
          </div>

          <div className="border-r-1/2 border-slate-600 max-lg:border-b-1/2 max-lg:border-r-0" />

          <div className="flex gap-28 max-lg:flex-col max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Pending Rewards</Trans>
              </span>
              <TotalPendingRewards processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
            </div>
          </div>
        </div>

        <ClaimRewardsButton
          className="shrink-0 xl:self-center"
          processedData={processedData}
          mutateProcessedData={mutateProcessedData}
        />
      </div>
    </div>
  );
}

function TotalEarned({
  processedData,
  nativeTokenSymbol,
  userEarnings,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
  userEarnings: UserEarningsData | null;
}) {
  const earnedTooltipContent = useMemo(() => {
    if (!processedData) {
      return null;
    }

    const stakingRows: ReactNode[] = [
      <StatsTooltipRow
        key="gmx"
        label={<Trans>GMX rewards:</Trans>}
        showDollar={false}
        value={
          <AmountWithUsdBalance
            amount={processedData.cumulativeGmxRewards}
            decimals={18}
            usd={processedData.cumulativeGmxRewardsUsd}
            symbol="GMX"
          />
        }
      />,
    ];

    if ((processedData.cumulativeEsGmxRewards ?? 0n) > 0n) {
      stakingRows.push(
        <StatsTooltipRow
          key="esgmx"
          label={<Trans>esGMX rewards:</Trans>}
          showDollar={false}
          value={
            <AmountWithUsdBalance
              amount={processedData.cumulativeEsGmxRewards}
              decimals={18}
              usd={processedData.cumulativeEsGmxRewardsUsd}
              symbol="esGMX"
            />
          }
        />
      );
    }

    if ((processedData.cumulativeNativeTokenRewards ?? 0n) > 0n) {
      stakingRows.push(
        <StatsTooltipRow
          key="native"
          label={<Trans>{nativeTokenSymbol} rewards:</Trans>}
          showDollar={false}
          value={
            <AmountWithUsdBalance
              amount={processedData.cumulativeNativeTokenRewards}
              decimals={18}
              usd={processedData.cumulativeNativeTokenRewardsUsd}
              symbol={nativeTokenSymbol}
            />
          }
        />
      );
    }

    const tooltipSections: ReactNode[] = [];

    if (stakingRows.length > 0) {
      tooltipSections.push(
        <div key="staking" className="flex flex-col gap-8">
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Lifetime staking rewards:</Trans>
          </span>
          <div className="flex flex-col">{stakingRows}</div>
        </div>
      );
    }

    if (userEarnings && userEarnings.allMarkets.total > 0n) {
      tooltipSections.push(
        <div key="lp" className="flex flex-col gap-8">
          <span className="text-14 font-medium text-typography-secondary">
            <Trans>Lifetime LP rewards:</Trans>
          </span>
          <div className="flex flex-col">
            <StatsTooltipRow
              label={<Trans>GM Pools:</Trans>}
              showDollar={false}
              value={<span className="text-body-medium numbers">{formatUsd(userEarnings.allMarkets.total)}</span>}
            />
          </div>
        </div>
      );
    }

    return <div className="flex flex-col gap-8">{tooltipSections}</div>;
  }, [nativeTokenSymbol, processedData, userEarnings]);

  const totalEarnedUsd = (processedData?.cumulativeTotalRewardsUsd ?? 0n) + (userEarnings?.allMarkets.total ?? 0n);

  return (
    <Tooltip
      disabled={!earnedTooltipContent}
      content={earnedTooltipContent}
      handle={<span className="text-body-large font-medium numbers">{formatUsd(totalEarnedUsd)}</span>}
    />
  );
}

function TotalPendingRewards({
  processedData,
  nativeTokenSymbol,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
}) {
  const totalPendingRewardsUsd = processedData?.totalRewardsUsd ?? 0n;

  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;

  return (
    <TooltipWithPortal
      handle={formatUsd(totalPendingRewardsUsd)}
      handleClassName="text-body-large font-medium numbers"
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>GMX Staked Rewards:</Trans>}
            showDollar={false}
            value={
              <AmountWithUsdBalance
                amount={processedData?.totalGmxRewards ?? 0n}
                decimals={18}
                usd={processedData?.totalGmxRewardsUsd ?? 0n}
                symbol="GMX"
              />
            }
          />

          <StatsTooltipRow
            label={<Trans>Vested Claimable GMX:</Trans>}
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

          {hasNativeRewards && (
            <StatsTooltipRow
              label={<Trans>{nativeTokenSymbol} Rewards:</Trans>}
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

export default RewardsBar;
