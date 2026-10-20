import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { useHistory, useLocation } from "react-router-dom";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { REWARDS_VESTING_STARTED_MODAL_DISMISSED_KEY } from "config/localStorage";
import { getRewardsVestingConfig } from "config/vesting";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getRatioVestingEndTimestamp, isRatioVestingDepositDisabled } from "domain/vesting/ratioVesting";
import {
  getRewardsVestingAvailableAmount,
  getRewardsVestingDaysLeft,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingProgress,
} from "domain/vesting/rewardsVesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { useChainId } from "lib/chains";
import { useMultipleWalletExtensionsChainError } from "lib/chains/getMultipleWalletExtensionsChainError";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { expandDecimals, formatAmount, formatUsd } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { usePrefersReducedMotion } from "lib/usePrefersReducedMotion";
import { sendRewardsTransactionResultEvent, sendRewardsVestingModalOpenEvent } from "lib/userAnalytics/rewardsEvents";
import { abis } from "sdk/abis";
import { convertToUsd } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import { BuyGmxModal } from "components/BuyGmxModal/BuyGmxModal";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { ButtonTooltipWrapper } from "components/Tooltip/ButtonTooltipWrapper";

import CheckIcon from "img/ic_check.svg?react";
import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import ClaimIcon from "img/ic_earn.svg?react";
import VestIcon from "img/ic_increaselimit_16.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { getRewardsDebugMode } from "../rewardsDebug";
import {
  REWARDS_ONBOARDING_OPEN_ACTION,
  REWARDS_ONBOARDING_SEARCH_PARAM,
  REWARDS_VESTING_HIGHLIGHT_ACTION,
  REWARDS_VESTING_SEARCH_PARAM,
  REWARDS_VESTING_START_ACTION,
} from "../rewardsRoutes";
import {
  getRewardsVestingDebugSnapshot,
  simulateRewardsGmxStake,
  simulateRewardsEsGmxClaim,
  simulateRewardsVestingClaim,
  simulateRewardsVestingDeposit,
  simulateRewardsVestingStop,
  simulateRewardsVestingUnlock,
} from "../rewardsVestingDebug";
import { RewardsDistributeEsGmxModal } from "./RewardsDistributeEsGmxModal";
import { RewardsMintEsGmxModal } from "./RewardsMintEsGmxModal";
import { RewardsRatioVestingModal } from "./RewardsRatioVestingModal";
import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";
import { RewardsVestingDebugPanel } from "./RewardsVestingDebugPanel";
import { RewardsStopVestingModal, RewardsVestingModal } from "./RewardsVestingModals";
import { RewardsVestingSimulatorApprovalModal } from "./RewardsVestingSimulatorApprovalModal";
import { RewardsVestingStartedModal } from "./RewardsVestingStartedModal";
import { RewardsTesterVestingSimulatorSlot } from "../tester/RewardsTesterVestingSimulatorSlot";
import {
  useRewardsTesterRewardsVestingData,
  useRewardsTesterVestingSnapshot,
  useRewardsTesterVestingSync,
  useRewardsTesterWallet,
} from "../tester/useRewardsTester";

const SIMULATED_TRANSACTION_DELAY = 1_000;
const CLAIMABLE_GMX_DISPLAY_DECIMALS = 4;
const MIN_VESTING_CLAIM_AMOUNT = expandDecimals(1, GMX_DECIMALS - CLAIMABLE_GMX_DISPLAY_DECIMALS);

function waitForSimulatedTransaction() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, SIMULATED_TRANSACTION_DELAY);
  });
}

function formatTokenAmount(amount: bigint, displayDecimals = 2) {
  return formatAmount(amount, GMX_DECIMALS, displayDecimals, true, { trimTrailingZeros: true });
}

function getUsdValue(amount: bigint, price: bigint | undefined) {
  if (amount === 0n) return 0n;
  return convertToUsd(amount, GMX_DECIMALS, price);
}

function getEffectiveRemainingAmount(data: RewardsVestingData) {
  return getRewardsVestingEffectiveRemainingAmount({
    totalVestedAmount: data.vestingInfo.vestedAmount,
    escrowedBalance: data.vestingInfo.escrowedBalance,
    claimedAmount: data.vestingInfo.claimedAmounts,
    claimableAmount: data.vestingInfo.claimable,
    unpaidClaimAmount: data.ratioVesting?.unpaidClaimAmount,
  });
}

function hasWithdrawPreviewChanged(currentData: RewardsVestingData, nextData: RewardsVestingData) {
  const currentInfo = currentData.vestingInfo;
  const nextInfo = nextData.vestingInfo;

  return (
    currentInfo.pairAmount !== nextInfo.pairAmount ||
    currentInfo.vestedAmount !== nextInfo.vestedAmount ||
    currentInfo.escrowedBalance !== nextInfo.escrowedBalance ||
    currentInfo.claimedAmounts !== nextInfo.claimedAmounts ||
    currentInfo.claimable !== nextInfo.claimable
  );
}

function AmountHeader({
  label,
  unit,
  amount,
  usd,
  displayDecimals = 2,
  active = false,
  loading = false,
  unavailable = false,
  action,
}: {
  label: React.ReactNode;
  unit: React.ReactNode;
  amount: bigint;
  usd: bigint | undefined;
  displayDecimals?: number;
  active?: boolean;
  loading?: boolean;
  unavailable?: boolean;
  action?: React.ReactNode;
}) {
  const isHighlighted = active && !unavailable && amount > 0n;
  const valueColorClassName = isHighlighted ? "text-typography-primary" : "text-typography-secondary";

  return (
    <div className="flex min-h-[105px] w-full flex-col items-start gap-8 p-8">
      <div className="flex h-24 w-full items-center gap-4">
        <span
          className={cx(
            "text-body-small whitespace-nowrap font-medium text-typography-secondary",
            action ? "min-w-0 truncate" : "shrink-0"
          )}
        >
          {label}
        </span>
        {action}
      </div>
      <div className="w-full shrink-0 border-t-1/2 border-slate-600" />
      <div className="flex w-full min-w-0 flex-col items-start gap-4">
        {loading ? (
          <div className="flex h-36 items-center">
            <Skeleton width={120} height={32} />
          </div>
        ) : (
          <div className="flex min-w-0 max-w-full items-end gap-8">
            <span className={cx("text-h1 min-w-0 truncate whitespace-nowrap", valueColorClassName)}>
              {unavailable ? "-" : formatTokenAmount(amount, displayDecimals)}
            </span>
            <span
              className={cx(
                "flex shrink-0 items-center justify-center whitespace-nowrap py-2 text-16 font-medium leading-[1.25]",
                valueColorClassName
              )}
            >
              {unit}
            </span>
          </div>
        )}
        <span className="shrink-0 whitespace-nowrap text-12 font-medium leading-[1.25] text-typography-disabled numbers">
          {loading ? <Skeleton width={72} /> : unavailable ? "-" : formatUsd(usd) ?? "-"}
        </span>
      </div>
    </div>
  );
}

// A light running once around the vest button: a comet with soft ends and a faint glow.
// Positions and lengths are in % of the button outline, measured from the comet's tail.
const VEST_COMET_LENGTH = 24;
const VEST_COMET_HEAD_FADE = 4;
const VEST_COMET_TAIL_FADE = 20;
// Brightness from the tips towards the core. Each nested layer adds a little light, so both ends fade out smoothly.
const VEST_COMET_PROFILE = [0.04, 0.09, 0.16, 0.25, 0.36, 0.48, 0.61, 0.74, 0.87, 1];
const VEST_COMET_LAYERS = [
  ...VEST_COMET_PROFILE.map((brightness, index) => {
    const step = index / VEST_COMET_PROFILE.length;
    const previousBrightness = index === 0 ? 0 : VEST_COMET_PROFILE[index - 1];
    const start = VEST_COMET_TAIL_FADE * step;
    const end = VEST_COMET_LENGTH - VEST_COMET_HEAD_FADE * step;

    return {
      start,
      length: end - start,
      opacity: 1 - (1 - brightness) / (1 - previousBrightness),
      strokeWidth: 0.5,
      isGlow: false,
    };
  }),
  { start: 12, length: 10, opacity: 0.18, strokeWidth: 3, isGlow: true },
  { start: 16, length: 5.5, opacity: 0.35, strokeWidth: 2.5, isGlow: true },
];

function VestButtonComet({ width, height, onDone }: { width: number; height: number; onDone: () => void }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 overflow-visible text-white"
      width={width}
      height={height}
    >
      <defs>
        <filter id="rewards-vest-comet-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={1.6} />
        </filter>
      </defs>
      <g
        className="opacity-0 motion-safe:animate-rewards-vest-comet-fade"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onDone();
        }}
      >
        {VEST_COMET_LAYERS.map(({ start, length, opacity, strokeWidth, isGlow }) => (
          <rect
            key={`${start}-${strokeWidth}`}
            x={0.25}
            y={0.25}
            width={width - 0.5}
            height={height - 0.5}
            rx={8}
            pathLength={100}
            fill="none"
            stroke="currentColor"
            strokeOpacity={opacity}
            strokeWidth={strokeWidth}
            // The dash pattern repeats exactly once per outline, so the comet loops without a visible start point.
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={VEST_COMET_LENGTH - start}
            filter={isGlow ? "url(#rewards-vest-comet-glow)" : undefined}
            className="motion-safe:animate-rewards-vest-comet"
            style={
              {
                "--comet-from": VEST_COMET_LENGTH - start,
                "--comet-to": VEST_COMET_LENGTH - start - 100,
              } as CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  );
}

function IdleAction({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="secondary"
      size="medium"
      className="h-40 w-full shrink-0 !bg-fill-surfaceElevated50 !text-14 !font-medium !leading-[1.25] !text-typography-disabled opacity-90"
      disabled
    >
      {children}
    </Button>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-14 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-16">
      <div className="flex flex-col gap-8">
        <Skeleton width="80%" height={14} />
        <Skeleton width="55%" height={14} />
      </div>
      <Skeleton width="100%" height={40} borderRadius={8} />
    </div>
  );
}

function UnavailablePanel() {
  return (
    <div className="flex min-h-[132px] w-full grow flex-col items-center justify-center gap-12 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 text-center text-13 text-typography-secondary">
      <Trans>Vesting data is temporarily unavailable.</Trans>
    </div>
  );
}

function DisconnectedPanel({ onConnect }: { onConnect?: () => void }) {
  return (
    <div className="flex min-h-[132px] w-full grow flex-col items-center justify-center gap-12 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 text-center text-13 text-typography-secondary">
      <Trans>Connect wallet to view vesting rewards.</Trans>
      {onConnect ? (
        <Button variant="primary" size="medium" className="h-40 w-full shrink-0 text-14" onClick={onConnect}>
          <Trans>Connect wallet</Trans>
        </Button>
      ) : null}
    </div>
  );
}

function RewardBalanceRow({
  label,
  amount,
  symbol = "GMX",
}: {
  label: React.ReactNode;
  amount: bigint;
  symbol?: string;
}) {
  return (
    <div className="flex h-24 items-center justify-between gap-8">
      <span className="text-body-medium font-medium text-typography-secondary">{label}</span>
      <span className="text-body-medium text-typography-secondary numbers">
        <span className="text-typography-primary">{formatTokenAmount(amount)}</span> {symbol}
      </span>
    </div>
  );
}

export function RewardsVestingFlow() {
  const { chainId } = useChainId();
  const vestingConfig = getRewardsVestingConfig(chainId);
  const { pathname, search } = useLocation();
  const history = useHistory();
  const { account, chainId: walletChainId, signer } = useRewardsTesterWallet();
  const { openConnectModal } = useConnectModal();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const multipleWalletExtensionsChainError = useMultipleWalletExtensionsChainError();
  const hasMultipleWalletExtensionsChainError = Boolean(multipleWalletExtensionsChainError.buttonErrorMessage);
  const now = useCurrentUnixTimestamp(30_000);
  const vestingResult = useRewardsTesterRewardsVestingData(account, chainId);
  const debugMode = getRewardsDebugMode(search);
  const debugSnapshot = useRewardsTesterVestingSnapshot(getRewardsVestingDebugSnapshot(debugMode));
  const [debugData, setDebugData] = useState(() => debugSnapshot?.data);
  useRewardsTesterVestingSync(debugData, setDebugData);
  const previousDebugModeRef = useRef(debugMode);
  const data = debugSnapshot ? debugData : vestingResult.data;
  const isLoading = debugSnapshot ? debugSnapshot.isLoading : vestingResult.isLoading;
  const error = debugSnapshot ? debugSnapshot.error : vestingResult.error;
  const mutate = vestingResult.mutate;
  const isDebugFixture = debugSnapshot !== undefined;
  const isInteractiveDebug = isDebugFixture && data !== undefined;
  const [isVestingModalVisible, setIsVestingModalVisible] = useState(false);
  const [isMintModalVisible, setIsMintModalVisible] = useState(false);
  const [isDistributeModalVisible, setIsDistributeModalVisible] = useState(false);
  useEffect(() => {
    setIsMintModalVisible(false);
    setIsDistributeModalVisible(false);
  }, [chainId]);
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [hasJustStartedVesting, setHasJustStartedVesting] = useState(false);
  const [isVestingStartedModalDismissed, setIsVestingStartedModalDismissed] = useLocalStorageSerializeKeySafe<boolean>(
    [REWARDS_VESTING_STARTED_MODAL_DISMISSED_KEY, account],
    false
  );
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [simulatedTransactionAction, setSimulatedTransactionAction] = useState<string>();
  const hasHandledStartActionRef = useRef(false);
  const transactionSessionRef = useRef(0);
  const isVestingActionPendingRef = useRef(false);
  const simulatedTransactionSessionRef = useRef(0);
  const simulatedTransactionRequestRef = useRef<{
    resolve: () => void;
    reject: (reason: Error) => void;
  }>();
  const walletStateRef = useRef({
    account,
    walletChainId,
    chainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
  });
  walletStateRef.current = {
    account,
    walletChainId,
    chainId,
    hasOutdatedUi,
    hasMultipleWalletExtensionsChainError,
  };

  const requestSimulatedTransactionApproval = useCallback((action: string) => {
    return new Promise<void>((resolve, reject) => {
      if (simulatedTransactionRequestRef.current) {
        reject(new Error("Another simulated transaction is awaiting approval."));
        return;
      }

      simulatedTransactionRequestRef.current = { resolve, reject };
      setSimulatedTransactionAction(action);
    });
  }, []);

  const approveSimulatedTransaction = useCallback(() => {
    const request = simulatedTransactionRequestRef.current;
    if (!request) return;

    simulatedTransactionRequestRef.current = undefined;
    setSimulatedTransactionAction(undefined);
    request.resolve();
  }, []);

  const rejectSimulatedTransaction = useCallback(() => {
    simulatedTransactionSessionRef.current += 1;
    const request = simulatedTransactionRequestRef.current;
    simulatedTransactionRequestRef.current = undefined;
    setSimulatedTransactionAction(undefined);
    request?.reject(new Error("Simulated transaction rejected."));
  }, []);

  const runSimulatedTransaction = useCallback(
    async (action: string, updateData: (currentData: RewardsVestingData) => RewardsVestingData) => {
      if (simulatedTransactionRequestRef.current) {
        throw new Error("Another simulated transaction is awaiting approval.");
      }

      const transactionSession = ++simulatedTransactionSessionRef.current;
      await requestSimulatedTransactionApproval(action);
      await waitForSimulatedTransaction();

      if (simulatedTransactionSessionRef.current !== transactionSession) {
        throw new Error("Simulated transaction cancelled.");
      }

      setDebugData((currentData) => {
        if (!currentData) return currentData;
        return updateData(currentData);
      });
    },
    [requestSimulatedTransactionApproval]
  );

  useEffect(() => {
    if (previousDebugModeRef.current === debugMode) return;

    previousDebugModeRef.current = debugMode;
    rejectSimulatedTransaction();
    setDebugData(getRewardsVestingDebugSnapshot(debugMode)?.data);
  }, [debugMode, rejectSimulatedTransaction]);

  useEffect(
    () => () => {
      transactionSessionRef.current += 1;
      simulatedTransactionSessionRef.current += 1;
      const request = simulatedTransactionRequestRef.current;
      simulatedTransactionRequestRef.current = undefined;
      request?.reject(new Error("Simulated transaction rejected."));
    },
    []
  );

  const isDisconnected = !account && !isDebugFixture;
  const isInitialLoading = !isDisconnected && isLoading && !data && !error;
  const isUnavailable = !isDisconnected && !data && (Boolean(error) || !isLoading);
  const vestingInfo = data?.vestingInfo;
  const effectiveRemainingAmount = useMemo(
    () =>
      vestingInfo
        ? getRewardsVestingEffectiveRemainingAmount({
            totalVestedAmount: vestingInfo.vestedAmount,
            escrowedBalance: vestingInfo.escrowedBalance,
            claimedAmount: vestingInfo.claimedAmounts,
            claimableAmount: vestingInfo.claimable,
            unpaidClaimAmount: data?.ratioVesting?.unpaidClaimAmount,
          })
        : 0n,
    [data?.ratioVesting?.unpaidClaimAmount, vestingInfo]
  );
  const progress = getRewardsVestingProgress({
    totalVestedAmount: vestingInfo?.vestedAmount ?? 0n,
    effectiveRemainingAmount,
  });
  const progressStyle = useMemo(() => ({ width: `${Number(progress.progressBps) / 100}%` }), [progress.progressBps]);
  const endTimestamp = data?.ratioVesting
    ? getRatioVestingEndTimestamp(data.ratioVesting.tranches, data.vestingDuration)
    : data
      ? getRewardsVestingEndTimestamp({
          currentTimestamp: BigInt(now),
          totalVestedAmount: vestingInfo?.vestedAmount ?? 0n,
          effectiveRemainingAmount,
          vestingDuration: data.vestingDuration,
        })
      : undefined;
  const daysLeft =
    endTimestamp === undefined ? 0n : getRewardsVestingDaysLeft({ currentTimestamp: BigInt(now), endTimestamp });
  const hasVestingPosition = (vestingInfo?.vestedAmount ?? 0n) > 0n;
  const isVestingComplete = hasVestingPosition && effectiveRemainingAmount === 0n;
  const isVestingActive = hasVestingPosition && !isVestingComplete;
  const ratioVesting = data?.ratioVesting;
  const isVestingPaused =
    ratioVesting &&
    isVestingActive &&
    (ratioVesting.isFrozen ||
      (ratioVesting.deactivatedAt !== 0n && BigInt(now) >= ratioVesting.deactivatedAt) ||
      ratioVesting.capUsedAmount - effectiveRemainingAmount >= (vestingInfo?.maxVestableAmount ?? 0n));
  const claimableAmount = vestingInfo?.claimable ?? 0n;
  const hasClaimableRewards = claimableAmount >= MIN_VESTING_CLAIM_AMOUNT;
  const displayedClaimableAmount = hasClaimableRewards ? claimableAmount : 0n;
  const vestableAmount = data
    ? getRewardsVestingAvailableAmount({
        walletEsGmxAmount: data.walletEsGmxBalance + data.claimableEsGmxRewards,
        totalVestedAmount: data.vestingInfo.vestedAmount,
        maxVestableAmount: data.vestingInfo.maxVestableAmount,
        capUsedAmount: data.ratioVesting?.capUsedAmount,
      })
    : 0n;

  const depositsDisabled = data?.ratioVesting ? isRatioVestingDepositDisabled(data.ratioVesting, BigInt(now)) : false;
  const pairTokenSymbol = vestingConfig.type === "ratio" ? vestingConfig.pairTokenSymbol : "GMX";

  const startVestingAction = useCallback(() => {
    sendRewardsVestingModalOpenEvent("Start");
    setIsVestingModalVisible(true);
  }, []);

  // Arriving from the "Start vesting" link above the tabs: draw the eye to the vest button.
  const [isVestActionHighlighted, setIsVestActionHighlighted] = useState(false);
  const [vestButtonSize, setVestButtonSize] = useState<{ width: number; height: number }>();
  const vestButtonRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!isVestActionHighlighted) return;

    const button = vestButtonRef.current;
    // The comet clears the highlight on animationend, which never fires without motion.
    if (!button || prefersReducedMotion) {
      button?.scrollIntoView({ block: "nearest" });
      setIsVestActionHighlighted(false);
      return;
    }

    setVestButtonSize({ width: button.offsetWidth, height: button.offsetHeight });
    button.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [isVestActionHighlighted, prefersReducedMotion]);

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const vestingAction = searchParams.get(REWARDS_VESTING_SEARCH_PARAM);
    const shouldStartVesting = vestingAction === REWARDS_VESTING_START_ACTION;
    const shouldHighlightVesting = vestingAction === REWARDS_VESTING_HIGHLIGHT_ACTION;

    if (!shouldStartVesting && !shouldHighlightVesting) {
      hasHandledStartActionRef.current = false;
      return;
    }
    if (!data || (!account && !isDebugFixture) || hasHandledStartActionRef.current) return;

    hasHandledStartActionRef.current = true;
    if (vestableAmount > 0n) {
      if (shouldStartVesting) {
        startVestingAction();
      } else {
        setIsVestActionHighlighted(true);
      }
    }
    searchParams.delete(REWARDS_VESTING_SEARCH_PARAM);
    const nextSearch = searchParams.toString();
    history.replace({ pathname, search: nextSearch ? `?${nextSearch}` : "" });
  }, [account, data, history, isDebugFixture, pathname, search, startVestingAction, vestableAmount]);

  const handleClaim = async () => {
    if (isInteractiveDebug) {
      if (!hasClaimableRewards || isClaiming || isUnlocking || isVestingActionPendingRef.current) {
        return;
      }

      isVestingActionPendingRef.current = true;
      setIsClaiming(true);
      try {
        await runSimulatedTransaction(
          `Claim ${formatTokenAmount(claimableAmount, CLAIMABLE_GMX_DISPLAY_DECIMALS)} GMX`,
          simulateRewardsVestingClaim
        );
      } catch {
        return;
      } finally {
        isVestingActionPendingRef.current = false;
        setIsClaiming(false);
      }
      return;
    }

    if (
      !account ||
      !signer ||
      walletChainId !== chainId ||
      !hasClaimableRewards ||
      data?.ratioVesting?.isFrozen ||
      isClaiming ||
      isUnlocking ||
      isVestingActionPendingRef.current ||
      hasOutdatedUi ||
      hasMultipleWalletExtensionsChainError
    ) {
      return;
    }

    const submittedAccount = account;
    const transactionSession = ++transactionSessionRef.current;
    const hasCurrentTransactionSession = () => transactionSessionRef.current === transactionSession;
    const hasCurrentWalletState = () =>
      walletStateRef.current.account === submittedAccount &&
      walletStateRef.current.walletChainId === chainId &&
      walletStateRef.current.chainId === chainId &&
      !walletStateRef.current.hasOutdatedUi &&
      !walletStateRef.current.hasMultipleWalletExtensionsChainError;
    isVestingActionPendingRef.current = true;
    setIsClaiming(true);
    let submittedAmount: bigint | undefined;
    try {
      let refreshedData;
      try {
        refreshedData = await mutate();
      } catch {
        if (!hasCurrentTransactionSession()) return;
        helperToast.error(t`Unable to refresh claimable rewards. Please try again.`);
        return;
      }

      if (!hasCurrentTransactionSession()) return;
      if (!hasCurrentWalletState()) {
        helperToast.info(t`Wallet or network changed. Review your rewards before claiming.`);
        return;
      }

      submittedAmount = refreshedData?.vestingInfo.claimable;
      if (submittedAmount === undefined) {
        helperToast.error(t`Unable to refresh claimable rewards. Please try again.`);
        return;
      }
      if (submittedAmount < MIN_VESTING_CLAIM_AMOUNT || refreshedData?.ratioVesting?.isFrozen) {
        helperToast.info(t`No rewards are currently available to claim.`);
        return;
      }

      const gmxVester = new ethers.Contract(vestingConfig.vester, abis[vestingConfig.abiId], signer);
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      const transaction = await callContract(chainId, gmxVester, "claim", [], {
        sentMsg: t`Claim submitted`,
        failMsg: t`Claim failed`,
        successMsg: t`GMX claimed`,
        setPendingTxns,
      });
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      await transaction?.wait();
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      sendRewardsTransactionResultEvent({
        transaction: "ClaimVestedGmx",
        result: "Success",
        amount: submittedAmount,
      });
      try {
        await mutate();
        if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      } catch {
        if (!hasCurrentTransactionSession()) return;
        helperToast.info(t`GMX was claimed. Balances will refresh shortly.`);
      }
    } catch {
      if (!hasCurrentTransactionSession()) return;
      sendRewardsTransactionResultEvent({
        transaction: "ClaimVestedGmx",
        result: "Fail",
        amount: submittedAmount,
      });
    } finally {
      if (hasCurrentTransactionSession()) {
        isVestingActionPendingRef.current = false;
        setIsClaiming(false);
      }
    }
  };

  const handleUnlock = async () => {
    if (isInteractiveDebug) {
      if (
        !data ||
        !isVestingComplete ||
        (vestingInfo?.pairAmount ?? 0n) === 0n ||
        isUnlocking ||
        isClaiming ||
        isVestingActionPendingRef.current
      ) {
        return;
      }

      isVestingActionPendingRef.current = true;
      setIsUnlocking(true);
      try {
        await runSimulatedTransaction(
          `Unlock ${formatTokenAmount(vestingInfo?.pairAmount ?? 0n)} GMX collateral`,
          simulateRewardsVestingUnlock
        );
      } catch {
        return;
      } finally {
        isVestingActionPendingRef.current = false;
        setIsUnlocking(false);
      }
      return;
    }

    if (
      !account ||
      !data ||
      !signer ||
      walletChainId !== chainId ||
      !isVestingComplete ||
      (vestingInfo?.pairAmount ?? 0n) === 0n ||
      isUnlocking ||
      isClaiming ||
      isVestingActionPendingRef.current ||
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
      walletStateRef.current.walletChainId === chainId &&
      walletStateRef.current.chainId === chainId &&
      !walletStateRef.current.hasOutdatedUi &&
      !walletStateRef.current.hasMultipleWalletExtensionsChainError;
    isVestingActionPendingRef.current = true;
    setIsUnlocking(true);
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
        helperToast.info(t`Wallet or network changed. Review your vesting details before unlocking collateral.`);
        return;
      }

      if (!refreshedData) {
        helperToast.error(t`Unable to refresh vesting details. Please try again.`);
        return;
      }

      const refreshedRemainingAmount = getEffectiveRemainingAmount(refreshedData);
      const refreshedInfo = refreshedData.vestingInfo;
      if (
        hasWithdrawPreviewChanged(submittedData, refreshedData) ||
        refreshedInfo.vestedAmount === 0n ||
        refreshedRemainingAmount !== 0n ||
        refreshedInfo.pairAmount === 0n
      ) {
        helperToast.info(t`Vesting details changed. Review the updated amounts before unlocking collateral.`);
        return;
      }

      submittedAmount = refreshedInfo.pairAmount;
      const gmxVester = new ethers.Contract(vestingConfig.vester, abis[vestingConfig.abiId], signer);
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      const transaction = await callContract(chainId, gmxVester, "withdraw", [], {
        sentMsg: t`Unlock submitted`,
        failMsg: t`Unlock failed`,
        successMsg: t`Collateral unlocked`,
        setPendingTxns,
      });
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      await transaction?.wait();
      if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      sendRewardsTransactionResultEvent({
        transaction: "UnlockCollateral",
        result: "Success",
        amount: submittedAmount,
      });
      try {
        await mutate();
        if (!hasCurrentTransactionSession() || !hasCurrentWalletState()) return;
      } catch {
        if (!hasCurrentTransactionSession()) return;
        helperToast.info(t`Collateral was unlocked. Balances will refresh shortly.`);
      }
    } catch {
      if (!hasCurrentTransactionSession()) return;
      sendRewardsTransactionResultEvent({
        transaction: "UnlockCollateral",
        result: "Fail",
        amount: submittedAmount,
      });
    } finally {
      if (hasCurrentTransactionSession()) {
        isVestingActionPendingRef.current = false;
        setIsUnlocking(false);
      }
    }
  };

  const openBuyGmxModal = () => {
    setIsVestingModalVisible(false);
    setIsBuyGmxModalVisible(true);
  };

  const handleVestingStarted = () => {
    if (isVestingStartedModalDismissed) return;

    setHasJustStartedVesting(true);
  };

  const closeVestingStartedModal = () => {
    setHasJustStartedVesting(false);
    setIsVestingStartedModalDismissed(true);
  };

  const openStopVestingModal = () => {
    sendRewardsVestingModalOpenEvent("Stop");
    setIsStopModalVisible(true);
  };

  const simulateVesting = async (depositAmount: bigint) => {
    await runSimulatedTransaction(`Vest ${formatTokenAmount(depositAmount)} esGMX`, (currentData) =>
      simulateRewardsVestingDeposit(currentData, depositAmount)
    );
  };

  const simulateEsGmxClaim = async () => {
    await runSimulatedTransaction(
      `Claim ${formatTokenAmount(data?.claimableEsGmxRewards ?? 0n)} esGMX rewards`,
      simulateRewardsEsGmxClaim
    );
  };

  const simulateGmxStake = async (stakeAmount: bigint) => {
    await runSimulatedTransaction(`Stake ${formatTokenAmount(stakeAmount)} GMX collateral`, (currentData) =>
      simulateRewardsGmxStake(currentData, stakeAmount)
    );
  };

  const simulateStopVesting = async () => {
    await runSimulatedTransaction("Stop vesting", simulateRewardsVestingStop);
  };

  const applyDebugData = (nextData: RewardsVestingData) => {
    rejectSimulatedTransaction();
    setDebugData(nextData);
  };

  const resetDebugData = () => {
    rejectSimulatedTransaction();
    setDebugData(getRewardsVestingDebugSnapshot(debugMode)?.data);
  };

  return (
    <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
      {isInteractiveDebug && data ? (
        <RewardsTesterVestingSimulatorSlot>
          <RewardsVestingDebugPanel data={data} onApply={applyDebugData} onReset={resetDebugData} />
        </RewardsTesterVestingSimulatorSlot>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-8 max-lg:grid-cols-1 max-lg:grid-rows-[1fr_minmax(0,1fr)_1fr]">
        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            label={<Trans>Available to vest</Trans>}
            unit="esGMX"
            amount={vestableAmount}
            usd={getUsdValue(vestableAmount, data?.gmxPrice)}
            active
            loading={isInitialLoading}
            unavailable={isDisconnected || isUnavailable}
            action={
              chainId === ARBITRUM_SEPOLIA && !isDebugFixture ? (
                <div className="ml-auto flex shrink-0 items-center gap-4">
                  <Button
                    variant="link"
                    size="controlled"
                    className="shrink-0 !p-0 !text-12"
                    onClick={() => setIsMintModalVisible(true)}
                    qa="rewards-mint-esgmx"
                  >
                    <Trans>Mint</Trans>
                  </Button>
                  <Button
                    variant="link"
                    size="controlled"
                    className="shrink-0 !p-0 !text-12"
                    aria-label={t`Distribute esGMX`}
                    onClick={() => setIsDistributeModalVisible(true)}
                    qa="rewards-distribute-esgmx"
                  >
                    <Trans>Distribute</Trans>
                  </Button>
                </div>
              ) : undefined
            }
          />
          {isDisconnected ? (
            <DisconnectedPanel onConnect={openConnectModal} />
          ) : isInitialLoading ? (
            <LoadingPanel />
          ) : isUnavailable ? (
            <UnavailablePanel />
          ) : (
            <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-12 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 backdrop-blur-[50px]">
              {vestableAmount > 0n ? (
                <div className="flex grow items-center justify-center px-4 text-left text-13 leading-[1.5]">
                  <p className="min-w-0 text-center">
                    <span className="font-medium text-blue-300">
                      <InfoIcon className="-mt-2 mr-4 inline size-16 align-middle" />
                      <Trans>Vesting turns esGMX into GMX over 12 months.</Trans>
                    </span>
                    <br />
                    <span className="text-typography-secondary">
                      {ratioVesting ? (
                        <Trans>Your collateral stays locked during vesting.</Trans>
                      ) : (
                        <Trans>Your GMX collateral stays locked until it’s done.</Trans>
                      )}
                    </span>
                  </p>
                </div>
              ) : (
                <ColorfulBanner
                  color="blue"
                  icon={InfoIcon}
                  className="min-h-56 w-full shrink-0 !border-l !px-12 !py-10 !text-14 !font-medium !leading-[1.25] [&_svg]:!p-0"
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <div>
                      <Trans>Earn esGMX rewards from eligible trading activity.</Trans>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const searchParams = new URLSearchParams(search);
                        searchParams.set(REWARDS_ONBOARDING_SEARCH_PARAM, REWARDS_ONBOARDING_OPEN_ACTION);
                        history.replace({ ...history.location, search: `?${searchParams.toString()}` });
                      }}
                      aria-haspopup="dialog"
                      className="flex w-fit items-center gap-4 pr-2 text-13 font-medium text-blue-300 -outline-offset-2"
                    >
                      <Trans>Learn how</Trans>
                      <ChevronRightIcon className="size-16" />
                    </button>
                  </div>
                </ColorfulBanner>
              )}

              {vestableAmount > 0n && data ? (
                <Button
                  variant="primary"
                  size="medium"
                  className="relative h-40 w-full shrink-0 text-14"
                  buttonRef={vestButtonRef}
                  onClick={startVestingAction}
                  disabled={depositsDisabled}
                >
                  {isVestActionHighlighted && vestButtonSize ? (
                    <VestButtonComet
                      width={vestButtonSize.width}
                      height={vestButtonSize.height}
                      onDone={() => setIsVestActionHighlighted(false)}
                    />
                  ) : null}
                  {depositsDisabled ? (
                    <Trans>Deposits are closed.</Trans>
                  ) : isVestingActive ? (
                    <Trans>Add to vesting</Trans>
                  ) : (
                    <Trans>Start vesting</Trans>
                  )}
                  <VestIcon className="size-16" />
                </Button>
              ) : (
                <IdleAction>
                  <Trans>Nothing to vest</Trans>
                </IdleAction>
              )}
            </div>
          )}
        </section>

        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            label={<Trans>In vesting</Trans>}
            unit={<Trans>esGMX left</Trans>}
            amount={effectiveRemainingAmount}
            usd={getUsdValue(effectiveRemainingAmount, data?.gmxPrice)}
            active={hasVestingPosition}
            loading={isInitialLoading}
            unavailable={isDisconnected || isUnavailable}
          />
          {isDisconnected ? (
            <DisconnectedPanel />
          ) : isInitialLoading ? (
            <LoadingPanel />
          ) : isUnavailable ? (
            <UnavailablePanel />
          ) : !hasVestingPosition ? (
            <div className="flex min-h-[132px] w-full grow flex-col items-center justify-center gap-8 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 text-center backdrop-blur-[50px]">
              <p className="max-w-[330px] text-12 font-medium leading-[1.35] text-typography-secondary">
                <Trans>
                  No esGMX is currently vesting. Begin vesting your esGMX and gradually convert it into liquid GMX.
                </Trans>
              </p>
            </div>
          ) : (
            <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-10 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 backdrop-blur-[50px]">
              <div className="flex grow flex-col gap-6 px-4">
                <div className="text-body-medium flex items-center justify-between gap-8">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Collateral locked</Trans>
                  </span>
                  <span className="text-typography-secondary numbers">
                    <span className="text-typography-primary">{formatTokenAmount(vestingInfo?.pairAmount ?? 0n)}</span>{" "}
                    {pairTokenSymbol}
                  </span>
                </div>
                <div className="text-body-medium flex items-center justify-between gap-8">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Status</Trans>
                  </span>
                  <span className={isVestingComplete ? "text-green-500" : "text-typography-primary"}>
                    {isVestingComplete ? (
                      <Trans>Complete</Trans>
                    ) : isVestingPaused ? (
                      <Trans>Vesting paused</Trans>
                    ) : (
                      <Plural value={Number(daysLeft)} one="# day left" other="# days left" />
                    )}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={cx("h-full rounded-full", isVestingComplete ? "bg-green-500" : "bg-blue-300")}
                    style={progressStyle}
                  />
                </div>
              </div>
              {isVestingComplete && (vestingInfo?.pairAmount ?? 0n) > 0n ? (
                <RewardsVestingChainGuard chainId={chainId} skip={isInteractiveDebug}>
                  <ButtonTooltipWrapper
                    content={isInteractiveDebug ? undefined : multipleWalletExtensionsChainError.buttonTooltipMessage}
                  >
                    <Button
                      variant="secondary"
                      size="medium"
                      className="h-40 w-full shrink-0 text-14"
                      onClick={handleUnlock}
                      disabled={
                        isUnlocking ||
                        isClaiming ||
                        (!isInteractiveDebug && (!signer || hasOutdatedUi || hasMultipleWalletExtensionsChainError))
                      }
                    >
                      {(!isInteractiveDebug ? multipleWalletExtensionsChainError.buttonErrorMessage : undefined) ??
                        (isUnlocking ? <Trans>Unlocking...</Trans> : <Trans>Unlock collateral</Trans>)}
                      <CheckIcon className="size-16" />
                    </Button>
                  </ButtonTooltipWrapper>
                </RewardsVestingChainGuard>
              ) : isVestingComplete ? (
                <IdleAction>
                  <Trans>Vesting completed</Trans>
                  <CheckIcon className="size-16" />
                </IdleAction>
              ) : (
                <Button
                  variant="secondary"
                  size="medium"
                  className="h-40 w-full shrink-0 text-14"
                  onClick={openStopVestingModal}
                >
                  <Trans>Stop vesting</Trans>
                  <CloseIcon className="size-16" />
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            label={<Trans>Claimable</Trans>}
            unit="GMX"
            amount={displayedClaimableAmount}
            usd={getUsdValue(displayedClaimableAmount, data?.gmxPrice)}
            displayDecimals={CLAIMABLE_GMX_DISPLAY_DECIMALS}
            active={hasClaimableRewards}
            loading={isInitialLoading}
            unavailable={isDisconnected || isUnavailable}
          />
          {isDisconnected ? (
            <DisconnectedPanel />
          ) : isInitialLoading ? (
            <LoadingPanel />
          ) : isUnavailable ? (
            <UnavailablePanel />
          ) : (
            <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-12 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 backdrop-blur-[50px]">
              <div className="flex grow flex-col px-4">
                <RewardBalanceRow label={<Trans>Wallet</Trans>} amount={data?.walletGmxBalance ?? 0n} />
                <RewardBalanceRow
                  label={data?.ratioVesting ? <Trans>Collateral available</Trans> : <Trans>Staked</Trans>}
                  amount={data?.ratioVesting ? data.freePairAmount : data?.stakedGmxBalance ?? 0n}
                  symbol={pairTokenSymbol}
                />
              </div>
              {hasClaimableRewards ? (
                <RewardsVestingChainGuard chainId={chainId} skip={isInteractiveDebug}>
                  <ButtonTooltipWrapper
                    content={isInteractiveDebug ? undefined : multipleWalletExtensionsChainError.buttonTooltipMessage}
                  >
                    <Button
                      variant="primary"
                      size="medium"
                      className="h-40 w-full shrink-0 text-14"
                      onClick={handleClaim}
                      disabled={
                        isClaiming ||
                        isUnlocking ||
                        Boolean(data?.ratioVesting?.isFrozen) ||
                        (!isInteractiveDebug && (!signer || hasOutdatedUi || hasMultipleWalletExtensionsChainError))
                      }
                    >
                      {(!isInteractiveDebug ? multipleWalletExtensionsChainError.buttonErrorMessage : undefined) ??
                        (isClaiming ? (
                          <Trans>Claiming...</Trans>
                        ) : (
                          <Trans>Claim {formatTokenAmount(claimableAmount, CLAIMABLE_GMX_DISPLAY_DECIMALS)} GMX</Trans>
                        ))}
                      <ClaimIcon className="size-16" />
                    </Button>
                  </ButtonTooltipWrapper>
                </RewardsVestingChainGuard>
              ) : (
                <IdleAction>
                  <Trans>Nothing to claim</Trans>
                </IdleAction>
              )}
            </div>
          )}
        </section>
      </div>

      {data && (account || isDebugFixture) ? (
        <>
          {vestingConfig.type === "ratio" && data.ratioVesting && !isInteractiveDebug ? (
            <RewardsRatioVestingModal
              key={chainId}
              chainId={chainId}
              config={vestingConfig}
              data={data}
              isVisible={isVestingModalVisible}
              setIsVisible={setIsVestingModalVisible}
              mutate={mutate}
              onVestingStarted={handleVestingStarted}
            />
          ) : (
            <RewardsVestingModal
              chainId={chainId}
              isVisible={isVestingModalVisible}
              setIsVisible={setIsVestingModalVisible}
              data={data}
              mutate={mutate}
              onBuyGmx={openBuyGmxModal}
              onVestingStarted={handleVestingStarted}
              claimableEsGmxAmount={data.claimableEsGmxRewards}
              onSimulatedClaim={isInteractiveDebug ? simulateEsGmxClaim : undefined}
              onSimulatedStake={isInteractiveDebug ? simulateGmxStake : undefined}
              onSimulatedVest={isInteractiveDebug ? simulateVesting : undefined}
            />
          )}
          <RewardsStopVestingModal
            chainId={chainId}
            isVisible={isStopModalVisible}
            setIsVisible={setIsStopModalVisible}
            data={data}
            mutate={mutate}
            onSimulatedStop={isInteractiveDebug ? simulateStopVesting : undefined}
          />
        </>
      ) : null}
      {chainId === ARBITRUM_SEPOLIA && !isDebugFixture ? (
        <>
          <RewardsMintEsGmxModal
            isVisible={isMintModalVisible}
            setIsVisible={setIsMintModalVisible}
            walletEsGmxBalance={data?.walletEsGmxBalance}
            walletSbfGmxBalance={data?.freePairAmount}
            onMinted={mutate}
          />
          <RewardsDistributeEsGmxModal
            isVisible={isDistributeModalVisible}
            setIsVisible={setIsDistributeModalVisible}
            onDistributed={mutate}
          />
        </>
      ) : null}
      <RewardsVestingStartedModal isVisible={hasJustStartedVesting} onClose={closeVestingStartedModal} />
      <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />
      <RewardsVestingSimulatorApprovalModal
        action={simulatedTransactionAction}
        onApprove={approveSimulatedTransaction}
        onReject={rejectSimulatedTransaction}
      />
    </SkeletonTheme>
  );
}
