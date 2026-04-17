import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { encodeFunctionData, maxUint256, zeroAddress } from "viem";

import type { AnyChainId, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { POINTS_REWARDS_DISTRIBUTION_ID } from "domain/synthetics/claims/constants";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/useAccountRewardsHistory";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { helperToast } from "lib/helperToast";
import { formatAmount } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler";
import { getTokenBySymbol } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import EarnIcon from "img/ic_earn.svg?react";

import { formatTimeLeft, getCurrentEpochEndTime, useCurrentUnixTimestamp } from "./epochTiming";

type Props = {
  chainId: number;
  account?: string;
};

export function SidebarRewards({ chainId, account }: Props) {
  const { data: config } = useIncentivesConfig(chainId);
  const { data: dashboard } = useAccountIncentiveDashboard(chainId, { account });
  const { data: rewardsHistory } = useAccountRewardsHistory(chainId, { account });
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const { openConnectModal } = useConnectModal();

  const rewardsBalance = dashboard?.rewardsBalance;
  const displayClaimableRewards = rewardsBalance ? formatAmount(rewardsBalance, 18, 4, true) : "0.0000";
  const hasRewards = rewardsBalance !== undefined && rewardsBalance > 0n;

  const currentEpochRewards = useMemo(() => {
    if (!config || !rewardsHistory?.length) return undefined;
    return rewardsHistory.find((entry) => entry.epoch === config.epochTimestamp)?.rewardsEarned;
  }, [config, rewardsHistory]);

  const totalEarnedRewards = useMemo(() => {
    if (!rewardsHistory?.length) return 0n;
    return rewardsHistory.reduce((acc, entry) => acc + entry.rewardsEarned, 0n);
  }, [rewardsHistory]);

  const displayEstimatedRewards = currentEpochRewards ? formatAmount(currentEpochRewards, 18, 4, true) : "0.0000";
  const displayTotalEarnedRewards = totalEarnedRewards ? formatAmount(totalEarnedRewards, 18, 4, true) : "0.0000";

  const now = useCurrentUnixTimestamp();
  const epochEndTime = getCurrentEpochEndTime(config, now);
  const timeLeft = epochEndTime > now ? formatTimeLeft(epochEndTime - now) : "";

  const pointsBalance = dashboard?.pointsBalance;
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 4, true) : "0.0000";

  if (!account) {
    return (
      <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
        <div className="flex flex-col gap-4">
          <span className="text-16 font-medium text-typography-primary">
            <Trans>Claim your GMX rewards</Trans>
          </span>
          <span className="text-body-small text-typography-secondary">
            <Trans>Connect your wallet to view your points balance and claim earned rewards.</Trans>
          </span>
        </div>
        <ConnectWalletButton onClick={openConnectModal}>
          <Trans>Connect wallet</Trans>
        </ConnectWalletButton>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-8 bg-slate-900 p-20">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-8">
              <span className="text-24 font-medium text-typography-primary">{displayClaimableRewards} GMX</span>
            </div>
            <div className="text-body-small flex items-center gap-2 font-medium leading-1 text-typography-secondary">
              <Trans>Claimable rewards</Trans>
              <TooltipWithPortal
                handle={undefined}
                content={t`GMX rewards available to claim or stake. Rewards are generated when your points are spent to discount trading fees.`}
                variant="iconStroke"
              />
            </div>
          </div>

          <Button
            variant="primary"
            className="shrink-0 max-lg:w-full"
            disabled={!hasRewards}
            onClick={() => setIsClaimModalOpen(true)}
            size="medium"
          >
            <EarnIcon className="size-16" />
            <Trans>Claim rewards</Trans>
          </Button>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t-1/2 border-slate-600 pt-16">
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="font-medium text-typography-secondary">
              <Trans>Epoch ends in</Trans>
            </span>
            <span className="text-typography-primary">{timeLeft || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="flex items-center gap-4 font-medium text-typography-secondary">
              <Trans>Estimated rewards</Trans>
              <TooltipWithPortal
                handle={undefined}
                content={t`Estimated GMX rewards generated during the current epoch.`}
                variant="iconStroke"
              />
            </span>
            <span className="text-typography-primary">{displayEstimatedRewards} GMX</span>
          </div>
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="flex items-center gap-4 font-medium text-typography-secondary">
              <Trans>Points balance</Trans>
              <TooltipWithPortal
                handle={undefined}
                content={t`Total non-expired points available. Points automatically discount up to 50% of your trading fees.`}
                variant="iconStroke"
              />
            </span>
            <span className="text-typography-primary">{displayPoints}</span>
          </div>
          <div className="flex items-center justify-between py-4 text-[1.3rem]">
            <span className="flex items-center gap-4 font-medium text-typography-secondary">
              <Trans>Total earned rewards</Trans>
              <TooltipWithPortal
                handle={undefined}
                content={t`Total rewards earned since the start of the program.`}
                variant="iconStroke"
              />
            </span>
            <span className="text-typography-primary">{displayTotalEarnedRewards} GMX</span>
          </div>
        </div>
      </div>

      <ClaimModal
        isOpen={isClaimModalOpen}
        setIsOpen={setIsClaimModalOpen}
        displayRewards={displayClaimableRewards}
        chainId={chainId}
        account={account}
      />
    </>
  );
}

function ClaimModal({
  isOpen,
  setIsOpen,
  displayRewards,
  chainId,
  account,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  displayRewards: string;
  chainId: number;
  account?: string;
}) {
  const { signer } = useWallet();
  const { srcChainId } = useChainId();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const [pendingAction, setPendingAction] = useState<"claim" | "claimAndStake" | "approve" | undefined>();
  const contractsChainId = chainId as ContractsChainId;
  const allowanceChainId = chainId as AnyChainId;
  // Off-settlement GMX-Account users need multichain relay wiring; disable claim to avoid wallet-chain mismatch until that lands.
  const isOnSettlementChain = srcChainId === undefined;

  const claimHandlerAddress = getContract(contractsChainId, "ClaimHandler");
  const dataStoreAddress = getContract(contractsChainId, "DataStore");
  const rewardRouterAddress = getContract(contractsChainId, "RewardRouter");
  const stakedGmxTrackerAddress = getContract(contractsChainId, "StakedGmxTracker");
  const gmxToken = getTokenBySymbol(contractsChainId, "GMX");

  const { data: rawClaimableAmount, mutate: mutateClaimableAmount } = useSWR(
    isOpen && account
      ? [
          `PointsRewardsClaimableAmount:${chainId}:${account}`,
          chainId,
          claimHandlerAddress,
          "getClaimableAmount",
          account,
          gmxToken.address,
          [POINTS_REWARDS_DISTRIBUTION_ID],
        ]
      : null,
    { fetcher: contractFetcher(undefined, "ClaimHandler") }
  );
  const { data: claimTerms } = useSWR(
    isOpen
      ? [
          `PointsRewardsClaimTerms:${chainId}:${POINTS_REWARDS_DISTRIBUTION_ID.toString()}`,
          chainId,
          dataStoreAddress,
          "getString",
          claimTermsKey(POINTS_REWARDS_DISTRIBUTION_ID),
        ]
      : null,
    { fetcher: contractFetcher(undefined, "DataStore") }
  );
  const { data: rawClaimsDisabled } = useSWR(
    isOpen
      ? [
          `PointsRewardsClaimsDisabled:${chainId}:${POINTS_REWARDS_DISTRIBUTION_ID.toString()}`,
          chainId,
          dataStoreAddress,
          "getBool",
          claimsDisabledKey(POINTS_REWARDS_DISTRIBUTION_ID),
        ]
      : null,
    { fetcher: contractFetcher(undefined, "DataStore") }
  );

  const claimableAmount = rawClaimableAmount !== undefined ? BigInt(rawClaimableAmount) : 0n;
  const claimsDisabled = Boolean(rawClaimsDisabled);
  const displayClaimableRewards = claimableAmount > 0n ? formatAmount(claimableAmount, 18, 4, true) : displayRewards;

  const claimParams = useMemo(
    () => [
      {
        token: gmxToken.address,
        distributionId: POINTS_REWARDS_DISTRIBUTION_ID,
        termsSignature: "0x",
        acceptedTerms: claimTerms ?? "",
      },
    ],
    [claimTerms, gmxToken.address]
  );

  const isStakeSupported = rewardRouterAddress !== zeroAddress && stakedGmxTrackerAddress !== zeroAddress;
  const { tokensAllowanceData, isLoaded: isStakeAllowanceLoaded } = useTokensAllowanceData(allowanceChainId, {
    spenderAddress: isStakeSupported ? stakedGmxTrackerAddress : undefined,
    tokenAddresses: isStakeSupported ? [gmxToken.address] : [],
    skip: !isOpen || !isStakeSupported,
  });

  const gmxAllowance = tokensAllowanceData?.[gmxToken.address];
  const needsStakeApproval =
    isStakeSupported && claimableAmount > 0n && gmxAllowance !== undefined && claimableAmount > BigInt(gmxAllowance);

  const canClaim = Boolean(
    account && signer && claimableAmount > 0n && !claimsDisabled && !hasOutdatedUi && isOnSettlementChain
  );
  const isClaiming = pendingAction === "claim";
  const isClaimAndStaking = pendingAction === "claimAndStake";
  const isApproving = pendingAction === "approve";

  const approveGmxForStaking = useCallback(async () => {
    if (!signer) return;

    setPendingAction("approve");
    try {
      const gmxContract = new ethers.Contract(gmxToken.address, abis.Token, signer);
      const tx = await callContract(chainId, gmxContract, "approve", [stakedGmxTrackerAddress, maxUint256], {
        sentMsg: t`GMX approval submitted`,
        failMsg: t`GMX approval failed`,
        successMsg: t`GMX approved`,
        setPendingTxns,
      });
      await tx.wait();
    } finally {
      setPendingAction(undefined);
    }
  }, [chainId, gmxToken.address, setPendingTxns, signer, stakedGmxTrackerAddress]);

  const submitClaim = useCallback(async () => {
    if (!account || !signer) {
      throw new Error("Wallet not connected");
    }

    const callData = encodeFunctionData({
      abi: ClaimHandlerAbi,
      functionName: "acceptTermsAndClaim",
      args: [claimParams, account],
    });

    const result = await sendWalletTransaction({
      chainId: contractsChainId,
      signer,
      to: claimHandlerAddress,
      callData,
      value: 0n,
    });

    const receipt = await result.wait();
    if (receipt?.status !== "success") {
      throw new Error("Claim transaction failed");
    }
  }, [account, claimHandlerAddress, claimParams, contractsChainId, signer]);

  const claimRewards = useCallback(async () => {
    if (!canClaim) {
      return;
    }

    setPendingAction("claim");

    try {
      await submitClaim();
      helperToast.success(t`Claim completed`);
      await mutateClaimableAmount(0n, false);
      setIsOpen(false);
    } catch {
      helperToast.error(t`Claim failed`);
    } finally {
      setPendingAction(undefined);
    }
  }, [canClaim, mutateClaimableAmount, setIsOpen, submitClaim]);

  const claimAndStakeRewards = useCallback(async () => {
    if (!account || !signer || !canClaim || !isStakeSupported) {
      return;
    }

    const stakeAmount = claimableAmount;
    let didClaim = false;

    try {
      if (needsStakeApproval) {
        await approveGmxForStaking();
      }

      setPendingAction("claimAndStake");

      await submitClaim();
      didClaim = true;
      helperToast.success(t`Claim completed`);
      await mutateClaimableAmount(0n, false);

      if (stakeAmount <= 0n) {
        throw new Error("No GMX claimed");
      }

      const rewardRouterContract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);
      const stakeTx = await callContract(chainId, rewardRouterContract, "stakeGmx", [stakeAmount], {
        sentMsg: t`Stake submitted`,
        failMsg: t`Stake failed`,
        successMsg: t`GMX staked`,
        setPendingTxns,
      });

      await stakeTx.wait();
      setIsOpen(false);
    } catch {
      if (!didClaim) {
        helperToast.error(t`Claim failed`);
      } else {
        setIsOpen(false);
        helperToast.info(
          t`GMX was claimed to your wallet. If staking did not complete, you can stake it from the Earn page.`
        );
      }
    } finally {
      setPendingAction(undefined);
    }
  }, [
    account,
    approveGmxForStaking,
    canClaim,
    chainId,
    claimableAmount,
    isStakeSupported,
    mutateClaimableAmount,
    needsStakeApproval,
    rewardRouterAddress,
    setIsOpen,
    setPendingTxns,
    signer,
    submitClaim,
  ]);

  const claimButtonText = isClaiming ? t`Claiming...` : hasOutdatedUi ? getPageOutdatedError() : t`Claim`;
  const claimAndStakeButtonText = isApproving
    ? t`Approving...`
    : isClaimAndStaking
      ? t`Claiming + staking...`
      : hasOutdatedUi
        ? getPageOutdatedError()
        : t`Claim + stake`;

  return (
    <ModalWithPortal
      isVisible={isOpen}
      setIsVisible={setIsOpen}
      label={t`Claim rewards`}
      withMobileBottomPosition
      contentPadding={false}
    >
      <div className="flex flex-col gap-16 p-16">
        <div>
          <span className="text-body-small text-typography-secondary">
            <Trans>Available to Claim</Trans>
          </span>
          <div className="text-h2 mt-4 font-medium text-typography-primary">{displayClaimableRewards} GMX</div>
          <p className="text-body-small mt-8 text-typography-secondary">
            <Trans>
              Claim your rewards now. You can also stake them instantly to get 5% yield on it and earn even more points.
            </Trans>
          </p>
          {claimsDisabled ? (
            <p className="text-body-small mt-8 text-typography-secondary">
              <Trans>Claims are currently unavailable for this distribution.</Trans>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-8">
          <Button
            variant="primary-action"
            className="w-full"
            disabled={
              !canClaim ||
              !isStakeSupported ||
              !isStakeAllowanceLoaded ||
              isClaiming ||
              isClaimAndStaking ||
              isApproving
            }
            onClick={claimAndStakeRewards}
          >
            {claimAndStakeButtonText}
          </Button>
          <button
            className="text-body-medium w-full py-8 text-center text-typography-secondary hover:text-typography-primary disabled:cursor-not-allowed disabled:text-typography-secondary/60"
            disabled={!canClaim || isClaiming || isClaimAndStaking || isApproving}
            onClick={claimRewards}
          >
            {claimButtonText}
          </button>
        </div>
      </div>
    </ModalWithPortal>
  );
}
