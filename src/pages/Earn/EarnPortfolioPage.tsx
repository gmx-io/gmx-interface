import { useMemo } from "react";

import { useRewardsTesterEarnIncentivesV2State as useIncentivesV2State } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import {
  selectGlvAndMarketsInfoData,
  selectMultichainMarketTokensBalancesIsLoading,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useRewardsTesterEarnSelector as useSelector } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { useRewardsTesterEarnStakingProcessedData as useStakingProcessedData } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { useRewardsTesterEarnIncentivesLeaderboard as useIncentivesLeaderboard } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { useRewardsTesterEarnLatestGtPrice as useLatestGtPrice } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useRewardsTesterEarnPerformanceAnnualized as usePerformanceAnnualized } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { convertToUsd } from "domain/synthetics/tokens";
import { useRewardsTesterEarnVestingData as useVestingData } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import { useRewardsTesterEarnIsWalletInitializing as useIsWalletInitializing } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { useRewardsTesterEarnWallet as useWallet } from "pages/RewardsPage/tester/useRewardsTesterEarn"; // rewards-tester
import { useBuyGmxDeepLink } from "pages/Earn/buyGmxDeepLink";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import { BuyGmxModal } from "components/BuyGmxModal/BuyGmxModal";
import AssetsList from "components/Earn/Portfolio/AssetsList/AssetsList";
import { EarningsOverview } from "components/Earn/Portfolio/EarningsOverview/EarningsOverview";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import Loader from "components/Loader/Loader";

export default function EarnPortfolioPage() {
  const { account } = useWallet();
  const isWalletInitializing = useIsWalletInitializing();
  const { data: processedData, mutate: mutateProcessedData } = useStakingProcessedData();
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useBuyGmxDeepLink();

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

  const isMultichainBalancesLoading = useSelector(selectMultichainMarketTokensBalancesIsLoading);
  const areAssetsLoading =
    Boolean(account) && (!processedData || !marketsInfoData || !marketTokensData || isMultichainBalancesLoading);

  return (
    <EarnPageLayout>
      <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />

      {account && !isWalletInitializing && (
        <ErrorBoundary id="EarnPortfolio-EarningsOverview" variant="block" wrapperClassName="rounded-t-8">
          <EarningsOverview processedData={processedData} mutateProcessedData={mutateProcessedData} />
        </ErrorBoundary>
      )}
      {isWalletInitializing || areAssetsLoading ? (
        <Loader />
      ) : (
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
      )}
    </EarnPageLayout>
  );
}
