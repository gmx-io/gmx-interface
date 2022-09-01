import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";
import { useCopyToClipboard } from "react-use";

import { getContract } from "../../config/Addresses";
import { callContract } from "../../domain/legacy";
import { useChainId, helperToast } from "../../lib/legacy";

import Modal from "../../components/Modal/Modal";
import Footer from "../../components/Footer/Footer";

import RewardRouter from "../../abis/RewardRouter.json";

import "./CompleteAccountTransfer.css";

import { Trans, t } from "@lingui/macro";

export default function CompleteAccountTransfer(props) {
  const [, copyToClipboard] = useCopyToClipboard();
  const { sender, receiver } = useParams();
  const { setPendingTxns } = props;
  const { library, account } = useWeb3React();
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);

  const { chainId } = useChainId();

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

    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

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
              <button className="App-cta Exchange-swap-button" disabled={!isPrimaryEnabled()} onClick={onClickPrimary}>
                {getPrimaryText()}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
