import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { useConnectModal } from "context/ConnectModalContext/ConnectModalContext";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import {
  getRewardsVestingDaysLeft,
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingProgress,
} from "domain/vesting/rewardsVesting";
import { useRewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { callContract } from "lib/contracts";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmount, formatUsd } from "lib/numbers";
import { useCurrentUnixTimestamp } from "lib/useCurrentUnixTimestamp";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { StandaloneBuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import { abis } from "sdk/abis";
import { convertToUsd } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import ButtonLink from "components/Button/ButtonLink";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import CheckIcon from "img/ic_check.svg?react";
import ChevronRightIcon from "img/ic_chevron_right.svg?react";
import CloseIcon from "img/ic_close.svg?react";
import ClaimIcon from "img/ic_earn.svg?react";
import VestIcon from "img/ic_increaselimit_16.svg?react";
import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { getRewardsPath } from "../rewardsRoutes";
import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";
import { RewardsStopVestingModal, RewardsVestingModal } from "./RewardsVestingModals";

function formatTokenAmount(amount: bigint, displayDecimals = 2) {
  return formatAmount(amount, GMX_DECIMALS, displayDecimals, true, { trimTrailingZeros: true });
}

function getUsdValue(amount: bigint, price: bigint | undefined) {
  if (amount === 0n) return 0n;
  return convertToUsd(amount, GMX_DECIMALS, price);
}

function AmountHeader({
  step,
  label,
  unit,
  amount,
  usd,
  active = false,
  loading = false,
  unavailable = false,
}: {
  step: number;
  label: React.ReactNode;
  unit: React.ReactNode;
  amount: bigint;
  usd: bigint | undefined;
  active?: boolean;
  loading?: boolean;
  unavailable?: boolean;
}) {
  return (
    <div className="flex min-h-[105px] w-full flex-col items-start p-8">
      <div className="flex h-24 items-center gap-8">
        <span
          className={cx(
            "flex size-20 items-center justify-center rounded-full px-4 py-2 text-12 font-medium",
            active ? "bg-blue-300/20 text-blue-300" : "bg-slate-800 text-typography-disabled"
          )}
        >
          {step}
        </span>
        <span className="shrink-0 whitespace-nowrap text-12 font-medium text-typography-secondary">{label}</span>
      </div>
      {loading ? (
        <div className="flex h-[50px] items-center">
          <Skeleton width={145} height={34} />
        </div>
      ) : (
        <div className="flex min-w-0 items-end gap-4">
          <span
            className={cx(
              "min-w-0 truncate whitespace-nowrap text-[40px] font-medium leading-[50px] tracking-[-0.016em]",
              active && !unavailable && amount > 0n ? "text-typography-primary" : "text-typography-secondary"
            )}
          >
            {unavailable ? "-" : formatTokenAmount(amount)}
          </span>
          <span className="flex h-32 shrink-0 items-center whitespace-nowrap text-16 font-medium text-typography-secondary">
            {unit}
          </span>
        </div>
      )}
      <span className="shrink-0 whitespace-nowrap text-12 font-medium leading-[1.25] text-typography-disabled">
        {loading ? <Skeleton width={72} /> : `= ${unavailable ? "-" : formatUsd(usd) ?? "-"}`}
      </span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex w-40 shrink-0 items-center justify-center rounded-8 bg-slate-900/[0.88] max-lg:h-40 max-lg:w-full">
      <ArrowRightIcon className="size-16 text-typography-disabled max-lg:rotate-90" />
    </div>
  );
}

function IdleAction({ children }: { children: React.ReactNode }) {
  return (
    <Button
      variant="secondary"
      size="medium"
      className="h-40 w-full shrink-0 !bg-fill-surfaceElevated50 !text-14 !leading-[1.25] !text-typography-disabled"
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

function RewardBalanceRow({ label, amount }: { label: React.ReactNode; amount: bigint }) {
  return (
    <div className="flex h-24 items-center justify-between gap-8 text-14">
      <span className="font-medium text-typography-secondary">{label}</span>
      <span className="text-typography-secondary numbers">
        <span className="text-typography-primary">{formatTokenAmount(amount)}</span> GMX
      </span>
    </div>
  );
}

export function RewardsVestingFlow() {
  const { account, chainId: walletChainId, signer } = useWallet();
  const { openConnectModal } = useConnectModal();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const now = useCurrentUnixTimestamp(30_000);
  const { data, isLoading, error, mutate } = useRewardsVestingData(account, ARBITRUM);
  const [isVestingModalVisible, setIsVestingModalVisible] = useState(false);
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const isDisconnected = !account;
  const isInitialLoading = Boolean(account) && isLoading && !data && !error;
  const isUnavailable = Boolean(account) && !data && (Boolean(error) || !isLoading);
  const availableEsGmxAmount = data?.walletEsGmxBalance ?? 0n;
  const vestingInfo = data?.vestingInfo;
  const effectiveRemainingAmount = useMemo(
    () =>
      vestingInfo
        ? getRewardsVestingEffectiveRemainingAmount({
            totalVestedAmount: vestingInfo.vestedAmount,
            escrowedBalance: vestingInfo.escrowedBalance,
            claimedAmount: vestingInfo.claimedAmounts,
            claimableAmount: vestingInfo.claimable,
          })
        : 0n,
    [vestingInfo]
  );
  const progress = getRewardsVestingProgress({
    totalVestedAmount: vestingInfo?.vestedAmount ?? 0n,
    effectiveRemainingAmount,
  });
  const progressStyle = useMemo(() => ({ width: `${Number(progress.progressBps) / 100}%` }), [progress.progressBps]);
  const endTimestamp = data
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
  const claimableAmount = vestingInfo?.claimable ?? 0n;
  const remainingVestableAmount = data
    ? data.vestingInfo.maxVestableAmount > data.vestingInfo.vestedAmount
      ? data.vestingInfo.maxVestableAmount - data.vestingInfo.vestedAmount
      : 0n
    : 0n;
  const vestableAmount =
    availableEsGmxAmount < remainingVestableAmount ? availableEsGmxAmount : remainingVestableAmount;

  const handleClaim = async () => {
    if (!signer || walletChainId !== ARBITRUM || claimableAmount === 0n || isClaiming || hasOutdatedUi) return;

    setIsClaiming(true);
    try {
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      const transaction = await callContract(ARBITRUM, gmxVester, "claim", [], {
        sentMsg: t`Claim submitted`,
        failMsg: t`Claim failed`,
        successMsg: t`GMX claimed`,
        setPendingTxns,
      });
      await transaction?.wait();
      await mutate();
    } catch {
      return;
    } finally {
      setIsClaiming(false);
    }
  };

  const handleUnlock = async () => {
    if (
      !signer ||
      walletChainId !== ARBITRUM ||
      !isVestingComplete ||
      (vestingInfo?.pairAmount ?? 0n) === 0n ||
      isUnlocking ||
      hasOutdatedUi
    ) {
      return;
    }

    setIsUnlocking(true);
    try {
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      const transaction = await callContract(ARBITRUM, gmxVester, "withdraw", [], {
        sentMsg: t`Unlock submitted`,
        failMsg: t`Unlock failed`,
        successMsg: t`Collateral unlocked`,
        setPendingTxns,
      });
      await transaction?.wait();
      await mutate();
    } catch {
      return;
    } finally {
      setIsUnlocking(false);
    }
  };

  const openBuyGmxModal = () => {
    setIsVestingModalVisible(false);
    setIsBuyGmxModalVisible(true);
  };

  return (
    <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A">
      <div
        className="grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)_40px_minmax(0,1fr)] items-stretch gap-8 max-lg:grid-cols-1 max-lg:grid-rows-[1fr_40px_1fr_40px_1fr]"
        data-testid="rewards-vesting-flow"
      >
        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            step={1}
            label={<Trans>Available esGMX</Trans>}
            unit="esGMX"
            amount={availableEsGmxAmount}
            usd={getUsdValue(availableEsGmxAmount, data?.gmxPrice)}
            active
            loading={isInitialLoading}
            unavailable={isDisconnected || isUnavailable}
          />
          {isDisconnected ? (
            <DisconnectedPanel onConnect={openConnectModal} />
          ) : isInitialLoading ? (
            <LoadingPanel />
          ) : isUnavailable ? (
            <UnavailablePanel />
          ) : (
            <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-12 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 backdrop-blur-[50px]">
              {isVestingActive ? (
                <ColorfulBanner
                  color="blue"
                  icon={InfoIcon}
                  className="min-h-56 w-full shrink-0 !border-l-[1.5px] !px-12 !py-10 !text-14 !font-medium !leading-[1.25] [&_svg]:!p-0"
                >
                  <span className="text-blue-300">
                    <Trans>New esGMX keeps accruing while a vest is active</Trans>
                  </span>{" "}
                  — <Trans>adding it will extend your unlock date.</Trans>
                </ColorfulBanner>
              ) : vestableAmount > 0n ? (
                <div className="flex grow items-center justify-center gap-8 px-4 text-left text-13 leading-[1.35]">
                  <InfoIcon className="size-20 shrink-0 text-blue-300" />
                  <p>
                    <span className="text-blue-300">
                      <Trans>Vesting turns esGMX into GMX over 12 months.</Trans>
                    </span>
                    <br />
                    <span className="text-typography-secondary">
                      <Trans>Your GMX collateral stays locked until it’s done.</Trans>
                    </span>
                  </p>
                </div>
              ) : (
                <ColorfulBanner
                  color="blue"
                  icon={InfoIcon}
                  className="min-h-56 w-full shrink-0 !border-l-[1.5px] !px-12 !py-10 !text-14 !font-medium !leading-[1.25] [&_svg]:!p-0"
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <div>
                      <Trans>Earn esGMX rewards from eligible trading activity.</Trans>
                    </div>
                    <ButtonLink
                      to={getRewardsPath("tiers")}
                      className="flex w-fit items-center gap-4 pr-2 text-13 font-medium text-blue-300 -outline-offset-2"
                    >
                      <Trans>Learn how</Trans>
                      <ChevronRightIcon className="size-16" />
                    </ButtonLink>
                  </div>
                </ColorfulBanner>
              )}

              {vestableAmount > 0n && data ? (
                <Button
                  variant="primary"
                  size="medium"
                  className="h-40 w-full shrink-0 text-14"
                  onClick={() => setIsVestingModalVisible(true)}
                >
                  {isVestingActive ? <Trans>Vest more</Trans> : <Trans>Start vesting</Trans>}
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

        <FlowArrow />

        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            step={2}
            label={<Trans>Vesting esGMX</Trans>}
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
              <VestIcon className="size-20 shrink-0 text-blue-300" />
              <p className="max-w-[330px] text-12 font-medium leading-[1.35] text-typography-secondary">
                <Trans>
                  No esGMX is currently vesting. Stake GMX to start vesting your esGMX and gradually convert it into
                  liquid GMX.
                </Trans>
              </p>
            </div>
          ) : (
            <div className="flex min-h-[132px] w-full grow flex-col justify-between gap-10 overflow-hidden rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12 backdrop-blur-[50px]">
              <div className="flex grow flex-col gap-6 px-4">
                <div className="flex items-center justify-between gap-8 text-14">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Collateral locked</Trans>
                  </span>
                  <span className="text-typography-secondary numbers">
                    <span className="text-typography-primary">{formatTokenAmount(vestingInfo?.pairAmount ?? 0n)}</span>{" "}
                    GMX
                  </span>
                </div>
                <div className="flex items-center justify-between gap-8 text-14">
                  <span className="font-medium text-typography-secondary">
                    <Trans>Status</Trans>
                  </span>
                  <span className={isVestingComplete ? "text-green-500" : "text-typography-primary"}>
                    {isVestingComplete ? (
                      <Trans>Complete</Trans>
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
                <RewardsVestingChainGuard>
                  <Button
                    variant="secondary"
                    size="medium"
                    className="h-40 w-full shrink-0 text-14"
                    onClick={handleUnlock}
                    disabled={isUnlocking || !signer || hasOutdatedUi}
                  >
                    {isUnlocking ? <Trans>Unlocking...</Trans> : <Trans>Unlock collateral</Trans>}
                    <CheckIcon className="size-16" />
                  </Button>
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
                  onClick={() => setIsStopModalVisible(true)}
                >
                  <Trans>Stop vesting</Trans>
                  <CloseIcon className="size-16" />
                </Button>
              )}
            </div>
          )}
        </section>

        <FlowArrow />

        <section className="flex min-h-[265px] min-w-0 flex-col gap-4 rounded-8 bg-slate-900 p-12">
          <AmountHeader
            step={3}
            label={<Trans>Rewards</Trans>}
            unit={<Trans>GMX Claimable</Trans>}
            amount={claimableAmount}
            usd={getUsdValue(claimableAmount, data?.gmxPrice)}
            active={claimableAmount > 0n}
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
                <RewardBalanceRow label={<Trans>Staked</Trans>} amount={data?.stakedGmxBalance ?? 0n} />
              </div>
              {claimableAmount > 0n ? (
                <RewardsVestingChainGuard>
                  <Button
                    variant="primary"
                    size="medium"
                    className="h-40 w-full shrink-0 text-14"
                    onClick={handleClaim}
                    disabled={isClaiming || !signer || hasOutdatedUi}
                  >
                    {isClaiming ? (
                      <Trans>Claiming...</Trans>
                    ) : (
                      <Trans>Claim {formatTokenAmount(claimableAmount)} GMX</Trans>
                    )}
                    <ClaimIcon className="size-16" />
                  </Button>
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

      {data && account ? (
        <>
          <RewardsVestingModal
            isVisible={isVestingModalVisible}
            setIsVisible={setIsVestingModalVisible}
            data={data}
            mutate={mutate}
            onBuyGmx={openBuyGmxModal}
          />
          <RewardsStopVestingModal
            isVisible={isStopModalVisible}
            setIsVisible={setIsStopModalVisible}
            data={data}
            mutate={mutate}
          />
        </>
      ) : null}
      <StandaloneBuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />
    </SkeletonTheme>
  );
}
