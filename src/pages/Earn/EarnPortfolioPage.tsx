import { useMemo } from "react";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { usePerformanceAnnualized } from "domain/synthetics/markets/usePerformanceAnnualized";
import { convertToUsd } from "domain/synthetics/tokens";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import AssetsList from "components/Earn/Portfolio/AssetsList/AssetsList";
import { EarningsOverview } from "components/Earn/Portfolio/EarningsOverview/EarningsOverview";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import Loader from "components/Loader/Loader";

export default function EarnPortfolioPage() {
  const { account, status } = useWallet();
  const { data: processedData, mutate: mutateProcessedData } = useStakingProcessedData();

  const { chainId, srcChainId } = useChainId();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const { performance: performanceTotal, isLoading: isPerformanceTotalLoading } = usePerformanceAnnualized({
    chainId,
    period: "total",
  });

  const { performance: performance30d, isLoading: isPerformance30dLoading } = usePerformanceAnnualized({
    chainId,
    period: "30d",
  });

  const gmGlvAssets = useMemo(() => {
    if (!marketsInfoData || !marketTokensData) {
      return [];
    }

    return Object.values(marketsInfoData).filter((info) => {
      const tokenAddress = isGlvInfo(info) ? info.glvTokenAddress : info.marketTokenAddress;
      const balance = getByKey(multichainMarketTokensBalances, tokenAddress)?.totalBalance;
      const balanceUsd = getByKey(multichainMarketTokensBalances, tokenAddress)?.totalBalanceUsd;

      const filteredBalanceUsd = getPlatformTokenBalanceAfterThreshold(balanceUsd);
      return filteredBalanceUsd !== 0n && balance !== undefined && balance > 0n;
    });
  }, [marketTokensData, marketsInfoData, multichainMarketTokensBalances]);

  const vestingData = useVestingData(account);

  const { isActive: isIncentivesActive } = useIncentivesV2State();
  const { data: allTimeRewards } = useIncentivesLeaderboard(chainId, {
    where: account ? { account } : undefined,
    isMutable: true,
    limit: 1,
    offset: 0,
    enabled: isIncentivesActive && Boolean(account),
  });
  const gtRewards = isIncentivesActive ? allTimeRewards?.[0]?.gtRewards : undefined;
  const hasGtRewards = gtRewards !== undefined && gtRewards > 0n;
  const { data: gtPrice } = useLatestGtPrice(chainId, { enabled: hasGtRewards });
  const gtRewardsUsd = hasGtRewards ? convertToUsd(gtRewards, GT_DECIMALS, gtPrice?.priceUsd) : undefined;

  const hasGmxAssets = processedData
    ? (processedData.gmxBalance ?? 0n) > 0n || (processedData.gmxInStakedGmx ?? 0n) > 0n
    : false;
  const hasEsGmxAssets = processedData
    ? (processedData.esGmxBalance ?? 0n) > 0n ||
      (processedData.esGmxInStakedGmx ?? 0n) > 0n ||
      (vestingData?.gmxVesterVestedAmount ?? 0n) > 0n ||
      (vestingData?.affiliateVesterVestedAmount ?? 0n) > 0n
    : false;

  const hasGmGlvAssets = gmGlvAssets.length > 0;

  const hasAnyAssets = hasGmxAssets || hasEsGmxAssets || hasGmGlvAssets || hasGtRewards;

  const isWalletInitializing = status === "connecting" || status === "reconnecting";

  return (
    <EarnPageLayout>
      {account && !isWalletInitializing && (
        <ErrorBoundary id="EarnPortfolio-EarningsOverview" variant="block" wrapperClassName="rounded-t-8">
          <EarningsOverview
            processedData={processedData}
            mutateProcessedData={mutateProcessedData}
            gmGlvAssets={gmGlvAssets}
          />
        </ErrorBoundary>
      )}
      {processedData && !isWalletInitializing ? (
        <ErrorBoundary id="EarnPortfolio-AssetsList" variant="block" wrapperClassName="rounded-t-8">
          <AssetsList
            processedData={processedData}
            chainId={chainId}
            hasAnyAssets={hasAnyAssets}
            hasGmx={hasGmxAssets}
            hasEsGmx={hasEsGmxAssets}
            gmGlvAssets={gmGlvAssets}
            gtRewards={gtRewards}
            gtRewardsUsd={gtRewardsUsd}
            performanceTotal={performanceTotal}
            performance30d={performance30d}
            isPerformanceLoading={isPerformanceTotalLoading || isPerformance30dLoading}
            multichainMarketTokensBalances={multichainMarketTokensBalances}
          />
        </ErrorBoundary>
      ) : (
        <Loader />
      )}
    </EarnPageLayout>
  );
}
