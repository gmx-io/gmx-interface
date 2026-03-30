import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { getIsFlagEnabled } from "config/ab";
import { ARBITRUM, ContractsChainId } from "config/chains";
import { getIcons } from "config/icons";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import { calculateStakeBonusPercentage } from "domain/stake/calculateStakeBonusPercentage";
import {
  getEffectiveHistoricalMax,
  getMaxSafeUnstake,
  getUnstakeLimitPercent,
  isLoyaltyTrackingActive,
  wouldTriggerReset,
} from "domain/stake/useStakingPowerData";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { StakingProcessedData } from "lib/legacy";
import { formatAmount, formatAmountFree, formatUsd, limitDecimals, numberWithCommas, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import Tabs from "components/Tabs/Tabs";

import WarnIcon from "img/ic_warn.svg?react";

import { GMX_DAO_LINKS } from "./constants";

export type StakeModalTab = "stake" | "unstake";

export type StakeModalTabConfig = {
  maxAmount: bigint | undefined;
  value: string;
  setValue: (value: string) => void;
};

const RESET_TOAST_HEADER_STYLE = { color: "#7885FF" };

const METHOD_NAME_MAP: Record<string, { stake: string; unstake: string }> = {
  GMX: { stake: "stakeGmx", unstake: "unstakeGmx" },
  esGMX: { stake: "stakeEsGmx", unstake: "unstakeEsGmx" },
};

function formatUnstakeLimitPercentLabel(percent: number): string {
  if (percent >= 100) {
    return percent.toFixed(0);
  }
  const truncatedToTenth = Math.floor(percent * 10) / 10;
  return Number.isInteger(truncatedToTenth) ? `${truncatedToTenth}` : truncatedToTenth.toFixed(1);
}

export function StakeModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: ContractsChainId;
  signer: UncheckedJsonRpcSigner | undefined;
  tokenSymbol: string;
  rewardRouterAddress: string;
  stake: StakeModalTabConfig;
  unstake: StakeModalTabConfig;
  setPendingTxns: SetPendingTransactions;
  processedData: StakingProcessedData | undefined;
  stakeTokenAddress: string;
  stakeFarmAddress: string;
  reservedAmount: bigint;
  stakingPowerData?: StakingPowerResponse;
  stakingPowerProjectedRewardsUsd?: bigint;
}) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    signer,
    tokenSymbol,
    rewardRouterAddress,
    stake,
    unstake,
    setPendingTxns,
    processedData,
    stakeTokenAddress,
    stakeFarmAddress,
    reservedAmount,
    stakingPowerData,
    stakingPowerProjectedRewardsUsd,
  } = props;

  const { maxAmount: stakeMaxAmount, value: stakeValue, setValue: setStakeValue } = stake;

  const { maxAmount: unstakeMaxAmount, value: unstakeValue, setValue: setUnstakeValue } = unstake;

  const [activeTab, setActiveTab] = useState<StakeModalTab>("stake");
  const [isResetAcknowledged, setIsResetAcknowledged] = useState(false);

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken = useMemo(
    () =>
      chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0,
    [chainId, govTokenDelegatesAddress, govTokenAmount]
  );

  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const isMetamaskMobile = useIsMetamaskMobile();
  const icons = getIcons(chainId);
  const hasOutdatedUi = useHasOutdatedUi();

  const stakeAmount = useMemo(() => parseValue(stakeValue, 18), [stakeValue]);
  const unstakeAmount = useMemo(() => parseValue(unstakeValue, 18), [unstakeValue]);

  const stakeMethodName = METHOD_NAME_MAP[tokenSymbol].stake;
  const unstakeMethodName = METHOD_NAME_MAP[tokenSymbol].unstake;

  const stakeTitle = t`Stake ${tokenSymbol}`;
  const unstakeTitle = t`Unstake ${tokenSymbol}`;

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: stakeFarmAddress,
    tokenAddresses: [stakeTokenAddress].filter(Boolean),
  });
  const tokenAllowance = tokensAllowanceData?.[stakeTokenAddress];

  useEffect(() => {
    setStakeValue("");
    setUnstakeValue("");
    setIsResetAcknowledged(false);
  }, [isVisible, setStakeValue, setUnstakeValue]);

  useEffect(() => {
    setIsResetAcknowledged(false);
  }, [unstakeValue]);

  const needApproval =
    stakeFarmAddress !== zeroAddress &&
    tokenAllowance !== undefined &&
    stakeAmount !== undefined &&
    stakeAmount > tokenAllowance;

  const stakeBonusPercentage = useMemo(() => {
    return calculateStakeBonusPercentage({
      esGmxInStakedGmx: processedData?.esGmxInStakedGmx,
      gmxInStakedGmx: processedData?.gmxInStakedGmx,
      stakeAmount,
    });
  }, [stakeAmount, processedData]);

  const stakeError = useMemo(() => {
    if (stakeAmount === undefined || stakeAmount === 0n) {
      return <Trans>Enter an amount</Trans>;
    }
    if (stakeMaxAmount !== undefined && stakeAmount > stakeMaxAmount) {
      return <Trans>Max amount exceeded</Trans>;
    }
    return undefined;
  }, [stakeAmount, stakeMaxAmount]);

  const unstakeError = useMemo(() => {
    if (unstakeAmount === undefined || unstakeAmount === 0n) {
      return <Trans>Enter an amount</Trans>;
    }
    if (unstakeMaxAmount !== undefined && unstakeAmount > unstakeMaxAmount) {
      return <Trans>Max amount exceeded</Trans>;
    }
    return undefined;
  }, [unstakeAmount, unstakeMaxAmount]);

  const isTestLoyalty = getIsFlagEnabled("testStakingPowerLoyalty");
  const effectiveHistoricalMax = getEffectiveHistoricalMax(stakingPowerData, isTestLoyalty);

  const isLoyaltyActive =
    isTestLoyalty ||
    (stakingPowerData?.loyaltyTrackingStart !== undefined &&
      isLoyaltyTrackingActive(stakingPowerData.loyaltyTrackingStart));

  const wouldResetPower =
    isLoyaltyActive &&
    stakingPowerData !== undefined &&
    unstakeAmount !== undefined &&
    unstakeAmount > 0n &&
    wouldTriggerReset(stakingPowerData.currentStaked, unstakeAmount, effectiveHistoricalMax);

  const safeUnstakeLimit =
    stakingPowerData && isLoyaltyActive
      ? getMaxSafeUnstake(stakingPowerData.currentStaked, effectiveHistoricalMax)
      : null;

  const rewardsLossUsd = useMemo(() => {
    if (!wouldResetPower) return null;
    if (stakingPowerProjectedRewardsUsd !== undefined) {
      return stakingPowerProjectedRewardsUsd;
    }
    if (isTestLoyalty) {
      return processedData?.cumulativeGmxRewardsUsd ?? null;
    }
    return null;
  }, [wouldResetPower, stakingPowerProjectedRewardsUsd, isTestLoyalty, processedData?.cumulativeGmxRewardsUsd]);

  const unstakeLimitPercent = getUnstakeLimitPercent(safeUnstakeLimit, unstakeAmount);

  const isStakePrimaryEnabled = !stakeError && !isApproving && !isStaking && !isUndelegatedGovToken && !hasOutdatedUi;

  const isUnstakePrimaryEnabled =
    !unstakeError && !isUnstaking && !hasOutdatedUi && (!wouldResetPower || isResetAcknowledged);

  useEffect(() => {
    if (!needApproval && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needApproval]);

  const handleStake = useCallback(() => {
    if (needApproval) {
      setIsApproving(true);
      approveTokens({
        setIsApproving: noop,
        signer,
        tokenAddress: stakeTokenAddress,
        spender: stakeFarmAddress,
        chainId,
        permitParams: undefined,
        approveAmount: undefined,
        onApproveFail: () => {
          setIsApproving(false);
        },
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, stakeMethodName, [stakeAmount], {
      sentMsg: t`Stake submitted`,
      failMsg: t`Stake failed`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsStaking(false);
      });
  }, [
    needApproval,
    signer,
    stakeTokenAddress,
    stakeFarmAddress,
    chainId,
    stakeMethodName,
    stakeAmount,
    setPendingTxns,
    setIsVisible,
    rewardRouterAddress,
  ]);

  const showResetToast = useCallback(() => {
    helperToast.info(
      <div>
        <span className="font-bold" style={RESET_TOAST_HEADER_STYLE}>
          <Trans>Rewards reset.</Trans>
        </span>
        <br />
        <Trans>
          The 20% unstaking limit was exceeded, and your rewards have been reset. You may now continue unstaking freely.
        </Trans>
      </div>,
      { autoClose: false }
    );
  }, []);

  const handleUnstake = useCallback(() => {
    const didReset = wouldResetPower;

    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, unstakeMethodName, [unstakeAmount], {
      sentMsg: t`Unstake submitted`,
      failMsg: t`Unstake failed`,
      successMsg: didReset ? undefined : t`Unstake completed`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
        if (didReset) {
          showResetToast();
        }
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  }, [
    chainId,
    signer,
    unstakeMethodName,
    rewardRouterAddress,
    unstakeAmount,
    setPendingTxns,
    setIsVisible,
    wouldResetPower,
    showResetToast,
  ]);

  const handleStakeMax = useCallback(() => {
    if (stakeMaxAmount === undefined) return;
    const formattedMaxAmount = formatAmountFree(stakeMaxAmount, 18, 18);
    const finalMaxAmount = isMetamaskMobile
      ? limitDecimals(formattedMaxAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedMaxAmount;
    setStakeValue(finalMaxAmount);
  }, [isMetamaskMobile, setStakeValue, stakeMaxAmount]);

  const handleUnstakeMax = useCallback(() => {
    if (unstakeMaxAmount === undefined) return;
    setUnstakeValue(formatAmountFree(unstakeMaxAmount, 18, 18));
  }, [setUnstakeValue, unstakeMaxAmount]);

  const primaryText = useMemo(() => {
    if (hasOutdatedUi) {
      return t`Page outdated. Refresh`;
    }

    if (activeTab === "stake") {
      if (stakeError) {
        return stakeError;
      }
      if (isApproving || needApproval) {
        if (isApproving) {
          return <Trans>Approving {tokenSymbol}...</Trans>;
        }

        return <Trans>Approve {tokenSymbol}</Trans>;
      }
      if (isStaking) {
        return <Trans>Staking...</Trans>;
      }
      return <Trans>Stake</Trans>;
    }

    if (unstakeError) {
      return unstakeError;
    }
    if (isUnstaking) {
      return <Trans>Unstaking...</Trans>;
    }
    return <Trans>Unstake</Trans>;
  }, [
    activeTab,
    hasOutdatedUi,
    isApproving,
    isStaking,
    isUnstaking,
    needApproval,
    tokenSymbol,
    stakeError,
    unstakeError,
  ]);

  const isPrimaryEnabled = activeTab === "stake" ? isStakePrimaryEnabled : isUnstakePrimaryEnabled;

  const onClickPrimary = useCallback(() => {
    if (activeTab === "stake") {
      handleStake();
      return;
    }

    handleUnstake();
  }, [activeTab, handleStake, handleUnstake]);

  const activeValue = activeTab === "stake" ? stakeValue : unstakeValue;
  const activeMaxAmount = activeTab === "stake" ? stakeMaxAmount : unstakeMaxAmount;
  const activeTokenSymbol = tokenSymbol;
  const activeTitle = activeTab === "stake" ? stakeTitle : unstakeTitle;

  const stakeCanClickMax = stakeMaxAmount !== undefined && stakeMaxAmount !== 0n && stakeAmount !== stakeMaxAmount;
  const unstakeCanClickMax =
    unstakeMaxAmount !== undefined && unstakeMaxAmount !== 0n && unstakeAmount !== unstakeMaxAmount;
  const canClickMax = activeTab === "stake" ? stakeCanClickMax : unstakeCanClickMax;
  const onClickMax = activeTab === "stake" ? handleStakeMax : handleUnstakeMax;

  const showStakeBonus =
    activeTab === "stake" &&
    stakeBonusPercentage !== undefined &&
    stakeBonusPercentage > 0 &&
    stakeAmount !== undefined &&
    stakeMaxAmount !== undefined &&
    stakeAmount <= stakeMaxAmount;

  const tabs = useMemo(
    () => [
      { label: <Trans>Stake</Trans>, value: "stake" as const },
      { label: <Trans>Unstake</Trans>, value: "unstake" as const },
    ],
    []
  );

  const showSafeUnstakeBar =
    activeTab === "unstake" && safeUnstakeLimit !== null && unstakeAmount !== undefined && unstakeAmount > 0n;

  const exceedsLimit = wouldResetPower;
  const isApproachingLimit = !exceedsLimit && unstakeLimitPercent >= 75;
  const unstakeBarStyle = useMemo(() => ({ width: `${Math.min(unstakeLimitPercent, 100)}%` }), [unstakeLimitPercent]);

  return (
    <div className="StakeModal">
      <Modal
        isVisible={isVisible}
        setIsVisible={setIsVisible}
        label={activeTitle}
        withMobileBottomPosition={true}
        contentClassName="w-[420px]"
      >
        <Tabs<StakeModalTab>
          className="mb-12"
          type="inline"
          options={tabs}
          selectedValue={activeTab}
          onChange={(value) => setActiveTab(value)}
        />
        <div className="flex flex-col gap-12">
          <BuyInputSection
            topLeftLabel={activeTab === "stake" ? t`Stake` : t`Unstake`}
            topRightLabel={t`Avail.`}
            topRightValue={formatAmount(activeMaxAmount, 18, 2, true)}
            onClickMax={canClickMax ? onClickMax : undefined}
            inputValue={activeValue}
            onInputValueChange={(e) =>
              activeTab === "stake" ? setStakeValue(e.target.value) : setUnstakeValue(e.target.value)
            }
            maxDecimals={18}
          >
            <div className="flex items-center gap-4 py-8">
              <img
                className="icon h-24"
                height="24"
                src={icons?.[activeTokenSymbol.toLowerCase()]}
                alt={activeTokenSymbol}
              />
              {activeTokenSymbol}
            </div>
          </BuyInputSection>

          {showSafeUnstakeBar && (
            <div className="flex flex-col gap-6">
              <div className="h-4 w-full rounded-full bg-slate-700">
                <div
                  className={cx(
                    "h-full rounded-full transition-all",
                    exceedsLimit ? "bg-red-500" : isApproachingLimit ? "bg-yellow-300" : "bg-blue-300"
                  )}
                  style={unstakeBarStyle}
                />
              </div>
              <div className="flex justify-between text-12">
                <span
                  className={cx(
                    "font-medium",
                    exceedsLimit ? "text-red-500" : isApproachingLimit ? "text-yellow-300" : "text-typography-secondary"
                  )}
                >
                  <Trans>
                    Safe unstake limit: {numberWithCommas(formatAmountFree(safeUnstakeLimit!, 18, 5))} GMX / esGMX
                  </Trans>
                </span>
                <span
                  className={cx(
                    "font-medium",
                    exceedsLimit ? "text-red-500" : isApproachingLimit ? "text-yellow-300" : "text-typography-secondary"
                  )}
                >
                  {formatUnstakeLimitPercentLabel(unstakeLimitPercent)}%
                  {(exceedsLimit || isApproachingLimit) && (
                    <>
                      {" "}
                      <Trans>of limit</Trans>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {showStakeBonus && (
            <AlertInfo type="info" noMargin>
              <Trans>Earn {formatAmount(stakeBonusPercentage, 2, 2)}% more rewards with this action</Trans>
            </AlertInfo>
          )}

          {activeTab === "stake" && isUndelegatedGovToken ? (
            <AlertInfoCard type="error" className={cx("DelegateGMXAlertInfo !mb-0")} hideClose>
              <Trans>
                <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                  Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
                </ExternalLink>{" "}
                voting power before staking.
              </Trans>
            </AlertInfoCard>
          ) : null}

          {activeTab === "unstake" && reservedAmount !== undefined && reservedAmount > 0 && (
            <AlertInfo type="info" noMargin>
              <Trans>{formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting</Trans>
            </AlertInfo>
          )}

          {isApproachingLimit && !wouldResetPower && showSafeUnstakeBar && (
            <ColorfulBanner color="yellow" icon={WarnIcon}>
              <Trans>Unstaking this amount will bring you close to the 20% reset threshold.</Trans>
            </ColorfulBanner>
          )}

          {activeTab === "unstake" && wouldResetPower && (
            <>
              <ColorfulBanner color="red" icon={WarnIcon}>
                <div>
                  <Trans>
                    Unstaking more than 20% of your max historical staked GMX will reset your accrued rewards.
                  </Trans>
                  {rewardsLossUsd !== null && (
                    <div className="mt-4 font-medium text-red-500">
                      <Trans>If you continue, you will lose {formatUsd(rewardsLossUsd)} in rewards.</Trans>
                    </div>
                  )}
                </div>
              </ColorfulBanner>
              <Checkbox isChecked={isResetAcknowledged} setIsChecked={setIsResetAcknowledged} className="!items-start">
                <span className="text-body-small text-typography-secondary">
                  <Trans>
                    I acknowledge that I will lose{" "}
                    <span className="font-bold text-typography-primary">
                      {rewardsLossUsd !== null ? formatUsd(rewardsLossUsd) : "all accrued"} in rewards
                    </span>{" "}
                    if I proceed.
                  </Trans>
                </span>
              </Checkbox>
            </>
          )}

          <SwitchToSettlementChainWarning topic="staking" />
          <SwitchToSettlementChainButtons>
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
              {primaryText}
            </Button>
          </SwitchToSettlementChainButtons>
        </div>
      </Modal>
    </div>
  );
}
