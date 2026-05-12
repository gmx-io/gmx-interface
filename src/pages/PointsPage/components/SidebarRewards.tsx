import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { maxUint256, zeroAddress } from "viem";

import type { AnyChainId, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { POINTS_REWARDS_DISTRIBUTION_ID } from "domain/synthetics/claims/constants";
import { encodeAcceptTermsAndClaim } from "domain/synthetics/claims/createClaimTransaction";
import { useAccountIncentiveDashboard } from "domain/synthetics/incentives/useAccountIncentiveDashboard";
import { useIncentivesConfig } from "domain/synthetics/incentives/useIncentivesConfig";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { contractFetcher } from "lib/contracts/contractFetcher";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatAmount } from "lib/numbers";
import { sendWalletTransaction } from "lib/transactions";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import {
  sendClaimRewardsResultEvent,
  sendStakeRewardsClickEvent,
  sendStakeRewardsResultEvent,
} from "lib/userAnalytics/pointsEvents";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
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
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const { openConnectModal } = useConnectModal();

  const contractsChainId = chainId as ContractsChainId;
  const claimHandlerAddress = getContract(contractsChainId, "ClaimHandler");
  const gmxTokenAddress = getTokenBySymbol(contractsChainId, "GMX").address;

  const { data: rawClaimableAmount, mutate: mutateClaimableAmount } = useSWR(
    account
      ? [
          `PointsRewardsClaimableAmount:${chainId}:${account}`,
          chainId,
          claimHandlerAddress,
          "getClaimableAmount",
          account,
          gmxTokenAddress,
          [POINTS_REWARDS_DISTRIBUTION_ID],
        ]
      : null,
    { fetcher: contractFetcher(undefined, "ClaimHandler") }
  );

  const claimableAmount = rawClaimableAmount !== undefined ? BigInt(rawClaimableAmount) : 0n;
  const displayClaimableRewards = formatAmount(claimableAmount, 18, 2, true);
  const hasRewards = claimableAmount > 0n;

  const totalEarnedRewards = dashboard?.rewardsBalance ?? 0n;
  const displayTotalEarnedRewards = totalEarnedRewards ? formatAmount(totalEarnedRewards, 18, 2, true) : "0.00";

  const now = useCurrentUnixTimestamp();
  const epochEndTime = getCurrentEpochEndTime(config, now);
  const timeLeft = epochEndTime > now ? formatTimeLeft(epochEndTime - now) : "";

  const pointsBalance = dashboard?.pointsBalance;
  const displayPoints = pointsBalance ? formatAmount(pointsBalance, 18, 2, true) : "0.00";

  if (!account) {
    return (
      <div className="flex flex-col gap-12 rounded-8 bg-slate-900 p-20">
        <div className="flex flex-col gap-4">
          <span className="text-16 font-medium text-typography-primary">
            <Trans>Claim your GMX rewards</Trans>
          </span>
          <span className="text-12 text-typography-secondary">
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
            <div className="flex items-center gap-2 text-12 font-medium leading-1 text-typography-secondary">
              <TooltipWithPortal
                handle={<Trans>Claimable rewards</Trans>}
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

        <div className="mt-16 flex flex-col border-t-1/2 border-slate-600 pt-16">
          <div className="flex h-24 items-center justify-between text-13 font-medium text-typography-secondary">
            <Trans>Epoch ends in</Trans>
            <span className="text-typography-primary">{timeLeft || "—"}</span>
          </div>
          <div className="flex h-24 items-center justify-between text-13 font-medium text-typography-secondary">
            <TooltipWithPortal
              handle={<Trans>Points balance</Trans>}
              content={t`Total non-expired points available. Points automatically discount up to 50% of your trading fees.`}
              variant="iconStroke"
            />

            <span className="text-typography-primary">{displayPoints}</span>
          </div>
          <div className="flex h-24 items-center justify-between text-13  font-medium text-typography-secondary">
            <TooltipWithPortal
              handle={<Trans>Total earned rewards</Trans>}
              content={t`Total rewards earned since the start of the program.`}
              variant="iconStroke"
            />

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
        claimableAmount={claimableAmount}
        mutateClaimableAmount={mutateClaimableAmount}
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
  claimableAmount,
  mutateClaimableAmount,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  displayRewards: string;
  chainId: number;
  account?: string;
  claimableAmount: bigint;
  mutateClaimableAmount: KeyedMutator<any>;
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

  const claimsDisabled = Boolean(rawClaimsDisabled);
  const displayClaimableRewards = claimableAmount > 0n ? formatAmount(claimableAmount, 18, 2, true) : displayRewards;

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

  // Intentionally uses `callContract` + `tx.wait()` (not the shared `approveTokens` helper)
  // because the follow-up `stakeGmx` call requires the approval to be mined first —
  // `approveTokens` fires its callback when the tx is submitted, not when it is mined.
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Points GMX stake approval failed", err);
      metrics.pushError(err, "pointsSidebar.stakeApprove");
      throw err;
    } finally {
      setPendingAction(undefined);
    }
  }, [chainId, gmxToken.address, setPendingTxns, signer, stakedGmxTrackerAddress]);

  const submitClaim = useCallback(async () => {
    if (!account || !signer) {
      throw new Error("Wallet not connected");
    }

    const callData = encodeAcceptTermsAndClaim(claimParams, account);

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
      // Revalidate the on-chain claimable amount before submitting so we don't send a tx
      // against stale data if the modal has been sitting open for a while.
      const latestRaw = await mutateClaimableAmount();
      const latest = latestRaw !== undefined ? BigInt(latestRaw) : 0n;
      if (latest <= 0n) {
        helperToast.error(t`No rewards available to claim`);
        return;
      }

      await submitClaim();
      sendClaimRewardsResultEvent(true);
      helperToast.success(t`Claim completed`);
      await mutateClaimableAmount(0n, false);
      setIsOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Points rewards claim failed", err);
      metrics.pushError(err, "pointsSidebar.claim");
      sendClaimRewardsResultEvent(false);
      helperToast.error(t`Claim failed`);
    } finally {
      setPendingAction(undefined);
    }
  }, [canClaim, mutateClaimableAmount, setIsOpen, submitClaim]);

  const claimAndStakeRewards = useCallback(async () => {
    if (!account || !signer || !canClaim || !isStakeSupported) {
      return;
    }

    let stakeAmount = claimableAmount;
    let didAttemptClaim = false;
    let didClaim = false;
    sendStakeRewardsClickEvent();

    try {
      if (needsStakeApproval) {
        await approveGmxForStaking();
      }

      setPendingAction("claimAndStake");

      // Revalidate the on-chain claimable amount before submitting so we stake the
      // actual amount that will be claimed, not a stale cached value.
      const latestRaw = await mutateClaimableAmount();
      const latest = latestRaw !== undefined ? BigInt(latestRaw) : 0n;
      if (latest <= 0n) {
        helperToast.error(t`No rewards available to claim`);
        return;
      }
      stakeAmount = latest;

      didAttemptClaim = true;
      await submitClaim();
      didClaim = true;
      sendClaimRewardsResultEvent(true);
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
      sendStakeRewardsResultEvent(true);
      setIsOpen(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Points rewards claim+stake failed", err);
      metrics.pushError(err, didClaim ? "pointsSidebar.stakeAfterClaim" : "pointsSidebar.claimAndStake");
      if (didAttemptClaim && !didClaim) {
        sendClaimRewardsResultEvent(false);
      }
      sendStakeRewardsResultEvent(false);
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
          <span className="text-12 text-typography-secondary">
            <Trans>Available to Claim</Trans>
          </span>
          <div className="text-h2 mt-4 font-medium text-typography-primary">{displayClaimableRewards} GMX</div>
          <p className="mt-8 text-12 text-typography-secondary">
            <Trans>
              Claim your rewards now. You can also stake them instantly to get 5% yield on it and earn even more points.
            </Trans>
          </p>
          {claimsDisabled ? (
            <p className="mt-8 text-12 text-typography-secondary">
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
            className="w-full py-8 text-center text-14 text-typography-secondary hover:text-typography-primary disabled:cursor-not-allowed disabled:text-typography-secondary/60"
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
