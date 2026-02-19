import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { isAddress } from "viem";

import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import Modal from "components/Modal/Modal";
import PageTitle from "components/PageTitle/PageTitle";

export default function CompleteAccountTransfer() {
  const [, copyToClipboard] = useCopyToClipboard();
  const { sender, receiver } = useParams<{ sender: string | undefined; receiver: string | undefined }>();
  const isSenderAndReceiverValid =
    sender && receiver && isAddress(sender, { strict: false }) && isAddress(receiver, { strict: false });
  const { setPendingTxns } = usePendingTxns();
  const { signer, account } = useWallet();
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

    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, "acceptTransfer", [sender], {
      sentMsg: t`Transfer submitted.`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(() => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsConfirming(false);
      });
  };

  if (!isSenderAndReceiverValid) {
    return (
      <AppPageLayout title={t`Complete Account Transfer`}>
        <PageTitle title={t`Complete Account Transfer`} />

        <ColorfulBanner color="red">
          <Trans>Invalid Transfer Addresses: Please check the url.</Trans>
        </ColorfulBanner>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout title={t`Complete Account Transfer`}>
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
      <PageTitle
        title={t`Complete Account Transfer`}
        subtitle={
          isCorrectAccount ? (
            <div className="hyphens-auto">
              <Trans>You have a pending transfer from {sender}.</Trans>
              <br />
            </div>
          ) : (
            <div>
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
          )
        }
      />

      {isCorrectAccount && (
        <div className="mt-16">
          <div className="input-form">
            <div className="input-row">
              <Button
                variant="primary-action"
                className="w-full"
                disabled={!isPrimaryEnabled()}
                onClick={onClickPrimary}
              >
                {getPrimaryText()}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppPageLayout>
  );
}
