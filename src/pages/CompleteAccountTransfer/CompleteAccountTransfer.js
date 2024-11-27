import React, { useContext, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useCopyToClipboard } from "react-use";

import { getContract } from "config/contracts";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import RewardRouter from "abis/RewardRouter.json";

import "./CompleteAccountTransfer.css";

import { Trans, t } from "@lingui/macro";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { useDynamicChainId } from "lib/chains";
import Button from "components/Button/Button";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

export default function CompleteAccountTransfer(props) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { sender, receiver } = useParams();
  const { setPendingTxns } = props;
  const dynamicContext = useContext(DynamicWalletContext);

  const account = dynamicContext.account;
  const signer = dynamicContext.signer;

  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);

  const { chainId } = useDynamicChainId();

  const [isConfirming, setIsConfirming] = useState(false);
  const isCorrectAccount = (account || "").toString().toLowerCase() === (receiver || "").toString().toLowerCase();

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const getError = () => {
    if (!account) {
      return t`Wallet is not connected`;
    }
    if (!isCorrectAccount) {
      return t`Incorrect Account`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isConfirming) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    return t`Complete Transfer`;
  };

  const onClickPrimary = () => {
    setIsConfirming(true);

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);

    callContract(chainId, contract, "acceptTransfer", [sender], {
      sentMsg: t`Transfer submitted!`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsConfirming(false);
      });
  };

  return (
    <div className="CompleteAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label="Transfer Completed"
      >
        <Trans>Your transfer has been completed.</Trans>
        <br />
        <br />
        <Link className="App-cta" to="/earn">
          <Trans>Continue</Trans>
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">
          <Trans>Complete Account Transfer</Trans>
        </div>
        {!isCorrectAccount && (
          <div className="Page-description">
            <Trans>To complete the transfer, you must switch your connected account to {receiver}.</Trans>
            <br />
            <br />
            <Trans>
              You will need to be on this page to accept the transfer,{" "}
              <span
                onClick={() => {
                  copyToClipboard(window.location.href);
                  helperToast.success("Link copied to your clipboard");
                }}
              >
                click here
              </span>{" "}
              to copy the link to this page if needed.
            </Trans>
            <br />
            <br />
          </div>
        )}
        {isCorrectAccount && (
          <div className="Page-description">
            <Trans>You have a pending transfer from {sender}.</Trans>
            <br />
          </div>
        )}
      </div>
      {isCorrectAccount && (
        <div className="Page-content">
          <div className="input-form">
            <div className="input-row">
              <Button
                variant="primary-action"
                className="w-100"
                disabled={!isPrimaryEnabled()}
                onClick={onClickPrimary}
              >
                {getPrimaryText()}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
