import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { getConstant } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { PLACEHOLDER_ACCOUNT, ProcessedData } from "lib/legacy";
import useWallet from "lib/wallets/useWallet";
import { ClaimModal } from "pages/Stake/ClaimModal";

import Button from "components/Button/Button";

import EarnIcon from "img/ic_earn.svg?react";

type ClaimRewardsButtonProps = {
  processedData: ProcessedData | undefined;
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

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  const hasNativeRewards = (processedData?.totalNativeTokenRewards ?? 0n) > 0n;
  const hasAnyRewards = (processedData?.totalRewardsUsd ?? 0n) > 0n;

  const handleClick = useCallback(() => {
    if (!active) {
      openConnectModal?.();
      return;
    }

    setIsClaimModalVisible(true);
  }, [active, openConnectModal]);

  const handleClaimSuccess = useCallback(() => {
    refetchBalances?.();
    mutateProcessedData?.();
  }, [mutateProcessedData, refetchBalances]);

  return (
    <div className={cx("flex justify-end max-lg:w-full", className)}>
      <Button variant="secondary" onClick={handleClick} disabled={active && !hasAnyRewards} className="max-lg:w-full">
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
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
        isNativeTokenToClaim={hasNativeRewards}
        onClaimSuccess={handleClaimSuccess}
      />
    </div>
  );
}

export default ClaimRewardsButton;
