import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import React, { useState } from "react";
import RewardRouter from "sdk/abis/RewardRouter.json";
import { ARBITRUM } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIcons } from "config/icons";
import { SetPendingTransactions } from "domain/legacy";
import { bigMath } from "lib/bigmath";
import { callContract } from "lib/contracts";
import { ProcessedData } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";

export function UnstakeModal(props: {
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
  reservedAmount: bigint | undefined;
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
    unstakingTokenSymbol,
    rewardRouterAddress,
    unstakeMethodName,
    reservedAmount,
    setPendingTxns,
    processedData,
  } = props;
  const [isUnstaking, setIsUnstaking] = useState(false);
  const icons = getIcons(chainId);

  let amount = parseValue(value, 18);

  let unstakeBonusLostPercentage: undefined | bigint = undefined;
  if (
    processedData &&
    amount !== undefined &&
    amount > 0 &&
    processedData.esGmxInStakedGmx !== undefined &&
    processedData.gmxInStakedGmx !== undefined
  ) {
    const divisor = processedData.esGmxInStakedGmx + processedData.gmxInStakedGmx;
    if (divisor !== 0n) {
      unstakeBonusLostPercentage = bigMath.mulDiv(amount, BASIS_POINTS_DIVISOR_BIGINT, divisor);
    }
  }

  const votingPowerBurnAmount = amount;

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
              src={icons?.[unstakingTokenSymbol.toLowerCase()]}
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
        {unstakeBonusLostPercentage !== undefined &&
          unstakeBonusLostPercentage > 0 &&
          amount !== undefined &&
          maxAmount !== undefined &&
          amount <= maxAmount && (
            <AlertInfo type="warning">
              <Trans>
                {chainId === ARBITRUM ? (
                  <span>
                    Unstaking will burn {formatAmount(votingPowerBurnAmount, 18, 2, true)} voting power.&nbsp;
                  </span>
                ) : null}
                <span>
                  You will earn {formatAmount(unstakeBonusLostPercentage, 2, 2)}% less rewards with this action.
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
