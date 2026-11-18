import { t, Trans } from "@lingui/macro";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { isAddress } from "viem";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getRewardRouterContract } from "domain/stake/rewardRouter";
import { useOrphanTransferState } from "domain/vesting/useOrphanTransferState";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { getAccountTransfersPausedMessage } from "components/Errors/getContractErrorMessage";
import { showStakingErrorToast } from "components/Errors/stakingToasts";
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

  const orphanTransferState = useOrphanTransferState({
    chainId,
    sender: isSenderAndReceiverValid ? sender : undefined,
    receiver: isSenderAndReceiverValid ? receiver : undefined,
  });
  const isTransferPaused = orphanTransferState?.isTransferPaused === true;
  const isTransferStateLoading = orphanTransferState?.isReceiverFresh === undefined;

  const getError = () => {
    if (!account) {
      return t`Wallet not connected`;
    }
    if (!isCorrectAccount) {
      return t`Incorrect account`;
    }
    // acceptTransfer runs the sender and receiver checks again, so a later Legacy vault deposit blocks it
    if (orphanTransferState?.isSenderFrozen) {
      return t`Sender account is restricted`;
    }
    if (orphanTransferState?.hasSenderOpenSession) {
      return t`Sender hasn't withdrawn from the Legacy vault`;
    }
    if (orphanTransferState?.isReceiverFrozen) {
      return t`Receiver account is restricted`;
    }
    if (orphanTransferState?.isReceiverFresh === false) {
      return t`Receiver has used the Legacy vault`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isConfirming || isTransferStateLoading || isTransferPaused) {
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

  const onClickPrimary = async () => {
    setIsConfirming(true);

    try {
      await callContract(chainId, getRewardRouterContract(chainId, signer), "acceptTransfer", [sender], {
        sentMsg: t`Transfer submitted`,
        failMsg: t`Transfer failed`,
        setPendingTxns,
        hideErrorMsg: true,
      });
      setIsTransferSubmittedModalVisible(true);
    } catch (error) {
      showStakingErrorToast({ chainId, error, failMsg: t`Transfer failed`, action: "transfer" });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isSenderAndReceiverValid) {
    return (
      <AppPageLayout title={t`Complete account transfer`}>
        <PageTitle title={t`Complete account transfer`} />

        <ColorfulBanner color="red">
          <Trans>Invalid transfer addresses. Check the URL.</Trans>
        </ColorfulBanner>
      </AppPageLayout>
    );
  }

  return (
    <AppPageLayout title={t`Complete account transfer`}>
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
              <Trans>Switch to account {receiver} to complete this transfer.</Trans>
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
                {"."}
              </Trans>
              <br />
              <br />
            </div>
          )
        }
      />

      {isTransferPaused && (
        <ColorfulBanner color="yellow" className="mt-16">
          {getAccountTransfersPausedMessage()}
        </ColorfulBanner>
      )}

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
