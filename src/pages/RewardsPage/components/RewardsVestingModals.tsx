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
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { GMX_DAO_LINKS } from "components/Earn/Portfolio/AssetsList/GmxAssetCard/constants";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

import CheckIcon from "img/ic_check.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";

type RewardsVestingDataMutator = () => Promise<RewardsVestingData | undefined>;

type RewardsVestingModalProps = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  data: RewardsVestingData;
  mutate: RewardsVestingDataMutator;
  onBuyGmx: () => void;
  isReadOnly?: boolean;
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

function getVestingLimit(data: RewardsVestingData) {
  return getRewardsVestingAvailableAmount({
    walletEsGmxAmount: data.walletEsGmxBalance,
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
    currentData.stakedGmxBalance !== nextData.stakedGmxBalance ||
    currentData.freePairAmount !== nextData.freePairAmount ||
    currentData.vestingDuration !== nextData.vestingDuration ||
    currentInfo.maxVestableAmount !== nextInfo.maxVestableAmount ||
    currentInfo.averageStakedAmount !== nextInfo.averageStakedAmount
  );
}

function ModalValueRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-12 text-14 leading-[1.25]">
      <span className="text-typography-secondary">{label}</span>
      <span className="shrink-0 text-typography-primary numbers">{value}</span>
    </div>
  );
}

type VestingTransactionStep = "approving" | "staking" | "vesting";

type VestingTransactionProgress = {
  approval: boolean;
  staking: boolean;
  vesting: boolean;
};

const EMPTY_TRANSACTION_PROGRESS: VestingTransactionProgress = {
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
  status: "pending" | "active" | "completed";
  label: React.ReactNode;
  completedLabel: React.ReactNode;
  showConnector: boolean;
}) {
  return (
    <div className="flex gap-10">
      <div className="relative z-10 flex w-20 shrink-0 justify-center self-stretch pt-1">
        {showConnector ? (
          <span className="absolute left-1/2 top-[24px] z-0 h-full w-2 -translate-x-1/2 bg-slate-600" />
        ) : null}
        <span
          className={cx(
            "relative z-10 flex size-20 shrink-0 items-center justify-center rounded-full text-12 font-medium normal-nums",
            status === "active" ? "bg-rewards-blue-300 text-white" : "bg-rewards-blue-300/20 text-rewards-blue-300"
          )}
        >
          {status === "completed" ? <CheckIcon className="size-16" /> : index}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-20 items-center justify-between gap-8">
          <span
            className={cx(
              "text-13 font-medium",
              status === "pending" ? "text-typography-secondary" : "text-typography-primary"
            )}
          >
            {status === "completed" ? completedLabel : label}
          </span>
          {status === "active" ? (
            <span className="shrink-0 rounded-full bg-rewards-blue-300/10 px-7 py-2 text-11 font-medium text-rewards-blue-300">
              <Trans>In progress</Trans>
            </span>
          ) : null}
        </div>
        {status === "active" ? (
          <div className="mt-2 text-12 text-blue-100">
            <Trans>Waiting for confirmation...</Trans>
          </div>
        ) : null}
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
  isReadOnly = false,
}: RewardsVestingModalProps) {
  const { account, active, chainId: walletChainId, signer } = useWallet();
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
  const govTokenAmount = useGovTokenAmount(ARBITRUM, { enabled: isVisible, requestKey: governanceRequestKey });
  const govTokenDelegatesAddress = useGovTokenDelegates(ARBITRUM, {
    enabled: isVisible,
    requestKey: governanceRequestKey,
  });
  const isUndelegatedGovToken =
    govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount !== undefined && govTokenAmount > 0n;
  const [value, setValue] = useState("");
  const [transactionStep, setTransactionStep] = useState<VestingTransactionStep>();
  const [transactionProgress, setTransactionProgress] =
    useState<VestingTransactionProgress>(EMPTY_TRANSACTION_PROGRESS);
  const wasVisible = useRef(false);
  const visibleAccountRef = useRef(account);
  const transactionSessionRef = useRef(0);
  const walletStateRef = useRef({
    account,
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

  const effectiveRemainingAmount = useMemo(() => getEffectiveRemainingAmount(data), [data]);
  const vestingLimit = useMemo(() => getVestingLimit(data), [data]);
  const depositAmount = useMemo(() => parseValue(value, GMX_DECIMALS), [value]);
  const preview = useMemo(() => getVestingPreview(data, depositAmount ?? 0n), [data, depositAmount]);
  const isGovernanceDataReady =
    preview.stakeShortfallAmount === 0n || (govTokenAmount !== undefined && govTokenDelegatesAddress !== undefined);
  walletStateRef.current = {
    account,
    walletChainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
    isUndelegatedGovToken,
    isGovernanceDataReady,
  };
  const affordableDepositAmount = useMemo(
    () =>
      getRewardsVestingMaxDepositAmount({
        walletEsGmxAmount: data.walletEsGmxBalance,
        totalVestedAmount: data.vestingInfo.vestedAmount,
        maxVestableAmount: data.vestingInfo.maxVestableAmount,
        effectiveRemainingAmount,
        averageStakedAmount: data.vestingInfo.averageStakedAmount,
        currentPairAmount: data.vestingInfo.pairAmount,
        availablePairAmount: data.freePairAmount + data.walletGmxBalance,
      }),
    [data, effectiveRemainingAmount]
  );

  useEffect(() => {
    const isOpening = isVisible && !wasVisible.current;
    const accountChanged = isVisible && visibleAccountRef.current !== account;

    if (wasVisible.current !== isVisible || accountChanged) {
      transactionSessionRef.current += 1;
    }
    if (wasVisible.current && !isVisible) {
      governanceReadSessionRef.current += 1;
    }
    if (isOpening || accountChanged) {
      setValue(vestingLimit > 0n ? formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS) : "");
      setTransactionStep(undefined);
      setTransactionProgress(EMPTY_TRANSACTION_PROGRESS);
    }
    wasVisible.current = isVisible;
    visibleAccountRef.current = account;
  }, [account, isVisible, vestingLimit]);

  const gmxAddress = getContract(ARBITRUM, "GMX");
  const stakedGmxTrackerAddress = getContract(ARBITRUM, "StakedGmxTracker");
  const { tokensAllowanceData, isLoading: isAllowanceLoading } = useTokensAllowanceData(ARBITRUM, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
    skip: !isVisible || preview.stakeShortfallAmount === 0n,
  });
  const gmxAllowance = tokensAllowanceData?.[gmxAddress];
  const needsApproval =
    preview.stakeShortfallAmount > 0n &&
    (gmxAllowance ?? 0n) < preview.stakeShortfallAmount &&
    !transactionProgress.approval;
  const hasEnoughWalletGmx = data.walletGmxBalance >= preview.stakeShortfallAmount;
  const isStakeBlockedByUndelegatedGovToken =
    preview.stakeShortfallAmount > 0n && !transactionProgress.staking && isUndelegatedGovToken;
  const isBusy = transactionStep !== undefined;
  const isWalletReady = Boolean(
    active && account && signer && walletChainId === ARBITRUM && !hasMultipleWalletExtensionsChainError
  );
  const hasActiveVesting = data.vestingInfo.vestedAmount > 0n && effectiveRemainingAmount > 0n;
  const hasValidAmount =
    depositAmount !== undefined &&
    depositAmount > 0n &&
    depositAmount <= vestingLimit &&
    hasEnoughWalletGmx &&
    isGovernanceDataReady;

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
    if (transactionProgress.vesting) return;

    setValue(nextValue);
    setTransactionProgress((current) => ({
      ...current,
      staking: false,
      vesting: false,
    }));
  };

  const handleApprove = async () => {
    if (!isWalletReady || !account || !signer || isReadOnly || hasOutdatedUi || hasMultipleWalletExtensionsChainError) {
      return;
    }

    const submittedAccount = account;
    const transactionSession = ++transactionSessionRef.current;
    setTransactionStep("approving");
    try {
      const gmx = new ethers.Contract(gmxAddress, abis.Token, signer);
      const transaction = await callContract(ARBITRUM, gmx, "approve", [stakedGmxTrackerAddress, maxUint256], {
        sentMsg: t`GMX approval submitted`,
        failMsg: t`GMX approval failed`,
        successMsg: t`GMX approved`,
        setPendingTxns,
      });
      await transaction?.wait();
      sendRewardsTransactionResultEvent({
        transaction: "ApproveGmx",
        result: "Success",
        amount: preview.stakeShortfallAmount,
      });

      if (
        transactionSessionRef.current !== transactionSession ||
        walletStateRef.current.account !== submittedAccount ||
        walletStateRef.current.walletChainId !== ARBITRUM ||
        walletStateRef.current.hasOutdatedUi ||
        walletStateRef.current.hasMultipleWalletExtensionsChainError
      ) {
        helperToast.info(t`GMX was approved. Reconnect the original wallet to continue.`);
        return;
      }
      setTransactionProgress((current) => ({ ...current, approval: true }));
    } catch {
      sendRewardsTransactionResultEvent({
        transaction: "ApproveGmx",
        result: "Fail",
        amount: preview.stakeShortfallAmount,
      });
    } finally {
      if (transactionSessionRef.current === transactionSession) {
        setTransactionStep(undefined);
      }
    }
  };

  const handleVest = async () => {
    if (
      !signer ||
      !account ||
      walletChainId !== ARBITRUM ||
      depositAmount === undefined ||
      depositAmount === 0n ||
      !hasValidAmount ||
      hasOutdatedUi ||
      hasMultipleWalletExtensionsChainError ||
      !isGovernanceDataReady ||
      isStakeBlockedByUndelegatedGovToken ||
      isReadOnly ||
      transactionProgress.vesting
    ) {
      return;
    }

    if (needsApproval) {
      await handleApprove();
      return;
    }

    const submittedAccount = account;
    const transactionSession = ++transactionSessionRef.current;
    let completedStakeThisFlow = transactionProgress.staking;
    let attemptedTransaction: "StakeCollateral" | "StartVesting" | undefined;
    let attemptedStakeAmount: bigint | undefined;

    try {
      setTransactionStep(preview.stakeShortfallAmount > 0n && !transactionProgress.staking ? "staking" : "vesting");

      let preflightData;
      try {
        preflightData = await mutate();
      } catch {
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      if (
        transactionSessionRef.current !== transactionSession ||
        walletStateRef.current.account !== submittedAccount ||
        walletStateRef.current.walletChainId !== ARBITRUM ||
        walletStateRef.current.hasOutdatedUi ||
        walletStateRef.current.hasMultipleWalletExtensionsChainError
      ) {
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
        hasVestingFundingPreviewChanged(data, preflightData) ||
        depositAmount > preflightVestingLimit ||
        preflightData.walletGmxBalance < preflightPreview.stakeShortfallAmount
      ) {
        helperToast.info(t`Vesting details changed. Review the updated collateral and continue vesting.`);
        return;
      }

      if (preflightPreview.stakeShortfallAmount > 0n && !transactionProgress.staking) {
        if (!walletStateRef.current.isGovernanceDataReady || walletStateRef.current.isUndelegatedGovToken) {
          return;
        }

        attemptedTransaction = "StakeCollateral";
        attemptedStakeAmount = preflightPreview.stakeShortfallAmount;
        setTransactionStep("staking");
        const rewardRouter = new ethers.Contract(getContract(ARBITRUM, "RewardRouter"), abis.RewardRouter, signer);
        const stakeTransaction = await callContract(ARBITRUM, rewardRouter, "stakeGmx", [attemptedStakeAmount], {
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
          amount: attemptedStakeAmount,
        });
        attemptedTransaction = undefined;

        if (
          transactionSessionRef.current !== transactionSession ||
          walletStateRef.current.account !== submittedAccount ||
          walletStateRef.current.walletChainId !== ARBITRUM ||
          walletStateRef.current.hasOutdatedUi ||
          walletStateRef.current.hasMultipleWalletExtensionsChainError
        ) {
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
        if (
          transactionSessionRef.current !== transactionSession ||
          walletStateRef.current.account !== submittedAccount ||
          walletStateRef.current.walletChainId !== ARBITRUM ||
          walletStateRef.current.hasOutdatedUi ||
          walletStateRef.current.hasMultipleWalletExtensionsChainError
        ) {
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

      if (
        transactionSessionRef.current !== transactionSession ||
        walletStateRef.current.account !== submittedAccount ||
        walletStateRef.current.walletChainId !== ARBITRUM ||
        walletStateRef.current.hasOutdatedUi ||
        walletStateRef.current.hasMultipleWalletExtensionsChainError
      ) {
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
      if (
        transactionSessionRef.current === transactionSession &&
        walletStateRef.current.account === submittedAccount &&
        walletStateRef.current.walletChainId === ARBITRUM &&
        !walletStateRef.current.hasOutdatedUi &&
        !walletStateRef.current.hasMultipleWalletExtensionsChainError
      ) {
        setTransactionProgress((current) => ({ ...current, vesting: true }));
      }
      try {
        await mutate();
      } catch {
        helperToast.info(t`Vesting started. Balances will refresh shortly.`);
      }
    } catch {
      if (attemptedTransaction === "StakeCollateral") {
        sendRewardsTransactionResultEvent({
          transaction: "StakeCollateral",
          result: "Fail",
          amount: attemptedStakeAmount,
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

  let primaryText: React.ReactNode;
  if (hasOutdatedUi) {
    primaryText = getPageOutdatedError();
  } else if (multipleWalletExtensionsChainError.buttonErrorMessage) {
    primaryText = multipleWalletExtensionsChainError.buttonErrorMessage;
  } else if (isReadOnly) {
    primaryText = <Trans>Preview only</Trans>;
  } else if (transactionProgress.vesting) {
    primaryText = <Trans>Done</Trans>;
  } else if (depositAmount === undefined || depositAmount === 0n) {
    primaryText = <Trans>Enter an amount</Trans>;
  } else if (depositAmount > vestingLimit) {
    primaryText = <Trans>Max amount exceeded</Trans>;
  } else if (!hasEnoughWalletGmx) {
    primaryText = <Trans>Vest {formatTokenAmount(depositAmount)} esGMX</Trans>;
  } else if (!isGovernanceDataReady) {
    primaryText = <Trans>Loading...</Trans>;
  } else if (isAllowanceLoading) {
    primaryText = <Trans>Loading allowance...</Trans>;
  } else if (transactionStep === "approving") {
    primaryText = <Trans>Approving GMX...</Trans>;
  } else if (needsApproval) {
    primaryText = <Trans>Approve GMX</Trans>;
  } else if (transactionStep === "staking") {
    primaryText = <Trans>Staking collateral...</Trans>;
  } else if (transactionStep === "vesting") {
    primaryText = <Trans>Vesting...</Trans>;
  } else {
    primaryText = <Trans>Vest {formatTokenAmount(depositAmount)} esGMX</Trans>;
  }

  const title = hasEnoughWalletGmx ? t`Stake & vest esGMX` : t`Vest esGMX`;
  const missingGmxAmount =
    preview.stakeShortfallAmount > data.walletGmxBalance ? preview.stakeShortfallAmount - data.walletGmxBalance : 0n;
  const depositAmountLabel = `${formatTokenAmount(depositAmount ?? 0n)} esGMX`;
  const showApprovalStep =
    preview.stakeShortfallAmount > 0n &&
    ((gmxAllowance ?? 0n) < preview.stakeShortfallAmount ||
      transactionProgress.approval ||
      transactionStep === "approving");
  const showStakingStep =
    preview.stakeShortfallAmount > 0n || transactionProgress.staking || transactionStep === "staking";
  const transactionSteps = [
    ...(showApprovalStep
      ? [
          {
            key: "approval",
            status: transactionProgress.approval
              ? ("completed" as const)
              : transactionStep === "approving"
                ? ("active" as const)
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
                ? ("active" as const)
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
          ? ("active" as const)
          : ("pending" as const),
      label: <Trans>Start vesting</Trans>,
      completedLabel: <Trans>Vesting started</Trans>,
    },
  ];

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setModalVisible}
      label={title}
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
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
              isDisabled={isBusy || transactionProgress.vesting}
              qa="rewards-vesting-amount"
            />
            <span className="text-13 text-typography-secondary">esGMX</span>
            <button
              type="button"
              className="rounded-full bg-slate-600 px-8 py-3 text-12 font-medium text-typography-primary hover:bg-slate-500"
              onClick={() => setDepositValue(formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS))}
              disabled={isBusy || transactionProgress.vesting || vestingLimit === 0n}
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
            label={<Trans>Collateral this vest locks</Trans>}
            value={
              <>
                {formatTokenAmount(preview.additionalPairAmount)} <span className="text-typography-secondary">GMX</span>
              </>
            }
          />
          <ModalValueRow
            label={<Trans>Already staked & free</Trans>}
            value={
              <>
                {formatTokenAmount(data.freePairAmount)} <span className="text-typography-secondary">GMX</span>
              </>
            }
          />
        </div>

        {!hasEnoughWalletGmx && preview.stakeShortfallAmount > 0n ? (
          <ColorfulBanner color="yellow" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
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
              {affordableDepositAmount > 0n && data.walletGmxBalance > 0n ? (
                <ColorfulButtonLink
                  color="yellow"
                  onClick={() => setDepositValue(formatAmountFree(affordableDepositAmount, GMX_DECIMALS, GMX_DECIMALS))}
                >
                  <Trans>
                    Vest {formatTokenAmount(affordableDepositAmount)} esGMX with your{" "}
                    {formatTokenAmount(data.walletGmxBalance)} GMX
                  </Trans>
                </ColorfulButtonLink>
              ) : null}
              <ColorfulButtonLink color="yellow" onClick={onBuyGmx}>
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
            </div>
          </ColorfulBanner>
        ) : null}

        {preview.stakeShortfallAmount > 0n && hasEnoughWalletGmx ? (
          <ColorfulBanner color="blue" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
            <span className="text-rewards-blue-300">
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
          <ColorfulBanner color="yellow" icon={InfoIcon} className="!text-13 [&>div]:!items-start">
            <Trans>
              Adding esGMX extends your current vesting: your existing tokens will finish converting on{" "}
              <span className="font-medium text-yellow-300">
                {formatRelativeDateWithComma(Number(nextEndTimestamp))} instead of{" "}
                {formatRelativeDateWithComma(Number(currentEndTimestamp))}
              </span>
              .
            </Trans>
          </ColorfulBanner>
        ) : null}

        {hasValidAmount ? (
          <div className="flex flex-col gap-16 rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-12">
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

        <SwitchToSettlementChainWarning topic="vesting" settlementChainId={ARBITRUM} />
        <RewardsVestingChainGuard>
          {transactionProgress.vesting ? (
            <Button variant="primary" size="medium" className="w-full" onClick={() => setModalVisible(false)}>
              <Trans>Done</Trans>
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-12">
              <ButtonTooltipWrapper content={multipleWalletExtensionsChainError.buttonTooltipMessage}>
                <Button
                  variant="primary"
                  size="medium"
                  className="w-full"
                  onClick={handleVest}
                  disabled={
                    !hasValidAmount ||
                    !isWalletReady ||
                    isBusy ||
                    isAllowanceLoading ||
                    hasOutdatedUi ||
                    hasMultipleWalletExtensionsChainError ||
                    isStakeBlockedByUndelegatedGovToken ||
                    isReadOnly
                  }
                >
                  {primaryText}
                </Button>
              </ButtonTooltipWrapper>
              <Button
                variant="secondary"
                size="medium"
                className="w-full"
                onClick={() => setModalVisible(false)}
                disabled={isBusy}
              >
                <Trans>Cancel</Trans>
              </Button>
            </div>
          )}
        </RewardsVestingChainGuard>
      </div>
    </Modal>
  );
}

type RewardsStopVestingModalProps = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  data: RewardsVestingData;
  mutate: RewardsVestingDataMutator;
  isReadOnly?: boolean;
};

export function RewardsStopVestingModal({
  isVisible,
  setIsVisible,
  data,
  mutate,
  isReadOnly = false,
}: RewardsStopVestingModalProps) {
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
    if (
      !account ||
      !signer ||
      !active ||
      walletChainId !== ARBITRUM ||
      data.vestingInfo.vestedAmount === 0n ||
      isStopping ||
      hasOutdatedUi ||
      hasMultipleWalletExtensionsChainError ||
      isReadOnly
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
    <Modal
      isVisible={isVisible}
      setIsVisible={setModalVisible}
      label={t`Stop vesting?`}
      contentPadding={false}
      hideHeaderBorder
      withMobileBottomPosition
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
          <span className="text-rewards-blue-300">
            <Trans>Your {formatTokenAmount(data.vestingInfo.pairAmount)} GMX collateral will be unlocked</Trans>
          </span>{" "}
          — <Trans>it stays staked, it is not unstaked.</Trans>
        </ColorfulBanner>

        <div className="border-t-1/2 border-dashed border-stroke-primary pt-16 text-13 font-medium text-red-500">
          <Trans>Stop vesting 100% of these rewards?</Trans>
        </div>

        <SwitchToSettlementChainWarning topic="vesting" settlementChainId={ARBITRUM} />
        <RewardsVestingChainGuard>
          <div className="grid grid-cols-2 gap-12">
            <ButtonTooltipWrapper content={multipleWalletExtensionsChainError.buttonTooltipMessage}>
              <Button
                variant="primary"
                size="medium"
                className="w-full !bg-red-500 !text-white hover:!bg-red-400"
                onClick={handleStop}
                disabled={
                  isStopping ||
                  !signer ||
                  !active ||
                  hasOutdatedUi ||
                  hasMultipleWalletExtensionsChainError ||
                  isReadOnly
                }
              >
                {hasOutdatedUi
                  ? getPageOutdatedError()
                  : multipleWalletExtensionsChainError.buttonErrorMessage ??
                    (isReadOnly ? (
                      <Trans>Preview only</Trans>
                    ) : isStopping ? (
                      <Trans>Stopping...</Trans>
                    ) : (
                      <Trans>Yes, stop vesting</Trans>
                    ))}
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
    </Modal>
  );
}
