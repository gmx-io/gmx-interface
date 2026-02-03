import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { ARBITRUM, ContractsChainId } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIcons } from "config/icons";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import { calculateStakeBonusPercentage } from "domain/stake/calculateStakeBonusPercentage";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { callContract } from "lib/contracts";
import { StakingProcessedData } from "lib/legacy";
import { formatAmount, formatAmountFree, limitDecimals, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import Tabs from "components/Tabs/Tabs";

import { GMX_DAO_LINKS } from "./constants";

export type StakeModalTab = "stake" | "unstake";

export type StakeModalTabConfig = {
  maxAmount: bigint | undefined;
  value: string;
  setValue: (value: string) => void;
};

const METHOD_NAME_MAP: Record<string, { stake: string; unstake: string }> = {
  GMX: { stake: "stakeGmx", unstake: "unstakeGmx" },
  esGMX: { stake: "stakeEsGmx", unstake: "unstakeEsGmx" },
};

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
  } = props;

  const { maxAmount: stakeMaxAmount, value: stakeValue, setValue: setStakeValue } = stake;

  const { maxAmount: unstakeMaxAmount, value: unstakeValue, setValue: setUnstakeValue } = unstake;

  const [activeTab, setActiveTab] = useState<StakeModalTab>("stake");

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
  }, [isVisible, setStakeValue, setUnstakeValue]);

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

  const isStakePrimaryEnabled = useMemo(
    () => !stakeError && !isApproving && !isStaking && !isUndelegatedGovToken && !hasOutdatedUi,
    [stakeError, isApproving, isStaking, isUndelegatedGovToken, hasOutdatedUi]
  );

  const isUnstakePrimaryEnabled = useMemo(
    () => !unstakeError && !isUnstaking && !hasOutdatedUi,
    [unstakeError, isUnstaking, hasOutdatedUi]
  );

  const handleStake = useCallback(() => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: stakeTokenAddress,
        spender: stakeFarmAddress,
        chainId,
        permitParams: undefined,
        approveAmount: undefined,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, stakeMethodName, [stakeAmount], {
      sentMsg: t`Stake submitted.`,
      failMsg: t`Stake failed.`,
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

  const handleUnstake = useCallback(() => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, unstakeMethodName, [unstakeAmount], {
      sentMsg: t`Unstake submitted.`,
      failMsg: t`Unstake failed.`,
      successMsg: t`Unstake completed.`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  }, [chainId, signer, unstakeMethodName, rewardRouterAddress, unstakeAmount, setPendingTxns, setIsVisible]);

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
      return t`Page outdated, please refresh`;
    }

    if (activeTab === "stake") {
      if (stakeError) {
        return stakeError;
      }
      if (isApproving || needApproval) {
        if (isApproving) {
          return <Trans>Pending {tokenSymbol} approval</Trans>;
        }

        return <Trans>Approve {tokenSymbol} to be spent</Trans>;
      }
      if (isStaking) {
        return <Trans>Staking</Trans>;
      }
      return <Trans>Stake</Trans>;
    }

    if (unstakeError) {
      return unstakeError;
    }
    if (isUnstaking) {
      return <Trans>Unstaking</Trans>;
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

  const unstakeBonusLostPercentage = useMemo(() => {
    if (
      processedData &&
      unstakeAmount !== undefined &&
      unstakeAmount > 0 &&
      processedData.esGmxInStakedGmx !== undefined &&
      processedData.gmxInStakedGmx !== undefined
    ) {
      const divisor = processedData.esGmxInStakedGmx + processedData.gmxInStakedGmx;
      if (divisor !== 0n) {
        return bigMath.mulDiv(unstakeAmount, BASIS_POINTS_DIVISOR_BIGINT, divisor);
      }
    }
    return undefined;
  }, [processedData, unstakeAmount]);

  const tabs = useMemo(
    () => [
      { label: <Trans>Stake</Trans>, value: "stake" as const },
      { label: <Trans>Unstake</Trans>, value: "unstake" as const },
    ],
    []
  );

  const showUnstakePenalty =
    activeTab === "unstake" &&
    unstakeBonusLostPercentage !== undefined &&
    unstakeBonusLostPercentage > 0 &&
    unstakeAmount !== undefined &&
    unstakeMaxAmount !== undefined &&
    unstakeAmount <= unstakeMaxAmount;

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
        <div className="mb-12">
          <BuyInputSection
            topLeftLabel={activeTab === "stake" ? t`Stake` : t`Unstake`}
            topRightLabel={t`Max`}
            topRightValue={formatAmount(activeMaxAmount, 18, 4, true)}
            onClickMax={canClickMax ? onClickMax : undefined}
            inputValue={activeValue}
            onInputValueChange={(e) =>
              activeTab === "stake" ? setStakeValue(e.target.value) : setUnstakeValue(e.target.value)
            }
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
        </div>

        {showStakeBonus && (
          <AlertInfo type="info">
            <Trans>You will earn {formatAmount(stakeBonusPercentage, 2, 2)}% more rewards with this action.</Trans>
          </AlertInfo>
        )}

        {activeTab === "stake" && isUndelegatedGovToken ? (
          <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-300">
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
              </ExternalLink>{" "}
              voting power before staking.
            </Trans>
          </AlertInfo>
        ) : null}

        {activeTab === "unstake" && reservedAmount !== undefined && reservedAmount > 0 && (
          <AlertInfo type="info">
            <Trans>You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.</Trans>
          </AlertInfo>
        )}

        {showUnstakePenalty && (
          <AlertInfo type="warning">
            <Trans>
              {chainId === ARBITRUM ? (
                <span>Unstaking will burn {formatAmount(unstakeAmount, 18, 2, true)} voting power.&nbsp;</span>
              ) : null}
              <span>
                You will earn {formatAmount(unstakeBonusLostPercentage, 2, 2)}% less rewards with this action.
              </span>
            </Trans>
          </AlertInfo>
        )}

        <SwitchToSettlementChainWarning topic="staking" />
        <div className="Exchange-swap-button-container">
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
