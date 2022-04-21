import React, { useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { ethers } from "ethers";
import { useWeb3React } from "@web3-react/core";

import { getContract } from "../../Addresses";
import { callContract } from "../../Api";

import Modal from "../../components/Modal/Modal";
import Footer from "../../Footer";

import Token from "../../abis/Token.json";
import Vester from "../../abis/Vester.json";
import RewardTracker from "../../abis/RewardTracker.json";
import RewardRouter from "../../abis/RewardRouter.json";

import { FaCheck, FaTimes } from "react-icons/fa";

import { fetcher, approveTokens, useChainId } from "../../Helpers";

import "./BeginAccountTransfer.css";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FaCheck className="ValidationRow-icon" />}
        {!isValid && <FaTimes className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer(props) {
  const { setPendingTxns } = props;
  const { active, library, account } = useWeb3React();
  const { chainId } = useChainId();

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

  const { data: gmxVesterBalance } = useSWR([active, chainId, gmxVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const { data: glpVesterBalance } = useSWR([active, chainId, glpVesterAddress, "balanceOf", account], {
    fetcher: fetcher(library, Token),
  });

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const { data: cumulativeGmxRewards } = useSWR(
    [active, chainId, stakedGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const { data: cumulativeGlpRewards } = useSWR(
    [active, chainId, stakedGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, RewardTracker),
    }
  );

  const { data: transferredCumulativeGmxRewards } = useSWR(
    [active, chainId, gmxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: transferredCumulativeGlpRewards } = useSWR(
    [active, chainId, glpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: fetcher(library, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR([active, chainId, rewardRouterAddress, "pendingReceivers", account], {
    fetcher: fetcher(library, RewardRouter),
  });

  const { data: gmxAllowance } = useSWR([active, chainId, gmxAddress, "allowance", account, stakedGmxTrackerAddress], {
    fetcher: fetcher(library, Token),
  });

  const { data: gmxStaked } = useSWR(
    [active, chainId, stakedGmxTrackerAddress, "depositBalances", account, gmxAddress],
    {
      fetcher: fetcher(library, RewardTracker),
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
      return "Wallet is not connected";
    }
    if (hasVestedGmx) {
      return "Vested GMX not withdrawn";
    }
    if (hasVestedGlp) {
      return "Vested GLP not withdrawn";
    }
    if (!receiver || receiver.length === 0) {
      return "Enter Receiver Address";
    }
    if (!ethers.utils.isAddress(receiver)) {
      return "Invalid Receiver Address";
    }
    if (hasStakedGmx || hasStakedGlp) {
      return "Invalid Receiver";
    }
    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return "Self-transfer not supported";
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return "Transfer already initiated";
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
      return "Approve GMX";
    }
    if (isApproving) {
      return "Approving...";
    }
    if (isTransferring) {
      return "Transferring";
    }

    return "Begin Transfer";
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: "Transfer submitted!",
      failMsg: "Transfer failed.",
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
        label="Transfer Submitted"
      >
        Your transfer has been initiated.
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          Continue
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">Transfer Account</div>
        <div className="Page-description">
          Please only use this for full account transfers.
          <br />
          This will transfer all your GMX, esGMX, GLP and Multiplier Points to your new account.
          <br />
          Transfers are only supported if the receiving account has not staked GMX or GLP tokens before.
          <br />
          Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
          </div>
        )}
      </div>
      <div className="Page-content">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">Receiver Address</label>
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
              Sender has withdrawn all tokens from GMX Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasVestedGlp}>
              Sender has withdrawn all tokens from GLP Vesting Vault
            </ValidationRow>
            <ValidationRow isValid={!hasStakedGmx}>Receiver has not staked GMX tokens before</ValidationRow>
            <ValidationRow isValid={!hasStakedGlp}>Receiver has not staked GLP tokens before</ValidationRow>
          </div>
          <div className="input-row">
            <button
              className="App-cta Exchange-swap-button"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
