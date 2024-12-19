import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import React, { useState } from "react";
import Vester from "sdk/abis/Vester.json";
import { SetPendingTransactions } from "domain/legacy";
import { callContract } from "lib/contracts";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";

export function VesterWithdrawModal(props: {
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
