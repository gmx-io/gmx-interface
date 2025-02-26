import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";

import { getIcons } from "config/icons";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import { callContract } from "lib/contracts";
import { getPageTitle } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { bigMath } from "sdk/utils/bigmath";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import SEO from "components/Common/SEO";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import Vester from "sdk/abis/Vester.json";

export function VesterDepositModal(props: {
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

  const amount = useMemo(() => parseValue(value, 18), [value]);

  const { nextReserveAmount, nextDepositAmount, additionalReserveAmount } = useMemo(() => {
    let nextReserveAmount = reserveAmount;
    let nextDepositAmount = vestedAmount;
    let additionalReserveAmount = 0n;

    if (amount !== undefined && vestedAmount !== undefined) {
      nextDepositAmount = vestedAmount + amount;
    }

    if (
      amount !== undefined &&
      nextDepositAmount !== undefined &&
      averageStakedAmount !== undefined &&
      maxVestableAmount !== undefined &&
      maxVestableAmount > 0n &&
      nextReserveAmount !== undefined
    ) {
      nextReserveAmount = bigMath.mulDiv(nextDepositAmount, averageStakedAmount, maxVestableAmount);
      if (reserveAmount !== undefined && nextReserveAmount > reserveAmount) {
        additionalReserveAmount = nextReserveAmount - reserveAmount;
      }
    }

    return { nextReserveAmount, nextDepositAmount, additionalReserveAmount };
  }, [amount, vestedAmount, averageStakedAmount, maxVestableAmount, reserveAmount]);

  const error = useMemo(() => {
    if (amount === undefined) {
      return t`Enter an amount`;
    }
    if (maxAmount !== undefined && amount > maxAmount) {
      return t`Max amount exceeded`;
    }
    if (maxReserveAmount !== undefined && nextReserveAmount !== undefined && nextReserveAmount > maxReserveAmount) {
      return t`Insufficient staked tokens`;
    }
    return undefined;
  }, [amount, maxAmount, maxReserveAmount, nextReserveAmount]);

  const isPrimaryEnabled = !error && !isDepositing;

  const primaryText = useMemo(() => {
    if (error) {
      return error;
    }
    if (isDepositing) {
      return t`Depositing...`;
    }
    return t`Deposit`;
  }, [error, isDepositing]);

  const onClickPrimary = useCallback(() => {
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
  }, [chainId, vesterAddress, amount, setPendingTxns, setIsVisible, signer]);

  const onClickMaxButton = useCallback(() => {
    if (maxAmount === undefined) return;
    setValue(formatAmountFree(maxAmount, 18, 18));
  }, [maxAmount, setValue]);

  return (
    <SEO title={getPageTitle(t`Earn`)}>
      <div className="StakeModal">
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title} className="non-scrollable">
          <div className="mb-12">
            <BuyInputSection
              topLeftLabel={t`Deposit`}
              topRightLabel={t`Max`}
              topRightValue={formatAmount(maxAmount, 18, 4, true)}
              onClickMax={amount !== maxAmount && maxAmount !== 0n ? onClickMaxButton : undefined}
              inputValue={value}
              onInputValueChange={(e) => setValue(e.target.value)}
            >
              <div className="Stake-modal-icons">
                <img className="icon mr-5 h-22" height="22" src={icons?.esgmx} alt="esGMX" />
                esGMX
              </div>
            </BuyInputSection>
          </div>

          <div className="mb-8 flex flex-col gap-14">
            <SyntheticsInfoRow label={t`Wallet`} value={<>{formatAmount(balance, 18, 2, true)} esGMX</>} />
            <SyntheticsInfoRow
              label={t`Vault Capacity`}
              value={
                <TooltipWithPortal
                  handle={`${formatAmount(nextDepositAmount, 18, 2, true)} / ${formatAmount(
                    maxVestableAmount,
                    18,
                    2,
                    true
                  )}`}
                  position="top-end"
                  content={
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
                  }
                />
              }
            />
            {reserveAmount !== undefined && (
              <SyntheticsInfoRow
                label={t`Reserve Amount`}
                value={
                  <TooltipWithPortal
                    handle={`${formatAmount(
                      nextReserveAmount,
                      18,
                      2,
                      true
                    )} / ${formatAmount(maxReserveAmount, 18, 2, true)}`}
                    position="top-end"
                    content={
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
                    }
                  />
                }
              />
            )}
          </div>
          <div className="Exchange-swap-button-container">
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
              {primaryText}
            </Button>
          </div>
        </Modal>
      </div>
    </SEO>
  );
}
