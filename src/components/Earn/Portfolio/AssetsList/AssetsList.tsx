import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useMemo } from "react";
import { useMedia } from "react-use";

import { ContractsChainId } from "config/chains";
import { MultichainMarketTokensBalances } from "domain/multichain/types";
import { getGlvOrMarketAddress, GlvOrMarketInfo } from "domain/synthetics/markets";
import { PerformanceData } from "domain/synthetics/markets/usePerformanceAnnualized";
import { StakingProcessedData } from "lib/legacy";
import { getByKey } from "lib/objects";
import { useBreakpoints } from "lib/useBreakpoints";
import useWallet from "lib/wallets/useWallet";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

import EarnIcon from "img/ic_earn.svg?react";

import { GmGlvAssetCard } from "./GmGlvAssetCard";
import { GmxAssetCard } from "./GmxAssetCard/GmxAssetCard";

type AssetItem =
  | { type: "gmx"; usdValue: bigint }
  | { type: "esGmx"; usdValue: bigint }
  | { type: "gmGlv"; info: GlvOrMarketInfo; usdValue: bigint };

function getSortedAssets({
  hasGmx,
  processedData,
  hasEsGmx,
  gmGlvAssets,
  multichainMarketTokensBalances,
}: {
  hasGmx: boolean;
  processedData: StakingProcessedData | undefined;
  hasEsGmx: boolean;
  gmGlvAssets: GlvOrMarketInfo[];
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const assets: AssetItem[] = [];

  if (hasGmx && processedData) {
    const gmxUsdValue = (processedData.gmxBalanceUsd ?? 0n) + (processedData.gmxInStakedGmxUsd ?? 0n);
    assets.push({ type: "gmx", usdValue: gmxUsdValue });
  }

  if (hasEsGmx && processedData) {
    const esGmxUsdValue = (processedData.esGmxBalanceUsd ?? 0n) + (processedData.esGmxInStakedGmxUsd ?? 0n);
    assets.push({ type: "esGmx", usdValue: esGmxUsdValue });
  }

  for (const info of gmGlvAssets) {
    const tokenAddress = getGlvOrMarketAddress(info);
    const usdValue = multichainMarketTokensBalances?.[tokenAddress]?.totalBalanceUsd ?? 0n;
    assets.push({ type: "gmGlv", info, usdValue });
  }

  return assets.sort((a, b) => {
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
  performanceTotal: PerformanceData | undefined;
  performance30d: PerformanceData | undefined;
  isPerformanceLoading: boolean;
  multichainMarketTokensBalances: MultichainMarketTokensBalances | undefined;
}) {
  const cardsCount = (hasGmx ? 1 : 0) + (hasEsGmx ? 1 : 0) + gmGlvAssets.length;
  const { isMobile } = useBreakpoints();

  const isEnoughSpaceFor3Columns = useMedia(`(min-width: 1340px)`);
  const isEnoughSpaceFor2Columns = !isMobile;

  const shouldUseFlex = (cardsCount < 3 && isEnoughSpaceFor2Columns) || (cardsCount < 4 && isEnoughSpaceFor3Columns);

  const { account } = useWallet();
  const { openConnectModal } = useConnectModal();

  const sortedAssets = useMemo(() => {
    return getSortedAssets({
      hasGmx,
      processedData,
      hasEsGmx,
      gmGlvAssets,
      multichainMarketTokensBalances,
    });
  }, [hasGmx, hasEsGmx, processedData, gmGlvAssets, multichainMarketTokensBalances]);

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
          {sortedAssets.map((asset) => {
            if (asset.type === "gmx" && processedData) {
              return <GmxAssetCard key="gmx" processedData={processedData} />;
            }
            if (asset.type === "esGmx" && processedData) {
              return <GmxAssetCard key="esGmx" processedData={processedData} esGmx />;
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
            return null;
          })}
        </div>
      )}

      {!hasAnyAssets && (
        <div className="flex h-full flex-col items-center justify-center gap-12 p-20">
          <EarnIcon className="size-20 text-blue-300" />
          <span className="text-body-small text-center font-medium text-typography-secondary">
            {account ? (
              <>
                <Trans>No assets yet</Trans>
                <br />
                <Trans>See recommended section above to start</Trans>
              </>
            ) : (
              <Trans>Connect wallet to see your assets</Trans>
            )}
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
