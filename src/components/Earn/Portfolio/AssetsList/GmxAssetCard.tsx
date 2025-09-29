import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { ARBITRUM, getConstant } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { PLACEHOLDER_ACCOUNT, ProcessedData } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { GMX_DAO_LINKS } from "pages/Stake/constants";
import { StakeModal } from "pages/Stake/StakeModal";
import { UnstakeModal } from "pages/Stake/UnstakeModal";
import { bigMath } from "sdk/utils/bigmath";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import BuyIcon from "img/ic_buy.svg?react";
import DownloadIcon from "img/ic_download2.svg?react";
import esGmxIcon from "img/ic_esgmx_40.svg";
import gmxIcon from "img/ic_gmx_40.svg";
import IncreaseLimit from "img/ic_increaselimit_16.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import ShareIcon from "img/ic_share.svg?react";

import { BaseAssetCard } from "./BaseAssetCard";

type StakeModalState = {
  isVisible: boolean;
  value: string;
};

type UnstakeModalState = {
  isVisible: boolean;
  value: string;
};

export function GmxAssetCard({ processedData, esGmx = false }: { processedData: ProcessedData; esGmx?: boolean }) {
  const { chainId } = useChainId();
  const { active, signer, account } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  const [stakeModalState, setStakeModalState] = useState<StakeModalState>({ isVisible: false, value: "" });
  const [unstakeModalState, setUnstakeModalState] = useState<UnstakeModalState>({ isVisible: false, value: "" });

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");

  const shouldFetchSbfGmx = chainId !== undefined && feeGmxTrackerAddress !== zeroAddress;
  const { data: sbfGmxBalance } = useSWR<bigint>(
    shouldFetchSbfGmx
      ? [
          `EarnPortfolio:sbfGmxBalance:${account ?? PLACEHOLDER_ACCOUNT}`,
          chainId,
          feeGmxTrackerAddress,
          "balanceOf",
          account ?? PLACEHOLDER_ACCOUNT,
        ]
      : null,
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );

  const reservedAmount = useMemo(() => {
    if (sbfGmxBalance === undefined) {
      return 0n;
    }

    const stakedTotal = (processedData?.gmxInStakedGmx ?? 0n) + (processedData?.esGmxInStakedGmx ?? 0n);
    const reserved = stakedTotal - sbfGmxBalance;

    return reserved > 0n ? reserved : 0n;
  }, [processedData?.esGmxInStakedGmx, processedData?.gmxInStakedGmx, sbfGmxBalance]);

  const stakeTokenSymbol = esGmx ? "esGMX" : "GMX";
  const title = esGmx ? "esGMX" : "GMX";
  const icon = esGmx ? esGmxIcon : gmxIcon;
  const balanceAmount = esGmx ? processedData?.esGmxBalance : processedData?.gmxBalance;
  const balanceUsd = esGmx ? processedData?.esGmxBalanceUsd : processedData?.gmxBalanceUsd;
  const stakedAmount = esGmx ? processedData?.esGmxInStakedGmx : processedData?.gmxInStakedGmx;
  const stakedUsd = esGmx ? processedData?.esGmxInStakedGmxUsd : processedData?.gmxInStakedGmxUsd;
  const stakeTitle = esGmx ? t`Stake esGMX` : t`Stake GMX`;
  const unstakeTitle = esGmx ? t`Unstake esGMX` : t`Unstake GMX`;
  const stakeMethod = esGmx ? "stakeEsGmx" : "stakeGmx";
  const unstakeMethod = esGmx ? "unstakeEsGmx" : "unstakeGmx";
  const stakeTokenAddress = esGmx ? esGmxAddress : gmxAddress;
  const farmAddress = esGmx ? zeroAddress : stakedGmxTrackerAddress;

  const maxUnstakeAmount = useMemo(() => {
    if (stakedAmount === undefined) {
      return undefined;
    }

    if (sbfGmxBalance === undefined) {
      return stakedAmount;
    }

    return bigMath.min(stakedAmount, sbfGmxBalance);
  }, [sbfGmxBalance, stakedAmount]);

  const handleOpenStakeModal = useCallback(() => {
    setStakeModalState({ isVisible: true, value: "" });
  }, []);

  const handleOpenUnstakeModal = useCallback(() => {
    setUnstakeModalState({ isVisible: true, value: "" });
  }, []);

  const priceRowValue = gmxPrice === undefined ? "..." : formatUsd(gmxPrice);

  const aprHandle = useMemo(() => {
    if (processedData?.gmxAprTotal === undefined) {
      return "...";
    }

    return <span className="numbers">{formatAmount(processedData.gmxAprTotal, 2, 2, true)}%</span>;
  }, [processedData?.gmxAprTotal]);

  const aprRowValue = useMemo(() => {
    if (processedData?.gmxAprTotal === undefined) {
      return "...";
    }

    return (
      <Tooltip
        position="bottom-end"
        handle={aprHandle}
        renderContent={() => (
          <GMXAprTooltip processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} isUserConnected={active} />
        )}
      />
    );
  }, [aprHandle, processedData, nativeTokenSymbol, active]);

  return (
    <div>
      <BaseAssetCard
        icon={<img src={icon} alt={title} className="size-40" />}
        title={title}
        headerButton={<DelegateDropdown />}
        footer={
          <div className="grid w-full grid-cols-3 gap-8">
            <Button variant="secondary" to="/buy_gmx" className="whitespace-nowrap">
              <BuyIcon className="size-16 shrink-0" />
              <Trans>Buy GMX</Trans>
            </Button>
            <Button variant="secondary" onClick={handleOpenStakeModal} disabled={!active}>
              <DownloadIcon className="size-16 shrink-0" />
              <Trans>Stake</Trans>
            </Button>
            <Button variant="secondary" onClick={handleOpenUnstakeModal} disabled={!active}>
              <IncreaseLimit className="size-16 shrink-0" />
              <Trans>Unstake</Trans>
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-12">
          <SyntheticsInfoRow label={<Trans>Price</Trans>} value={priceRowValue} />
          <SyntheticsInfoRow label={<Trans>APR</Trans>} value={aprRowValue} />
          <SyntheticsInfoRow
            label={<Trans>Wallet</Trans>}
            value={
              <AmountWithUsdBalance amount={balanceAmount} decimals={18} usd={balanceUsd} symbol={stakeTokenSymbol} />
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Staked</Trans>}
            value={
              <AmountWithUsdBalance amount={stakedAmount} decimals={18} usd={stakedUsd} symbol={stakeTokenSymbol} />
            }
          />
        </div>
      </BaseAssetCard>

      <StakeModal
        isVisible={stakeModalState.isVisible}
        setIsVisible={(isVisible) => setStakeModalState((state) => ({ ...state, isVisible }))}
        chainId={chainId}
        title={stakeTitle}
        maxAmount={balanceAmount}
        value={stakeModalState.value}
        setValue={(value) => setStakeModalState((state) => ({ ...state, value }))}
        signer={signer}
        stakingTokenSymbol={stakeTokenSymbol}
        stakingTokenAddress={stakeTokenAddress}
        farmAddress={farmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethod}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />

      <UnstakeModal
        isVisible={unstakeModalState.isVisible}
        setIsVisible={(isVisible) => setUnstakeModalState((state) => ({ ...state, isVisible }))}
        chainId={chainId}
        title={unstakeTitle}
        maxAmount={maxUnstakeAmount}
        value={unstakeModalState.value}
        setValue={(value) => setUnstakeModalState((state) => ({ ...state, value }))}
        signer={signer}
        unstakingTokenSymbol={stakeTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethod}
        reservedAmount={reservedAmount}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />
    </div>
  );
}

function DelegateDropdown() {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(8), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  return (
    <Menu>
      <Menu.Button as="div" ref={refs.setReference}>
        <Button variant="secondary" className="w-32 !p-0">
          <MenuDotsIcon className="size-16" />
        </Button>
      </Menu.Button>
      <FloatingPortal>
        <Menu.Items
          as="div"
          ref={refs.setFloating}
          style={floatingStyles}
          className="menu-items max-w-[160px] rounded-8 border-1/2 border-slate-600 bg-slate-900 !pb-0"
        >
          <Menu.Item>
            {() => (
              <a href={GMX_DAO_LINKS.VOTING_POWER} target="_blank" rel="noopener noreferrer" className="menu-item">
                <ShareIcon className="size-16" />
                <p>
                  <Trans>Delegate</Trans>
                </p>
              </a>
            )}
          </Menu.Item>
        </Menu.Items>
      </FloatingPortal>
    </Menu>
  );
}

export default GmxAssetCard;
