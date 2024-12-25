import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ZeroAddress, ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIcons } from "config/icons";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { SetPendingTransactions } from "domain/legacy";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { callContract } from "lib/contracts";
import { ProcessedData } from "lib/legacy";
import { formatAmount, formatAmountFree, limitDecimals, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { GMX_DAO_LINKS } from "./constants";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Modal from "components/Modal/Modal";

import RewardRouter from "sdk/abis/RewardRouter.json";

export function StakeModal(props: {
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
  processedData: ProcessedData | undefined;
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
    processedData,
  } = props;

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken = useMemo(
    () =>
      chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0,
    [chainId, govTokenDelegatesAddress, govTokenAmount]
  );

  const [isStaking, setIsStaking] = useState(false);
  const isMetamaskMobile = useIsMetamaskMobile();
  const [isApproving, setIsApproving] = useState(false);
  const icons = getIcons(chainId);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: farmAddress,
    tokenAddresses: [stakingTokenAddress].filter(Boolean),
  });
  const tokenAllowance = tokensAllowanceData?.[stakingTokenAddress];

  const amount = useMemo(() => parseValue(value, 18), [value]);

  const needApproval =
    farmAddress !== ZeroAddress && tokenAllowance !== undefined && amount !== undefined && amount > tokenAllowance;

  const stakeBonusPercentage = useMemo(() => {
    if (
      processedData &&
      amount !== undefined &&
      amount > 0 &&
      processedData.esGmxInStakedGmx !== undefined &&
      processedData.gmxInStakedGmx !== undefined
    ) {
      const divisor = processedData.esGmxInStakedGmx + processedData.gmxInStakedGmx;
      if (divisor !== 0n) {
        return bigMath.mulDiv(amount, BASIS_POINTS_DIVISOR_BIGINT, divisor);
      }
    }
    return undefined;
  }, [amount, processedData]);

  const error = useMemo(() => {
    if (amount === undefined || amount === 0n) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
    return undefined;
  }, [amount, maxAmount]);

  const isPrimaryEnabled = useMemo(
    () => !error && !isApproving && !needApproval && !isStaking && !isUndelegatedGovToken,
    [error, isApproving, needApproval, isStaking, isUndelegatedGovToken]
  );

  const primaryText = useMemo(() => {
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
  }, [error, isApproving, needApproval, isStaking, stakingTokenSymbol]);

  const onClickPrimary = useCallback(() => {
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
  }, [
    needApproval,
    signer,
    stakingTokenAddress,
    farmAddress,
    chainId,
    rewardRouterAddress,
    stakeMethodName,
    amount,
    setPendingTxns,
    setIsVisible,
  ]);

  const onClickMaxButton = useCallback(() => {
    if (maxAmount === undefined) return;
    const formattedMaxAmount = formatAmountFree(maxAmount, 18, 18);
    const finalMaxAmount = isMetamaskMobile
      ? limitDecimals(formattedMaxAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedMaxAmount;
    setValue(finalMaxAmount);
  }, [maxAmount, isMetamaskMobile, setValue]);

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <BuyInputSection
          topLeftLabel={t`Stake`}
          topRightLabel={t`Max`}
          topRightValue={formatAmount(maxAmount, 18, 4, true)}
          onClickTopRightLabel={onClickMaxButton}
          inputValue={value}
          onInputValueChange={(e) => setValue(e.target.value)}
          showMaxButton={false}
        >
          <div className="Stake-modal-icons">
            <img
              className="icon mr-5 h-22"
              height="22"
              src={icons?.[stakingTokenSymbol.toLowerCase()]}
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

        {stakeBonusPercentage !== undefined &&
          stakeBonusPercentage > 0 &&
          amount !== undefined &&
          maxAmount !== undefined &&
          amount <= maxAmount && (
            <AlertInfo type="info">
              <Trans>You will earn {formatAmount(stakeBonusPercentage, 2, 2)}% more rewards with this action.</Trans>
            </AlertInfo>
          )}

        {isUndelegatedGovToken ? (
          <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
            <Trans>
              <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
                Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
              </ExternalLink>{" "}
              voting power before staking.
            </Trans>
          </AlertInfo>
        ) : null}

        <div className="Exchange-swap-button-container">
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
            {primaryText}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
