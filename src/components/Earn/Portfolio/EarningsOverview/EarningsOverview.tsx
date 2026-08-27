import { useMemo } from "react";

import { getChainName, getChainNativeTokenSymbol } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets";
import { useGlvUserEarnings } from "domain/synthetics/markets/useGlvUserEarnings";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { getTotalGlvInfo, getTotalGmInfo } from "domain/synthetics/markets/utils";
import { useChainId } from "lib/chains";
import { StakingProcessedData } from "lib/legacy";
import { bigMath } from "sdk/utils/bigmath";

import { EarningsBand, InvestmentValueBreakdown } from "./EarningsBand";
import { roundEarningsUsd } from "./earningsMath";
import { LifetimeEarningsBreakdown } from "./LifetimeEarningsTooltip";
import { LpPanel } from "./LpPanel";
import { StakingPanel } from "./StakingPanel";

const DAYS_IN_WEEK = 7n;
const DAYS_IN_YEAR = 365n;

function getStakingNext7dUsd(processedData: StakingProcessedData | undefined): bigint | undefined {
  if (!processedData) {
    return undefined;
  }

  if (processedData.isRewardsSuspended) {
    return 0n;
  }

  const stakedUsd = (processedData.gmxInStakedGmxUsd ?? 0n) + (processedData.esGmxInStakedGmxUsd ?? 0n);
  const aprBasisPoints =
    (processedData.gmxAprForEsGmx ?? 0n) +
    (processedData.gmxAprForNativeToken ?? 0n) +
    (processedData.gmxAprForGmx ?? 0n);

  return bigMath.mulDiv(stakedUsd * aprBasisPoints, DAYS_IN_WEEK, BASIS_POINTS_DIVISOR_BIGINT * DAYS_IN_YEAR);
}

export function EarningsOverview({
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

  const {
    userEarnings,
    isLoading: isGmEarningsLoading,
    isUnavailable: isGmEarningsUnavailable,
    isEstimated365dFeesLoading: isGmExpected365dLoading,
    isEstimated365dFeesUnavailable: isGmExpected365dUnavailable,
  } = useUserEarnings(chainId, srcChainId);

  const {
    glvUserEarnings,
    isLoading: isGlvEarningsLoading,
    isUnavailable: isGlvEarningsUnavailable,
    isEstimated365dFeesLoading: isGlvExpected365dLoading,
    isEstimated365dFeesUnavailable: isGlvExpected365dUnavailable,
  } = useGlvUserEarnings(chainId, srcChainId);

  const isLpLoading = isGmEarningsLoading || isGlvEarningsLoading;
  const isLpUnavailable = isGmEarningsUnavailable || isGlvEarningsUnavailable;

  const gmLifetimeUsd = userEarnings?.allMarkets.total;
  const glvLifetimeUsd = glvUserEarnings?.allGlvs.total;
  const lpLifetimeUsd = roundEarningsUsd(gmLifetimeUsd ?? 0n) + roundEarningsUsd(glvLifetimeUsd ?? 0n);
  const lpLast7dUsd = (userEarnings?.allMarkets.recent ?? 0n) + (glvUserEarnings?.allGlvs.recent ?? 0n);
  const lpExpected365dUsd =
    (userEarnings?.allMarkets.expected365d ?? 0n) + (glvUserEarnings?.allGlvs.expected365d ?? 0n);

  const stakingNext7dUsd = getStakingNext7dUsd(processedData);

  const isStakingLoading = processedData === undefined;
  const isLpValueMissing = isLpUnavailable && !userEarnings && !glvUserEarnings;

  const stakingLifetimeUsd = useMemo(() => {
    if (!processedData) {
      return undefined;
    }

    return (
      roundEarningsUsd(processedData.cumulativeGmxRewardsUsd ?? 0n) +
      roundEarningsUsd(processedData.cumulativeEsGmxRewardsUsd ?? 0n) +
      roundEarningsUsd(processedData.cumulativeNativeTokenRewardsUsd ?? 0n)
    );
  }, [processedData]);

  const isMyEarningsLoading = isStakingLoading || (isLpLoading && !isLpValueMissing);

  const lifetimeBreakdown: LifetimeEarningsBreakdown | undefined = useMemo(() => {
    if (!processedData || isMyEarningsLoading) {
      return undefined;
    }

    const stakingGmxUsd = processedData.cumulativeGmxRewardsUsd ?? 0n;
    const stakingEsGmxUsd = processedData.cumulativeEsGmxRewardsUsd ?? 0n;
    const stakingNativeUsd = processedData.cumulativeNativeTokenRewardsUsd ?? 0n;

    return {
      stakingGmxUsd,
      stakingEsGmxUsd,
      stakingNativeUsd,
      gmUsd: gmLifetimeUsd,
      glvUsd: glvLifetimeUsd,
      totalUsd:
        roundEarningsUsd(stakingGmxUsd) +
        roundEarningsUsd(stakingEsGmxUsd) +
        roundEarningsUsd(stakingNativeUsd) +
        roundEarningsUsd(gmLifetimeUsd ?? 0n) +
        roundEarningsUsd(glvLifetimeUsd ?? 0n),
    };
  }, [processedData, isMyEarningsLoading, gmLifetimeUsd, glvLifetimeUsd]);

  const isInvestmentValueLoading =
    processedData === undefined || marketTokensData === undefined || multichainMarketTokensBalances === undefined;

  const investmentBreakdown: InvestmentValueBreakdown | undefined = useMemo(() => {
    if (isInvestmentValueLoading) {
      return undefined;
    }

    const totalGmInfo = getTotalGmInfo({ tokensData: marketTokensData, multichainMarketTokensBalances });
    const totalGlvInfo = getTotalGlvInfo({ tokensData: marketTokensData, multichainMarketTokensBalances });

    const stakedGmxUsd = processedData?.gmxInStakedGmxUsd ?? 0n;
    const stakedEsGmxUsd = processedData?.esGmxInStakedGmxUsd ?? 0n;
    const gmUsd = totalGmInfo.balanceUsd;
    const glvUsd = totalGlvInfo.balanceUsd;

    return {
      stakedGmxUsd,
      stakedEsGmxUsd,
      gmUsd,
      glvUsd,
      totalUsd:
        roundEarningsUsd(stakedGmxUsd) +
        roundEarningsUsd(stakedEsGmxUsd) +
        roundEarningsUsd(gmUsd) +
        roundEarningsUsd(glvUsd),
    };
  }, [isInvestmentValueLoading, marketTokensData, multichainMarketTokensBalances, processedData]);

  return (
    <div className="flex flex-col gap-8">
      <EarningsBand
        lifetimeBreakdown={lifetimeBreakdown}
        isEarningsLoading={isMyEarningsLoading}
        isLpUnavailable={isLpUnavailable}
        investmentBreakdown={investmentBreakdown}
        isInvestmentValueLoading={isInvestmentValueLoading}
        processedData={processedData}
        mutateProcessedData={mutateProcessedData}
        nativeTokenSymbol={nativeTokenSymbol}
        chainName={getChainName(chainId)}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <StakingPanel
          processedData={processedData}
          lifetimeUsd={stakingLifetimeUsd}
          next7dUsd={stakingNext7dUsd}
          nativeTokenSymbol={nativeTokenSymbol}
        />
        <LpPanel
          lifetimeUsd={isLpLoading ? undefined : lpLifetimeUsd}
          last7dUsd={isLpLoading ? undefined : lpLast7dUsd}
          gmLifetimeUsd={gmLifetimeUsd ?? (isGmEarningsLoading ? undefined : 0n)}
          glvLifetimeUsd={glvLifetimeUsd ?? (isGlvEarningsLoading ? undefined : 0n)}
          expected365dUsd={isLpLoading ? undefined : lpExpected365dUsd}
          isLoading={isLpLoading}
          isUnavailable={isLpUnavailable}
          isExpected365dLoading={isGmExpected365dLoading || isGlvExpected365dLoading}
          isExpected365dUnavailable={isGmExpected365dUnavailable || isGlvExpected365dUnavailable}
        />
      </div>
    </div>
  );
}
