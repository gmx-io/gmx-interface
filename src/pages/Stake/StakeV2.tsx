import { Trans, t } from "@lingui/macro";
import { useCallback, useMemo, useState } from "react";

import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import RewardRouter from "abis/RewardRouter.json";
import Token from "abis/Token.json";
import Vault from "abis/Vault.json";
import Vester from "abis/Vester.json";

import cx from "classnames";
import { ARBITRUM, AVALANCHE, getConstant } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { SetPendingTransactions, useGmxPrice, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { useAccumulatedBnGMXAmount } from "domain/rewards/useAccumulatedBnGMXAmount";
import { useMaxBoostBasicPoints } from "domain/rewards/useMaxBoostBasisPoints";
import { useRecommendStakeGmxAmount } from "domain/stake/useRecommendStakeGmxAmount";
import { ethers } from "ethers";
import {
  GLP_DECIMALS,
  PLACEHOLDER_ACCOUNT,
  USD_DECIMALS,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getPageTitle,
  getProcessedData,
  getStakingData,
} from "lib/legacy";

import useSWR from "swr";

import { getContract } from "config/contracts";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { GmList } from "components/Synthetics/GmList/GmList";
import UserIncentiveDistributionList from "components/Synthetics/UserIncentiveDistributionList/UserIncentiveDistributionList";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getServerUrl } from "config/backend";
import { getIsSyntheticsSupported } from "config/features";
import { getIcons } from "config/icons";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useStakedBnGMXAmount } from "domain/rewards/useStakedBnGMXAmount";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { getTotalGmInfo, useMarketTokensData, useMarketsInfoRequest } from "domain/synthetics/markets";
import { approveTokens } from "domain/tokens";
import useVestingData from "domain/vesting/useVestingData";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useENS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  BN_ZERO,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatKeyAmount,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { usePendingTxns } from "lib/usePendingTxns";
import { shortenAddressOrEns } from "lib/wallets";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import "./StakeV2.css";
import { GMX_DAO_LINKS, getGmxDAODelegateLink } from "./constants";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { useGmMarketsApy } from "domain/synthetics/markets/useGmMarketsApy";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { useTokensAllowanceData } from "domain/synthetics/tokens";

const { ZeroAddress } = ethers;

function StakeModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: number;
  title: string;
  maxAmount: bigint | undefined;
  value: string;
  setValue: (value: string) => void;
  signer: UncheckedJsonRpcSigner | undefined;
  stakingTokenSymbol: string;
  stakingTokenAddress: string;
  farmAddress: string;
  rewardRouterAddress: string;
  stakeMethodName: string;
  setPendingTxns: SetPendingTransactions;
}) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    signer,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
  } = props;

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken =
    chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0;

  const [isStaking, setIsStaking] = useState(false);
  const isMetamaskMobile = useIsMetamaskMobile();
  const [isApproving, setIsApproving] = useState(false);
  const icons = getIcons(chainId);
  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: farmAddress,
    tokenAddresses: [stakingTokenAddress],
  });
  const tokenAllowance = tokensAllowanceData?.[stakingTokenAddress];

  let amount = parseValue(value, 18);
  const needApproval =
    farmAddress !== ZeroAddress && tokenAllowance !== undefined && amount !== undefined && amount > tokenAllowance;

  const getError = () => {
    if (amount === undefined || amount === 0n) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: stakingTokenAddress,
        spender: farmAddress,
        chainId,
      });
      return;
    }

    setIsStaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);

    callContract(chainId, contract, stakeMethodName, [amount], {
      sentMsg: t`Stake submitted!`,
      failMsg: t`Stake failed.`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsStaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving || needApproval) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    if (isUndelegatedGovToken) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving || needApproval) {
      return t`Pending ${stakingTokenSymbol} approval`;
    }
    if (isStaking) {
      return t`Staking...`;
    }
    return t`Stake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        {isUndelegatedGovToken ? (
          <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
              </ExternalLink>
              <span>&nbsp;voting power before staking.</span>
            </Trans>
          </AlertInfo>
        ) : null}
        <BuyInputSection
          topLeftLabel={t`Stake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={() => {
            if (maxAmount === undefined) return;
            const formattedMaxAmount = formatAmountFree(maxAmount, 18, 18);
            const finalMaxAmount = isMetamaskMobile
              ? limitDecimals(formattedMaxAmount, MAX_METAMASK_MOBILE_DECIMALS)
              : formattedMaxAmount;
            setValue(finalMaxAmount);
          }}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          <div className="Stake-modal-icons">
            <img
              className="icon mr-5 h-22"
              height="22"
              src={icons[stakingTokenSymbol.toLowerCase()]}
              alt={stakingTokenSymbol}
            />
            {stakingTokenSymbol}
          </div>
        </BuyInputSection>

        {(needApproval || isApproving) && (
          <div className="mb-12">
            <ApproveTokenButton
              tokenAddress={stakingTokenAddress}
              spenderAddress={farmAddress}
              tokenSymbol={stakingTokenSymbol}
              isApproved={!needApproval}
            />
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: number;
  title: string;
  maxAmount: bigint | undefined;
  value: string;
  setValue: (value: string) => void;
  signer: UncheckedJsonRpcSigner | undefined;
  unstakingTokenSymbol: string;
  rewardRouterAddress: string;
  unstakeMethodName: string;
  multiplierPointsAmount: bigint | undefined;
  reservedAmount: bigint | undefined;
  bonusGmxInFeeGmx: bigint | undefined;
  setPendingTxns: SetPendingTransactions;
  processedData: any;
  nativeTokenSymbol: string;
}) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    signer,
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    multiplierPointsAmount,
    reservedAmount,
    bonusGmxInFeeGmx,
    setPendingTxns,
    processedData,
    nativeTokenSymbol,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);
  const icons = getIcons(chainId);

  let amount = parseValue(value, 18);
  let burnAmount = 0n;

  const govTokenAmount = useGovTokenAmount(chainId);

  if (
    multiplierPointsAmount !== undefined &&
    multiplierPointsAmount > 0 &&
    amount !== undefined &&
    amount > 0 &&
    bonusGmxInFeeGmx !== undefined &&
    bonusGmxInFeeGmx > 0
  ) {
    burnAmount = bigMath.mulDiv(multiplierPointsAmount, amount, bonusGmxInFeeGmx);
  }

  const unstakeGmxPercentage =
    maxAmount !== undefined && maxAmount > 0 && amount !== undefined
      ? bigMath.mulDiv(amount, BASIS_POINTS_DIVISOR_BIGINT, maxAmount)
      : 0n;

  let unstakeBonusLostPercentage: undefined | bigint = undefined;
  if (
    amount !== undefined &&
    amount > 0 &&
    multiplierPointsAmount !== undefined &&
    processedData.esGmxInStakedGmx !== undefined &&
    processedData.gmxInStakedGmx !== undefined
  ) {
    const divisor = multiplierPointsAmount + processedData.esGmxInStakedGmx + processedData.gmxInStakedGmx;
    if (divisor !== 0n) {
      unstakeBonusLostPercentage = bigMath.mulDiv(amount + burnAmount, BASIS_POINTS_DIVISOR_BIGINT, divisor);
    }
  }

  const votingPowerBurnAmount =
    unstakeGmxPercentage !== undefined && govTokenAmount !== undefined && unstakeGmxPercentage > 0 && govTokenAmount > 0
      ? bigMath.mulDiv(govTokenAmount, unstakeGmxPercentage, BASIS_POINTS_DIVISOR_BIGINT)
      : 0n;

  const getError = () => {
    if (amount === undefined || amount === 0n) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
  };

  const onClickPrimary = () => {
    setIsUnstaking(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);
    callContract(chainId, contract, unstakeMethodName, [amount], {
      sentMsg: t`Unstake submitted!`,
      failMsg: t`Unstake failed.`,
      successMsg: t`Unstake completed!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsUnstaking(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isUnstaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return t`Unstaking...`;
    }
    return t`Unstake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <BuyInputSection
          topLeftLabel={t`Unstake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={() => maxAmount !== undefined && setValue(formatAmountFree(maxAmount, 18, 18))}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          <div className="Stake-modal-icons">
            <img
              className="icon mr-5 h-22"
              height="22"
              src={icons[unstakingTokenSymbol.toLowerCase()]}
              alt={unstakingTokenSymbol}
            />
            {unstakingTokenSymbol}
          </div>
        </BuyInputSection>
        {reservedAmount !== undefined && reservedAmount > 0 && (
          <AlertInfo type="info">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </AlertInfo>
        )}
        {burnAmount > 0 &&
          unstakeBonusLostPercentage !== undefined &&
          unstakeBonusLostPercentage > 0 &&
          amount !== undefined &&
          maxAmount !== undefined &&
          amount <= maxAmount && (
            <AlertInfo type="warning">
              <Trans>
                Unstaking will burn&nbsp;
                <ExternalLink className="inline" href="https://docs.gmx.io/docs/tokenomics/rewards">
                  {formatAmount(burnAmount, 18, 2, true)} Multiplier Points
                </ExternalLink>
                {chainId === ARBITRUM ? (
                  <span>&nbsp;and {formatAmount(votingPowerBurnAmount, 18, 2, true)} voting power.&nbsp;</span>
                ) : (
                  "."
                )}
                <span>
                  You will earn {formatAmount(unstakeBonusLostPercentage, 2, 2)}% less {nativeTokenSymbol} rewards with
                  this action.
                </span>
              </Trans>
            </AlertInfo>
          )}
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function VesterDepositModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: number;
  title: string;
  maxAmount: bigint | undefined;
  value: string;
  setValue: (value: string) => void;
  balance: bigint | undefined;
  vestedAmount: bigint | undefined;
  averageStakedAmount: bigint | undefined;
  maxVestableAmount: bigint | undefined;
  signer: UncheckedJsonRpcSigner | undefined;
  stakeTokenLabel: string;
  reserveAmount: bigint | undefined;
  maxReserveAmount: bigint | undefined;
  vesterAddress: string;
  setPendingTxns: SetPendingTransactions;
}) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    balance,
    vestedAmount,
    averageStakedAmount,
    maxVestableAmount,
    signer,
    stakeTokenLabel,
    reserveAmount,
    maxReserveAmount,
    vesterAddress,
    setPendingTxns,
  } = props;
  const [isDepositing, setIsDepositing] = useState(false);
  const icons = getIcons(chainId);

  let amount = parseValue(value, 18);

  let nextReserveAmount: bigint | undefined = reserveAmount;

  let nextDepositAmount = vestedAmount;
  if (amount !== undefined && vestedAmount !== undefined) {
    nextDepositAmount = vestedAmount + amount;
  }

  let additionalReserveAmount = 0n;
  if (
    amount !== undefined &&
    nextDepositAmount !== undefined &&
    averageStakedAmount !== undefined &&
    maxVestableAmount !== undefined &&
    maxVestableAmount > 0 &&
    nextReserveAmount !== undefined
  ) {
    nextReserveAmount = bigMath.mulDiv(nextDepositAmount, averageStakedAmount, maxVestableAmount);
    if (reserveAmount !== undefined && nextReserveAmount > reserveAmount) {
      additionalReserveAmount = nextReserveAmount - reserveAmount;
    }
  }

  const getError = () => {
    if (amount === undefined) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
    if (maxReserveAmount !== undefined && nextReserveAmount !== undefined && nextReserveAmount > maxReserveAmount) {
      return t`Insufficient staked tokens`;
    }
  };

  const onClickPrimary = () => {
    setIsDepositing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, signer);

    callContract(chainId, contract, "deposit", [amount], {
      sentMsg: t`Deposit submitted!`,
      failMsg: t`Deposit failed!`,
      successMsg: t`Deposited!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsDepositing(false);
      });
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isDepositing) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isDepositing) {
      return t`Depositing...`;
    }
    return t`Deposit`;
  };

  return (
    <SEO title={getPageTitle(t`Earn`)}>
      <div className="StakeModal">
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
          <BuyInputSection
            topLeftLabel={t`Deposit`}
            topRightLabel={t`Max`}
            topRightValue={formatAmount(maxAmount, 18, 4, true)}
            onClickTopRightLabel={() => maxAmount !== undefined && setValue(formatAmountFree(maxAmount, 18, 18))}
            inputValue={value}
            onInputValueChange={(e) => setValue(e.target.value)}
            showMaxButton={false}
          >
            <div className="Stake-modal-icons">
              <img className="icon mr-5 h-22" height="22" src={icons.esgmx} alt="esGMX" />
              esGMX
            </div>
          </BuyInputSection>

          <div className="VesterDepositModal-info-rows">
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Wallet</Trans>
              </div>
              <div className="align-right">{formatAmount(balance, 18, 2, true)} esGMX</div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Vault Capacity</Trans>
              </div>
              <div className="align-right">
                <TooltipWithPortal
                  handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
                    maxVestableAmount,
                    18,
                    2,
                    true
                  )}`}
                  position="top-end"
                  renderContent={() => {
                    return (
                      <div>
                        <p className="text-white">
                          <Trans>Vault Capacity for your Account:</Trans>
                        </p>
                        <br />
                        <StatsTooltipRow
                          showDollar={false}
                          label={t`Deposited`}
                          value={`${formatAmount(vestedAmount, 18, 2, true)} esGMX`}
                        />
                        <StatsTooltipRow
                          showDollar={false}
                          label={t`Max Capacity`}
                          value={`${formatAmount(maxVestableAmount, 18, 2, true)} esGMX`}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            {reserveAmount !== undefined && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Reserve Amount</Trans>
                </div>
                <div className="align-right">
                  <TooltipWithPortal
                    handle={`${formatAmount(
                      nextReserveAmount,
                      18,
                      2,
                      true
                    )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
                    position="top-end"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={t`Current Reserved`}
                            value={formatAmount(reserveAmount, 18, 2, true)}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label={t`Additional reserve required`}
                            value={formatAmount(additionalReserveAmount, 18, 2, true)}
                            showDollar={false}
                          />
                          {amount !== undefined &&
                            nextReserveAmount !== undefined &&
                            maxReserveAmount !== undefined &&
                            nextReserveAmount > maxReserveAmount && (
                              <>
                                <br />
                                <Trans>
                                  You need a total of at least {formatAmount(nextReserveAmount, 18, 2, true)}{" "}
                                  {stakeTokenLabel} to vest {formatAmount(amount, 18, 2, true)} esGMX.
                                </Trans>
                              </>
                            )}
                        </>
                      );
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="Exchange-swap-button-container">
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {getPrimaryText()}
            </Button>
          </div>
        </Modal>
      </div>
    </SEO>
  );
}

function VesterWithdrawModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  chainId: number;
  title: string;
  signer: UncheckedJsonRpcSigner | undefined;
  vesterAddress: string;
  setPendingTxns: SetPendingTransactions;
}) {
  const { isVisible, setIsVisible, chainId, title, signer, vesterAddress, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const onClickPrimary = () => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(vesterAddress, Vester.abi, signer);

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted.`,
      failMsg: t`Withdraw failed.`,
      successMsg: t`Withdrawn!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <Trans>
          <div>
            This will withdraw and unreserve all tokens as well as pause vesting.
            <br />
            <br />
            esGMX tokens that have been converted to GMX will be claimed and remain as GMX tokens.
            <br />
            <br />
            To claim GMX tokens without withdrawing, use the "Claim" button under the Total Rewards section.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={isWithdrawing}>
            {!isWithdrawing && "Confirm Withdraw"}
            {isWithdrawing && "Confirming..."}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AffiliateVesterWithdrawModal(props) {
  const { isVisible, setIsVisible, chainId, signer, setPendingTxns } = props;
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const onClickPrimary = () => {
    setIsWithdrawing(true);
    const contract = new ethers.Contract(affiliateVesterAddress, Vester.abi, signer);

    callContract(chainId, contract, "withdraw", [], {
      sentMsg: t`Withdraw submitted.`,
      failMsg: t`Withdraw failed.`,
      successMsg: t`Withdrawn!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Withdraw from Affiliate Vault`}>
        <Trans>
          <div>
            This will withdraw all esGMX tokens as well as pause vesting.
            <br />
            <br />
            esGMX tokens that have been converted to GMX will be claimed and remain as GMX tokens.
            <br />
            <br />
            To claim GMX tokens without withdrawing, use the "Claim" button.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={isWithdrawing}>
            {!isWithdrawing && "Confirm Withdraw"}
            {isWithdrawing && "Confirming..."}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CompoundModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  rewardRouterAddress: string;
  signer: UncheckedJsonRpcSigner | undefined;
  chainId: number;
  setPendingTxns: SetPendingTransactions;
  totalVesterRewards: bigint | undefined;
  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
  processedData: any;
}) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    signer,
    chainId,
    setPendingTxns,
    totalVesterRewards,
    nativeTokenSymbol,
    wrappedTokenSymbol,
    processedData,
  } = props;
  const [isCompounding, setIsCompounding] = useState(false);
  const [shouldClaimGmx, setShouldClaimGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-gmx"],
    true
  );
  const [shouldStakeGmx, setShouldStakeGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-gmx"],
    true
  );
  const [shouldClaimEsGmx, setShouldClaimEsGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-es-gmx"],
    true
  );
  const [shouldStakeEsGmx, setShouldStakeEsGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-es-gmx"],
    true
  );
  const [shouldStakeMultiplierPoints, setShouldStakeMultiplierPoints] = useState(true);
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-convert-weth"],
    true
  );

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken =
    chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0;

  const gmxAddress = getContract(chainId, "GMX");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
  });

  const tokenAllowance = tokensAllowanceData?.[gmxAddress];

  const needApproval =
    shouldStakeGmx &&
    totalVesterRewards !== undefined &&
    ((tokenAllowance !== undefined && totalVesterRewards > tokenAllowance) ||
      (totalVesterRewards > 0n && tokenAllowance === undefined));

  const isPrimaryEnabled = () => {
    return !isCompounding && !isApproving && !needApproval && !isCompounding && !isUndelegatedGovToken;
  };

  const getPrimaryText = () => {
    if (needApproval || isApproving) {
      return t`Pending GMX approval`;
    }

    if (isCompounding) {
      return t`Compounding...`;
    }
    return t`Compound`;
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsCompounding(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimGmx || shouldStakeGmx,
        shouldStakeGmx,
        shouldClaimEsGmx || shouldStakeEsGmx,
        shouldStakeEsGmx,
        shouldStakeMultiplierPoints,
        shouldClaimWeth || shouldConvertWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: t`Compound submitted!`,
        failMsg: t`Compound failed.`,
        successMsg: t`Compound completed!`,
        setPendingTxns,
      }
    )
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsCompounding(false);
      });
  };

  const toggleShouldStakeGmx = (value) => {
    if (value) {
      setShouldClaimGmx(true);
    }
    setShouldStakeGmx(value);
  };

  const toggleShouldStakeEsGmx = (value) => {
    if (value) {
      setShouldClaimEsGmx(true);
    }
    setShouldStakeEsGmx(value);
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  const accumulatedBnGMXAmount = useAccumulatedBnGMXAmount();

  const recommendStakeGmx = useRecommendStakeGmxAmount(
    {
      accumulatedGMX: processedData?.totalVesterRewards,
      accumulatedBnGMX: accumulatedBnGMXAmount,
      accumulatedEsGMX: processedData?.totalEsGmxRewards,
      stakedGMX: processedData?.gmxInStakedGmx,
      stakedBnGMX: processedData?.bnGmxInFeeGmx,
      stakedEsGMX: processedData?.esGmxInStakedGmx,
    },
    {
      shouldStakeGmx,
      shouldStakeEsGmx,
    }
  );

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Compound Rewards`}>
        {recommendStakeGmx > 0 && (
          <AlertInfo type="info">
            <Trans>
              You have reached the maximum Boost Percentage. Stake an additional{" "}
              {formatAmount(recommendStakeGmx, 18, 2, true)} GMX or esGMX to be able to stake your unstaked{" "}
              {formatAmount(accumulatedBnGMXAmount, 18, 4, true)} Multiplier Points.
            </Trans>
          </AlertInfo>
        )}
        {isUndelegatedGovToken ? (
          <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
              </ExternalLink>
              <span>&nbsp;voting power before compounding.</span>
            </Trans>
          </AlertInfo>
        ) : null}
        <div className="CompoundModal-menu">
          <div>
            <Checkbox
              isChecked={shouldStakeMultiplierPoints}
              setIsChecked={setShouldStakeMultiplierPoints}
              disabled={true}
            >
              <Trans>Stake Multiplier Points</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimGmx} setIsChecked={setShouldClaimGmx} disabled={shouldStakeGmx}>
              <Trans>Claim GMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeGmx} setIsChecked={toggleShouldStakeGmx}>
              <Trans>Stake GMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsGmx} setIsChecked={setShouldClaimEsGmx} disabled={shouldStakeEsGmx}>
              <Trans>Claim esGMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldStakeEsGmx} setIsChecked={toggleShouldStakeEsGmx}>
              <Trans>Stake esGMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              <Trans>Claim {wrappedTokenSymbol} Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              <Trans>
                Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
              </Trans>
            </Checkbox>
          </div>
        </div>
        {(needApproval || isApproving) && (
          <div className="mb-12">
            <ApproveTokenButton
              tokenAddress={gmxAddress}
              spenderAddress={stakedGmxTrackerAddress}
              tokenSymbol={"GMX"}
              isApproved={!needApproval}
            />
          </div>
        )}
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  rewardRouterAddress: string;
  signer: UncheckedJsonRpcSigner | undefined;
  chainId: number;
  setPendingTxns: SetPendingTransactions;
  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
}) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    signer,
    chainId,
    setPendingTxns,
    nativeTokenSymbol,
    wrappedTokenSymbol,
  } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const [shouldClaimGmx, setShouldClaimGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-gmx"],
    true
  );
  const [shouldClaimEsGmx, setShouldClaimEsGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-es-gmx"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-claim-should-convert-weth"],
    true
  );

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken =
    chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0;

  const isPrimaryEnabled = () => {
    return !isClaiming && !isUndelegatedGovToken;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return t`Claiming...`;
    }
    return t`Claim`;
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimGmx,
        false, // shouldStakeGmx
        shouldClaimEsGmx,
        false, // shouldStakeEsGmx
        false, // shouldStakeMultiplierPoints
        shouldClaimWeth,
        shouldConvertWeth,
      ],
      {
        sentMsg: t`Claim submitted.`,
        failMsg: t`Claim failed.`,
        successMsg: t`Claim completed!`,
        setPendingTxns,
      }
    )
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  const toggleConvertWeth = (value) => {
    if (value) {
      setShouldClaimWeth(true);
    }
    setShouldConvertWeth(value);
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Rewards`}>
        {isUndelegatedGovToken ? (
          <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
              </ExternalLink>
              <span>&nbsp;voting power before compounding.</span>
            </Trans>
          </AlertInfo>
        ) : null}
        <div className="CompoundModal-menu">
          <div>
            <Checkbox isChecked={shouldClaimGmx} setIsChecked={setShouldClaimGmx}>
              <Trans>Claim GMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimEsGmx} setIsChecked={setShouldClaimEsGmx}>
              <Trans>Claim esGMX Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
              <Trans>Claim {wrappedTokenSymbol} Rewards</Trans>
            </Checkbox>
          </div>
          <div>
            <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
              <Trans>
                Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
              </Trans>
            </Checkbox>
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function AffiliateClaimModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  signer: UncheckedJsonRpcSigner | undefined;
  chainId: number;
  setPendingTxns: SetPendingTransactions;
  totalVesterRewards: bigint | undefined;
}) {
  const { isVisible, setIsVisible, signer, chainId, setPendingTxns, totalVesterRewards } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const isPrimaryEnabled = () => {
    if (totalVesterRewards == undefined || totalVesterRewards == 0n) {
      return false;
    }

    return !isClaiming;
  };

  const getPrimaryText = () => {
    if (isClaiming) {
      return t`Claiming...`;
    }
    return t`Claim`;
  };

  const onClickPrimary = () => {
    setIsClaiming(true);

    const affiliateVesterContract = new ethers.Contract(affiliateVesterAddress, Vester.abi, signer);

    callContract(chainId, affiliateVesterContract, "claim", [], {
      sentMsg: t`Claim submitted.`,
      failMsg: t`Claim failed.`,
      successMsg: t`Claim completed!`,
      setPendingTxns,
    })
      .then(() => {
        setIsVisible(false);
      })
      .finally(() => {
        setIsClaiming(false);
      });
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Affiliate Vault Rewards`}>
        <Trans>
          <div>
            This will claim {formatAmount(totalVesterRewards, 18, 4, true)} GMX.
            <br />
            <br />
            After claiming, you can stake these GMX tokens by using the "Stake" button in the GMX section of this Earn
            page.
            <br />
            <br />
          </div>
        </Trans>
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function StakeV2() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();
  const incentiveStats = useIncentiveStats(chainId);

  const [, setPendingTxns] = usePendingTxns();

  const icons = getIcons(chainId);
  const hasInsurance = true;
  const [isStakeModalVisible, setIsStakeModalVisible] = useState(false);
  const [stakeModalTitle, setStakeModalTitle] = useState("");
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState<bigint | undefined>(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState<bigint | undefined>(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState<bigint | undefined>(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState<bigint | undefined>();
  const [vesterDepositBalance, setVesterDepositBalance] = useState<bigint | undefined>();
  const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState<bigint | undefined>();
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState<bigint | undefined | string>(
    ""
  );
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState<bigint | undefined>();
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState<bigint | undefined>();
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState<bigint | undefined>();
  const [vesterDepositAddress, setVesterDepositAddress] = useState("");

  const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  const [isAffiliateVesterWithdrawModalVisible, setIsAffiliateVesterWithdrawModalVisible] = useState(false);
  const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState("");
  const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");

  const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  const [isAffiliateClaimModalVisible, setIsAffiliateClaimModalVisible] = useState(false);

  const rewardRouterAddress = getContract(chainId, "RewardRouter");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const glpAddress = getContract(chainId, "GLP");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");

  const glpManagerAddress = getContract(chainId, "GlpManager");

  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor");
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor");

  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const glpVesterAddress = getContract(chainId, "GlpVester");
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");
  const wrappedTokenSymbol = getConstant(chainId, "wrappedTokenSymbol");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];
  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    bnGmxAddress,
    glpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedGmxTrackerAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress,
  ];

  const stakedBnGmxSupply = useStakedBnGMXAmount(chainId);
  const { marketsInfoData, tokensData } = useMarketsInfoRequest(chainId);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const { marketsTokensApyData, marketsTokensIncentiveAprData } = useGmMarketsApy(chainId);
  const vestingData = useVestingData(account);
  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const { ensName: govTokenDelegatesEns } = useENS(govTokenDelegatesAddress);

  const { data: walletBalances } = useSWR(
    [
      `StakeV2:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, ReaderV2, [walletTokens]),
    }
  );

  const { data: depositBalances } = useSWR(
    [
      `StakeV2:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(signer, RewardReader, [depositTokens, rewardTrackersForDepositBalances]),
    }
  );

  const { data: stakingInfo } = useSWR(
    [`StakeV2:stakingInfo:${active}`, chainId, rewardReaderAddress, "getStakingInfo", account || PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(signer, RewardReader, [rewardTrackersForStakingInfo]),
    }
  );

  const { data: stakedGmxSupply } = useSWR(
    [`StakeV2:stakedGmxSupply:${active}`, chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const { data: aums } = useSWR([`StakeV2:getAums:${active}`, chainId, glpManagerAddress, "getAums"], {
    fetcher: contractFetcher(signer, GlpManager),
  });

  const { data: nativeTokenPrice } = useSWR(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: contractFetcher(signer, Vault),
    }
  );

  const { data: esGmxSupply } = useSWR(
    [`StakeV2:esGmxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esGmxAddress],
    {
      fetcher: contractFetcher(signer, ReaderV2, [excludedEsGmxAccounts]),
    }
  );

  const accumulatedBnGMXAmount = useAccumulatedBnGMXAmount();

  const maxBoostBasicPoints = useMaxBoostBasicPoints();

  const { gmxPrice, gmxPriceFromArbitrum, gmxPriceFromAvalanche } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM ? signer : undefined },
    active
  );

  let { total: totalGmxSupply } = useTotalGmxSupply();

  const stakedGMXInfo = useTotalGmxStaked();
  const { [AVALANCHE]: avaxGmxStaked, [ARBITRUM]: arbitrumGmxStaked, total: totalGmxStaked } = stakedGMXInfo;

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply");
  const { data: gmxSupply } = useSWR([gmxSupplyUrl], {
    fetcher: (args) => fetch(...args).then((res) => res.text()),
  });

  const isGmxTransferEnabled = true;

  let esGmxSupplyUsd;
  if (esGmxSupply && gmxPrice) {
    esGmxSupplyUsd = bigMath.mulDiv(esGmxSupply, gmxPrice, expandDecimals(1, 18));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = (aums[0] + aums[1]) / 2n;
  }

  const { balanceData, supplyData } = useMemo(() => getBalanceAndSupplyData(walletBalances), [walletBalances]);
  const depositBalanceData = useMemo(() => getDepositBalanceData(depositBalances), [depositBalances]);
  const stakingData = useMemo(() => getStakingData(stakingInfo), [stakingInfo]);

  const userTotalGmInfo = useMemo(() => {
    if (!active) return;
    return getTotalGmInfo(marketTokensData);
  }, [marketTokensData, active]);

  const processedData = getProcessedData(
    balanceData,
    supplyData,
    depositBalanceData,
    stakingData,
    vestingData,
    aum,
    nativeTokenPrice,
    stakedGmxSupply,
    stakedBnGmxSupply,
    gmxPrice,
    gmxSupply,
    maxBoostBasicPoints === undefined ? undefined : maxBoostBasicPoints / BASIS_POINTS_DIVISOR_BIGINT
  );

  let multiplierPointsAmount: bigint | undefined;
  if (accumulatedBnGMXAmount !== undefined && processedData?.bnGmxInFeeGmx !== undefined) {
    multiplierPointsAmount = accumulatedBnGMXAmount + processedData.bnGmxInFeeGmx;
  }

  let totalRewardTokens;

  if (processedData && processedData.bnGmxInFeeGmx !== undefined && processedData.bonusGmxInFeeGmx !== undefined) {
    totalRewardTokens = processedData.bnGmxInFeeGmx + processedData.bonusGmxInFeeGmx;
  }

  let totalRewardAndLpTokens = totalRewardTokens ?? 0n;
  if (processedData?.glpBalance !== undefined) {
    totalRewardAndLpTokens = totalRewardAndLpTokens + processedData.glpBalance;
  }
  if ((userTotalGmInfo?.balance ?? 0n) > 0) {
    totalRewardAndLpTokens = totalRewardAndLpTokens + (userTotalGmInfo?.balance ?? 0n);
  }

  const bonusGmxInFeeGmx = processedData ? processedData.bonusGmxInFeeGmx : undefined;

  let stakedGmxSupplyUsd;
  if (totalGmxStaked !== 0n && gmxPrice) {
    stakedGmxSupplyUsd = bigMath.mulDiv(totalGmxStaked, gmxPrice, expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalGmxSupply !== undefined && totalGmxSupply !== 0n && gmxPrice) {
    totalSupplyUsd = bigMath.mulDiv(totalGmxSupply, gmxPrice, expandDecimals(1, 18));
  }

  let maxUnstakeableGmx = 0n;
  if (
    totalRewardTokens !== undefined &&
    vestingData &&
    vestingData.gmxVesterPairAmount !== undefined &&
    multiplierPointsAmount !== undefined &&
    processedData?.bonusGmxInFeeGmx !== undefined
  ) {
    const availableTokens = totalRewardTokens - vestingData.gmxVesterPairAmount;
    const stakedTokens = processedData.bonusGmxInFeeGmx;
    const divisor = multiplierPointsAmount + stakedTokens;
    if (divisor > 0) {
      maxUnstakeableGmx = bigMath.mulDiv(availableTokens, stakedTokens, divisor);
    }
  }

  const showStakeGmxModal = () => {
    if (!isGmxTransferEnabled) {
      helperToast.error(t`GMX transfers not yet enabled`);
      return;
    }

    setIsStakeModalVisible(true);
    setStakeModalTitle(t`Stake GMX`);
    setStakeModalMaxAmount(processedData?.gmxBalance);
    setStakeValue("");
    setStakingTokenSymbol("GMX");
    setStakingTokenAddress(gmxAddress);
    setStakingFarmAddress(stakedGmxTrackerAddress);
    setStakeMethodName("stakeGmx");
  };

  const showStakeEsGmxModal = () => {
    setIsStakeModalVisible(true);
    setStakeModalTitle(t`Stake esGMX`);
    setStakeModalMaxAmount(processedData?.esGmxBalance);
    setStakeValue("");
    setStakingTokenSymbol("esGMX");
    setStakingTokenAddress(esGmxAddress);
    setStakingFarmAddress(ZeroAddress);
    setStakeMethodName("stakeEsGmx");
  };

  const showGmxVesterDepositModal = () => {
    if (!vestingData) return;

    let remainingVestableAmount = vestingData.gmxVester.maxVestableAmount - vestingData.gmxVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData?.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GMX Vault`);
    setVesterDepositStakeTokenLabel("staked GMX + esGMX + Multiplier Points");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData.gmxVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.gmxVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.gmxVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.gmxVester.pairAmount);
    setVesterDepositMaxReserveAmount(totalRewardTokens);
    setVesterDepositValue("");
    setVesterDepositAddress(gmxVesterAddress);
  };

  const showGlpVesterDepositModal = () => {
    if (!vestingData) return;

    let remainingVestableAmount = vestingData.glpVester.maxVestableAmount - vestingData.glpVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData?.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GLP Vault`);
    setVesterDepositStakeTokenLabel("staked GLP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData.glpVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.glpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.glpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.glpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData?.glpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(glpVesterAddress);
  };

  const showGmxVesterWithdrawModal = () => {
    if (!vestingData || vestingData.gmxVesterVestedAmount === undefined || vestingData.gmxVesterVestedAmount === 0n) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from GMX Vault`);
    setVesterWithdrawAddress(gmxVesterAddress);
  };

  const showGlpVesterWithdrawModal = () => {
    if (!vestingData || vestingData.glpVesterVestedAmount === undefined || vestingData.glpVesterVestedAmount === 0n) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from GLP Vault`);
    setVesterWithdrawAddress(glpVesterAddress);
  };

  const showUnstakeGmxModal = () => {
    if (!isGmxTransferEnabled) {
      helperToast.error(t`GMX transfers not yet enabled`);
      return;
    }
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake GMX`);
    let maxAmount = processedData?.gmxInStakedGmx;
    if (
      processedData?.gmxInStakedGmx !== undefined &&
      vestingData &&
      vestingData.gmxVesterPairAmount > 0 &&
      maxUnstakeableGmx !== undefined &&
      maxUnstakeableGmx < processedData.gmxInStakedGmx
    ) {
      maxAmount = maxUnstakeableGmx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    if (vestingData) {
      setUnstakeModalReservedAmount(vestingData.gmxVesterPairAmount);
    }
    setUnstakeValue("");
    setUnstakingTokenSymbol("GMX");
    setUnstakeMethodName("unstakeGmx");
  };

  const showUnstakeEsGmxModal = () => {
    setIsUnstakeModalVisible(true);
    setUnstakeModalTitle(t`Unstake esGMX`);
    let maxAmount = processedData?.esGmxInStakedGmx;
    if (
      maxAmount !== undefined &&
      vestingData &&
      vestingData.gmxVesterPairAmount > 0 &&
      maxUnstakeableGmx !== undefined &&
      maxUnstakeableGmx < maxAmount
    ) {
      maxAmount = maxUnstakeableGmx;
    }
    setUnstakeModalMaxAmount(maxAmount);
    if (vestingData) {
      setUnstakeModalReservedAmount(vestingData.gmxVesterPairAmount);
    }
    setUnstakeValue("");
    setUnstakingTokenSymbol("esGMX");
    setUnstakeMethodName("unstakeEsGmx");
  };

  function showAffiliateVesterDepositModal() {
    if (!vestingData?.affiliateVester) {
      helperToast.error(t`Unsupported network`);
      return;
    }

    let remainingVestableAmount =
      vestingData.affiliateVester.maxVestableAmount - vestingData.affiliateVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`Affiliate Vault`);

    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData?.affiliateVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData?.affiliateVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData?.affiliateVester.averageStakedAmount);

    setVesterDepositReserveAmount(undefined);
    setVesterDepositValue("");

    setVesterDepositAddress(affiliateVesterAddress);
  }

  function showAffiliateVesterWithdrawModal() {
    if (vestingData?.affiliateVesterVestedAmount === undefined || vestingData.affiliateVesterVestedAmount <= 0) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsAffiliateVesterWithdrawModalVisible(true);
  }

  function showAffiliateVesterClaimModal() {
    if (vestingData?.affiliateVesterClaimable === undefined || vestingData?.affiliateVesterClaimable <= 0) {
      helperToast.error(t`You have no GMX tokens to claim.`);
      return;
    }
    setIsAffiliateClaimModalVisible(true);
  }

  const recommendStakeGmx = useRecommendStakeGmxAmount(
    {
      accumulatedGMX: processedData?.totalVesterRewards,
      accumulatedBnGMX: accumulatedBnGMXAmount,
      accumulatedEsGMX: processedData?.totalEsGmxRewards,
      stakedGMX: processedData?.gmxInStakedGmx,
      stakedBnGMX: processedData?.bnGmxInFeeGmx,
      stakedEsGMX: processedData?.esGmxInStakedGmx,
    },
    {
      shouldStakeGmx: true,
      shouldStakeEsGmx: true,
    }
  );

  const renderBoostPercentageTooltip = useCallback(() => {
    return (
      <div>
        <Trans>
          You are earning {formatAmount(processedData?.boostBasisPoints, 2, 2, false)}% more {nativeTokenSymbol} rewards
          using {formatAmount(processedData?.bnGmxInFeeGmx, 18, 4, true)} Staked Multiplier Points.
        </Trans>
        <br />
        <br />
        {recommendStakeGmx > 0 ? (
          <Trans>
            You have reached the maximum Boost Percentage. Stake an additional{" "}
            {formatAmount(recommendStakeGmx, 18, 2, true)} GMX or esGMX to be able to stake your unstaked{" "}
            {formatAmount(accumulatedBnGMXAmount, 18, 4, true)} Multiplier Points using the "Compound" button.
          </Trans>
        ) : (
          <Trans>Use the "Compound" button to stake your Multiplier Points.</Trans>
        )}
      </div>
    );
  }, [nativeTokenSymbol, processedData, recommendStakeGmx, accumulatedBnGMXAmount]);

  const gmxAvgAprText = useMemo(() => {
    return `${formatAmount(processedData?.avgGMXAprForNativeToken, 2, 2, true)}%`;
  }, [processedData?.avgGMXAprForNativeToken]);

  const renderMultiplierPointsLabel = useCallback(() => {
    return t`Multiplier Points APR`;
  }, []);

  const renderMultiplierPointsValue = useCallback(() => {
    return (
      <Tooltip
        handle={`100.00%`}
        position="bottom-end"
        renderContent={() => {
          return (
            <Trans>
              Boost your rewards with Multiplier Points.&nbsp;
              <ExternalLink href="https://docs.gmx.io/docs/tokenomics/rewards#multiplier-points">
                Read more
              </ExternalLink>
              .
            </Trans>
          );
        }}
      />
    );
  }, []);

  let earnMsg;
  if (totalRewardAndLpTokens && totalRewardAndLpTokens > 0) {
    let gmxAmountStr;
    if (processedData?.gmxInStakedGmx && processedData.gmxInStakedGmx > 0) {
      gmxAmountStr = formatAmount(processedData.gmxInStakedGmx, 18, 2, true) + " GMX";
    }
    let esGmxAmountStr;
    if (processedData?.esGmxInStakedGmx && processedData.esGmxInStakedGmx > 0) {
      esGmxAmountStr = formatAmount(processedData.esGmxInStakedGmx, 18, 2, true) + " esGMX";
    }
    let mpAmountStr;
    if (processedData?.bnGmxInFeeGmx && processedData.bnGmxInFeeGmx > 0) {
      mpAmountStr = formatAmount(processedData.bnGmxInFeeGmx, 18, 2, true) + " MP";
    }
    let glpStr;
    if (processedData?.glpBalance && processedData.glpBalance > 0) {
      glpStr = formatAmount(processedData.glpBalance, 18, 2, true) + " GLP";
    }
    let gmStr;
    if (userTotalGmInfo?.balance && userTotalGmInfo.balance > 0) {
      gmStr = formatAmount(userTotalGmInfo.balance, 18, 2, true) + " GM";
    }
    const amountStr = [gmxAmountStr, esGmxAmountStr, mpAmountStr, gmStr, glpStr].filter((s) => s).join(", ");
    earnMsg = (
      <div>
        <Trans>
          You are earning rewards with {formatAmount(totalRewardAndLpTokens, 18, 2, true)} tokens.
          <br />
          Tokens: {amountStr}.
        </Trans>
      </div>
    );
  }

  const stakedEntries = useMemo(
    () => ({
      "Staked on Arbitrum": arbitrumGmxStaked,
      "Staked on Avalanche": avaxGmxStaked,
    }),
    [arbitrumGmxStaked, avaxGmxStaked]
  );

  return (
    <div className="default-container page-layout">
      <StakeModal
        isVisible={isStakeModalVisible}
        setIsVisible={setIsStakeModalVisible}
        chainId={chainId}
        title={stakeModalTitle}
        maxAmount={stakeModalMaxAmount}
        value={stakeValue}
        setValue={setStakeValue}
        signer={signer}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        setPendingTxns={setPendingTxns}
      />
      <UnstakeModal
        setPendingTxns={setPendingTxns}
        isVisible={isUnstakeModalVisible}
        setIsVisible={setIsUnstakeModalVisible}
        chainId={chainId}
        title={unstakeModalTitle}
        maxAmount={unstakeModalMaxAmount}
        reservedAmount={unstakeModalReservedAmount}
        value={unstakeValue}
        setValue={setUnstakeValue}
        signer={signer}
        unstakingTokenSymbol={unstakingTokenSymbol}
        rewardRouterAddress={rewardRouterAddress}
        unstakeMethodName={unstakeMethodName}
        multiplierPointsAmount={multiplierPointsAmount}
        bonusGmxInFeeGmx={bonusGmxInFeeGmx}
        processedData={processedData}
        nativeTokenSymbol={nativeTokenSymbol}
      />
      <VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={
          typeof vesterDepositAverageStakedAmount === "string"
            ? vesterDepositAverageStakedAmount === ""
              ? undefined
              : BigInt(vesterDepositAverageStakedAmount)
            : vesterDepositAverageStakedAmount
        }
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        signer={signer}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        signer={signer}
        setPendingTxns={setPendingTxns}
      />
      <AffiliateVesterWithdrawModal
        isVisible={isAffiliateVesterWithdrawModalVisible}
        setIsVisible={setIsAffiliateVesterWithdrawModalVisible}
        chainId={chainId}
        signer={signer}
        setPendingTxns={setPendingTxns}
      />
      <CompoundModal
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        processedData={processedData}
        setIsVisible={setIsCompoundModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData?.totalVesterRewards}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        signer={signer}
        chainId={chainId}
      />
      <ClaimModal
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        wrappedTokenSymbol={wrappedTokenSymbol}
        nativeTokenSymbol={nativeTokenSymbol}
        signer={signer}
        chainId={chainId}
      />
      <AffiliateClaimModal
        signer={signer}
        chainId={chainId}
        setPendingTxns={setPendingTxns}
        isVisible={isAffiliateClaimModalVisible}
        setIsVisible={setIsAffiliateClaimModalVisible}
        totalVesterRewards={vestingData?.affiliateVesterClaimable ?? BN_ZERO}
      />

      <PageTitle
        isTop
        title={t`Earn`}
        subtitle={
          <div>
            <Trans>
              Stake <ExternalLink href="https://docs.gmx.io/docs/tokenomics/gmx-token">GMX</ExternalLink> and buy{" "}
              <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v2">GM</ExternalLink> or{" "}
              <ExternalLink href="https://docs.gmx.io/docs/providing-liquidity/v1">GLP</ExternalLink> to earn rewards.
            </Trans>
            {earnMsg && <div className="Page-description">{earnMsg}</div>}
            {(incentiveStats?.lp?.isActive || incentiveStats?.trading?.isActive) && (
              <div>
                <Trans>
                  Liquidity and trading incentives program is live on Arbitrum.{" "}
                  <ExternalLink
                    newTab
                    href="https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3"
                  >
                    Read more
                  </ExternalLink>
                  .
                </Trans>
              </div>
            )}
          </div>
        }
      />
      <div className="StakeV2-content">
        <div className="StakeV2-cards">
          <div className="App-card StakeV2-gmx-card">
            <div className="App-card-title">
              <div className="inline-flex items-center">
                <img className="mr-5 h-20" alt="GMX" src={icons.gmx} height={20} />
                {t`GMX & Voting Power`}
              </div>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>
                  {!gmxPrice && "..."}
                  {gmxPrice && (
                    <Tooltip
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={"$" + formatAmount(gmxPrice, USD_DECIMALS, 2, true)}
                      renderContent={() => (
                        <>
                          <StatsTooltipRow
                            label={t`Price on Avalanche`}
                            value={formatAmount(gmxPriceFromAvalanche, USD_DECIMALS, 2, true)}
                          />
                          <StatsTooltipRow
                            label={t`Price on Arbitrum`}
                            value={formatAmount(gmxPriceFromArbitrum, USD_DECIMALS, 2, true)}
                          />
                        </>
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Wallet</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "gmxBalance", 18, 2, true)} GMX ($
                  {formatKeyAmount(processedData, "gmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "gmxInStakedGmx", 18, 2, true)} GMX ($
                  {formatKeyAmount(processedData, "gmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              {chainId === ARBITRUM && (
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Voting Power</Trans>
                  </div>
                  <div>
                    {govTokenAmount !== undefined ? (
                      <Tooltip
                        position="bottom-end"
                        className="nowrap"
                        handle={`${formatAmount(govTokenAmount, 18, 2, true)} GMX DAO`}
                        renderContent={() => (
                          <>
                            {govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount > 0 ? (
                              <AlertInfo
                                type="warning"
                                className={cx("DelegateGMXAlertInfo")}
                                textColor="text-yellow-500"
                              >
                                <Trans>
                                  <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                                    Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
                                  </ExternalLink>
                                  <span>&nbsp;voting power.</span>
                                </Trans>
                              </AlertInfo>
                            ) : null}
                            <StatsTooltipRow
                              label={t`Delegated to`}
                              value={
                                !govTokenDelegatesAddress || govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS ? (
                                  <Trans>No delegate found</Trans>
                                ) : (
                                  <ExternalLink href={getGmxDAODelegateLink(govTokenDelegatesAddress)}>
                                    {govTokenDelegatesAddress === account
                                      ? t`Myself`
                                      : govTokenDelegatesEns
                                        ? shortenAddressOrEns(govTokenDelegatesEns, 25)
                                        : shortenAddressOrEns(govTokenDelegatesAddress, 13)}
                                  </ExternalLink>
                                )
                              }
                              showDollar={false}
                            />
                            <br />
                            <ExternalLink href={GMX_DAO_LINKS.DELEGATES}>Explore the list of delegates</ExternalLink>.
                          </>
                        )}
                      />
                    ) : (
                      "..."
                    )}
                  </div>
                </div>
              )}
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Avg. APR</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={gmxAvgAprText}
                    position="bottom-end"
                    renderContent={() => (
                      <GMXAprTooltip processedData={processedData} nativeTokenSymbol={nativeTokenSymbol} />
                    )}
                  />
                </div>
              </div>
              {active && (
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Your APR</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "gmxAprTotalWithBoost", 2, 2, true)}%`}
                      position="bottom-end"
                      renderContent={() => (
                        <GMXAprTooltip
                          processedData={processedData}
                          nativeTokenSymbol={nativeTokenSymbol}
                          recommendStakeGmx={recommendStakeGmx}
                          isUserConnected={true}
                        />
                      )}
                    />
                  </div>
                </div>
              )}
              <div className="App-card-row">
                <div className="label">
                  <Trans>Rewards</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`$${formatKeyAmount(processedData, "totalGmxRewardsUsd", USD_DECIMALS, 2, true)}`}
                    position="bottom-end"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                            value={`${formatKeyAmount(
                              processedData,
                              "feeGmxTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(processedData, "feeGmxTrackerRewardsUsd", USD_DECIMALS, 2, true)})`}
                            showDollar={false}
                          />
                          <StatsTooltipRow
                            label="Escrowed GMX"
                            value={`${formatKeyAmount(
                              processedData,
                              "stakedGmxTrackerRewards",
                              18,
                              4
                            )} ($${formatKeyAmount(
                              processedData,
                              "stakedGmxTrackerRewardsUsd",
                              USD_DECIMALS,
                              2,
                              true
                            )})`}
                            showDollar={false}
                          />
                        </>
                      );
                    }}
                  />
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Boost Percentage</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={`${formatAmount(processedData?.boostBasisPoints, 2, 2, false)}%`}
                    position="bottom-end"
                    renderContent={renderBoostPercentageTooltip}
                  />
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  {totalGmxStaked === undefined && "..."}
                  {(totalGmxStaked !== undefined && (
                    <Tooltip
                      position="bottom-end"
                      className="whitespace-nowrap"
                      handle={
                        formatAmount(totalGmxStaked, 18, 0, true) +
                        " GMX" +
                        ` ($${formatAmount(stakedGmxSupplyUsd, USD_DECIMALS, 0, true)})`
                      }
                      renderContent={() => (
                        <ChainsStatsTooltipRow
                          showDollar={false}
                          decimalsForConversion={18}
                          symbol="GMX"
                          entries={stakedEntries}
                        />
                      )}
                    />
                  )) ||
                    null}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                {totalGmxSupply === undefined && "..."}
                {(totalGmxSupply !== undefined && (
                  <div>
                    {formatAmount(totalGmxSupply, 18, 0, true)} GMX ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )) ||
                  null}
              </div>
              <div className="App-card-divider" />
              <div className="App-card-buttons m-0">
                <Button variant="secondary" to="/buy_gmx">
                  <Trans>Buy GMX</Trans>
                </Button>
                {active && (
                  <Button variant="secondary" onClick={() => showStakeGmxModal()}>
                    <Trans>Stake</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" onClick={() => showUnstakeGmxModal()}>
                    <Trans>Unstake</Trans>
                  </Button>
                )}
                {active && chainId === ARBITRUM && (
                  <Button variant="secondary" to={GMX_DAO_LINKS.VOTING_POWER} newTab>
                    <Trans>Delegate</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" to="/begin_account_transfer">
                    <Trans>Transfer Account</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="App-card primary StakeV2-total-rewards-card">
            <div className="App-card-title">
              <Trans>Total Rewards</Trans>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  {nativeTokenSymbol} ({wrappedTokenSymbol})
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalNativeTokenRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalNativeTokenRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">GMX</div>
                <div>
                  {formatKeyAmount(processedData, "totalVesterRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalVesterRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Escrowed GMX</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "totalEsGmxRewards", 18, 4, true)} ($
                  {formatKeyAmount(processedData, "totalEsGmxRewardsUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Multiplier Points</Trans>
                </div>
                <div>{formatAmount(accumulatedBnGMXAmount, 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked Multiplier Points</Trans>
                </div>
                <div>{formatKeyAmount(processedData, "bnGmxInFeeGmx", 18, 4, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total</Trans>
                </div>
                <div>${formatKeyAmount(processedData, "totalRewardsUsd", USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-footer">
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {active && (
                    <Button variant="secondary" onClick={() => setIsCompoundModalVisible(true)}>
                      <Trans>Compound</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => setIsClaimModalVisible(true)}>
                      <Trans>Claim</Trans>
                    </Button>
                  )}
                  {!active && (
                    <Button variant="secondary" onClick={openConnectModal}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="App-card App-card-space-between">
            <div>
              <div className="App-card-title">
                <div className="inline-flex items-center">
                  <img className="mr-5 h-20" alt="GLP" src={icons.glp} height={20} />
                  GLP
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Price</Trans>
                  </div>
                  <div>${formatKeyAmount(processedData, "glpPrice", USD_DECIMALS, 3, true)}</div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Wallet</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(processedData, "glpBalance", GLP_DECIMALS, 2, true)} GLP ($
                    {formatKeyAmount(processedData, "glpBalanceUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(processedData, "glpBalance", GLP_DECIMALS, 2, true)} GLP ($
                    {formatKeyAmount(processedData, "glpBalanceUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>APR</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "glpAprTotal", 2, 2, true)}%`}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              label={`${nativeTokenSymbol} (${wrappedTokenSymbol}) APR`}
                              value={`${formatKeyAmount(processedData, "glpAprForNativeToken", 2, 2, true)}%`}
                              showDollar={false}
                            />

                            {processedData?.glpAprForEsGmx && processedData.glpAprForEsGmx > 0 && (
                              <StatsTooltipRow
                                label="Escrowed GMX APR"
                                value={`${formatKeyAmount(processedData, "glpAprForEsGmx", 2, 2, true)}%`}
                                showDollar={false}
                              />
                            )}

                            <br />

                            <Trans>
                              APRs are updated weekly on Wednesday and will depend on the fees collected for the week.{" "}
                              <br />
                              <br />
                              Historical GLP APRs can be checked in this{" "}
                              <ExternalLink href="https://dune.com/saulius/gmx-analytics">
                                community dashboard
                              </ExternalLink>
                              .
                            </Trans>
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Rewards</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`$${formatKeyAmount(processedData, "totalGlpRewardsUsd", USD_DECIMALS, 2, true)}`}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              label={`${nativeTokenSymbol} (${wrappedTokenSymbol})`}
                              value={`${formatKeyAmount(
                                processedData,
                                "feeGlpTrackerRewards",
                                18,
                                4
                              )} ($${formatKeyAmount(
                                processedData,
                                "feeGlpTrackerRewardsUsd",
                                USD_DECIMALS,
                                2,
                                true
                              )})`}
                              showDollar={false}
                            />
                            <StatsTooltipRow
                              label="Escrowed GMX"
                              value={`${formatKeyAmount(
                                processedData,
                                "stakedGlpTrackerRewards",
                                18,
                                4
                              )} ($${formatKeyAmount(
                                processedData,
                                "stakedGlpTrackerRewardsUsd",
                                USD_DECIMALS,
                                2,
                                true
                              )})`}
                              showDollar={false}
                            />
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-divider" />
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Staked</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(processedData, "glpSupply", 18, 2, true)} GLP ($
                    {formatKeyAmount(processedData, "glpSupplyUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Total Supply</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(processedData, "glpSupply", 18, 2, true)} GLP ($
                    {formatKeyAmount(processedData, "glpSupplyUsd", USD_DECIMALS, 2, true)})
                  </div>
                </div>

                <div />
              </div>
            </div>
            <div>
              <div className="App-card-divider" />
              <div className="App-card-buttons glp-buttons m-0">
                <Button variant="secondary" to="/buy_glp">
                  <Trans>Buy GLP</Trans>
                </Button>
                <Button variant="secondary" to="/buy_glp#redeem">
                  <Trans>Sell GLP</Trans>
                </Button>
                {hasInsurance && (
                  <Button
                    variant="secondary"
                    to="https://app.insurace.io/Insurance/Cart?id=124&referrer=545066382753150189457177837072918687520318754040"
                  >
                    <Trans>Purchase Insurance</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="App-card">
            <div className="App-card-title">
              <div className="inline-flex items-center">
                <img className="mr-5 h-20" alt="GLP" src={icons.esgmx} height={20} />
                <span>
                  <Trans>Escrowed GMX</Trans>
                </span>
              </div>
            </div>
            <div className="App-card-divider"></div>
            <div className="App-card-content">
              <div className="App-card-row">
                <div className="label">
                  <Trans>Price</Trans>
                </div>
                <div>${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}</div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Wallet</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "esGmxBalance", 18, 2, true)} esGMX ($
                  {formatKeyAmount(processedData, "esGmxBalanceUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "esGmxInStakedGmx", 18, 2, true)} esGMX ($
                  {formatKeyAmount(processedData, "esGmxInStakedGmxUsd", USD_DECIMALS, 2, true)})
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Avg. APR</Trans>
                </div>
                <div>
                  <Tooltip
                    handle={gmxAvgAprText}
                    position="bottom-end"
                    renderContent={() => (
                      <GMXAprTooltip processedData={processedData!} nativeTokenSymbol={nativeTokenSymbol} />
                    )}
                  />
                </div>
              </div>
              {active && (
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Your APR</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(processedData, "gmxAprTotalWithBoost", 2, 2, true)}%`}
                      position="bottom-end"
                      renderContent={() => (
                        <GMXAprTooltip
                          processedData={processedData!}
                          nativeTokenSymbol={nativeTokenSymbol}
                          recommendStakeGmx={recommendStakeGmx}
                          isUserConnected={true}
                        />
                      )}
                    />
                  </div>
                </div>
              )}
              <div className="App-card-row">
                <div className="label">{renderMultiplierPointsLabel()}</div>
                <div>{renderMultiplierPointsValue()}</div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Staked</Trans>
                </div>
                <div>
                  {formatKeyAmount(processedData, "stakedEsGmxSupply", 18, 0, true)} esGMX ($
                  {formatKeyAmount(processedData, "stakedEsGmxSupplyUsd", USD_DECIMALS, 0, true)})
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                <div>
                  {formatAmount(esGmxSupply, 18, 0, true)} esGMX (${formatAmount(esGmxSupplyUsd, USD_DECIMALS, 0, true)}
                  )
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-buttons m-0">
                {active && (
                  <Button variant="secondary" onClick={() => showStakeEsGmxModal()}>
                    <Trans>Stake</Trans>
                  </Button>
                )}
                {active && (
                  <Button variant="secondary" onClick={() => showUnstakeEsGmxModal()}>
                    <Trans>Unstake</Trans>
                  </Button>
                )}
                {!active && (
                  <Button variant="secondary" onClick={openConnectModal}>
                    <Trans> Connect Wallet</Trans>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {getIsSyntheticsSupported(chainId) && (
        <div className="StakeV2-section">
          <GmList
            marketsTokensApyData={marketsTokensApyData}
            marketsTokensIncentiveAprData={marketsTokensIncentiveAprData}
            marketTokensData={marketTokensData}
            marketsInfoData={marketsInfoData}
            tokensData={tokensData}
            shouldScrollToTop
          />
        </div>
      )}

      <div>
        <PageTitle
          title={t`Vest`}
          subtitle={
            <Trans>
              Convert esGMX tokens to GMX tokens.
              <br />
              Please read the{" "}
              <ExternalLink href="https://docs.gmx.io/docs/tokenomics/rewards#vesting">
                vesting details
              </ExternalLink>{" "}
              before using the vaults.
            </Trans>
          }
        />
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">
                <div className="inline-flex items-center">
                  <img className="mr-5 h-20" alt="GMX" src={icons.gmx} height={20} />
                  <Trans>GMX Vault</Trans>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <>
                            <StatsTooltipRow
                              showDollar={false}
                              label="GMX"
                              value={formatAmount(processedData?.gmxInStakedGmx, 18, 2, true)}
                            />

                            <StatsTooltipRow
                              showDollar={false}
                              label="esGMX"
                              value={formatAmount(processedData?.esGmxInStakedGmx, 18, 2, true)}
                            />
                            <StatsTooltipRow
                              showDollar={false}
                              label="Multiplier Points"
                              value={formatAmount(processedData?.bnGmxInFeeGmx, 18, 2, true)}
                            />
                          </>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(vestingData, "gmxVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(totalRewardTokens, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "gmxVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <div>
                            <Trans>
                              {formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)} tokens have been
                              converted to GMX from the{" "}
                              {formatKeyAmount(vestingData, "gmxVesterVestedAmount", 18, 4, true)} esGMX deposited for
                              vesting.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Claimable</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "gmxVesterClaimable", 18, 4, true)} GMX`}
                      position="bottom-end"
                      renderContent={() => (
                        <Trans>
                          {formatKeyAmount(vestingData, "gmxVesterClaimable", 18, 4, true)} GMX tokens can be claimed,
                          use the options under the Total Rewards section to claim them.
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={openConnectModal}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGmxVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGmxVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">
                <div className="inline-flex items-center">
                  <img className="mr-5 h-20" alt="GLP" src={icons.glp} height={20} />
                  <Trans>GLP Vault</Trans>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>{formatAmount(processedData?.glpBalance, 18, 2, true)} GLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(vestingData, "glpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData?.glpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "glpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="bottom-end"
                      renderContent={() => {
                        return (
                          <div>
                            <Trans>
                              {formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} tokens have been
                              converted to GMX from the{" "}
                              {formatKeyAmount(vestingData, "glpVesterVestedAmount", 18, 4, true)} esGMX deposited for
                              vesting.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Claimable</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "glpVesterClaimable", 18, 4, true)} GMX`}
                      position="bottom-end"
                      renderContent={() => (
                        <Trans>
                          {formatKeyAmount(vestingData, "glpVesterClaimable", 18, 4, true)} GMX tokens can be claimed,
                          use the options under the Total Rewards section to claim them.
                        </Trans>
                      )}
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={openConnectModal}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGlpVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGlpVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {(vestingData?.affiliateVesterMaxVestableAmount && vestingData?.affiliateVesterMaxVestableAmount > 0 && (
              <div className="App-card StakeV2-gmx-card">
                <div className="App-card-title">
                  <div className="inline-flex items-center">
                    <img className="mr-5 h-20" alt="GLP" src={icons.gmx} height={20} />
                    <Trans>Affiliate Vault</Trans>
                  </div>
                </div>
                <div className="App-card-divider" />
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Vesting Status</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatKeyAmount(
                          vestingData,
                          "affiliateVesterClaimSum",
                          18,
                          4,
                          true
                        )} / ${formatKeyAmount(vestingData, "affiliateVesterVestedAmount", 18, 4, true)}`}
                        position="bottom-end"
                        renderContent={() => {
                          return (
                            <div>
                              <Trans>
                                {formatKeyAmount(vestingData, "affiliateVesterClaimSum", 18, 4, true)} tokens have been
                                converted to GMX from the{" "}
                                {formatKeyAmount(vestingData, "affiliateVesterVestedAmount", 18, 4, true)} esGMX
                                deposited for vesting.
                              </Trans>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Claimable</Trans>
                    </div>
                    <div>{formatKeyAmount(vestingData, "affiliateVesterClaimable", 18, 4, true)} GMX</div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-buttons m-0">
                    {!active && (
                      <Button variant="secondary" onClick={openConnectModal}>
                        <Trans>Connect Wallet</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterDepositModal()}>
                        <Trans>Deposit</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterWithdrawModal()}>
                        <Trans>Withdraw</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterClaimModal()}>
                        <Trans>Claim</Trans>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )) ||
              null}
          </div>
        </div>
      </div>
      <div className="mt-10">
        <PageTitle
          title={t`Incentives & Prizes`}
          subtitle={
            incentiveStats?.lp?.isActive || incentiveStats?.trading?.isActive ? (
              <Trans>
                Earn ARB tokens by purchasing GM tokens, trading, or migrating liquidity from GLP to GM. Only for GMX
                V2.
                <br />
                Earn prizes by participating in GMX Trading Competitions.
              </Trans>
            ) : (
              <Trans>Earn prizes by participating in GMX Trading Competitions.</Trans>
            )
          }
        />
      </div>
      <UserIncentiveDistributionList />
      <Footer />
    </div>
  );
}
