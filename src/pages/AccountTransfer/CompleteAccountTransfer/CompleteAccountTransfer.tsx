import { t, Trans } from "@lingui/macro";;
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
      return t`Wallet not connected`;
    }
    if (!isCorrectAccount) {
      return t`Incorrect account`;
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
    return t`Complete transfer`;
  };

  const onClickPrimary = () => {
    setIsConfirming(true);

    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, "acceptTransfer", [sender], {
      sentMsg: t`Transfer submitted`,
      failMsg: t`Transfer failed`,
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
      <AppPageLayout>
        <PageTitle title={t`Complete account transfer`} />

        <ColorfulBanner color="red">
          <Trans>Invalid transfer addresses. Check the URL.</Trans>
        </ColorfulBanner>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout>
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label={t`Transfer completed`}
      >
        <Trans>Your transfer is complete</Trans>
        <br />
        <br />
        <Link className="App-cta" to="/earn">
          <Trans>Continue</Trans>
        </Link>
      </Modal>
      <PageTitle
        title={t`Complete account transfer`}
        subtitle={
          isCorrectAccount ? (
            <div className="hyphens-auto">
              <Trans>Pending transfer from {sender}</Trans>
              <br />
            </div>
          ) : (
            <div>
              <Trans>Switch to account {receiver} to complete this transfer</Trans>
              <br />
              <br />
              <Trans>
                You must be on this page to accept the transfer.{" "}
                <span
                  onClick={() => {
                    copyToClipboard(window.location.href);
                    helperToast.success(t`Link copied`);
                  }}
                >
                  Copy link
                </span>
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
