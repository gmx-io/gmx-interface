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

import { ARBITRUM, AVALANCHE, getConstant } from "config/chains";
import { useGmxPrice, useTotalGmxStaked, useTotalGmxSupply } from "domain/legacy";
import { useRecommendStakeGmxAmount } from "domain/stake/useRecommendStakeGmxAmount";
import { useAccumulatedBnGMXAmount } from "domain/rewards/useAccumulatedBnGMXAmount";
import { useMaxBoostBasicPoints } from "domain/rewards/useMaxBoostBasisPoints";
import { BigNumber, ethers } from "ethers";
import cx from "classnames";
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
import { BASIS_POINTS_DIVISOR } from "config/factors";

import useSWR from "swr";

import { getContract } from "config/contracts";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import SEO from "components/Common/SEO";
import ExternalLink from "components/ExternalLink/ExternalLink";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import ChainsStatsTooltipRow from "components/StatsTooltip/ChainsStatsTooltipRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { GmList } from "components/Synthetics/GmList/GmList";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { getIcons } from "config/icons";
import { getServerUrl } from "config/backend";
import { getIsSyntheticsSupported } from "config/features";
import { getTotalGmInfo, useMarketTokensData, useMarketsInfoRequest } from "domain/synthetics/markets";
import { useMarketTokensAPR } from "domain/synthetics/markets/useMarketTokensAPR";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { shortenAddressOrEns } from "lib/wallets";
import { useENS } from "lib/legacy";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import {
  BN_ZERO,
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatKeyAmount,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import "./StakeV2.css";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import PageTitle from "components/PageTitle/PageTitle";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import UserIncentiveDistributionList from "components/Synthetics/UserIncentiveDistributionList/UserIncentiveDistributionList";
import useIncentiveStats from "domain/synthetics/common/useIncentiveStats";
import useVestingData from "domain/vesting/useVestingData";
import { useStakedBnGMXAmount } from "domain/rewards/useStakedBnGMXAmount";
import { usePendingTxns } from "lib/usePendingTxns";
import { GMX_DAO_LINKS, getGmxDAODelegateLink } from "./constants";

const { AddressZero } = ethers.constants;

function StakeModal(props) {
  const {
    isVisible,
    setIsVisible,
    chainId,
    title,
    maxAmount,
    value,
    setValue,
    active,
    account,
    signer,
    stakingTokenSymbol,
    stakingTokenAddress,
    farmAddress,
    rewardRouterAddress,
    stakeMethodName,
    setPendingTxns,
  } = props;

  const [isStaking, setIsStaking] = useState(false);
  const isMetamaskMobile = useIsMetamaskMobile();
  const [isApproving, setIsApproving] = useState(false);
  const icons = getIcons(chainId);
  const { data: tokenAllowance } = useSWR(
    active && stakingTokenAddress && [active, chainId, stakingTokenAddress, "allowance", account, farmAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  let amount = parseValue(value, 18);
  const needApproval = farmAddress !== AddressZero && tokenAllowance && amount && amount.gt(tokenAllowance);

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return t`Enter an amount`;
    }
    if (maxAmount && amount.gt(maxAmount)) {
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
    if (isApproving) {
      return false;
    }
    if (isStaking) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return t`Approving ${stakingTokenSymbol}...`;
    }
    if (needApproval) {
      return t`Approve ${stakingTokenSymbol}`;
    }
    if (isStaking) {
      return t`Staking...`;
    }
    return t`Stake`;
  };

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <BuyInputSection
          topLeftLabel={t`Stake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={() => {
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
              className="mr-xs icon"
              height="22"
              src={icons[stakingTokenSymbol.toLowerCase()]}
              alt={stakingTokenSymbol}
            />
            {stakingTokenSymbol}
          </div>
        </BuyInputSection>

        <DelegateGMXAlertInfo />

        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function UnstakeModal(props) {
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
  let burnAmount;

  if (
    multiplierPointsAmount &&
    multiplierPointsAmount.gt(0) &&
    amount &&
    amount.gt(0) &&
    bonusGmxInFeeGmx &&
    bonusGmxInFeeGmx.gt(0)
  ) {
    burnAmount = multiplierPointsAmount.mul(amount).div(bonusGmxInFeeGmx);
  }

  let unstakeBonusLostPercentage;
  if (amount?.gt(0) && multiplierPointsAmount?.gt(0)) {
    unstakeBonusLostPercentage = amount
      ?.add(burnAmount)
      .mul(BASIS_POINTS_DIVISOR)
      ?.div(multiplierPointsAmount?.add(processedData.esGmxInStakedGmx)?.add(processedData.gmxInStakedGmx));
  }

  const getError = () => {
    if (!amount) {
      return t`Enter an amount`;
    }
    if (amount.gt(maxAmount)) {
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
          onClickTopRightLabel={() => setValue(formatAmountFree(maxAmount, 18, 18))}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          <div className="Stake-modal-icons">
            <img
              className="mr-xs icon"
              height="22"
              src={icons[unstakingTokenSymbol.toLowerCase()]}
              alt={unstakingTokenSymbol}
            />
            {unstakingTokenSymbol}
          </div>
        </BuyInputSection>
        {reservedAmount && reservedAmount.gt(0) && (
          <AlertInfo type="info">
            You have {formatAmount(reservedAmount, 18, 2, true)} tokens reserved for vesting.
          </AlertInfo>
        )}
        {burnAmount?.gt(0) && unstakeBonusLostPercentage?.gt(0) && amount && !amount.gt(maxAmount) && (
          <AlertInfo type="warning">
            <Trans>
              Unstaking will burn&nbsp;
              <ExternalLink className="display-inline" href="https://docs.gmx.io/docs/tokenomics/rewards">
                {formatAmount(burnAmount, 18, 4, true)} Multiplier Points
              </ExternalLink>
              <span>&nbsp;and {formatAmount(burnAmount, 18, 4, true)} voting pover.&nbsp;</span>
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

function VesterDepositModal(props) {
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

  let nextReserveAmount = reserveAmount;

  let nextDepositAmount = vestedAmount;
  if (amount) {
    nextDepositAmount = vestedAmount.add(amount);
  }

  let additionalReserveAmount = bigNumberify(0);
  if (amount && averageStakedAmount && maxVestableAmount && maxVestableAmount.gt(0) && nextReserveAmount) {
    nextReserveAmount = nextDepositAmount.mul(averageStakedAmount).div(maxVestableAmount);
    if (nextReserveAmount?.gt(reserveAmount)) {
      additionalReserveAmount = nextReserveAmount.sub(reserveAmount);
    }
  }

  const getError = () => {
    if (!amount || amount.eq(0)) {
      return t`Enter an amount`;
    }
    if (maxAmount && amount.gt(maxAmount)) {
      return t`Max amount exceeded`;
    }
    if (nextReserveAmount && nextReserveAmount?.gt(maxReserveAmount)) {
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
            onClickTopRightLabel={() => setValue(formatAmountFree(maxAmount, 18, 18))}
            inputValue={value}
            onInputValueChange={(e) => setValue(e.target.value)}
            showMaxButton={false}
          >
            <div className="Stake-modal-icons">
              <img className="mr-xs icon" height="22" src={icons.esgmx} alt="esGMX" />
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
            {reserveAmount && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Reserve Amount</Trans>
                </div>
                <div className="align-right">
                  <TooltipWithPortal
                    handle={`${formatAmount(
                      reserveAmount && reserveAmount.gte(additionalReserveAmount)
                        ? reserveAmount
                        : additionalReserveAmount,
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
                          {amount && nextReserveAmount.gt(maxReserveAmount) && (
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

function VesterWithdrawModal(props) {
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

function CompoundModal(props) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    active,
    account,
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

  const gmxAddress = getContract(chainId, "GMX");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { data: tokenAllowance } = useSWR(
    active && [active, chainId, gmxAddress, "allowance", account, stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const needApproval = shouldStakeGmx && tokenAllowance && totalVesterRewards && totalVesterRewards.gt(tokenAllowance);

  const isPrimaryEnabled = () => {
    return !isCompounding && !isApproving && !isCompounding;
  };

  const getPrimaryText = () => {
    if (isApproving) {
      return t`Approving GMX...`;
    }
    if (needApproval) {
      return t`Approve GMX`;
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
        {recommendStakeGmx.gt(0) && (
          <AlertInfo type="info">
            <Trans>
              You have reached the maximum Boost Percentage. Stake an additional{" "}
              {formatAmount(recommendStakeGmx, 18, 2, true)} GMX or esGMX to be able to stake your unstaked{" "}
              {formatAmount(accumulatedBnGMXAmount, 18, 4, true)} Multiplier Points.
            </Trans>
          </AlertInfo>
        )}
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
        <DelegateGMXAlertInfo className="StakeModal-delegate" />
        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimModal(props) {
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

  const isPrimaryEnabled = () => {
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

function AffiliateClaimModal(props) {
  const { isVisible, setIsVisible, signer, chainId, setPendingTxns, totalVesterRewards } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const isPrimaryEnabled = () => {
    if (totalVesterRewards.isZero()) {
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
  const [stakeModalMaxAmount, setStakeModalMaxAmount] = useState<BigNumber | undefined>(undefined);
  const [stakeValue, setStakeValue] = useState("");
  const [stakingTokenSymbol, setStakingTokenSymbol] = useState("");
  const [stakingTokenAddress, setStakingTokenAddress] = useState("");
  const [stakingFarmAddress, setStakingFarmAddress] = useState("");
  const [stakeMethodName, setStakeMethodName] = useState("");

  const [isUnstakeModalVisible, setIsUnstakeModalVisible] = useState(false);
  const [unstakeModalTitle, setUnstakeModalTitle] = useState("");
  const [unstakeModalMaxAmount, setUnstakeModalMaxAmount] = useState<BigNumber | undefined>(undefined);
  const [unstakeModalReservedAmount, setUnstakeModalReservedAmount] = useState<BigNumber | undefined>(undefined);
  const [unstakeValue, setUnstakeValue] = useState("");
  const [unstakingTokenSymbol, setUnstakingTokenSymbol] = useState("");
  const [unstakeMethodName, setUnstakeMethodName] = useState("");

  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState<BigNumber | undefined>();
  const [vesterDepositBalance, setVesterDepositBalance] = useState<BigNumber | undefined>();
  const [vesterDepositEscrowedBalance, setVesterDepositEscrowedBalance] = useState<BigNumber | undefined>();
  const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState<BigNumber | undefined>();
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState<
    BigNumber | undefined | string
  >("");
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState<BigNumber | undefined>();
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState<BigNumber | undefined>();
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState<BigNumber | undefined>();
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
  const { marketsTokensAPRData, marketsTokensIncentiveAprData } = useMarketTokensAPR(chainId);
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
    esGmxSupplyUsd = esGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  }

  let aum;
  if (aums && aums.length > 0) {
    aum = aums[0].add(aums[1]).div(2);
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
    maxBoostBasicPoints?.div(BASIS_POINTS_DIVISOR)
  );

  let hasMultiplierPoints = false;
  let multiplierPointsAmount;
  if (accumulatedBnGMXAmount && processedData?.bnGmxInFeeGmx) {
    multiplierPointsAmount = accumulatedBnGMXAmount.add(processedData.bnGmxInFeeGmx);
    if (multiplierPointsAmount.gt(0)) {
      hasMultiplierPoints = true;
    }
  }
  let totalRewardTokens;

  if (processedData && processedData.bnGmxInFeeGmx && processedData.bonusGmxInFeeGmx) {
    totalRewardTokens = processedData.bnGmxInFeeGmx.add(processedData.bonusGmxInFeeGmx);
  }

  let totalRewardAndLpTokens = totalRewardTokens ?? bigNumberify(0);
  if (processedData?.glpBalance) {
    totalRewardAndLpTokens = totalRewardAndLpTokens.add(processedData.glpBalance);
  }
  if (userTotalGmInfo?.balance?.gt(0)) {
    totalRewardAndLpTokens = totalRewardAndLpTokens.add(userTotalGmInfo.balance);
  }

  const bonusGmxInFeeGmx = processedData ? processedData.bonusGmxInFeeGmx : undefined;

  let stakedGmxSupplyUsd;
  if (!totalGmxStaked.isZero() && gmxPrice) {
    stakedGmxSupplyUsd = totalGmxStaked.mul(gmxPrice).div(expandDecimals(1, 18));
  }

  let totalSupplyUsd;
  if (totalGmxSupply && !totalGmxSupply.isZero() && gmxPrice) {
    totalSupplyUsd = totalGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  }

  let maxUnstakeableGmx = bigNumberify(0);
  if (
    totalRewardTokens &&
    vestingData &&
    vestingData.gmxVesterPairAmount &&
    multiplierPointsAmount &&
    processedData?.bonusGmxInFeeGmx
  ) {
    const availableTokens = totalRewardTokens.sub(vestingData.gmxVesterPairAmount);
    const stakedTokens = processedData.bonusGmxInFeeGmx;
    const divisor = multiplierPointsAmount.add(stakedTokens);
    if (divisor.gt(0)) {
      maxUnstakeableGmx = availableTokens.mul(stakedTokens).div(divisor);
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
    setStakingFarmAddress(AddressZero);
    setStakeMethodName("stakeEsGmx");
  };

  const showGmxVesterDepositModal = () => {
    if (!vestingData) return;

    let remainingVestableAmount = vestingData.gmxVester.maxVestableAmount.sub(vestingData.gmxVester.vestedAmount);
    if (processedData?.esGmxBalance?.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GMX Vault`);
    setVesterDepositStakeTokenLabel("staked GMX + esGMX + Multiplier Points");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositEscrowedBalance(vestingData.gmxVester.escrowedBalance);
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

    let remainingVestableAmount = vestingData.glpVester.maxVestableAmount.sub(vestingData.glpVester.vestedAmount);
    if (processedData?.esGmxBalance?.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GLP Vault`);
    setVesterDepositStakeTokenLabel("staked GLP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositEscrowedBalance(vestingData.glpVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData.glpVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.glpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.glpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.glpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData?.glpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(glpVesterAddress);
  };

  const showGmxVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.gmxVesterVestedAmount || vestingData.gmxVesterVestedAmount.eq(0)) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from GMX Vault`);
    setVesterWithdrawAddress(gmxVesterAddress);
  };

  const showGlpVesterWithdrawModal = () => {
    if (!vestingData || !vestingData.glpVesterVestedAmount || vestingData.glpVesterVestedAmount.eq(0)) {
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
      processedData?.gmxInStakedGmx &&
      vestingData &&
      vestingData.gmxVesterPairAmount.gt(0) &&
      maxUnstakeableGmx &&
      maxUnstakeableGmx.lt(processedData.gmxInStakedGmx)
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
      maxAmount &&
      vestingData &&
      vestingData.gmxVesterPairAmount.gt(0) &&
      maxUnstakeableGmx &&
      maxUnstakeableGmx.lt(maxAmount)
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

    let remainingVestableAmount = vestingData?.affiliateVester?.maxVestableAmount?.sub(
      vestingData?.affiliateVester?.vestedAmount
    );
    if (processedData?.esGmxBalance?.lt(remainingVestableAmount)) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`Affiliate Vault`);

    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositEscrowedBalance(vestingData?.affiliateVester.escrowedBalance);
    setVesterDepositVestedAmount(vestingData?.affiliateVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData?.affiliateVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData?.affiliateVester.averageStakedAmount);

    setVesterDepositReserveAmount(undefined);
    setVesterDepositValue("");

    setVesterDepositAddress(affiliateVesterAddress);
  }

  function showAffiliateVesterWithdrawModal() {
    if (!vestingData?.affiliateVesterVestedAmount?.gt(0)) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsAffiliateVesterWithdrawModalVisible(true);
  }

  function showAffiliateVesterClaimModal() {
    if (!vestingData?.affiliateVesterClaimable?.gt(0)) {
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
        {recommendStakeGmx.gt(0) ? (
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
  if (totalRewardAndLpTokens && totalRewardAndLpTokens.gt(0)) {
    let gmxAmountStr;
    if (processedData?.gmxInStakedGmx?.gt(0)) {
      gmxAmountStr = formatAmount(processedData.gmxInStakedGmx, 18, 2, true) + " GMX";
    }
    let esGmxAmountStr;
    if (processedData?.esGmxInStakedGmx?.gt(0)) {
      esGmxAmountStr = formatAmount(processedData.esGmxInStakedGmx, 18, 2, true) + " esGMX";
    }
    let mpAmountStr;
    if (processedData?.bnGmxInFeeGmx?.gt(0)) {
      mpAmountStr = formatAmount(processedData.bnGmxInFeeGmx, 18, 2, true) + " MP";
    }
    let glpStr;
    if (processedData?.glpBalance?.gt(0)) {
      glpStr = formatAmount(processedData.glpBalance, 18, 2, true) + " GLP";
    }
    let gmStr;
    if (userTotalGmInfo?.balance && userTotalGmInfo?.balance.gt(0)) {
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
        active={active}
        account={account}
        signer={signer}
        stakingTokenSymbol={stakingTokenSymbol}
        stakingTokenAddress={stakingTokenAddress}
        farmAddress={stakingFarmAddress}
        rewardRouterAddress={rewardRouterAddress}
        stakeMethodName={stakeMethodName}
        hasMultiplierPoints={hasMultiplierPoints}
        setPendingTxns={setPendingTxns}
        nativeTokenSymbol={nativeTokenSymbol}
        wrappedTokenSymbol={wrappedTokenSymbol}
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
        escrowedBalance={vesterDepositEscrowedBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={vesterDepositAverageStakedAmount}
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
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isCompoundModalVisible}
        multiplierPointsAmount={multiplierPointsAmount}
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
        active={active}
        account={account}
        setPendingTxns={setPendingTxns}
        isVisible={isClaimModalVisible}
        setIsVisible={setIsClaimModalVisible}
        rewardRouterAddress={rewardRouterAddress}
        totalVesterRewards={processedData?.totalVesterRewards}
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
              <div className="inline-items-center">
                <img className="mr-xs" alt="GMX" src={icons.gmx} height={20} />
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
                      className="nowrap"
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
              <div className="App-card-row">
                <div className="label">
                  <Trans>Voting Power</Trans>
                </div>
                <div>
                  {govTokenAmount ? (
                    <Tooltip
                      position="bottom-end"
                      className="nowrap"
                      handle={`${formatAmount(govTokenAmount, 18, 2, true)} GMX DAO`}
                      renderContent={() => (
                        <>
                          <DelegateGMXAlertInfo />
                          <Trans>Delegated to:</Trans>{" "}
                          {govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS ? (
                            <Trans>No delegate found</Trans>
                          ) : (
                            <ExternalLink href={getGmxDAODelegateLink(govTokenDelegatesAddress)}>
                              {govTokenDelegatesAddress === account
                                ? t`Myself`
                                : shortenAddressOrEns(govTokenDelegatesEns || govTokenDelegatesAddress, 13)}
                            </ExternalLink>
                          )}
                          <br />
                          <br />
                          <ExternalLink href={GMX_DAO_LINKS.DELEGATES}>Explore the list of delegates.</ExternalLink>
                        </>
                      )}
                    />
                  ) : (
                    "..."
                  )}
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
                  {!totalGmxStaked && "..."}
                  {totalGmxStaked && (
                    <Tooltip
                      position="bottom-end"
                      className="nowrap"
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
                  )}
                </div>
              </div>
              <div className="App-card-row">
                <div className="label">
                  <Trans>Total Supply</Trans>
                </div>
                {!totalGmxSupply && "..."}
                {totalGmxSupply && (
                  <div>
                    {formatAmount(totalGmxSupply, 18, 0, true)} GMX ($
                    {formatAmount(totalSupplyUsd, USD_DECIMALS, 0, true)})
                  </div>
                )}
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
                {active && (
                  <Button variant="secondary" to={GMX_DAO_LINKS.VOTING_POWER}>
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
                <div className="inline-items-center">
                  <img className="mr-xs" alt="GLP" src={icons.glp} height={20} />
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

                            {processedData?.glpAprForEsGmx?.gt(0) && (
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
              <div className="inline-items-center">
                <img className="mr-xs" alt="GLP" src={icons.esgmx} height={20} />
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
            marketsTokensAPRData={marketsTokensAPRData}
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
                <div className="inline-items-center">
                  <img className="mr-xs" alt="GMX" src={icons.gmx} height={20} />
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
                <div className="inline-items-center">
                  <img className="mr-xs" alt="GLP" src={icons.glp} height={20} />
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
            {vestingData?.affiliateVesterMaxVestableAmount?.gt(0) && (
              <div className="App-card StakeV2-gmx-card">
                <div className="App-card-title">
                  <div className="inline-items-center">
                    <img className="mr-xs" alt="GLP" src={icons.gmx} height={20} />
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
            )}
          </div>
        </div>
      </div>
      <div className="mt-sm">
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

function DelegateGMXAlertInfo({ className }: { className?: string }) {
  const { chainId } = useChainId();
  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);

  return govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount.gt(0) ? (
    <AlertInfo type="info" className={cx("DelegateGMXAlertInfo", className)}>
      <Trans>
        <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
          Delegate your {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO undelegated
        </ExternalLink>
        <span>&nbsp;voting power.</span>
      </Trans>
    </AlertInfo>
  ) : null;
}
