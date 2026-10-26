import { t, Trans } from "@lingui/macro";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import useSWR from "swr";
import { isAddress } from "viem";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getIsRewardRouterChanged, getRewardRouterContract } from "domain/stake/rewardRouter";
import { useRewardRouter } from "domain/stake/useRewardRouter";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { getAccountTransfersPausedMessage } from "components/Errors/getContractErrorMessage";
import { showRewardRouterChangedToast, showStakingErrorToast } from "components/Errors/stakingToasts";
import Modal from "components/Modal/Modal";
import PageTitle from "components/PageTitle/PageTitle";

export default function CompleteAccountTransfer() {
  const [, copyToClipboard] = useCopyToClipboard();
  const { sender, receiver } = useParams<{ sender: string | undefined; receiver: string | undefined }>();
  const isSenderAndReceiverValid =
    sender && receiver && isAddress(sender, { strict: false }) && isAddress(receiver, { strict: false });
  const { setPendingTxns } = usePendingTxns();
  const { active, signer, account } = useWallet();
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);

  const { chainId } = useChainId();

  const [isConfirming, setIsConfirming] = useState(false);
  const isCorrectAccount = (account || "").toString().toLowerCase() === (receiver || "").toString().toLowerCase();

  const { rewardRouter, mutateRewardRouter } = useRewardRouter(chainId);

  const { data: designatedVestersLength } = useSWR<bigint>(
    rewardRouter?.version === "v3" && [active, chainId, rewardRouter.address, "designatedVestersLength"],
    {
      fetcher: contractFetcher<bigint>(signer, "RewardRouterV3"),
    }
  );
  const isTransferPaused = rewardRouter?.version === "v3" && designatedVestersLength === 0n;
  const isRewardRouterLoading =
    rewardRouter === undefined || (rewardRouter.version === "v3" && designatedVestersLength === undefined);

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
    if (isConfirming || isRewardRouterLoading || isTransferPaused) {
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
    if (!rewardRouter) {
      return;
    }

    setIsConfirming(true);

    try {
      if (await getIsRewardRouterChanged(chainId, rewardRouter)) {
        mutateRewardRouter();
        showRewardRouterChangedToast();
        return;
      }

      await callContract(chainId, getRewardRouterContract(rewardRouter, signer), "acceptTransfer", [sender], {
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
