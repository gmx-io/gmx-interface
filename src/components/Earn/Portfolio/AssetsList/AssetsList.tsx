import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMedia } from "react-use";

import { ContractsChainId } from "config/chains";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { MarketTokensAPRData } from "domain/synthetics/markets/types";
import { StakingProcessedData } from "lib/legacy";
import { getByKey } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";

import EarnIcon from "img/ic_earn.svg?react";

import { GmGlvAssetCard } from "./GmGlvAssetCard";
import { GmxAssetCard } from "./GmxAssetCard/GmxAssetCard";

export function AssetsList({
  chainId,
  processedData,
  hasAnyAssets,
  hasGmx,
  hasEsGmx,
  gmGlvAssets,

  glvTotalApyData,
  marketsTotalApyData,
  glv30dApyData,
  markets30dApyData,
  multichainMarketTokensBalances,
}: {
  chainId: ContractsChainId;
  processedData: StakingProcessedData | undefined;
  hasAnyAssets: boolean;
  hasGmx: boolean;
  hasEsGmx: boolean;
  gmGlvAssets: GlvOrMarketInfo[];
  glvTotalApyData: MarketTokensAPRData | undefined;
  marketsTotalApyData: MarketTokensAPRData | undefined;
  glv30dApyData: MarketTokensAPRData | undefined;
  markets30dApyData: MarketTokensAPRData | undefined;
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const cardsCount = (hasGmx ? 1 : 0) + (hasEsGmx ? 1 : 0) + gmGlvAssets.length;
  const { isMobile } = useBreakpoints();

  const isEnoughSpaceFor3Columns = useMedia(`(min-width: 1340px)`);
  const isEnoughSpaceFor2Columns = !isMobile;

  const shouldUseFlex = (cardsCount < 3 && isEnoughSpaceFor2Columns) || (cardsCount < 4 && isEnoughSpaceFor3Columns);

  const { account } = useWallet();

  return (
    <section className={cx("flex flex-col rounded-8 bg-slate-900", { grow: !hasAnyAssets })}>
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>My assets</Trans>
      </h2>

      {hasAnyAssets && (
        <div
          className={cx(
            "grid grid-cols-1 gap-12 p-12 ",
            shouldUseFlex
              ? "md:flex md:flex-wrap md:[&>div]:w-[359px]"
              : "md:grid-cols-2 min-[1300px]:grid-cols-3 min-[1460px]:grid-cols-4"
          )}
        >
          {hasGmx && processedData ? <GmxAssetCard processedData={processedData} /> : null}
          {hasEsGmx && processedData ? <GmxAssetCard processedData={processedData} esGmx /> : null}
          {gmGlvAssets.map((info) => (
            <GmGlvAssetCard
              key={getGlvOrMarketAddress(info)}
              marketInfo={info}
              chainId={chainId}
              totalFeeApy={
                isGlvInfo(info)
                  ? getByKey(glvTotalApyData, info.glvTokenAddress)
                  : getByKey(marketsTotalApyData, info.marketTokenAddress)
              }
              feeApy30d={
                isGlvInfo(info)
                  ? getByKey(glv30dApyData, info.glvTokenAddress)
                  : getByKey(markets30dApyData, info.marketTokenAddress)
              }
              multichainMarketTokenBalances={multichainMarketTokensBalances?.[getGlvOrMarketAddress(info)]}
            />
          ))}
        </div>
      )}

      {!hasAnyAssets && (
        <div className="flex h-full flex-col items-center justify-center gap-8 p-20">
          <EarnIcon className="size-20 text-blue-300" />
          <span className="text-body-small text-center font-medium text-typography-secondary">
            {account ? (
              <>
                <Trans>It seems you currently don't own any assets.</Trans>
                <br />
                <Trans>Please check the recommended section above to start earning yield!</Trans>
              </>
            ) : (
              <Trans>Please connect your wallet to see your assets.</Trans>
            )}
          </span>
        </div>
      )}
    </section>
  );
}

export default AssetsList;
