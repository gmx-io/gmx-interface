import { useMemo } from "react";

import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getPlatformTokenBalanceAfterThreshold } from "domain/multichain/getPlatformTokenBalanceAfterThreshold";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { usePerformanceAnnualized } from "domain/synthetics/markets/usePerformanceAnnualized";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import AssetsList from "components/Earn/Portfolio/AssetsList/AssetsList";
import { RecommendedAssets } from "components/Earn/Portfolio/RecommendedAssets/RecommendedAssets";
import RewardsBar from "components/Earn/Portfolio/RewardsBar";
import ErrorBoundary from "components/Errors/ErrorBoundary";
import Loader from "components/Loader/Loader";

export default function EarnPortfolioPage() {
  const { account, status } = useWallet();
  const { data: processedData, mutate: mutateProcessedData } = useStakingProcessedData();

  const { chainId, srcChainId } = useChainId();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });
  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);

  const { marketsTokensApyData: markets90dApyData, glvApyInfoData: glv90dApyData } = useGmMarketsApy(
    chainId,
    srcChainId,
    { period: "90d" }
  );

  const { performance: performanceTotal } = usePerformanceAnnualized({
    chainId,
    period: "total",
  });

  const { performance: performance30d } = usePerformanceAnnualized({
    chainId,
    period: "30d",
  });

  const { performance: performance90d } = usePerformanceAnnualized({
    chainId,
    period: "90d",
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

  const hasAnyAssets = hasGmxAssets || hasEsGmxAssets || hasGmGlvAssets;

  const isWalletInitializing = status === "connecting" || status === "reconnecting";

  return (
    <EarnPageLayout>
      {processedData && !isWalletInitializing && (
        <RewardsBar processedData={processedData} mutateProcessedData={mutateProcessedData} />
      )}
      {processedData && !isWalletInitializing ? (
        <>
          {hasAnyAssets && (
            <ErrorBoundary id="EarnPortfolio-AssetsList" variant="block" wrapperClassName="rounded-t-8">
              <AssetsList
                processedData={processedData}
                chainId={chainId}
                hasAnyAssets={hasAnyAssets}
                hasGmx={hasGmxAssets}
                hasEsGmx={hasEsGmxAssets}
                gmGlvAssets={gmGlvAssets}
                performanceTotal={performanceTotal}
                performance30d={performance30d}
                multichainMarketTokensBalances={multichainMarketTokensBalances}
              />
            </ErrorBoundary>
          )}
          {glv90dApyData && markets90dApyData && performance90d && marketTokensData && (
            <ErrorBoundary id="EarnPortfolio-RecommendedAssets" variant="block" wrapperClassName="rounded-t-8">
              <RecommendedAssets
                hasGmxAssets={hasGmxAssets}
                marketsInfoData={marketsInfoData}
                marketTokensData={marketTokensData}
                marketsApyInfo={markets90dApyData}
                glvsApyInfo={glv90dApyData}
                performance={performance90d}
              />
            </ErrorBoundary>
          )}
          {!hasAnyAssets && (
            <ErrorBoundary id="EarnPortfolio-AssetsListEmpty" variant="block" wrapperClassName="rounded-t-8">
              <AssetsList
                processedData={processedData}
                chainId={chainId}
                hasAnyAssets={hasAnyAssets}
                hasGmx={hasGmxAssets}
                hasEsGmx={hasEsGmxAssets}
                gmGlvAssets={gmGlvAssets}
                performanceTotal={performanceTotal}
                performance30d={performance30d}
                multichainMarketTokensBalances={multichainMarketTokensBalances}
              />
            </ErrorBoundary>
          )}
        </>
      ) : (
        <Loader />
      )}
    </EarnPageLayout>
  );
}
