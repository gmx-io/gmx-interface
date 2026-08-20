import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import { useMedia } from "react-use";

import { ContractsChainId } from "config/chains";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { StakingProcessedData } from "lib/legacy";
import { getByKey } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import useSearchParams from "lib/useSearchParams";
import useWallet from "lib/wallets/useWallet";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

import EarnIcon from "img/ic_earn.svg?react";

import { GmGlvAssetCard } from "./GmGlvAssetCard";
import {
  EARN_OPERATION_QUERY_PARAM,
  EARN_OPERATION_STAKE_ES_GMX,
  EARN_OPERATION_STAKE_GMX,
} from "./GmxAssetCard/constants";
import { GmxAssetCard } from "./GmxAssetCard/GmxAssetCard";
import { GtAssetCard } from "./GtAssetCard";

type AssetItem =
  | { type: "gmx"; usdValue: bigint; hasEsGmx: boolean }
  | { type: "gmGlv"; info: GlvOrMarketInfo; usdValue: bigint }
  | { type: "gt"; usdValue: bigint; gtRewards: bigint; gtRewardsUsd: bigint | undefined };

function getSortedAssets({
  hasGmx,
  forceGmxCard,
  forceEsGmxCard,
  processedData,
  hasEsGmx,
  gmGlvAssets,
  multichainMarketTokensBalances,
  gtRewards,
  gtRewardsUsd,
}: {
  hasGmx: boolean;
  forceGmxCard: boolean;
  forceEsGmxCard: boolean;
  processedData: StakingProcessedData | undefined;
  hasEsGmx: boolean;
  gmGlvAssets: GlvOrMarketInfo[];
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
  gtRewards: bigint | undefined;
  gtRewardsUsd: bigint | undefined;
}) {
  const assets: AssetItem[] = [];

  if ((hasGmx || hasEsGmx || forceGmxCard) && processedData) {
    const gmxUsdValue = hasGmx ? (processedData.gmxBalanceUsd ?? 0n) + (processedData.gmxInStakedGmxUsd ?? 0n) : 0n;
    const esGmxUsdValue = hasEsGmx
      ? (processedData.esGmxBalanceUsd ?? 0n) + (processedData.esGmxInStakedGmxUsd ?? 0n)
      : 0n;
    assets.push({ type: "gmx", usdValue: gmxUsdValue + esGmxUsdValue, hasEsGmx: hasEsGmx || forceEsGmxCard });
  }

  for (const info of gmGlvAssets) {
    const tokenAddress = getGlvOrMarketAddress(info);
    const usdValue = multichainMarketTokensBalances?.[tokenAddress]?.totalBalanceUsd ?? 0n;
    assets.push({ type: "gmGlv", info, usdValue });
  }

  if (gtRewards !== undefined && gtRewards > 0n) {
    assets.push({ type: "gt", usdValue: gtRewardsUsd ?? 0n, gtRewards, gtRewardsUsd });
  }

  return assets.sort((a, b) => {
    if (a.type === "gmx" && b.type !== "gmx") return -1;
    if (a.type !== "gmx" && b.type === "gmx") return 1;
    if (b.usdValue > a.usdValue) return 1;
    if (b.usdValue < a.usdValue) return -1;
    return 0;
  });
}

function AssetsList({
  chainId,
  processedData,
  hasAnyAssets,
  hasGmx,
  hasEsGmx,
  gmGlvAssets,
  gtRewards,
  gtRewardsUsd,

  performanceTotal,
  performance30d,
  isPerformanceLoading,
  multichainMarketTokensBalances,
}: {
  chainId: ContractsChainId;
  processedData: StakingProcessedData | undefined;
  hasAnyAssets: boolean;
  hasGmx: boolean;
  hasEsGmx: boolean;
  gmGlvAssets: GlvOrMarketInfo[];
  gtRewards: bigint | undefined;
  gtRewardsUsd: bigint | undefined;
  performanceTotal: PerformanceData | undefined;
  performance30d: PerformanceData | undefined;
  isPerformanceLoading: boolean;
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const { [EARN_OPERATION_QUERY_PARAM]: operation } = useSearchParams<{ [EARN_OPERATION_QUERY_PARAM]?: string }>();
  const forceGmxCard = operation === EARN_OPERATION_STAKE_GMX || operation === EARN_OPERATION_STAKE_ES_GMX;
  const forceEsGmxCard = operation === EARN_OPERATION_STAKE_ES_GMX;
  const shouldShowAssets = hasAnyAssets || forceGmxCard;
  const hasGmxCard = hasGmx || hasEsGmx || forceGmxCard;
  const hasGtCard = gtRewards !== undefined && gtRewards > 0n;
  const cardsCount = (hasGmxCard ? 1 : 0) + gmGlvAssets.length + (hasGtCard ? 1 : 0);
  const { isMobile } = useBreakpoints();

  const isEnoughSpaceFor3Columns = useMedia(`(min-width: 1340px)`);
  const isEnoughSpaceFor2Columns = !isMobile;

  const shouldUseFlex = (cardsCount < 3 && isEnoughSpaceFor2Columns) || (cardsCount < 4 && isEnoughSpaceFor3Columns);

  const { account } = useWallet();
  const { openConnectModal } = useConnectModal();

  const sortedAssets = useMemo(() => {
    return getSortedAssets({
      hasGmx,
      forceGmxCard,
      forceEsGmxCard,
      processedData,
      hasEsGmx,
      gmGlvAssets,
      multichainMarketTokensBalances,
      gtRewards,
      gtRewardsUsd,
    });
  }, [
    forceEsGmxCard,
    forceGmxCard,
    hasGmx,
    hasEsGmx,
    processedData,
    gmGlvAssets,
    multichainMarketTokensBalances,
    gtRewards,
    gtRewardsUsd,
  ]);

  return (
    <section className={cx("flex flex-col rounded-8 bg-slate-900", { grow: !hasAnyAssets })}>
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>My assets</Trans>
      </h2>

      {shouldShowAssets && (
        <div
          className={cx(
            "grid grid-cols-1 items-start gap-12 p-12",
            shouldUseFlex
              ? "md:flex md:flex-wrap md:items-start md:[&>div]:w-[359px]"
              : "md:grid-flow-dense md:grid-cols-2 min-[1300px]:grid-cols-3 min-[1460px]:grid-cols-4"
          )}
        >
          {sortedAssets.map((asset) => {
            if (asset.type === "gmx" && processedData) {
              return (
                <div key="gmx" className="md:row-span-2 md:min-h-[420px] md:self-stretch">
                  <GmxAssetCard processedData={processedData} hasEsGmx={asset.hasEsGmx} />
                </div>
              );
            }
            if (asset.type === "gmGlv") {
              const info = asset.info;
              return (
                <GmGlvAssetCard
                  key={getGlvOrMarketAddress(info)}
                  marketInfo={info}
                  chainId={chainId}
                  totalPerformanceApy={getByKey(performanceTotal, getGlvOrMarketAddress(info))}
                  performanceApy30d={getByKey(performance30d, getGlvOrMarketAddress(info))}
                  isPerformanceLoading={isPerformanceLoading}
                  multichainMarketTokenBalances={multichainMarketTokensBalances?.[getGlvOrMarketAddress(info)]}
                />
              );
            }
            if (asset.type === "gt") {
              return <GtAssetCard key="gt" gtRewards={asset.gtRewards} gtRewardsUsd={asset.gtRewardsUsd} />;
            }
            return null;
          })}
        </div>
      )}

      {!shouldShowAssets && (
        <div className="flex h-full flex-col items-center justify-center gap-12 p-20">
          <EarnIcon className="size-20 text-blue-300" />
          <span className="text-body-small text-center font-medium text-typography-secondary">
            {account ? <Trans>No assets yet</Trans> : <Trans>Connect wallet to see your assets</Trans>}
          </span>
          {!account && openConnectModal && (
            <ConnectWalletButton onClick={openConnectModal}>
              <Trans>Connect wallet</Trans>
            </ConnectWalletButton>
          )}
        </div>
      )}
    </section>
  );
}

export default AssetsList;
