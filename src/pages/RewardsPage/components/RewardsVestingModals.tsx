import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { maxUint256 } from "viem";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import {
  getRewardsVestingAvailableAmount,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingMaxDepositAmount,
  getRewardsVestingPairAmounts,
} from "domain/vesting/rewardsVesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { formatRelativeDateWithComma } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { sendRewardsTransactionResultEvent } from "lib/userAnalytics/rewardsEvents";
import useWallet from "lib/wallets/useWallet";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { GMX_DAO_LINKS } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import NumberInput from "components/NumberInput/NumberInput";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CheckIcon from "img/ic_check.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";
import SpinnerBlueIcon from "img/ic_spinner_blue.svg?react";

import { getRewardsVestingDebugCalculationData } from "../rewardsVestingDebug";
import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";

type RewardsVestingDataMutator = () => Promise<RewardsVestingData | undefined>;

type RewardsVestingModalProps = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  data: RewardsVestingData;
  mutate: RewardsVestingDataMutator;
  onBuyGmx: () => void;
  claimableEsGmxAmount?: bigint;
  onSimulatedClaim?: () => Promise<void>;
  onSimulatedStake?: (stakeAmount: bigint) => Promise<void>;
  onSimulatedVest?: (depositAmount: bigint) => Promise<void>;
};

function formatTokenAmount(amount: bigint, displayDecimals = 2) {
  return formatAmount(amount, GMX_DECIMALS, displayDecimals, true, { trimTrailingZeros: true });
}

function getEffectiveRemainingAmount(data: RewardsVestingData) {
  return getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: data.vestingInfo.vestedAmount,
    escrowedBalance: data.vestingInfo.escrowedBalance,
    claimedAmount: data.vestingInfo.claimedAmounts,
    claimableAmount: data.vestingInfo.claimable,
  });
}

function getVestingLimit(data: RewardsVestingData, availableEsGmxAmount = data.walletEsGmxBalance) {
  return getRewardsVestingAvailableAmount({
    walletEsGmxAmount: availableEsGmxAmount,
    totalVestedAmount: data.vestingInfo.vestedAmount,
    maxVestableAmount: data.vestingInfo.maxVestableAmount,
  });
}

function getVestingPreview(data: RewardsVestingData, depositAmount: bigint) {
  return getRewardsVestingPairAmounts({
    effectiveRemainingAmount: getEffectiveRemainingAmount(data),
    depositAmount,
    averageStakedAmount: data.vestingInfo.averageStakedAmount,
    maxVestableAmount: data.vestingInfo.maxVestableAmount,
    currentPairAmount: data.vestingInfo.pairAmount,
    availablePairAmount: data.freePairAmount,
  });
}

function hasVestingPositionSnapshotChanged(currentData: RewardsVestingData, nextData: RewardsVestingData) {
  const currentInfo = currentData.vestingInfo;
  const nextInfo = nextData.vestingInfo;

  return (
    currentInfo.pairAmount !== nextInfo.pairAmount ||
    currentInfo.vestedAmount !== nextInfo.vestedAmount ||
    currentInfo.escrowedBalance !== nextInfo.escrowedBalance ||
    currentInfo.claimedAmounts !== nextInfo.claimedAmounts
  );
}

function hasVestingFundingPreviewChanged(currentData: RewardsVestingData, nextData: RewardsVestingData) {
  const currentInfo = currentData.vestingInfo;
  const nextInfo = nextData.vestingInfo;

  return (
    hasVestingPositionSnapshotChanged(currentData, nextData) ||
    currentData.walletGmxBalance !== nextData.walletGmxBalance ||
    currentData.walletEsGmxBalance !== nextData.walletEsGmxBalance ||
    currentData.claimableEsGmxRewards !== nextData.claimableEsGmxRewards ||
    currentData.stakedGmxBalance !== nextData.stakedGmxBalance ||
    currentData.freePairAmount !== nextData.freePairAmount ||
    currentData.vestingDuration !== nextData.vestingDuration ||
    currentInfo.maxVestableAmount !== nextInfo.maxVestableAmount ||
    currentInfo.averageStakedAmount !== nextInfo.averageStakedAmount
  );
}

function ModalValueRow({ label, value, qa }: { label: React.ReactNode; value: React.ReactNode; qa?: string }) {
  return (
    <div className="flex items-center justify-between gap-12 text-14 leading-[1.25]" data-qa={qa}>
      <span className="text-typography-secondary">{label}</span>
      <span className="shrink-0 text-typography-primary numbers">{value}</span>
    </div>
  );
}

type VestingTransactionStep = "claiming" | "approving" | "staking" | "vesting";

type VestingTransactionProgress = {
  claim: boolean;
  approval: boolean;
  staking: boolean;
  vesting: boolean;
};

const EMPTY_TRANSACTION_PROGRESS: VestingTransactionProgress = {
  claim: false,
  approval: false,
  staking: false,
  vesting: false,
};

function VestingStep({
  index,
  status,
  label,
  completedLabel,
  showConnector,
}: {
  index: number;
  status: "pending" | "loading" | "completed";
  label: React.ReactNode;
  completedLabel: React.ReactNode;
  showConnector: boolean;
}) {
  return (
    <div className="flex min-h-20 gap-10">
      <div className="relative z-10 flex w-20 shrink-0 justify-center self-stretch pt-1">
        {showConnector ? (
          <span className="absolute -bottom-13 left-1/2 top-21 z-0 w-2 -translate-x-1/2 bg-slate-600" />
        ) : null}
        <span
          className={cx(
            "relative z-10 flex size-20 shrink-0 items-center justify-center rounded-full text-12 font-medium normal-nums",
            status === "loading"
              ? "bg-blue-300/20 text-blue-300"
              : status === "completed"
                ? "bg-green-500/20 text-green-500"
                : "bg-blue-300/20 text-blue-300"
          )}
        >
          {status === "completed" ? (
            <CheckIcon className="size-16" />
          ) : status === "loading" ? (
            <SpinnerBlueIcon className="size-16 animate-spin" />
          ) : (
            index
          )}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-8">
        <span
          className={cx(
            "text-13 font-medium",
            status === "pending" ? "text-typography-secondary" : "text-typography-primary"
          )}
        >
          {status === "completed" ? completedLabel : label}
        </span>
        <span
          className={cx(
            "w-72 shrink-0 rounded-full px-7 py-2 text-center text-11 font-medium",
            status === "loading"
              ? "bg-blue-300/10 text-blue-300"
              : status === "completed"
                ? "bg-green-500/10 text-green-500"
                : "invisible"
          )}
        >
          {status === "completed" ? <Trans>Completed</Trans> : <Trans>In progress</Trans>}
        </span>
      </div>
    </div>
  );
}

export function RewardsVestingModal({
  isVisible,
  setIsVisible,
  data,
  mutate,
  onBuyGmx,
  claimableEsGmxAmount,
  onSimulatedClaim,
  onSimulatedStake,
  onSimulatedVest,
}: RewardsVestingModalProps) {
  const isSimulation = onSimulatedVest !== undefined;
  const pendingEsGmxClaimAmount = claimableEsGmxAmount ?? 0n;
  const { account, active, chainId: walletChainId, connector, signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const multipleWalletExtensionsChainError = useMultipleWalletExtensionsChainError();
  const hasMultipleWalletExtensionsChainError = Boolean(multipleWalletExtensionsChainError.buttonErrorMessage);
  const governanceReadInstanceId = useId();
  const governanceReadSessionRef = useRef(0);
  const governanceReadAccountRef = useRef(account);
  if (governanceReadAccountRef.current !== account) {
    governanceReadAccountRef.current = account;
    governanceReadSessionRef.current += 1;
  }
  const governanceRequestKey = `${governanceReadInstanceId}:${governanceReadSessionRef.current}`;
  const govTokenAmount = useGovTokenAmount(ARBITRUM, {
    enabled: isVisible && !isSimulation,
    requestKey: governanceRequestKey,
  });
  const govTokenDelegatesAddress = useGovTokenDelegates(ARBITRUM, {
    enabled: isVisible && !isSimulation,
    requestKey: governanceRequestKey,
  });
  const isUndelegatedGovToken =
    govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount !== undefined && govTokenAmount > 0n;
  const [value, setValue] = useState("");
  const [transactionStep, setTransactionStep] = useState<VestingTransactionStep>();
  const [transactionProgress, setTransactionProgress] =
    useState<VestingTransactionProgress>(EMPTY_TRANSACTION_PROGRESS);
  const [showTransactionSteps, setShowTransactionSteps] = useState(false);
  const [hasInterruptedTransaction, setHasInterruptedTransaction] = useState(false);
  const calculationData = isSimulation ? getRewardsVestingDebugCalculationData(data) : data;
  const wasVisible = useRef(false);
  const transactionSessionRef = useRef(0);
  const signerReady = Boolean(signer);
  const connectorUid = connector?.uid;
  const transactionWalletStateRef = useRef({ account, active, connectorUid, signerReady, walletChainId });
  const visibleWalletStateRef = useRef({ account, active, connectorUid, signerReady, walletChainId });
  const transactionWalletState = transactionWalletStateRef.current;
  if (
    transactionWalletState.account !== account ||
    transactionWalletState.active !== active ||
    transactionWalletState.connectorUid !== connectorUid ||
    transactionWalletState.signerReady !== signerReady ||
    transactionWalletState.walletChainId !== walletChainId
  ) {
    transactionSessionRef.current += 1;
    transactionWalletStateRef.current = { account, active, connectorUid, signerReady, walletChainId };
  }
  const walletStateRef = useRef({
    account,
    active,
    connectorUid,
    signerReady,
    walletChainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
    isUndelegatedGovToken,
    isGovernanceDataReady: false,
  });

  useEffect(
    () => () => {
      transactionSessionRef.current += 1;
    },
    []
  );

  const effectiveRemainingAmount = useMemo(() => getEffectiveRemainingAmount(calculationData), [calculationData]);
  const needsEsGmxClaim = pendingEsGmxClaimAmount > 0n && !transactionProgress.claim;
  const hasClaimStep = pendingEsGmxClaimAmount > 0n || transactionProgress.claim;
  const availableEsGmxAmount = needsEsGmxClaim
    ? data.walletEsGmxBalance + pendingEsGmxClaimAmount
    : data.walletEsGmxBalance;
  const vestingLimit = useMemo(() => getVestingLimit(data, availableEsGmxAmount), [availableEsGmxAmount, data]);
  const depositAmount = useMemo(() => parseValue(value, GMX_DECIMALS), [value]);
  const preview = useMemo(
    () => getVestingPreview(calculationData, depositAmount ?? 0n),
    [calculationData, depositAmount]
  );
  const isGovernanceDataReady =
    isSimulation ||
    preview.stakeShortfallAmount === 0n ||
    (govTokenAmount !== undefined && govTokenDelegatesAddress !== undefined);
  walletStateRef.current = {
    account,
    active,
    connectorUid,
    signerReady,
    walletChainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
    isUndelegatedGovToken,
    isGovernanceDataReady,
  };
  const affordableDepositAmount = useMemo(
    () =>
      getRewardsVestingMaxDepositAmount({
        walletEsGmxAmount: availableEsGmxAmount,
        totalVestedAmount: data.vestingInfo.vestedAmount,
        maxVestableAmount: data.vestingInfo.maxVestableAmount,
        effectiveRemainingAmount,
        averageStakedAmount: calculationData.vestingInfo.averageStakedAmount,
        currentPairAmount: data.vestingInfo.pairAmount,
        availablePairAmount: data.freePairAmount + data.walletGmxBalance,
      }),
    [availableEsGmxAmount, calculationData.vestingInfo.averageStakedAmount, data, effectiveRemainingAmount]
  );

  useEffect(() => {
    const isOpening = isVisible && !wasVisible.current;
    const visibleWalletState = visibleWalletStateRef.current;
    const walletChanged =
      isVisible &&
      (visibleWalletState.account !== account ||
        visibleWalletState.active !== active ||
        visibleWalletState.connectorUid !== connectorUid ||
        visibleWalletState.signerReady !== signerReady ||
        visibleWalletState.walletChainId !== walletChainId);

    if (wasVisible.current !== isVisible) {
      transactionSessionRef.current += 1;
    }
    if (wasVisible.current && !isVisible) {
      governanceReadSessionRef.current += 1;
    }
    if (isOpening || walletChanged) {
      setValue(vestingLimit > 0n ? formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS) : "");
      setTransactionStep(undefined);
      setTransactionProgress(EMPTY_TRANSACTION_PROGRESS);
      setShowTransactionSteps(false);
      setHasInterruptedTransaction(false);
    }
    wasVisible.current = isVisible;
    visibleWalletStateRef.current = { account, active, connectorUid, signerReady, walletChainId };
  }, [account, active, connectorUid, isVisible, signerReady, vestingLimit, walletChainId]);

  const gmxAddress = getContract(ARBITRUM, "GMX");
  const stakedGmxTrackerAddress = getContract(ARBITRUM, "StakedGmxTracker");
  const { tokensAllowanceData, isLoading: isAllowanceLoading } = useTokensAllowanceData(ARBITRUM, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
    skip: !isVisible || isSimulation || preview.stakeShortfallAmount === 0n,
  });
  const gmxAllowance = tokensAllowanceData?.[gmxAddress];
  const gmxAllowanceRef = useRef(gmxAllowance);
  gmxAllowanceRef.current = gmxAllowance;
  const hasEnoughWalletGmx = data.walletGmxBalance >= preview.stakeShortfallAmount;
  const isStakeBlockedByUndelegatedGovToken =
    !isSimulation &&
    !needsEsGmxClaim &&
    preview.stakeShortfallAmount > 0n &&
    !transactionProgress.staking &&
    isUndelegatedGovToken;
  const isBusy = transactionStep !== undefined;
  const isWalletReady =
    isSimulation ||
    Boolean(active && account && signer && walletChainId === ARBITRUM && !hasMultipleWalletExtensionsChainError);
  const hasActiveVesting = data.vestingInfo.vestedAmount > 0n && effectiveRemainingAmount > 0n;
  const hasValidSelectedAmount = depositAmount !== undefined && depositAmount > 0n && depositAmount <= vestingLimit;
  const hasValidAmount =
    hasValidSelectedAmount && (!isSimulation && needsEsGmxClaim ? true : hasEnoughWalletGmx && isGovernanceDataReady);

  const currentEndTimestamp = getRewardsVestingEndTimestamp({
    currentTimestamp: BigInt(Math.floor(Date.now() / 1000)),
    totalVestedAmount: data.vestingInfo.vestedAmount,
    effectiveRemainingAmount,
    vestingDuration: data.vestingDuration,
  });
  const nextEndTimestamp =
    depositAmount !== undefined && depositAmount > 0n
      ? getRewardsVestingEndTimestamp({
          currentTimestamp: BigInt(Math.floor(Date.now() / 1000)),
          totalVestedAmount: data.vestingInfo.vestedAmount + depositAmount,
          effectiveRemainingAmount: effectiveRemainingAmount + depositAmount,
          vestingDuration: data.vestingDuration,
        })
      : undefined;

  const setModalVisible = (nextVisible: boolean) => {
    if (!isBusy) setIsVisible(nextVisible);
  };

  const setDepositValue = (nextValue: string) => {
    setValue(nextValue);
    setTransactionProgress(EMPTY_TRANSACTION_PROGRESS);
    setShowTransactionSteps(false);
    setHasInterruptedTransaction(false);
  };

  const handleVest = async () => {
    if (
      depositAmount === undefined ||
      depositAmount === 0n ||
      !hasValidAmount ||
      (!needsEsGmxClaim && (!isGovernanceDataReady || isStakeBlockedByUndelegatedGovToken))
    ) {
      return;
    }

    setShowTransactionSteps(true);
    const transactionSession = ++transactionSessionRef.current;

    if (onSimulatedVest) {
      const hasStakingStep = preview.stakeShortfallAmount > 0n || transactionProgress.staking;
      try {
        if (needsEsGmxClaim) {
          if (!onSimulatedClaim) return;

          setTransactionStep("claiming");
          await onSimulatedClaim();
          if (transactionSessionRef.current !== transactionSession) return;
          setTransactionProgress((current) => ({ ...current, claim: true }));

          if (!hasEnoughWalletGmx) return;
        }

        if (hasStakingStep && !transactionProgress.staking) {
          if (!onSimulatedStake) return;

          setTransactionStep("staking");
          await onSimulatedStake(preview.stakeShortfallAmount);
          if (transactionSessionRef.current !== transactionSession) return;
          setTransactionProgress((current) => ({ ...current, staking: true }));
        }

        setTransactionStep("vesting");
        await onSimulatedVest(depositAmount);
        if (transactionSessionRef.current !== transactionSession) return;
        setTransactionProgress((current) => ({ ...current, vesting: true }));
        setValue("");
        if (!hasClaimStep && !hasStakingStep) {
          setIsVisible(false);
        }
      } catch {
        if (transactionSessionRef.current === transactionSession) {
          setHasInterruptedTransaction(true);
        }
      } finally {
        if (transactionSessionRef.current === transactionSession) {
          setTransactionStep(undefined);
        }
      }
      return;
    }

    if (!signer || !account || walletChainId !== ARBITRUM || hasOutdatedUi || hasMultipleWalletExtensionsChainError) {
      return;
    }

    const submittedAccount = account;
    const submittedConnectorUid = connectorUid;
    let currentData = data;
    let currentPreview = getVestingPreview(currentData, depositAmount);
    let completedApprovalThisFlow = transactionProgress.approval;
    let completedStakeThisFlow = transactionProgress.staking;
    let attemptedTransaction: "ClaimEsGmx" | "ApproveGmx" | "StakeCollateral" | "StartVesting" | undefined;
    let attemptedAmount: bigint | undefined;

    const hasCurrentTransaction = () =>
      transactionSessionRef.current === transactionSession &&
      walletStateRef.current.account === submittedAccount &&
      walletStateRef.current.active &&
      walletStateRef.current.connectorUid === submittedConnectorUid &&
      walletStateRef.current.signerReady &&
      walletStateRef.current.walletChainId === ARBITRUM &&
      !walletStateRef.current.hasOutdatedUi &&
      !walletStateRef.current.hasMultipleWalletExtensionsChainError;

    try {
      if (needsEsGmxClaim) {
        setTransactionStep("claiming");

        let claimPreflightData;
        try {
          claimPreflightData = await mutate();
        } catch {
          helperToast.error(t`Unable to refresh esGMX rewards. Please try again.`);
          return;
        }

        if (!hasCurrentTransaction()) {
          helperToast.info(t`Wallet or network changed. Review your esGMX rewards before claiming.`);
          return;
        }

        attemptedAmount = claimPreflightData?.claimableEsGmxRewards;
        if (
          !claimPreflightData ||
          attemptedAmount === undefined ||
          attemptedAmount !== pendingEsGmxClaimAmount ||
          depositAmount > getVestingLimit(claimPreflightData, claimPreflightData.walletEsGmxBalance + attemptedAmount)
        ) {
          helperToast.info(t`esGMX rewards changed. Review the updated amount and continue vesting.`);
          return;
        }

        attemptedTransaction = "ClaimEsGmx";
        const rewardRouter = new ethers.Contract(getContract(ARBITRUM, "RewardRouter"), abis.RewardRouter, signer);
        const claimTransaction = await callContract(
          ARBITRUM,
          rewardRouter,
          "handleRewards",
          [false, false, true, false, true, false, false],
          {
            sentMsg: t`esGMX claim submitted`,
            failMsg: t`esGMX claim failed`,
            successMsg: t`esGMX claimed`,
            setPendingTxns,
          }
        );
        await claimTransaction?.wait();
        sendRewardsTransactionResultEvent({
          transaction: "ClaimEsGmx",
          result: "Success",
          amount: attemptedAmount,
        });
        attemptedTransaction = undefined;

        if (!hasCurrentTransaction()) {
          helperToast.info(t`esGMX was claimed. Reconnect the original wallet to continue.`);
          return;
        }

        setTransactionProgress((current) => ({ ...current, claim: true }));
        try {
          const claimedData = await mutate();
          if (!claimedData) {
            helperToast.info(t`esGMX was claimed. Balances will refresh shortly.`);
            return;
          }
          currentData = claimedData;
          currentPreview = getVestingPreview(currentData, depositAmount);
        } catch {
          helperToast.info(t`esGMX was claimed. Balances will refresh shortly.`);
          return;
        }

        if (!hasCurrentTransaction()) {
          helperToast.info(t`esGMX was claimed. Reconnect the original wallet to continue.`);
          return;
        }

        if (depositAmount > getVestingLimit(currentData)) {
          helperToast.info(t`Vesting details changed. Review the updated collateral and continue vesting.`);
          return;
        }
        if (currentData.walletGmxBalance < currentPreview.stakeShortfallAmount) return;
      }

      if (
        currentPreview.stakeShortfallAmount > 0n &&
        (!walletStateRef.current.isGovernanceDataReady || walletStateRef.current.isUndelegatedGovToken)
      ) {
        return;
      }

      let currentGmxAllowance = gmxAllowanceRef.current;
      if (currentPreview.stakeShortfallAmount > 0n && currentGmxAllowance === undefined) {
        try {
          currentGmxAllowance = await getPublicClientWithRpc(ARBITRUM).readContract({
            address: gmxAddress,
            abi: abis.Token,
            functionName: "allowance",
            args: [submittedAccount, stakedGmxTrackerAddress],
          });
        } catch {
          helperToast.error(t`Unable to refresh vesting details. Please try again.`);
          return;
        }

        if (!hasCurrentTransaction()) {
          helperToast.info(t`Wallet or network changed. Review the updated collateral and continue vesting.`);
          return;
        }
      }

      const requiresApproval =
        currentPreview.stakeShortfallAmount > 0n &&
        (currentGmxAllowance ?? 0n) < currentPreview.stakeShortfallAmount &&
        !completedApprovalThisFlow;

      if (requiresApproval) {
        attemptedTransaction = "ApproveGmx";
        attemptedAmount = currentPreview.stakeShortfallAmount;
        setTransactionStep("approving");
        const gmx = new ethers.Contract(gmxAddress, abis.Token, signer);
        const approvalTransaction = await callContract(
          ARBITRUM,
          gmx,
          "approve",
          [stakedGmxTrackerAddress, maxUint256],
          {
            sentMsg: t`GMX approval submitted`,
            failMsg: t`GMX approval failed`,
            successMsg: t`GMX approved`,
            setPendingTxns,
          }
        );
        await approvalTransaction?.wait();
        sendRewardsTransactionResultEvent({
          transaction: "ApproveGmx",
          result: "Success",
          amount: attemptedAmount,
        });
        attemptedTransaction = undefined;
        completedApprovalThisFlow = true;

        if (!hasCurrentTransaction()) {
          helperToast.info(t`GMX was approved. Reconnect the original wallet to continue.`);
          return;
        }
        setTransactionProgress((current) => ({ ...current, approval: true }));
      }

      setTransactionStep(currentPreview.stakeShortfallAmount > 0n && !completedStakeThisFlow ? "staking" : "vesting");

      let preflightData;
      try {
        preflightData = await mutate();
      } catch {
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      if (!hasCurrentTransaction()) {
        helperToast.info(t`Wallet or network changed. Review the updated collateral and continue vesting.`);
        return;
      }

      if (!preflightData) {
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      const preflightPreview = getVestingPreview(preflightData, depositAmount);
      const preflightVestingLimit = getVestingLimit(preflightData);
      if (
        hasVestingFundingPreviewChanged(currentData, preflightData) ||
        depositAmount > preflightVestingLimit ||
        preflightData.walletGmxBalance < preflightPreview.stakeShortfallAmount
      ) {
        helperToast.info(t`Vesting details changed. Review the updated collateral and continue vesting.`);
        return;
      }

      if (preflightPreview.stakeShortfallAmount > 0n && !completedStakeThisFlow) {
        if (!walletStateRef.current.isGovernanceDataReady || walletStateRef.current.isUndelegatedGovToken) {
          return;
        }

        attemptedTransaction = "StakeCollateral";
        attemptedAmount = preflightPreview.stakeShortfallAmount;
        setTransactionStep("staking");
        const rewardRouter = new ethers.Contract(getContract(ARBITRUM, "RewardRouter"), abis.RewardRouter, signer);
        const stakeTransaction = await callContract(ARBITRUM, rewardRouter, "stakeGmx", [attemptedAmount], {
          sentMsg: t`Stake submitted`,
          failMsg: t`Stake failed`,
          successMsg: t`GMX staked`,
          setPendingTxns,
        });
        await stakeTransaction?.wait();
        completedStakeThisFlow = true;
        sendRewardsTransactionResultEvent({
          transaction: "StakeCollateral",
          result: "Success",
          amount: attemptedAmount,
        });
        attemptedTransaction = undefined;

        if (!hasCurrentTransaction()) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }
        setTransactionProgress((current) => ({ ...current, staking: true }));

        let postStakeData;
        try {
          postStakeData = await mutate();
        } catch {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }

        if (!postStakeData) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }
        if (!hasCurrentTransaction()) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }

        const postStakePreview = getVestingPreview(postStakeData, depositAmount);

        if (
          hasVestingPositionSnapshotChanged(preflightData, postStakeData) ||
          preflightData.walletEsGmxBalance !== postStakeData.walletEsGmxBalance ||
          formatTokenAmount(preflightPreview.additionalPairAmount) !==
            formatTokenAmount(postStakePreview.additionalPairAmount) ||
          postStakePreview.stakeShortfallAmount > 0n ||
          depositAmount > getVestingLimit(postStakeData)
        ) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }
      }

      if (!hasCurrentTransaction()) {
        helperToast.info(t`Wallet or network changed. Review the updated collateral and continue vesting.`);
        return;
      }

      attemptedTransaction = "StartVesting";
      setTransactionStep("vesting");
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      const vestTransaction = await callContract(ARBITRUM, gmxVester, "deposit", [depositAmount], {
        sentMsg: t`Vesting submitted`,
        failMsg: t`Vesting failed`,
        successMsg: t`Vesting started`,
        setPendingTxns,
      });
      await vestTransaction?.wait();
      sendRewardsTransactionResultEvent({
        transaction: "StartVesting",
        result: "Success",
        amount: depositAmount,
      });
      attemptedTransaction = undefined;
      if (hasCurrentTransaction()) {
        setTransactionProgress((current) => ({ ...current, vesting: true }));
        setValue("");
        if (!hasClaimStep && !completedStakeThisFlow && !completedApprovalThisFlow) {
          setIsVisible(false);
        }
      }
      try {
        await mutate();
      } catch {
        helperToast.info(t`Vesting started. Balances will refresh shortly.`);
      }
    } catch {
      if (attemptedTransaction !== undefined && transactionSessionRef.current === transactionSession) {
        setHasInterruptedTransaction(true);
      }
      if (attemptedTransaction === "ClaimEsGmx") {
        sendRewardsTransactionResultEvent({
          transaction: "ClaimEsGmx",
          result: "Fail",
          amount: attemptedAmount,
        });
      } else if (attemptedTransaction === "ApproveGmx") {
        sendRewardsTransactionResultEvent({
          transaction: "ApproveGmx",
          result: "Fail",
          amount: attemptedAmount,
        });
      } else if (attemptedTransaction === "StakeCollateral") {
        sendRewardsTransactionResultEvent({
          transaction: "StakeCollateral",
          result: "Fail",
          amount: attemptedAmount,
        });
      } else if (attemptedTransaction === "StartVesting") {
        sendRewardsTransactionResultEvent({
          transaction: "StartVesting",
          result: completedStakeThisFlow ? "PartialSuccess" : "Fail",
          amount: depositAmount,
        });
      }
      if (completedStakeThisFlow && attemptedTransaction === "StartVesting") {
        helperToast.info(t`GMX was staked, but vesting did not start. Review the updated collateral and try again.`);
      }
    } finally {
      if (transactionSessionRef.current === transactionSession) {
        setTransactionStep(undefined);
      }
    }
  };

  const isTransactionComplete = transactionProgress.vesting;
  const title = t`Vest esGMX`;
  let primaryText: React.ReactNode;
  if (isTransactionComplete) {
    primaryText = <Trans>Close</Trans>;
  } else if (!isSimulation && hasOutdatedUi) {
    primaryText = getPageOutdatedError();
  } else if (!isSimulation && multipleWalletExtensionsChainError.buttonErrorMessage) {
    primaryText = multipleWalletExtensionsChainError.buttonErrorMessage;
  } else if (hasInterruptedTransaction) {
    primaryText = <Trans>Continue</Trans>;
  } else if (depositAmount === undefined || depositAmount === 0n) {
    primaryText = <Trans>Enter an amount</Trans>;
  } else if (depositAmount > vestingLimit) {
    primaryText = <Trans>Max amount exceeded</Trans>;
  } else if (!needsEsGmxClaim && !isGovernanceDataReady) {
    primaryText = <Trans>Loading...</Trans>;
  } else if (!isSimulation && !needsEsGmxClaim && isAllowanceLoading) {
    primaryText = <Trans>Loading allowance...</Trans>;
  } else {
    primaryText = title;
  }

  const collateralAvailable = data.freePairAmount + data.walletGmxBalance;
  const missingGmxAmount =
    preview.stakeShortfallAmount > data.walletGmxBalance ? preview.stakeShortfallAmount - data.walletGmxBalance : 0n;
  const depositAmountLabel = `${formatTokenAmount(depositAmount ?? 0n)} esGMX`;
  const showClaimStep =
    transactionProgress.claim || transactionStep === "claiming" || (!isTransactionComplete && hasClaimStep);
  const showApprovalStep =
    !isSimulation &&
    (transactionProgress.approval ||
      transactionStep === "approving" ||
      (!isTransactionComplete &&
        preview.stakeShortfallAmount > 0n &&
        (gmxAllowance ?? 0n) < preview.stakeShortfallAmount));
  const showStakingStep =
    transactionProgress.staking ||
    transactionStep === "staking" ||
    (!isTransactionComplete && preview.stakeShortfallAmount > 0n);
  const transactionSteps = [
    ...(showClaimStep
      ? [
          {
            key: "claim",
            status: transactionProgress.claim
              ? ("completed" as const)
              : transactionStep === "claiming"
                ? ("loading" as const)
                : ("pending" as const),
            label: <Trans>Claim esGMX rewards</Trans>,
            completedLabel: <Trans>esGMX claimed</Trans>,
          },
        ]
      : []),
    ...(showApprovalStep
      ? [
          {
            key: "approval",
            status: transactionProgress.approval
              ? ("completed" as const)
              : transactionStep === "approving"
                ? ("loading" as const)
                : ("pending" as const),
            label: <Trans>Approve GMX</Trans>,
            completedLabel: <Trans>GMX approved</Trans>,
          },
        ]
      : []),
    ...(showStakingStep
      ? [
          {
            key: "staking",
            status: transactionProgress.staking
              ? ("completed" as const)
              : transactionStep === "staking"
                ? ("loading" as const)
                : ("pending" as const),
            label: <Trans>Stake collateral</Trans>,
            completedLabel: <Trans>Collateral staked</Trans>,
          },
        ]
      : []),
    {
      key: "vesting",
      status: transactionProgress.vesting
        ? ("completed" as const)
        : transactionStep === "vesting"
          ? ("loading" as const)
          : ("pending" as const),
      label: <Trans>Start vesting</Trans>,
      completedLabel: <Trans>Vesting started</Trans>,
    },
  ];

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setModalVisible}
      label={title}
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
      keepScrollbarVisible
      contentClassName="w-[420px]"
      qa="rewards-vesting-modal"
    >
      <div className="flex flex-col gap-16 px-20 pb-20">
        <div className="flex flex-col gap-8">
          <div className="flex h-48 items-center gap-8 rounded-8 bg-fill-surfaceElevated50 px-12">
            <NumberInput
              value={value}
              onValueChange={(event) => setDepositValue(event.target.value)}
              className="bg-transparent min-w-0 grow text-16 outline-none"
              placeholder="0"
              maxDecimals={GMX_DECIMALS}
              isDisabled={isBusy || isTransactionComplete || transactionProgress.claim}
              qa="rewards-vesting-amount"
            />
            <span className="text-13 text-typography-secondary">esGMX</span>
            <button
              type="button"
              className="rounded-full bg-slate-600 px-8 py-3 text-12 font-medium text-typography-primary hover:bg-slate-500"
              onClick={() => setDepositValue(formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS))}
              disabled={isBusy || isTransactionComplete || transactionProgress.claim || vestingLimit === 0n}
            >
              <Trans>Max</Trans>
            </button>
          </div>
          <div className="px-4 text-12 text-typography-disabled">
            <Trans>Vestable: {formatTokenAmount(vestingLimit)} esGMX</Trans>
          </div>
        </div>

        <div className="flex flex-col gap-8 px-4">
          <ModalValueRow
            qa="rewards-vesting-collateral-required"
            label={
              <TooltipWithPortal
                position="top-start"
                variant="iconStroke"
                content={
                  <Trans>
                    The amount of GMX needed to vest the entered esGMX. Each 1 esGMX requires 5 GMX to be staked and
                    locked
                  </Trans>
                }
              >
                <Trans>Collateral required for vest</Trans>
              </TooltipWithPortal>
            }
            value={
              <>
                {formatTokenAmount(depositAmount ?? 0n)} <span className="text-typography-secondary">GMX</span>
              </>
            }
          />
          <ModalValueRow
            qa="rewards-vesting-collateral-available"
            label={
              <TooltipWithPortal
                position="top-start"
                variant="iconStroke"
                content={<Trans>The amount of GMX currently available to be locked as collateral for vesting.</Trans>}
              >
                <Trans>Collateral available</Trans>
              </TooltipWithPortal>
            }
            value={
              <>
                {formatTokenAmount(collateralAvailable)} <span className="text-typography-secondary">GMX</span>
              </>
            }
          />
        </div>

        {!hasEnoughWalletGmx && preview.stakeShortfallAmount > 0n ? (
          <ColorfulBanner color="blue" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
            <div>
              {data.walletGmxBalance === 0n ? (
                <Trans>Vesting needs GMX staked as collateral, but you have no GMX to stake.</Trans>
              ) : (
                <Trans>
                  Vesting {formatTokenAmount(depositAmount ?? 0n)} esGMX needs{" "}
                  {formatTokenAmount(preview.stakeShortfallAmount)} more GMX staked as collateral. You hold{" "}
                  {formatTokenAmount(data.walletGmxBalance)} unreserved GMX in the wallet. You can either:
                </Trans>
              )}
              {isSimulation ? (
                <div className="mt-8 text-blue-300">Increase Wallet GMX in the simulator to continue.</div>
              ) : (
                <>
                  {affordableDepositAmount > 0n && data.walletGmxBalance > 0n ? (
                    <ColorfulButtonLink
                      color="blue"
                      onClick={() =>
                        setDepositValue(formatAmountFree(affordableDepositAmount, GMX_DECIMALS, GMX_DECIMALS))
                      }
                    >
                      <Trans>
                        Vest {formatTokenAmount(affordableDepositAmount)} esGMX with your{" "}
                        {formatTokenAmount(data.walletGmxBalance)} GMX
                      </Trans>
                    </ColorfulButtonLink>
                  ) : null}
                  <ColorfulButtonLink color="blue" onClick={onBuyGmx}>
                    {data.walletGmxBalance === 0n ? (
                      <Trans>
                        Buy {formatTokenAmount(missingGmxAmount)} GMX to vest {depositAmountLabel}
                      </Trans>
                    ) : (
                      <Trans>
                        Buy {formatTokenAmount(missingGmxAmount)} GMX and vest all {depositAmountLabel}
                      </Trans>
                    )}
                  </ColorfulButtonLink>
                </>
              )}
            </div>
          </ColorfulBanner>
        ) : null}

        {preview.stakeShortfallAmount > 0n && hasEnoughWalletGmx ? (
          <ColorfulBanner color="blue" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
            <span className="font-medium text-blue-300">
              <Trans>You need {formatTokenAmount(preview.stakeShortfallAmount)} more GMX staked as collateral.</Trans>
            </span>{" "}
            <Trans>We’ll stake it from your wallet, then start vesting.</Trans>
          </ColorfulBanner>
        ) : null}

        {isStakeBlockedByUndelegatedGovToken ? (
          <AlertInfoCard type="error" hideClose>
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, GMX_DECIMALS, 2, true)} GMX DAO
              </ExternalLink>{" "}
              voting power before staking
            </Trans>
          </AlertInfoCard>
        ) : null}

        {hasActiveVesting && currentEndTimestamp !== undefined && nextEndTimestamp !== undefined ? (
          <ColorfulBanner color="blue" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
            <Trans>
              Adding esGMX extends your current vesting: your existing tokens will finish converting on{" "}
              <span className="font-medium text-blue-300">
                {formatRelativeDateWithComma(Number(nextEndTimestamp))} instead of{" "}
                {formatRelativeDateWithComma(Number(currentEndTimestamp))}
              </span>
              .
            </Trans>
          </ColorfulBanner>
        ) : null}

        {!isSimulation ? <SwitchToSettlementChainWarning topic="vesting" settlementChainId={ARBITRUM} /> : null}
        <RewardsVestingChainGuard skip={isSimulation}>
          <div className={cx("grid gap-12", isTransactionComplete ? "grid-cols-1" : "grid-cols-2")}>
            <ButtonTooltipWrapper
              content={isSimulation ? undefined : multipleWalletExtensionsChainError.buttonTooltipMessage}
            >
              <Button
                variant="primary"
                size="medium"
                className="w-full"
                onClick={isTransactionComplete ? () => setModalVisible(false) : handleVest}
                disabled={
                  isBusy ||
                  (!isTransactionComplete &&
                    (!hasValidAmount ||
                      !isWalletReady ||
                      (!isSimulation &&
                        ((!needsEsGmxClaim && isAllowanceLoading) ||
                          hasOutdatedUi ||
                          hasMultipleWalletExtensionsChainError ||
                          isStakeBlockedByUndelegatedGovToken))))
                }
              >
                {primaryText}
              </Button>
            </ButtonTooltipWrapper>
            {!isTransactionComplete ? (
              <Button
                variant="secondary"
                size="medium"
                className="w-full"
                onClick={() => setModalVisible(false)}
                disabled={isBusy}
              >
                <Trans>Cancel</Trans>
              </Button>
            ) : null}
          </div>
        </RewardsVestingChainGuard>
        {showTransactionSteps && transactionSteps.length > 1 ? (
          <div
            className="flex flex-col gap-12 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-12"
            data-qa="rewards-vesting-steps"
          >
            {transactionSteps.map((step, index) => (
              <VestingStep
                key={step.key}
                index={index + 1}
                status={step.status}
                label={step.label}
                completedLabel={step.completedLabel}
                showConnector={index < transactionSteps.length - 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    </ModalWithPortal>
  );
}

type RewardsStopVestingModalProps = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  data: RewardsVestingData;
  mutate: RewardsVestingDataMutator;
  onSimulatedStop?: () => Promise<void>;
};

export function RewardsStopVestingModal({
  isVisible,
  setIsVisible,
  data,
  mutate,
  onSimulatedStop,
}: RewardsStopVestingModalProps) {
  const isSimulation = onSimulatedStop !== undefined;
  const { account, active, chainId: walletChainId, signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const multipleWalletExtensionsChainError = useMultipleWalletExtensionsChainError();
  const hasMultipleWalletExtensionsChainError = Boolean(multipleWalletExtensionsChainError.buttonErrorMessage);
  const [isStopping, setIsStopping] = useState(false);
  const transactionSessionRef = useRef(0);
  const walletStateRef = useRef({
    account,
    walletChainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
  });
  walletStateRef.current = {
    account,
    walletChainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
  };
  useEffect(
    () => () => {
      transactionSessionRef.current += 1;
    },
    []
  );
  const effectiveRemainingAmount = getEffectiveRemainingAmount(data);
  const convertedAmount = data.vestingInfo.vestedAmount - effectiveRemainingAmount;

  const setModalVisible = (nextVisible: boolean) => {
    if (!isStopping) setIsVisible(nextVisible);
  };

  const handleStop = async () => {
    if (onSimulatedStop) {
      if (data.vestingInfo.vestedAmount === 0n || isStopping) {
        return;
      }

      setIsStopping(true);
      try {
        await onSimulatedStop();
        setIsVisible(false);
      } catch {
        return;
      } finally {
        setIsStopping(false);
      }
      return;
    }

    if (
      !account ||
      !signer ||
      !active ||
      walletChainId !== ARBITRUM ||
      data.vestingInfo.vestedAmount === 0n ||
      isStopping ||
      hasOutdatedUi ||
      hasMultipleWalletExtensionsChainError
    ) {
      return;
    }

    const submittedAccount = account;
    const submittedData = data;
    const transactionSession = ++transactionSessionRef.current;
    const hasCurrentTransactionSession = () => transactionSessionRef.current === transactionSession;
    const hasCurrentWalletState = () =>
      walletStateRef.current.account === submittedAccount &&
      walletStateRef.current.walletChainId === ARBITRUM &&
      !walletStateRef.current.hasOutdatedUi &&
      !walletStateRef.current.hasMultipleWalletExtensionsChainError;
    setIsStopping(true);
    let submittedAmount: bigint | undefined;
    try {
      let refreshedData;
      try {
        refreshedData = await mutate();
      } catch {
        if (!hasCurrentTransactionSession()) return;
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      if (!hasCurrentTransactionSession()) return;
      if (!hasCurrentWalletState()) {
        helperToast.info(t`Wallet or network changed. Review your vesting details before stopping.`);
        return;
      }

      if (!refreshedData) {
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      const refreshedRemainingAmount = getEffectiveRemainingAmount(refreshedData);
      const refreshedConvertedAmount = refreshedData.vestingInfo.vestedAmount - refreshedRemainingAmount;
      if (
        hasVestingPositionSnapshotChanged(submittedData, refreshedData) ||
        refreshedData.vestingInfo.vestedAmount === 0n ||
        refreshedRemainingAmount === 0n ||
        formatTokenAmount(effectiveRemainingAmount) !== formatTokenAmount(refreshedRemainingAmount) ||
        formatTokenAmount(convertedAmount) !== formatTokenAmount(refreshedConvertedAmount)
      ) {
        helperToast.info(t`Vesting details changed. Review the updated amounts before stopping.`);
        return;
      }

      submittedAmount = refreshedRemainingAmount;
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      const transaction = await callContract(ARBITRUM, gmxVester, "withdraw", [], {
        sentMsg: t`Stop vesting submitted`,
        failMsg: t`Stop vesting failed`,
        successMsg: t`Vesting stopped`,
        setPendingTxns,
      });
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      await transaction?.wait();
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      sendRewardsTransactionResultEvent({
        transaction: "StopVesting",
        result: "Success",
        amount: submittedAmount,
      });
      setIsVisible(false);
      try {
        await mutate();
        if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      } catch {
        if (!hasCurrentTransactionSession()) return;
        helperToast.info(t`Vesting was stopped. Balances will refresh shortly.`);
      }
    } catch {
      if (!hasCurrentTransactionSession()) return;
      sendRewardsTransactionResultEvent({
        transaction: "StopVesting",
        result: "Fail",
        amount: submittedAmount,
      });
    } finally {
      if (hasCurrentTransactionSession()) {
        setIsStopping(false);
      }
    }
  };

  return (
    <ModalWithPortal
      isVisible={isVisible}
      setIsVisible={setModalVisible}
      label={t`Stop vesting?`}
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
      keepScrollbarVisible
      contentClassName="w-[420px]"
      qa="rewards-stop-vesting-modal"
    >
      <div className="flex flex-col gap-12 px-20 pb-20">
        <p className="text-13 leading-[1.35] text-typography-secondary">
          <Trans>
            This ends your current vesting. So far {formatTokenAmount(convertedAmount)} GMX has vested and is yours to
            keep. The remaining {formatTokenAmount(effectiveRemainingAmount)} esGMX would keep converting to GMX if you
            wait — stopping now returns it to your wallet unvested.
          </Trans>
        </p>

        <ColorfulBanner color="blue" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
          <span className="text-blue-300">
            <Trans>Your {formatTokenAmount(data.vestingInfo.pairAmount)} GMX collateral will be unlocked</Trans>
          </span>{" "}
          — <Trans>it stays staked, it is not unstaked.</Trans>
        </ColorfulBanner>

        <div className="border-t-1/2 border-dashed border-stroke-primary pt-16 text-13 font-medium text-red-500">
          <Trans>Stop vesting 100% of these rewards?</Trans>
        </div>

        {!isSimulation ? <SwitchToSettlementChainWarning topic="vesting" settlementChainId={ARBITRUM} /> : null}
        <RewardsVestingChainGuard skip={isSimulation}>
          <div className="grid grid-cols-2 gap-12">
            <ButtonTooltipWrapper
              content={isSimulation ? undefined : multipleWalletExtensionsChainError.buttonTooltipMessage}
            >
              <Button
                variant="primary"
                size="medium"
                className="w-full !bg-red-500 !text-white hover:!bg-red-400"
                onClick={handleStop}
                disabled={
                  isStopping ||
                  (!isSimulation && (!signer || !active || hasOutdatedUi || hasMultipleWalletExtensionsChainError))
                }
              >
                {!isSimulation && hasOutdatedUi
                  ? getPageOutdatedError()
                  : (!isSimulation ? multipleWalletExtensionsChainError.buttonErrorMessage : undefined) ??
                    (isStopping ? <Trans>Stopping...</Trans> : <Trans>Yes, stop vesting</Trans>)}
              </Button>
            </ButtonTooltipWrapper>
            <Button
              variant="secondary"
              size="medium"
              className="w-full"
              onClick={() => setModalVisible(false)}
              disabled={isStopping}
            >
              <Trans>Keep vesting</Trans>
            </Button>
          </div>
        </RewardsVestingChainGuard>
      </div>
    </ModalWithPortal>
  );
}
