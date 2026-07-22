import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useEffect, useMemo, useRef, useState } from "react";

import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import {
  getRewardsVestingEffectiveRemainingAmount,
  getRewardsVestingEndTimestamp,
  getRewardsVestingMaxDepositAmount,
  getRewardsVestingPairAmounts,
} from "domain/vesting/rewardsVesting";
import type { RewardsVestingData } from "domain/vesting/useRewardsVestingData";
import { callContract } from "lib/contracts";
import { formatRelativeDateWithComma } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { GMX_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import Button from "components/Button/Button";
import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";

import InfoIcon from "img/ic_info_circle_stroke.svg?react";

import { RewardsVestingChainGuard } from "./RewardsVestingChainGuard";

type RewardsVestingDataMutator = () => Promise<RewardsVestingData | undefined>;

type RewardsVestingModalProps = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  data: RewardsVestingData;
  mutate: RewardsVestingDataMutator;
  onBuyGmx: () => void;
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
  const remainingVestableAmount =
    data.vestingInfo.maxVestableAmount > data.vestingInfo.vestedAmount
      ? data.vestingInfo.maxVestableAmount - data.vestingInfo.vestedAmount
      : 0n;

  return data.walletEsGmxBalance < remainingVestableAmount ? data.walletEsGmxBalance : remainingVestableAmount;
}

function ModalValueRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-12 text-14 leading-[1.25]">
      <span className="text-typography-secondary">{label}</span>
      <span className="shrink-0 text-typography-primary numbers">{value}</span>
    </div>
  );
}

export function RewardsVestingModal({ isVisible, setIsVisible, data, mutate, onBuyGmx }: RewardsVestingModalProps) {
  const { account, active, chainId: walletChainId, signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const [value, setValue] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [transactionStep, setTransactionStep] = useState<"staking" | "vesting">();
  const wasVisible = useRef(false);
  const walletStateRef = useRef({ account, walletChainId });
  walletStateRef.current = { account, walletChainId };

  const effectiveRemainingAmount = useMemo(() => getEffectiveRemainingAmount(data), [data]);
  const vestingLimit = useMemo(() => getVestingLimit(data), [data]);
  const depositAmount = useMemo(() => parseValue(value, GMX_DECIMALS), [value]);
  const preview = useMemo(
    () =>
      getRewardsVestingPairAmounts({
        effectiveRemainingAmount,
        depositAmount: depositAmount ?? 0n,
        averageStakedAmount: data.vestingInfo.averageStakedAmount,
        maxVestableAmount: data.vestingInfo.maxVestableAmount,
        currentPairAmount: data.vestingInfo.pairAmount,
        availablePairAmount: data.freePairAmount,
      }),
    [data, depositAmount, effectiveRemainingAmount]
  );
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
    if (isVisible && !wasVisible.current) {
      setValue(vestingLimit > 0n ? formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS) : "");
    }
    wasVisible.current = isVisible;
  }, [isVisible, vestingLimit]);

  const gmxAddress = getContract(ARBITRUM, "GMX");
  const stakedGmxTrackerAddress = getContract(ARBITRUM, "StakedGmxTracker");
  const { tokensAllowanceData, isLoading: isAllowanceLoading } = useTokensAllowanceData(ARBITRUM, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
    skip: !isVisible || preview.stakeShortfallAmount === 0n,
  });
  const gmxAllowance = tokensAllowanceData?.[gmxAddress];
  const needsApproval = preview.stakeShortfallAmount > 0n && (gmxAllowance ?? 0n) < preview.stakeShortfallAmount;
  const hasEnoughWalletGmx = data.walletGmxBalance >= preview.stakeShortfallAmount;
  const isBusy = isApproving || transactionStep !== undefined;
  const isWalletReady = Boolean(active && account && signer && walletChainId === ARBITRUM);
  const hasActiveVesting = data.vestingInfo.vestedAmount > 0n && effectiveRemainingAmount > 0n;
  const hasValidAmount =
    depositAmount !== undefined && depositAmount > 0n && depositAmount <= vestingLimit && hasEnoughWalletGmx;

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

  const handleApprove = async () => {
    if (!isWalletReady) return;

    await approveTokens({
      setIsApproving,
      signer,
      tokenAddress: gmxAddress,
      spender: stakedGmxTrackerAddress,
      chainId: ARBITRUM,
      permitParams: undefined,
      approveAmount: undefined,
    });
  };

  const handleVest = async () => {
    if (
      !signer ||
      !account ||
      walletChainId !== ARBITRUM ||
      depositAmount === undefined ||
      depositAmount === 0n ||
      !hasValidAmount ||
      hasOutdatedUi
    ) {
      return;
    }

    if (needsApproval) {
      await handleApprove();
      return;
    }

    const submittedAccount = account;
    let didStake = false;
    let didVest = false;

    try {
      if (preview.stakeShortfallAmount > 0n) {
        setTransactionStep("staking");
        const rewardRouter = new ethers.Contract(getContract(ARBITRUM, "RewardRouter"), abis.RewardRouter, signer);
        const stakeTransaction = await callContract(
          ARBITRUM,
          rewardRouter,
          "stakeGmx",
          [preview.stakeShortfallAmount],
          {
            sentMsg: t`Stake submitted`,
            failMsg: t`Stake failed`,
            successMsg: t`GMX staked`,
            setPendingTxns,
          }
        );
        await stakeTransaction?.wait();
        didStake = true;
        const refreshedData = await mutate();

        if (!refreshedData) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }
        if (walletStateRef.current.account !== submittedAccount || walletStateRef.current.walletChainId !== ARBITRUM) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }

        const latestEffectiveRemainingAmount = getEffectiveRemainingAmount(refreshedData);
        const latestPreview = getRewardsVestingPairAmounts({
          effectiveRemainingAmount: latestEffectiveRemainingAmount,
          depositAmount,
          averageStakedAmount: refreshedData.vestingInfo.averageStakedAmount,
          maxVestableAmount: refreshedData.vestingInfo.maxVestableAmount,
          currentPairAmount: refreshedData.vestingInfo.pairAmount,
          availablePairAmount: refreshedData.freePairAmount,
        });

        if (latestPreview.stakeShortfallAmount > 0n || depositAmount > getVestingLimit(refreshedData)) {
          helperToast.info(t`GMX was staked. Review the updated collateral and continue vesting.`);
          return;
        }
      }

      setTransactionStep("vesting");
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      const vestTransaction = await callContract(ARBITRUM, gmxVester, "deposit", [depositAmount], {
        sentMsg: t`Vesting submitted`,
        failMsg: t`Vesting failed`,
        successMsg: t`Vesting started`,
        setPendingTxns,
      });
      setIsVisible(false);
      await vestTransaction?.wait();
      didVest = true;
      await mutate();
    } catch {
      if (didStake && !didVest) {
        helperToast.info(t`GMX was staked, but vesting did not start. Review the updated collateral and try again.`);
      }
      return;
    } finally {
      setTransactionStep(undefined);
    }
  };

  let primaryText: React.ReactNode;
  if (hasOutdatedUi) {
    primaryText = getPageOutdatedError();
  } else if (depositAmount === undefined || depositAmount === 0n) {
    primaryText = <Trans>Enter an amount</Trans>;
  } else if (depositAmount > vestingLimit) {
    primaryText = <Trans>Max amount exceeded</Trans>;
  } else if (!hasEnoughWalletGmx) {
    primaryText = <Trans>Vest {formatTokenAmount(depositAmount)} esGMX</Trans>;
  } else if (isAllowanceLoading) {
    primaryText = <Trans>Loading allowance...</Trans>;
  } else if (isApproving) {
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
              onValueChange={(event) => setValue(event.target.value)}
              className="bg-transparent min-w-0 grow text-16 outline-none"
              placeholder="0"
              maxDecimals={GMX_DECIMALS}
              isDisabled={isBusy}
              qa="rewards-vesting-amount"
            />
            <span className="text-13 text-typography-secondary">esGMX</span>
            <button
              type="button"
              className="rounded-full bg-slate-600 px-8 py-3 text-12 font-medium text-typography-primary hover:bg-slate-500"
              onClick={() => setValue(formatAmountFree(vestingLimit, GMX_DECIMALS, GMX_DECIMALS))}
              disabled={isBusy || vestingLimit === 0n}
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
                  onClick={() => setValue(formatAmountFree(affordableDepositAmount, GMX_DECIMALS, GMX_DECIMALS))}
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
            <span className="text-blue-300">
              <Trans>You need {formatTokenAmount(preview.stakeShortfallAmount)} more GMX staked as collateral.</Trans>
            </span>{" "}
            <Trans>We’ll stake it from your wallet, then start vesting.</Trans>
          </ColorfulBanner>
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

        <SwitchToSettlementChainWarning topic="vesting" settlementChainId={ARBITRUM} />
        <RewardsVestingChainGuard>
          <div className="grid grid-cols-2 gap-12">
            <Button
              variant="primary"
              size="medium"
              className="w-full"
              onClick={handleVest}
              disabled={!hasValidAmount || !isWalletReady || isBusy || isAllowanceLoading || hasOutdatedUi}
            >
              {primaryText}
            </Button>
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
};

export function RewardsStopVestingModal({ isVisible, setIsVisible, data, mutate }: RewardsStopVestingModalProps) {
  const { active, chainId: walletChainId, signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const hasOutdatedUi = useHasOutdatedUi();
  const [isStopping, setIsStopping] = useState(false);
  const effectiveRemainingAmount = getEffectiveRemainingAmount(data);
  const convertedAmount = data.vestingInfo.vestedAmount - effectiveRemainingAmount;

  const setModalVisible = (nextVisible: boolean) => {
    if (!isStopping) setIsVisible(nextVisible);
  };

  const handleStop = async () => {
    if (
      !signer ||
      !active ||
      walletChainId !== ARBITRUM ||
      data.vestingInfo.vestedAmount === 0n ||
      isStopping ||
      hasOutdatedUi
    ) {
      return;
    }

    setIsStopping(true);
    try {
      const gmxVester = new ethers.Contract(getContract(ARBITRUM, "GmxVester"), abis.Vester, signer);
      const transaction = await callContract(ARBITRUM, gmxVester, "withdraw", [], {
        sentMsg: t`Stop vesting submitted`,
        failMsg: t`Stop vesting failed`,
        successMsg: t`Vesting stopped`,
        setPendingTxns,
      });
      setIsVisible(false);
      await transaction?.wait();
      await mutate();
    } catch {
      return;
    } finally {
      setIsStopping(false);
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
          <span className="text-blue-300">
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
            <Button
              variant="primary"
              size="medium"
              className="w-full !bg-red-500 !text-white hover:!bg-red-400"
              onClick={handleStop}
              disabled={isStopping || !signer || !active || hasOutdatedUi}
            >
              {hasOutdatedUi ? (
                getPageOutdatedError()
              ) : isStopping ? (
                <Trans>Stopping...</Trans>
              ) : (
                <Trans>Yes, stop vesting</Trans>
              )}
            </Button>
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
