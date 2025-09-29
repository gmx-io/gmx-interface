import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { useMarketTokensData } from "domain/synthetics/markets/useMarketTokensData";
import { useChainId } from "lib/chains";
import { ProcessedData } from "lib/legacy";
import { getByKey } from "lib/objects";

import { GmGlvAssetCard } from "./GmGlvAssetCard";
import { GmxAssetCard } from "./GmxAssetCard";

export function AssetsList({ processedData }: { processedData: ProcessedData | undefined }) {
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

  const hasGmx = processedData
    ? (processedData.gmxBalance ?? 0n) > 0n || (processedData.gmxInStakedGmx ?? 0n) > 0n
    : false;
  const hasEsGmx = processedData
    ? (processedData.esGmxBalance ?? 0n) > 0n || (processedData.esGmxInStakedGmx ?? 0n) > 0n
    : false;

  const hasMarketAssets = gmGlvAssets.length > 0;

  if (!hasGmx && !hasEsGmx && !hasMarketAssets) {
    return null;
  }

  return (
    <section className="flex flex-col rounded-8 bg-slate-900">
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>My assets</Trans>
      </h2>

      <div className="grid grid-cols-1 gap-12 p-12 md:grid-cols-2 min-[1300px]:grid-cols-3 min-[1660px]:grid-cols-4">
        {hasGmx && processedData ? <GmxAssetCard processedData={processedData} /> : null}
        {hasEsGmx && processedData ? <GmxAssetCard processedData={processedData} esGmx /> : null}
        {gmGlvAssets.map((info) => (
          <GmGlvAssetCard
            key={getGlvOrMarketAddress(info)}
            token={getByKey(marketTokensData, getGlvOrMarketAddress(info))}
            marketInfo={info}
            chainId={chainId}
            totalFeeApy={
              isGlvInfo(info)
                ? getByKey(glvTotalApyData, info.glvTokenAddress)
                : getByKey(marketsTotalApyData, info.marketTokenAddress)
            }
            thirtyDayFeeApy={
              isGlvInfo(info)
                ? getByKey(glvThirtyDayApyData, info.glvTokenAddress)
                : getByKey(marketsThirtyDayApyData, info.marketTokenAddress)
            }
          />
        ))}
      </div>
    </section>
  );
}

export default AssetsList;
