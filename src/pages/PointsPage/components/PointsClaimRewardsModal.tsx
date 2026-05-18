import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { maxUint256, zeroAddress } from "viem";

import type { AnyChainId, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { POINTS_REWARDS_DISTRIBUTION_ID } from "domain/synthetics/claims/constants";
import { encodeAcceptTermsAndClaim } from "domain/synthetics/claims/createClaimTransaction";
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
import ModalWithPortal from "components/Modal/ModalWithPortal";

import CheckCircleIcon from "img/ic_check_circle.svg?react";
import EarnIcon from "img/ic_earn.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

const CLAIM_MODAL_AUTO_CLOSE_SECONDS = 5;

type PointsRewardsClaimFlowMode = "claimOnly" | "claimAndStake";
type PointsRewardsClaimFlowStep = "idle" | "claimPending" | "claimSucceeded" | "stakePending" | "stakeSucceeded";

type PointsClaimRewardsModalProps = {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  displayRewards: string;
  chainId: number;
  account?: string;
  claimableAmount: bigint;
  mutateClaimableAmount: KeyedMutator<any>;
};

export function PointsClaimRewardsModal({
  isOpen,
  setIsOpen,
  displayRewards,
  chainId,
  account,
  claimableAmount,
  mutateClaimableAmount,
}: PointsClaimRewardsModalProps) {
  const { signer } = useWallet();
  const { srcChainId } = useChainId();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const [pendingAction, setPendingAction] = useState<"claim" | "claimAndStake" | "approve" | undefined>();
  const [claimFlowMode, setClaimFlowMode] = useState<PointsRewardsClaimFlowMode | undefined>();
  const [claimFlowStep, setClaimFlowStep] = useState<PointsRewardsClaimFlowStep>("idle");
  const [submittedClaimAmount, setSubmittedClaimAmount] = useState<bigint | undefined>();
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(CLAIM_MODAL_AUTO_CLOSE_SECONDS);
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
  const displayedRewardAmount =
    submittedClaimAmount !== undefined && submittedClaimAmount > 0n ? submittedClaimAmount : claimableAmount;
  const displayClaimableRewards =
    displayedRewardAmount > 0n ? formatAmount(displayedRewardAmount, 18, 2, true) : displayRewards;

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
  const isClaimFlowPending = isClaiming || isClaimAndStaking || isApproving;
  const isClaimFlowCompleted =
    (claimFlowMode === "claimOnly" && claimFlowStep === "claimSucceeded") || claimFlowStep === "stakeSucceeded";

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setPendingAction(undefined);
    setClaimFlowMode(undefined);
    setClaimFlowStep("idle");
    setSubmittedClaimAmount(undefined);
    setAutoCloseSeconds(CLAIM_MODAL_AUTO_CLOSE_SECONDS);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isClaimFlowCompleted) {
      return;
    }

    setAutoCloseSeconds(CLAIM_MODAL_AUTO_CLOSE_SECONDS);

    const countdownInterval = setInterval(() => {
      setAutoCloseSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    const closeTimer = setTimeout(() => {
      setIsOpen(false);
    }, CLAIM_MODAL_AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(closeTimer);
    };
  }, [isClaimFlowCompleted, isOpen, setIsOpen]);

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
    setClaimFlowMode("claimOnly");
    setClaimFlowStep("claimPending");
    setSubmittedClaimAmount(claimableAmount);

    try {
      // Revalidate the on-chain claimable amount before submitting so we don't send a tx
      // against stale data if the modal has been sitting open for a while.
      const latestRaw = await mutateClaimableAmount();
      const latest = latestRaw !== undefined ? BigInt(latestRaw) : 0n;
      if (latest <= 0n) {
        setClaimFlowMode(undefined);
        setClaimFlowStep("idle");
        setSubmittedClaimAmount(undefined);
        helperToast.error(t`No rewards available to claim`);
        return;
      }
      setSubmittedClaimAmount(latest);

      await submitClaim();
      sendClaimRewardsResultEvent(true);
      helperToast.success(t`Claim completed`);
      await mutateClaimableAmount(0n, false);
      setClaimFlowStep("claimSucceeded");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Points rewards claim failed", err);
      metrics.pushError(err, "pointsSidebar.claim");
      sendClaimRewardsResultEvent(false);
      helperToast.error(t`Claim failed`);
      setClaimFlowMode(undefined);
      setClaimFlowStep("idle");
      setSubmittedClaimAmount(undefined);
    } finally {
      setPendingAction(undefined);
    }
  }, [canClaim, claimableAmount, mutateClaimableAmount, submitClaim]);

  const claimAndStakeRewards = useCallback(async () => {
    if (!account || !signer || !canClaim || !isStakeSupported) {
      return;
    }

    let stakeAmount = claimableAmount;
    let didAttemptClaim = false;
    let didClaim = false;
    sendStakeRewardsClickEvent();
    setClaimFlowMode("claimAndStake");
    setSubmittedClaimAmount(claimableAmount);

    try {
      if (needsStakeApproval) {
        await approveGmxForStaking();
      }

      setPendingAction("claimAndStake");
      setClaimFlowStep("claimPending");

      // Revalidate the on-chain claimable amount before submitting so we stake the
      // actual amount that will be claimed, not a stale cached value.
      const latestRaw = await mutateClaimableAmount();
      const latest = latestRaw !== undefined ? BigInt(latestRaw) : 0n;
      if (latest <= 0n) {
        setClaimFlowMode(undefined);
        setClaimFlowStep("idle");
        setSubmittedClaimAmount(undefined);
        helperToast.error(t`No rewards available to claim`);
        return;
      }
      stakeAmount = latest;
      setSubmittedClaimAmount(latest);

      didAttemptClaim = true;
      await submitClaim();
      didClaim = true;
      setClaimFlowStep("claimSucceeded");
      sendClaimRewardsResultEvent(true);
      helperToast.success(t`Claim completed`);
      await mutateClaimableAmount(0n, false);

      if (stakeAmount <= 0n) {
        throw new Error("No GMX claimed");
      }

      const rewardRouterContract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);
      setClaimFlowStep("stakePending");
      const stakeTx = await callContract(chainId, rewardRouterContract, "stakeGmx", [stakeAmount], {
        sentMsg: t`Stake submitted`,
        failMsg: t`Stake failed`,
        successMsg: t`GMX staked`,
        setPendingTxns,
      });

      await stakeTx.wait();
      sendStakeRewardsResultEvent(true);
      setClaimFlowStep("stakeSucceeded");
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
        setClaimFlowMode(undefined);
        setClaimFlowStep("idle");
        setSubmittedClaimAmount(undefined);
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

  const claimButtonText = hasOutdatedUi ? getPageOutdatedError() : t`Claim only`;
  const pendingButtonText = isApproving ? t`Approving...` : t`Waiting for confirmation`;
  const claimAndStakeButtonText = hasOutdatedUi ? getPageOutdatedError() : t`Stake and earn more rewards`;
  const isRewardAmountConfirmed =
    claimFlowStep === "claimSucceeded" || claimFlowStep === "stakePending" || claimFlowStep === "stakeSucceeded";

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
            {claimFlowStep === "stakeSucceeded" ? (
              <Trans>Staked</Trans>
            ) : isRewardAmountConfirmed ? (
              <Trans>Claimed</Trans>
            ) : (
              <Trans>Available to Claim</Trans>
            )}
          </span>
          <div
            className={cx(
              "text-h2 mt-4 font-medium",
              isRewardAmountConfirmed ? "text-green-500" : "text-typography-primary"
            )}
          >
            {displayClaimableRewards} GMX
          </div>
          <p className="mt-8 text-12 text-typography-secondary">
            {claimFlowStep === "stakeSucceeded" ? (
              <Trans>Your rewards have been staked. You are now earning more points and rewards.</Trans>
            ) : isRewardAmountConfirmed ? (
              <Trans>Your rewards have been claimed to your wallet. You can now stake them.</Trans>
            ) : (
              <Trans>Claim your rewards now. You can also stake them instantly to earn more points and rewards.</Trans>
            )}
          </p>
          {claimsDisabled ? (
            <p className="mt-8 text-12 text-typography-secondary">
              <Trans>Claims are currently unavailable for this distribution.</Trans>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-8">
          {isClaimFlowCompleted ? null : isClaimFlowPending ? (
            <Button variant="secondary" className="w-full" disabled size="medium">
              <SpinnerIcon className="size-16 animate-spin" />
              {pendingButtonText}
            </Button>
          ) : (
            <>
              <Button
                variant="primary-action"
                className="w-full"
                disabled={!canClaim || !isStakeSupported || !isStakeAllowanceLoaded}
                onClick={claimAndStakeRewards}
              >
                {claimAndStakeButtonText}
                <EarnIcon className="size-16" />
              </Button>
              <button
                className="w-full py-8 text-center text-14 text-typography-secondary hover:text-typography-primary disabled:cursor-not-allowed disabled:text-typography-secondary/60"
                disabled={!canClaim}
                onClick={claimRewards}
              >
                {claimButtonText}
              </button>
            </>
          )}
        </div>

        {claimFlowMode === "claimAndStake" && claimFlowStep !== "idle" ? (
          <PointsRewardsClaimSteps step={claimFlowStep} />
        ) : null}

        {isClaimFlowCompleted ? (
          <div className="text-12 text-typography-secondary">
            <Trans>Will close automatically in {autoCloseSeconds}...</Trans>
          </div>
        ) : null}
      </div>
    </ModalWithPortal>
  );
}

function PointsRewardsClaimSteps({ step }: { step: PointsRewardsClaimFlowStep }) {
  const isClaimComplete = step === "claimSucceeded" || step === "stakePending" || step === "stakeSucceeded";
  const isStakeComplete = step === "stakeSucceeded";

  return (
    <div className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-12">
      <PointsRewardsClaimStep
        index={1}
        status={isClaimComplete ? "completed" : "active"}
        label={isClaimComplete ? <Trans>Rewards claimed</Trans> : <Trans>Claim rewards</Trans>}
        description={isClaimComplete ? undefined : <Trans>Waiting for confirmation...</Trans>}
      />
      <PointsRewardsClaimStep
        index={2}
        status={isStakeComplete ? "completed" : step === "stakePending" ? "active" : "pending"}
        label={isStakeComplete ? <Trans>Rewards staked</Trans> : <Trans>Stake rewards</Trans>}
        description={
          isStakeComplete ? undefined : step === "stakePending" ? (
            <Trans>Waiting for confirmation...</Trans>
          ) : (
            <Trans>Stake to boost your multiplier</Trans>
          )
        }
      />
    </div>
  );
}

function PointsRewardsClaimStep({
  index,
  status,
  label,
  description,
}: {
  index: number;
  status: "completed" | "active" | "pending";
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-8">
      <div className="mt-1 flex size-16 shrink-0 items-center justify-center">
        {status === "completed" ? (
          <CheckCircleIcon className="size-16 text-blue-300" />
        ) : (
          <span
            className={cx(
              "flex size-16 items-center justify-center rounded-full border text-11 font-medium",
              status === "active"
                ? "border-blue-300 bg-blue-300 text-slate-950"
                : "border-slate-600 text-typography-secondary"
            )}
          >
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-16 items-center justify-between gap-8">
          <span
            className={cx(
              "text-13 font-medium",
              status === "pending" ? "text-typography-secondary" : "text-typography-primary"
            )}
          >
            {label}
          </span>
          {status === "active" ? (
            <span className="shrink-0 rounded-full bg-blue-300/10 px-6 py-2 text-11 font-medium text-blue-300">
              <Trans>In progress</Trans>
            </span>
          ) : null}
        </div>
        {description ? <div className="mt-2 text-12 text-typography-secondary">{description}</div> : null}
      </div>
    </div>
  );
}
