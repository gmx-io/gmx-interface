import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { Menu } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
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
import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import { bigMath } from "sdk/utils/bigmath";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { VestModal } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/VestModal";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import DownloadIcon from "img/ic_download2.svg?react";
import esGmxIcon from "img/ic_esgmx_40.svg";
import gmxIcon from "img/ic_gmx_40.svg";
import IncreaseMarketIcon from "img/ic_increasemarket_16.svg?react";
import MenuDotsIcon from "img/ic_menu_dots.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";
import ShareIcon from "img/ic_share.svg?react";

import { GMX_DAO_LINKS } from "./constants";
import { StakeModal, StakeModalTabConfig } from "./StakeModal";
import { BaseAssetCard } from "../BaseAssetCard";

export function GmxAssetCard({ processedData, esGmx = false }: { processedData: ProcessedData; esGmx?: boolean }) {
  const { chainId } = useChainId();
  const { active, signer, account } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeValue, setStakeValue] = useState("");
  const [unstakeValue, setUnstakeValue] = useState("");
  const [isVestModalVisible, setIsVestModalVisible] = useState(false);
  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);

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
    setIsStakeModalVisible(true);
    setStakeValue("");
  }, []);

  const handleOpenVestModal = useCallback(() => {
    setIsVestModalVisible(true);
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

  const stakeConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: balanceAmount,
      value: stakeValue,
      setValue: setStakeValue,
    }),
    [balanceAmount, stakeValue, setStakeValue]
  );

  const unstakeConfig: StakeModalTabConfig = useMemo(
    () => ({
      maxAmount: maxUnstakeAmount,
      value: unstakeValue,
      setValue: setUnstakeValue,
    }),
    [maxUnstakeAmount, unstakeValue, setUnstakeValue]
  );

  return (
    <div>
      <BaseAssetCard
        icon={<img src={icon} alt={title} className="size-40" />}
        title={title}
        headerButton={<DelegateDropdown />}
        footer={
          <div className={cx("grid w-full grid-cols-2 gap-8", { "grid-cols-3": esGmx })}>
            <Button variant="secondary" onClick={() => setIsBuyModalVisible(true)} className="whitespace-nowrap">
              <PlusCircleIcon className="size-16 shrink-0" />
              <Trans>Buy GMX</Trans>
            </Button>
            <Button variant="secondary" onClick={handleOpenStakeModal}>
              <DownloadIcon className="size-16 shrink-0" />
              <Trans>Stake</Trans>
            </Button>
            {esGmx && (
              <Button variant="secondary" onClick={handleOpenVestModal}>
                <IncreaseMarketIcon className="size-16 shrink-0" />
                <Trans>Vest</Trans>
              </Button>
            )}
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
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        signer={signer}
        tokenSymbol={stakeTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        stakeTokenAddress={stakeTokenAddress}
        stakeFarmAddress={farmAddress}
        reservedAmount={reservedAmount}
        stake={stakeConfig}
        unstake={unstakeConfig}
        setPendingTxns={setPendingTxns}
        processedData={processedData}
      />
      {esGmx && (
        <VestModal
          isVisible={isVestModalVisible}
          setIsVisible={setIsVestModalVisible}
          processedData={processedData}
          reservedAmount={reservedAmount}
        />
      )}
      <BuyGmxModal isVisible={isBuyModalVisible} setIsVisible={setIsBuyModalVisible} />
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
