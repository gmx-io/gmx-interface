import { useMemo } from "react";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import EarnPageLayout from "pages/Earn/EarnPageLayout";
import { useProcessedData } from "pages/Earn/useProcessedData";

import AssetsList from "components/Earn/Portfolio/AssetsList/AssetsList";
import { RecommendedAssets } from "components/Earn/Portfolio/RecommendedAssets/RecommendedAssets";
import RewardsBar from "components/Earn/Portfolio/RewardsBar";
import Loader from "components/Loader/Loader";

export default function EarnPortfolioPage() {
  const { data: processedData, mutate: mutateProcessedData } = useProcessedData();

  const { chainId, srcChainId } = useChainId();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: false, withGlv: true });

  const { marketsTokensApyData: marketsTotalApyData, glvApyInfoData: glvTotalApyData } = useGmMarketsApy(
    chainId,
    srcChainId,
    { period: "total" }
  );

  const { marketsTokensApyData: marketsThirtyDayApyData, glvApyInfoData: glvThirtyDayApyData } = useGmMarketsApy(
    chainId,
    srcChainId,
    { period: "30d" }
  );

  const gmGlvAssets = useMemo(() => {
    if (!marketsInfoData || !marketTokensData) {
      return [];
    }

    return Object.values(marketsInfoData).filter((info) => {
      const balance = getByKey(
        marketTokensData,
        isGlvInfo(info) ? info.glvTokenAddress : info.marketTokenAddress
      )?.balance;
      return balance !== undefined && balance > 0n;
    });
  }, [marketTokensData, marketsInfoData]);

  const hasGmxAssets = processedData
    ? (processedData.gmxBalance ?? 0n) > 0n || (processedData.gmxInStakedGmx ?? 0n) > 0n
    : false;
  const hasEsGmxAssets = processedData
    ? (processedData.esGmxBalance ?? 0n) > 0n || (processedData.esGmxInStakedGmx ?? 0n) > 0n
    : false;

  const hasGmGlvAssets = gmGlvAssets.length > 0;

  const hasAnyAssets = hasGmxAssets || hasEsGmxAssets || hasGmGlvAssets;

  return (
    <EarnPageLayout>
      {processedData && <RewardsBar processedData={processedData} mutateProcessedData={mutateProcessedData} />}
      {marketsInfoData && marketTokensData && processedData ? (
        <>
          {hasAnyAssets && (
            <AssetsList
              processedData={processedData}
              chainId={chainId}
              hasAnyAssets={hasAnyAssets}
              hasGmx={hasGmxAssets}
              hasEsGmx={hasEsGmxAssets}
              gmGlvAssets={gmGlvAssets}
              marketTokensData={marketTokensData}
              glvTotalApyData={glvTotalApyData}
              marketsTotalApyData={marketsTotalApyData}
              glvThirtyDayApyData={glvThirtyDayApyData}
              marketsThirtyDayApyData={marketsThirtyDayApyData}
            />
          )}
          <RecommendedAssets
            hasGmxAssets={hasGmxAssets}
            marketsInfoData={marketsInfoData}
            marketsApyInfo={marketsThirtyDayApyData}
            marketTokensData={marketTokensData}
            glvsApyInfo={glvThirtyDayApyData}
          />
          {!hasAnyAssets && (
            <AssetsList
              processedData={processedData}
              chainId={chainId}
              hasAnyAssets={hasAnyAssets}
              hasGmx={hasGmxAssets}
              hasEsGmx={hasEsGmxAssets}
              gmGlvAssets={gmGlvAssets}
              marketTokensData={marketTokensData}
              glvTotalApyData={glvTotalApyData}
              marketsTotalApyData={marketsTotalApyData}
              glvThirtyDayApyData={glvThirtyDayApyData}
              marketsThirtyDayApyData={marketsThirtyDayApyData}
            />
          )}
        </>
      ) : (
        <Loader />
      )}
    </EarnPageLayout>
  );
}
