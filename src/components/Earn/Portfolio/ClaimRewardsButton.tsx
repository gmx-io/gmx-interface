import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { getChainNativeTokenSymbol, getChainWrappedTokenSymbol } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { PLACEHOLDER_ACCOUNT, StakingProcessedData } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import { ClaimModal } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/ClaimModal";

import EarnIcon from "img/ic_earn.svg?react";

type ClaimRewardsButtonProps = {
  processedData: StakingProcessedData | undefined;
  mutateProcessedData?: () => Promise<unknown> | void;
  className?: string;
};

export function ClaimRewardsButton({ processedData, mutateProcessedData, className }: ClaimRewardsButtonProps) {
  const { active, account, signer } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { chainId } = useChainId();
  const { setPendingTxns } = usePendingTxns();

  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const readerAddress = getContract(chainId, "Reader");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const glpAddress = getContract(chainId, "GLP");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];

  const { mutate: refetchBalances } = useSWR(
    readerAddress !== zeroAddress && [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, "ReaderV2", [walletTokens]),
    }
  );

  const nativeTokenSymbol = getChainNativeTokenSymbol(chainId);
  const wrappedTokenSymbol = getChainWrappedTokenSymbol(chainId);

  const hasGmxRewards = (processedData?.totalGmxRewards ?? 0n) > 0n;
  const hasEsGmxRewards = (processedData?.totalEsGmxRewards ?? 0n) > 0n;
  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;

  const handleClick = () => {
    if (!active) {
      openConnectModal?.();
      return;
    }

    setIsClaimModalVisible(true);
  };

  const handleClaimSuccess = () => {
    refetchBalances?.();
    mutateProcessedData?.();
  };

  return (
    <div className={cx("flex justify-end max-lg:w-full", className)}>
      <Button
        variant="secondary"
        onClick={handleClick}
        className="max-lg:w-full"
        disabled={!hasGmxRewards && !hasEsGmxRewards && !hasNativeRewards}
      >
        <EarnIcon className="size-16" />
        <Trans>Claim rewards</Trans>
      </Button>

      <ClaimModal
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        signer={signer}
        chainId={chainId}
        setPendingTxns={setPendingTxns}
        totalGmxRewards={processedData?.totalGmxRewards}
        totalEsGmxRewards={processedData?.totalEsGmxRewards}
        totalNativeTokenRewards={processedData?.totalNativeTokenRewards}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
        isNativeTokenToClaim={hasNativeRewards}
        onClaimSuccess={handleClaimSuccess}
        isRewardsSuspended={processedData?.isRewardsSuspended}
      />
    </div>
  );
}
