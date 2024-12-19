import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import React, { useState } from "react";
import Vester from "sdk/abis/Vester.json";
import { getIcons } from "config/icons";
import { SetPendingTransactions } from "domain/legacy";
import { bigMath } from "lib/bigmath";
import { callContract } from "lib/contracts";
import { getPageTitle } from "lib/legacy";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import Button from "components/Button/Button";
import SEO from "components/Common/SEO";
import Modal from "components/Modal/Modal";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

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
              <img className="icon mr-5 h-22" height="22" src={icons?.esgmx} alt="esGMX" />
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
