import { Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";
import Skeleton from "react-loading-skeleton";

import { BOTANIX, ContractsChainId, getChainNativeTokenSymbol } from "config/chains";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { useSelector } from "context/SyntheticsStateContext/utils";
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

function RewardsBar({
  processedData,
  mutateProcessedData,
}: {
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
}) {
  const { chainId, srcChainId } = useChainId();
  const nativeTokenSymbol = getChainNativeTokenSymbol(chainId);

  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const { userEarnings, isLoading: isUserEarningsLoading } = useUserEarnings(chainId, srcChainId);

  const totalGmInfo = useMemo(
    () => getTotalGmInfo({ tokensData: marketTokensData, multichainMarketTokensBalances }),
    [marketTokensData, multichainMarketTokensBalances]
  );
  const totalGlvInfo = useMemo(
    () => getTotalGlvInfo({ tokensData: marketTokensData, multichainMarketTokensBalances }),
    [marketTokensData, multichainMarketTokensBalances]
  );

  const stakedGmxUsd = (processedData?.gmxInStakedGmxUsd ?? 0n) + (processedData?.esGmxInStakedGmxUsd ?? 0n);
  const totalInvestmentUsd = stakedGmxUsd + totalGmInfo.balanceUsd + totalGlvInfo.balanceUsd;

  const isInvestmentValueLoading =
    processedData === undefined || marketTokensData === undefined || multichainMarketTokensBalances === undefined;

  return (
    <div className="rounded-8 bg-slate-900 p-20 text-typography-primary">
      <div className="flex flex-col gap-16 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-28 max-lg:flex-col max-lg:gap-16">
          <div className="flex shrink-0 gap-28 max-lg:grid max-lg:grid-cols-2 max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Investment Value</Trans>
              </span>
              <span className="text-body-large font-medium numbers">
                {isInvestmentValueLoading ? (
                  <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={80} className="leading-base" />
                ) : (
                  formatUsd(totalInvestmentUsd)
                )}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Earned</Trans>
              </span>
              <TotalEarned
                processedData={processedData}
                nativeTokenSymbol={nativeTokenSymbol}
                userEarnings={userEarnings}
                isUserEarningsLoading={isUserEarningsLoading}
                chainId={chainId}
              />
            </div>
          </div>

          <div className="border-r-1/2 border-slate-600 max-lg:border-b-1/2 max-lg:border-r-0" />

          <div className="flex gap-28 max-lg:flex-col max-lg:gap-12">
            <div className="flex flex-col gap-2">
              <span className="text-12 font-medium text-typography-secondary">
                <Trans>Total Pending Rewards</Trans>
              </span>
              <TotalPendingRewards
                processedData={processedData}
                nativeTokenSymbol={nativeTokenSymbol}
                chainId={chainId}
              />
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
  isUserEarningsLoading,
  chainId,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
  userEarnings: UserEarningsData | null;
  isUserEarningsLoading: boolean;
  chainId: ContractsChainId;
}) {
  const earnedTooltipContent = useMemo(() => {
    if (!processedData) {
      return null;
    }

    const stakingRows: ReactNode[] = [];

    if (chainId !== BOTANIX && (processedData.cumulativeGmxRewards ?? 0n) > 0n) {
      stakingRows.push(
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
        />
      );
    }

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
            <StatsTooltipRow
              label={<Trans>GLV Vaults:</Trans>}
              showDollar={false}
              value={
                <span className="text-body-medium text-typography-secondary">
                  <Trans>coming soon</Trans>
                </span>
              }
            />
          </div>
        </div>
      );
    }

    if (tooltipSections.length === 0) {
      return null;
    }

    return <div className="flex flex-col gap-8">{tooltipSections}</div>;
  }, [nativeTokenSymbol, processedData, userEarnings, chainId]);

  const totalEarnedUsd = (processedData?.cumulativeTotalRewardsUsd ?? 0n) + (userEarnings?.allMarkets.total ?? 0n);
  const isLoading = processedData === undefined || isUserEarningsLoading;

  const valueElement = (
    <span className="text-body-large font-medium numbers">
      {isLoading ? (
        <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={65} className="leading-base" />
      ) : (
        formatUsd(totalEarnedUsd)
      )}
    </span>
  );

  if (!earnedTooltipContent) {
    return valueElement;
  }

  return <Tooltip content={earnedTooltipContent} handle={valueElement} />;
}

function TotalPendingRewards({
  processedData,
  nativeTokenSymbol,
  chainId,
}: {
  processedData: StakingProcessedData | undefined;
  nativeTokenSymbol: string;
  chainId: ContractsChainId;
}) {
  const totalPendingRewardsUsd = processedData?.totalRewardsUsd ?? 0n;
  const isLoading = processedData === undefined;

  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;
  const hasEsGmxRewards = (processedData?.totalEsGmxRewards ?? 0n) > 0n;

  const skeletonElement = (
    <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={80} className="leading-base" />
  );

  if (chainId === BOTANIX) {
    return (
      <span className="text-body-large font-medium numbers">
        {isLoading ? skeletonElement : formatUsd(totalPendingRewardsUsd)}
      </span>
    );
  }

  return (
    <TooltipWithPortal
      handle={isLoading ? skeletonElement : formatUsd(totalPendingRewardsUsd)}
      handleClassName="text-body-large font-medium numbers"
      content={
        <div className="flex flex-col">
          <StatsTooltipRow
            label={<Trans>GMX Staked Rewards:</Trans>}
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
            label={<Trans>Vested Claimable GMX:</Trans>}
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
              label={<Trans>esGMX Rewards:</Trans>}
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
