import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import { useMedia } from "react-use";

import { ContractsChainId } from "config/chains";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { getGlvOrMarketAddress } from "domain/synthetics/markets";
import { useBreakpoints } from "lib/useBreakpoints";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import { GmGlvAssetCard } from "components/Earn/Portfolio/AssetsList/GmGlvAssetCard";

import EarnIcon from "img/ic_earn.svg?react";

import type { SolanaEarnData } from "./solanaEarnTypes";

// Same layout as the EVM "My assets" list, without the GMX card.
export function SolanaAssetsList({ data, chainId }: { data: SolanaEarnData; chainId: ContractsChainId }) {
  const { account, assets } = data;
  const hasAnyAssets = Boolean(account) && assets.length > 0;
  const { isMobile } = useBreakpoints();
  const { openConnectModal } = useConnectModal();

  const isEnoughSpaceFor3Columns = useMedia(`(min-width: 1340px)`);
  const isEnoughSpaceFor2Columns = !isMobile;
  const shouldUseFlex =
    (assets.length < 3 && isEnoughSpaceFor2Columns) || (assets.length < 4 && isEnoughSpaceFor3Columns);

  const sortedAssets = useMemo(
    () =>
      [...assets].sort((a, b) => {
        if (b.balances.totalBalanceUsd > a.balances.totalBalanceUsd) return 1;
        if (b.balances.totalBalanceUsd < a.balances.totalBalanceUsd) return -1;
        return 0;
      }),
    [assets]
  );

  return (
    <section className={cx("flex flex-col rounded-8 bg-slate-900", { grow: !hasAnyAssets })}>
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>My assets</Trans>
      </h2>

      {hasAnyAssets && (
        <div
          className={cx(
            "grid grid-cols-1 items-start gap-12 p-12",
            shouldUseFlex
              ? "md:flex md:flex-wrap md:items-start md:[&>div]:w-[359px]"
              : "md:grid-flow-dense md:grid-cols-2 min-[1300px]:grid-cols-3 min-[1460px]:grid-cols-4"
          )}
        >
          {sortedAssets.map((asset) => (
            <GmGlvAssetCard
              key={getGlvOrMarketAddress(asset.info)}
              marketInfo={asset.info}
              chainId={chainId}
              totalPerformanceApy={asset.totalPerformanceApy}
              performanceApy30d={asset.performanceApy30d}
              isPerformanceLoading={false}
              multichainMarketTokenBalances={asset.balances}
              hasBalanceOutsideWallet={false}
              earnings={asset.earnings}
              isEarningsLoading={false}
              isEarningsAvailable
            />
          ))}
        </div>
      )}

      {!hasAnyAssets && (
        <div className="flex h-full flex-col items-center justify-center gap-12 p-20">
          <EarnIcon className="size-20 text-blue-300" />
          <span className="text-body-small text-center font-medium text-typography-secondary">
            {account ? <Trans>No GM or GLV yet</Trans> : <Trans>Connect wallet to see your assets</Trans>}
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
