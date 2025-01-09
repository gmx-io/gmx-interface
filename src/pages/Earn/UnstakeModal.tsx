import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";

import { ARBITRUM } from "config/chains";
import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { getIcons } from "config/icons";
import { bigMath } from "lib/bigmath";
import { callContract } from "lib/contracts";
import { ProcessedData } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";

import RewardRouter from "sdk/abis/RewardRouter.json";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";

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

  const amount = useMemo(() => parseValue(value, 18), [value]);

  const unstakeBonusLostPercentage = useMemo(() => {
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

  const votingPowerBurnAmount = amount;

  const error = useMemo(() => {
    if (amount === undefined || amount === 0n) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
    return undefined;
  }, [amount, maxAmount]);

  const isPrimaryEnabled = !error && !isUnstaking;

  const primaryText = useMemo(() => {
    if (error) {
      return error;
    }
    if (isUnstaking) {
      return t`Unstaking...`;
    }
    return t`Unstake`;
  }, [error, isUnstaking]);

  const onClickPrimary = useCallback(() => {
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
  }, [chainId, rewardRouterAddress, unstakeMethodName, amount, setPendingTxns, setIsVisible, signer]);

  const onClickMaxButton = useCallback(() => {
    if (maxAmount === undefined) return;
    setValue(formatAmountFree(maxAmount, 18, 18));
  }, [maxAmount, setValue]);

  return (
    <div className="StakeModal">
      <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
        <BuyInputSection
          topLeftLabel={t`Unstake`}
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
          <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
            {primaryText}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
