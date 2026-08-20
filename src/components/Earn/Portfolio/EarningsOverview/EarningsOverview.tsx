import { useMemo } from "react";

import { getChainNativeTokenSymbol, GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGlvOrMarketAddress, GlvOrMarketInfo, useMarketTokensData } from "domain/synthetics/markets";
import { useGlvUserEarnings } from "domain/synthetics/markets/useGlvUserEarnings";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { getTotalGlvInfo, getTotalGmInfo } from "domain/synthetics/markets/utils";
import { useChainId } from "lib/chains";
import { StakingProcessedData } from "lib/legacy";
import { bigMath } from "sdk/utils/bigmath";

import { LpPanel } from "./LpPanel";
import { MyEarningsCard } from "./MyEarningsCard";
import { EarningsOrigin } from "./OriginChips";
import { StakingPanel } from "./StakingPanel";

const DAYS_IN_WEEK = 7n;
const DAYS_IN_YEAR = 365n;

function getStakingLast7dUsd(processedData: StakingProcessedData | undefined): bigint | undefined {
  if (!processedData) {
    return undefined;
  }

  if (processedData.isRewardsSuspended) {
    return 0n;
  }

  const stakedUsd = (processedData.gmxInStakedGmxUsd ?? 0n) + (processedData.esGmxInStakedGmxUsd ?? 0n);
  const aprBasisPoints =
    (processedData.gmxAprForEsGmx ?? 0n) + (processedData.gmxAprForNativeToken ?? 0n) + (processedData.gmxAprForGmx ?? 0n);

  return bigMath.mulDiv(stakedUsd * aprBasisPoints, DAYS_IN_WEEK, BASIS_POINTS_DIVISOR_BIGINT * DAYS_IN_YEAR);
}

export function EarningsOverview({
  processedData,
  mutateProcessedData,
  gmGlvAssets,
}: {
  processedData: StakingProcessedData | undefined;
  mutateProcessedData: () => void;
  gmGlvAssets: GlvOrMarketInfo[];
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
  const lpLifetimeUsd = (gmLifetimeUsd ?? 0n) + (glvLifetimeUsd ?? 0n);
  const lpLast7dUsd = (userEarnings?.allMarkets.recent ?? 0n) + (glvUserEarnings?.allGlvs.recent ?? 0n);
  const lpExpected365dUsd = (userEarnings?.allMarkets.expected365d ?? 0n) + (glvUserEarnings?.allGlvs.expected365d ?? 0n);

  const stakingLast7dUsd = getStakingLast7dUsd(processedData);
  const stakingLifetimeUsd = processedData ? (processedData.cumulativeTotalRewardsUsd ?? 0n) : undefined;

  const isStakingLoading = processedData === undefined;
  const isLpValueMissing = isLpUnavailable && !userEarnings && !glvUserEarnings;

  const totalLifetimeUsd =
    stakingLifetimeUsd === undefined ? undefined : stakingLifetimeUsd + lpLifetimeUsd;
  const totalLast7dUsd = stakingLast7dUsd === undefined ? undefined : stakingLast7dUsd + lpLast7dUsd;
  const isMyEarningsLoading = isStakingLoading || (isLpLoading && !isLpValueMissing);

  const totalInvestmentUsd = useMemo(() => {
    const totalGmInfo = getTotalGmInfo({ tokensData: marketTokensData, multichainMarketTokensBalances });
    const totalGlvInfo = getTotalGlvInfo({ tokensData: marketTokensData, multichainMarketTokensBalances });
    const stakedGmxUsd = (processedData?.gmxInStakedGmxUsd ?? 0n) + (processedData?.esGmxInStakedGmxUsd ?? 0n);

    return stakedGmxUsd + totalGmInfo.balanceUsd + totalGlvInfo.balanceUsd;
  }, [marketTokensData, multichainMarketTokensBalances, processedData]);

  const isInvestmentValueLoading =
    processedData === undefined || marketTokensData === undefined || multichainMarketTokensBalances === undefined;

  const stakingOrigins: EarningsOrigin[] = useMemo(
    () => [srcChainId !== undefined ? GMX_ACCOUNT_PSEUDO_CHAIN_ID : chainId],
    [chainId, srcChainId]
  );

  const lpOrigins: EarningsOrigin[] = useMemo(() => {
    const origins = new Set<EarningsOrigin>();

    for (const info of gmGlvAssets) {
      const balances = multichainMarketTokensBalances?.[getGlvOrMarketAddress(info)]?.balances;

      if (!balances) continue;

      for (const [balanceChainId, balanceData] of Object.entries(balances)) {
        if ((balanceData?.balanceUsd ?? 0n) > 0n) {
          origins.add(Number(balanceChainId) as EarningsOrigin);
        }
      }
    }

    if (origins.size === 0) {
      return [chainId];
    }

    return Array.from(origins).sort((a, b) => {
      if (a === GMX_ACCOUNT_PSEUDO_CHAIN_ID) return 1;
      if (b === GMX_ACCOUNT_PSEUDO_CHAIN_ID) return -1;
      return a - b;
    });
  }, [chainId, gmGlvAssets, multichainMarketTokensBalances]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <MyEarningsCard
        totalLifetimeUsd={totalLifetimeUsd}
        last7dUsd={totalLast7dUsd}
        isEarningsLoading={isMyEarningsLoading}
        investmentValueUsd={totalInvestmentUsd}
        isInvestmentValueLoading={isInvestmentValueLoading}
        processedData={processedData}
        mutateProcessedData={mutateProcessedData}
        nativeTokenSymbol={nativeTokenSymbol}
      />
      <StakingPanel
        processedData={processedData}
        last7dUsd={stakingLast7dUsd}
        origins={stakingOrigins}
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
        origins={lpOrigins}
      />
    </div>
  );
}
