import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";


import { getContract } from "config/contracts";

import Modal from "components/Modal/Modal";
import Footer from "components/Footer/Footer";

import Token from "abis/Token.json";
import Vester from "abis/Vester.json";
import RewardTracker from "abis/RewardTracker.json";
import RewardRouter from "abis/RewardRouter.json";

import { FiX, FiCheck } from "react-icons/fi";
import { Trans, t } from "@lingui/macro";

import "./BeginAccountTransfer.css";
import { callContract,  dynamicContractFetcher } from "lib/contracts";
import { approveTokens } from "domain/tokens";
import {  useDynamicChainId } from "lib/chains";
import Button from "components/Button/Button";
import { DynamicWalletContext } from "store/dynamicwalletprovider";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FiCheck className="ValidationRow-icon" />}
        {!isValid && <FiX className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer(props) {
  const { setPendingTxns } = props;
  const dynamicContext = useContext(DynamicWalletContext);
  const active = dynamicContext.active;
  const account = dynamicContext.account;
  const signer = dynamicContext.signer;
  //const { library } = useWeb3React();
  const { chainId } = useDynamicChainId();

  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  let parsedReceiver = ethers.constants.AddressZero;
  if (ethers.utils.isAddress(receiver)) {
    parsedReceiver = receiver;
  }

  const gmxAddress = getContract(chainId, "GMX");
  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const glpVesterAddress = getContract(chainId, "GlpVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: gmxVesterBalance } = useSWR(active && [active, chainId, gmxVesterAddress, "balanceOf", account], {
    fetcher: dynamicContractFetcher(signer, Token),
  });

  const { data: glpVesterBalance } = useSWR(active && [active, chainId, glpVesterAddress, "balanceOf", account], {
    fetcher: dynamicContractFetcher(signer, Token),
  });

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const { data: cumulativeGmxRewards } = useSWR(
    [active, chainId, stakedGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: dynamicContractFetcher(signer, RewardTracker),
    }
  );

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const { data: cumulativeGlpRewards } = useSWR(
    [active, chainId, stakedGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: dynamicContractFetcher(signer, RewardTracker),
    }
  );

  const { data: transferredCumulativeGmxRewards } = useSWR(
    [active, chainId, gmxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: dynamicContractFetcher(signer, Vester),
    }
  );

  const { data: transferredCumulativeGlpRewards } = useSWR(
    [active, chainId, glpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: dynamicContractFetcher(signer, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR(
    active && [active, chainId, rewardRouterAddress, "pendingReceivers", account],
    {
      fetcher: dynamicContractFetcher(signer, RewardRouter),
    }
  );

  const { data: gmxAllowance } = useSWR(
    active && [active, chainId, gmxAddress, "allowance", account, stakedGmxTrackerAddress],
    {
      fetcher: dynamicContractFetcher(signer, Token),
    }
  );

  const { data: gmxStaked } = useSWR(
    active && [active, chainId, stakedGmxTrackerAddress, "depositBalances", account, gmxAddress],
    {
      fetcher: dynamicContractFetcher(signer, RewardTracker),
    }
  );

  const needApproval = gmxAllowance && gmxStaked && gmxStaked.gt(gmxAllowance);

  const hasVestedGmx = gmxVesterBalance && gmxVesterBalance.gt(0);
  const hasVestedGlp = glpVesterBalance && glpVesterBalance.gt(0);
  const hasStakedGmx =
    (cumulativeGmxRewards && cumulativeGmxRewards.gt(0)) ||
    (transferredCumulativeGmxRewards && transferredCumulativeGmxRewards.gt(0));
  const hasStakedGlp =
    (cumulativeGlpRewards && cumulativeGlpRewards.gt(0)) ||
    (transferredCumulativeGlpRewards && transferredCumulativeGlpRewards.gt(0));
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.constants.AddressZero;

  const getError = () => {
    if (!account) {
      return t`Wallet is not connected`;
    }
    if (hasVestedGmx) {
      return t`Vested TMX not withdrawn`;
    }
    if (hasVestedGlp) {
      return t`Vested TLP not withdrawn`;
    }
    if (!receiver || receiver.length === 0) {
      return t`Enter Receiver Address`;
    }
    if (!ethers.utils.isAddress(receiver)) {
      return t`Invalid Receiver Address`;
    }
    if (hasStakedGmx || hasStakedGlp) {
      return t`Invalid Receiver`;
    }
    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return t`Self-transfer not supported`;
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return t`Transfer already initiated`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isTransferring) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (needApproval) {
      return t`Approve TMX`;
    }
    if (isApproving) {
      return t`Approving...`;
    }
    if (isTransferring) {
      return t`Transferring`;
    }

    return t`Begin Transfer`;
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: t`Transfer submitted!`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
  };

  const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
  const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

  return (
    <div className="BeginAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label={t`Transfer Submitted`}
      >
        <Trans>Your transfer has been initiated.</Trans>
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          <Trans>Continue</Trans>
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">
          <Trans>Transfer Account</Trans>
        </div>
        <div className="Page-description">
          <Trans>
            Please only use this for full account transfers.
            <br />
            This will transfer all your TMX, esTMX, TLP and Multiplier Points to your new account.
            <br />
            Transfers are only supported if the receiving account has not staked TMX or TLP tokens before.
            <br />
            Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
          </Trans>
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            <Trans>
              You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
            </Trans>
          </div>
        )}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">
              <Trans>Receiver Address</Trans>
            </label>
            <div>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="text-input"
              />
            </div>
          </div>
          <div className="BeginAccountTransfer-validations">
            <ValidationRow isValid={!hasVestedGmx}>
              <Trans>Sender has withdrawn all tokens from TMX Vesting Vault</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasVestedGlp}>
              <Trans>Sender has withdrawn all tokens from TLP Vesting Vault</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasStakedGmx}>
              <Trans>Receiver has not staked TMX tokens before</Trans>
            </ValidationRow>
            <ValidationRow isValid={!hasStakedGlp}>
              <Trans>Receiver has not staked TLP tokens before</Trans>
            </ValidationRow>
          </div>
          <div className="input-row">
            <Button
              variant="primary-action"
              className="w-100"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
